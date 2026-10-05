import numpy as np, json, base64, io
from scipy import signal
from scipy.io import wavfile

import os
os.makedirs('build/wav', exist_ok=True)
SR = 22050
BPM = 110
S16 = 60 / BPM / 4
STEPS = 32
N = int(round(STEPS * S16 * SR))
rng = np.random.default_rng(7)

def mtof(m): return 440.0 * 2 ** ((m - 69) / 12)
def st(step): return int(round(step * S16 * SR))
def tt(dur): return np.arange(int(dur * SR)) / SR

def put(buf, start, sig):
    idx = (start + np.arange(len(sig))) % N
    np.add.at(buf, idx, sig)

def wrapfold(x):
    out = np.zeros(N)
    for k in range(0, len(x), N):
        seg = x[k:k + N]
        out[:len(seg)] += seg
    return out

def lp(x, fc, order=2):
    b, a = signal.butter(order, min(fc, SR / 2 * 0.95) / (SR / 2))
    return signal.lfilter(b, a, x)

def hp(x, fc, order=2):
    b, a = signal.butter(order, fc / (SR / 2), 'high')
    return signal.lfilter(b, a, x)

def bp(x, lo, hi, order=2):
    b, a = signal.butter(order, [lo / (SR / 2), min(hi, SR / 2 * 0.95) / (SR / 2)], 'band')
    return signal.lfilter(b, a, x)

def env(t, a=0.005, d=0.3):
    return (1 - np.exp(-t / max(a, 1e-4))) * np.exp(-t / d)

def saw(f, t, kmax=30):
    out = np.zeros_like(t)
    for k in range(1, kmax + 1):
        if f * k > SR / 2 * 0.9: break
        out += np.sin(2 * np.pi * f * k * t) / k
    return out * 0.6

def square(f, t, kmax=25):
    out = np.zeros_like(t)
    for k in range(1, kmax * 2, 2):
        if f * k > SR / 2 * 0.9: break
        out += np.sin(2 * np.pi * f * k * t) / k
    return out * 0.8

def noise(n): return rng.uniform(-1, 1, n)

def reverb(x, wet=0.25, length=1.0, decay=0.35):
    n = int(length * SR)
    ir = noise(n) * np.exp(-np.arange(n) / SR / decay)
    ir = lp(ir, 5000)
    ir /= np.sqrt(np.sum(ir ** 2))
    y = signal.fftconvolve(np.concatenate([x, x]), ir)[:2 * N]
    y = y[N:2 * N]  # steady-state circular tail
    return x * (1 - wet) + y * wet * 0.6

def delay(x, steps=3, fb=0.4, mix=0.35):
    d = st(steps)
    y = x.copy()
    for k in range(1, 6):
        y += np.roll(x, d * k) * (fb ** k) * mix
    return y

def norm(x, peak=0.9):
    m = np.max(np.abs(x)) or 1
    return x / m * peak

# ---------- voices ----------
def kick(f0=150, f1=45, d=0.32):
    t = tt(0.45)
    ph = 2 * np.pi * np.cumsum(f1 + (f0 - f1) * np.exp(-t / 0.035)) / SR
    return np.sin(ph) * env(t, 0.002, d) + noise(len(t)) * np.exp(-t / 0.004) * 0.3

def snare():
    t = tt(0.3)
    return bp(noise(len(t)), 1200, 6000) * env(t, 0.001, 0.12) * 0.9 + np.sin(2 * np.pi * 185 * t) * env(t, 0.001, 0.06) * 0.6

def clap():
    t = tt(0.3); out = np.zeros(len(t))
    for k, off in enumerate([0, 0.011, 0.022]):
        s = int(off * SR)
        nn = bp(noise(len(t) - s), 900, 3000) * env(t[:len(t) - s], 0.001, 0.02 if k < 2 else 0.12)
        out[s:] += nn
    return out

def hat(d=0.035, hpf=7000):
    t = tt(0.12)
    return hp(noise(len(t)), hpf) * env(t, 0.001, d)

def shaker(d=0.05):
    t = tt(0.12)
    return bp(noise(len(t)), 4000, 9500) * env(t, 0.012, d)

def pluck_bass(m, dur=0.3):
    t = tt(dur + 0.15); f = mtof(m)
    x = saw(f, t, 20)
    cut = 300 + 2200 * np.exp(-t / 0.06)
    # stepwise variable lowpass
    y = np.zeros_like(x); zi = None
    for k in range(0, len(x), 256):
        b, a = signal.butter(2, cut[k] / (SR / 2))
        if zi is None: zi = signal.lfilter_zi(b, a) * 0
        y[k:k + 256], zi = signal.lfilter(b, a, x[k:k + 256], zi=zi)
    return y * env(t, 0.004, dur * 0.8) + np.sin(2 * np.pi * f / 2 * t) * env(t, 0.004, dur) * 0.5

def fm_bell(m, dur=1.2, ratio=3.5, idx=4, detune=0):
    t = tt(dur); f = mtof(m) * 2 ** (detune / 1200)
    I = idx * np.exp(-t / 0.25)
    return np.sin(2 * np.pi * f * t + I * np.sin(2 * np.pi * f * ratio * t)) * env(t, 0.002, dur * 0.35)

def musicbox(m, detune=0):
    t = tt(1.0); f = mtof(m) * 2 ** (detune / 1200)
    return (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * f * 4.1 * t) * np.exp(-t / 0.05)) * env(t, 0.001, 0.4)

def lead(m, dur, kind='square'):
    t = tt(dur + 0.08); f = mtof(m)
    vib = 1 + 0.006 * np.sin(2 * np.pi * 5.5 * t) * np.clip((t - 0.12) / 0.2, 0, 1)
    ph = 2 * np.pi * np.cumsum(f * vib) / SR
    x = np.zeros_like(t)
    for k in range(1, 40, 2):
        if f * k > SR / 2 * 0.9: break
        x += np.sin(k * ph) / k
    x = lp(x, 3500)
    e = np.clip(t / 0.01, 0, 1) * np.clip((dur + 0.08 - t) / 0.08, 0, 1)
    return x * e * 0.7

def pad(notes, dur, bright=1400):
    t = tt(dur + 0.4); x = np.zeros_like(t)
    for m in notes:
        for dt in (-7, 0, 7):
            x += saw(mtof(m) * 2 ** (dt / 1200), t, 18)
    x = lp(x, bright)
    e = np.clip(t / 0.25, 0, 1) * np.clip((dur + 0.4 - t) / 0.4, 0, 1)
    return x * e * 0.25

def organ(notes, dur):
    t = tt(dur + 0.3); x = np.zeros_like(t)
    for m in notes:
        f = mtof(m)
        for h, a in ((1, 1), (2, .5), (3, .3), (4, .2), (0.5, .4)):
            x += a * np.sin(2 * np.pi * f * h * t)
    x *= 1 + 0.35 * np.sin(2 * np.pi * 5 * t)
    e = np.clip(t / 0.35, 0, 1) * np.clip((dur + 0.3 - t) / 0.3, 0, 1)
    return x * e * 0.12

FORMANTS = {'a': (730, 1090, 2440), 'o': (570, 840, 2410), 'u': (300, 870, 2240)}
def choir(notes, dur, vowel='a', vib=5, eerie=False):
    t = tt(dur + 0.4); x = np.zeros_like(t)
    for m in notes:
        for dt in ((-12, 0, 12) if not eerie else (-25, 0, 18)):
            f = mtof(m) * 2 ** (dt / 1200)
            ph = 2 * np.pi * np.cumsum(f * (1 + 0.01 * np.sin(2 * np.pi * vib * t))) / SR
            s = np.zeros_like(t)
            for k in range(1, 30):
                if f * k > SR / 2 * 0.9: break
                s += np.sin(k * ph) / k
            x += s
    F = FORMANTS[vowel]; y = np.zeros_like(x)
    for i, fc in enumerate(F):
        y += bp(x, fc * 0.85, fc * 1.15) * (1, .7, .25)[i]
    e = np.clip(t / 0.3, 0, 1) * np.clip((dur + 0.4 - t) / 0.4, 0, 1)
    return y * e * 0.4

def theremin(m0, m1, dur):
    t = tt(dur + 0.1)
    f = mtof(m0) + (mtof(m1) - mtof(m0)) * np.clip(t / 0.25, 0, 1)
    f = f * (1 + 0.02 * np.sin(2 * np.pi * 6 * t))
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.2 * np.sin(4 * np.pi * np.cumsum(f) / SR)
    e = np.clip(t / 0.15, 0, 1) * np.clip((dur + 0.1 - t) / 0.15, 0, 1)
    return x * e * 0.6

def blip(m, d=0.06, crush=False):
    t = tt(d + 0.03)
    x = square(mtof(m), t, 12) * env(t, 0.001, d * 0.6)
    if crush: x = np.round(x * 4) / 4
    return x

# ---------- harmony ----------
P1_CH = [[60, 64, 67], [57, 60, 64], [57, 60, 65], [59, 62, 67]]  # C Am F G
P1_BASS = [48, 45, 41, 43]
P2_CH = [[60, 63, 67], [56, 60, 63], [56, 60, 65], [55, 59, 62]]  # Cm Ab Fm G
P2_BASS = [48, 44, 41, 43]

loops = {}
onsets = {}

def mk(name, steps, buf, wet=0.0, rv_decay=0.35, peak=0.9):
    if wet: buf = reverb(buf, wet, decay=rv_decay)
    loops[name] = norm(buf, peak)
    onsets[name] = sorted(set(int(s) % STEPS for s in steps))

# ===== Phase 1 =====
b = np.zeros(N); s_ = [0, 8, 10, 16, 24, 26]
for s in s_: put(b, st(s), kick() * (1 if s % 8 == 0 else .7))
mk('kick1', s_, b)

b = np.zeros(N); s_ = list(range(32))
for s in s_: put(b, st(s), shaker() * (1 if s % 4 == 2 else .45))
mk('shaker1', [x for x in s_ if x % 2 == 0], b)

b = np.zeros(N); s_ = [4, 12, 20, 28, 30, 31]
for s in s_: put(b, st(s), clap() * (1 if s in (4, 12, 20, 28) else .45))
mk('clap1', s_, b, wet=.15)

b = np.zeros(N); s_ = []
for h, root in enumerate(P1_BASS):
    for o, oc in ((0, 0), (3, 12), (6, 0)):
        s = h * 8 + o; s_.append(s); put(b, st(s), pluck_bass(root + oc, .25))
mk('bass1', s_, b)

b = np.zeros(N); s_ = []
for base in (12, 28):
    for k, m in enumerate([84, 88, 91, 96, 100]):
        put(b, st(base) + int(k * 0.045 * SR), fm_bell(m, .8, 2.0, 1.5) * .5)
    s_.append(base)
mk('chime1', s_, b, wet=.35)

swp = np.zeros(N); x = noise(N); cut = np.geomspace(250, 7000, N)
y = np.zeros(N); zi = None
for k in range(0, N, 256):
    c = cut[k]; bb, aa = signal.butter(2, [c * .7 / (SR / 2), min(c * 1.3, SR / 2 * .95) / (SR / 2)], 'band')
    if zi is None: zi = signal.lfilter_zi(bb, aa) * 0
    y[k:k + 256], zi = signal.lfilter(bb, aa, x[k:k + 256], zi=zi)
amp = np.clip((np.arange(N) / N - 0.45) / 0.55, 0, 1) ** 2
swp = y * amp
swp[:st(1)] *= np.linspace(1, 0, st(1)) + 0  # quick tail at loop start
mk('sweep1', [0, 24, 28], swp, wet=.2)

b = np.zeros(N); pat = [(2, 79), (5, 84), (7, 76), (10, 81), (13, 79), (18, 84), (21, 88), (23, 79), (26, 81), (29, 76)]
for s, m in pat: put(b, st(s), blip(m) * .7)
mk('blip1', [s for s, _ in pat], delay(b, 3, .35, .3))

b = np.zeros(N); mel = [(0, 76, 2), (2, 79, 2), (4, 81, 2), (6, 79, 2), (8, 76, 4), (12, 74, 2), (14, 72, 2), (16, 72, 2), (18, 74, 2), (20, 76, 2), (22, 79, 2), (24, 74, 6), (30, 72, 2)]
for s, m, l in mel: put(b, st(s), fm_bell(m, 1.0, 3.5, 3) * .8)
mk('bells1', [s for s, _, _ in mel], b, wet=.3)

b = np.zeros(N); mel = [(0, 72, 1), (1, 72, 1), (3, 79, 2), (6, 76, 2), (8, 74, 1), (9, 74, 1), (11, 72, 2), (14, 69, 2), (16, 72, 1), (17, 72, 1), (19, 79, 2), (22, 81, 2), (24, 79, 3), (28, 76, 4)]
for s, m, l in mel: put(b, st(s), lead(m, l * S16 * .9))
mk('lead1', [s for s, _, _ in mel], b, wet=.2)

b = np.zeros(N)
for h, ch in enumerate(P1_CH): put(b, st(h * 8), pad(ch, 8 * S16))
mk('pad1', [0, 8, 16, 24], b, wet=.3)

b = np.zeros(N); top = [67, 69, 69, 67]
for h, ch in enumerate(P1_CH): put(b, st(h * 8), choir([ch[0] - 12, top[h] - 12], 8 * S16, 'a'))
mk('choir1', [0, 8, 16, 24], b, wet=.35)

# ===== Phase 2 (spooky) =====
b = np.zeros(N); s_ = []
for base in (0, 8, 16, 24):
    put(b, st(base), lp(kick(90, 38, .4), 500)); put(b, st(base) + int(.18 * SR), lp(kick(80, 36, .35), 400) * .6); s_.append(base)
mk('kick2', s_, b, wet=.25, rv_decay=.6)

b = np.zeros(N); s_ = []
for s in range(0, 32, 4):
    put(b, st(s), bp(noise(st(.4)), 2500 if (s // 4) % 2 == 0 else 1600, 4500 if (s // 4) % 2 == 0 else 2600) * env(tt(.4)[:st(.4)], .001, .012)); s_.append(s)
for s in (14, 30):
    t = tt(.5); put(b, st(s), bp(noise(len(t)), 300, 900) * np.sin(np.pi * t / .5) * .25 * (1 + .5 * np.sin(2 * np.pi * 25 * t)))
mk('shaker2', s_, b, wet=.3, rv_decay=.7)

b = np.zeros(N); s_ = [12, 28]
for s in s_:
    t = tt(.2); put(b, st(s), (np.sin(2 * np.pi * 820 * t) * env(t, .001, .02) + bp(noise(len(t)), 2000, 5000) * env(t, .001, .015)))
mk('clap2', [12, 15, 28, 31], delay(b, 3, .5, .6), wet=.3, rv_decay=.8)

b = np.zeros(N); s_ = []
x = np.zeros(N); f = np.zeros(N)
for h, root in enumerate(P2_BASS):
    f[st(h * 8):st(h * 8 + 8)] = mtof(root)
f = np.convolve(np.concatenate([f[-2000:], f]), np.ones(2000) / 2000, 'valid')[:N]
ph = 2 * np.pi * np.cumsum(f) / SR
for k in range(1, 15): x += np.sin(k * ph) / k
x = lp(x, 500) * (0.7 + 0.3 * np.sin(2 * np.pi * np.arange(N) / N * 4))
mk('bass2', [0, 8, 16, 24], x, wet=.15)

b = np.zeros(N); pat = [(3, 96, -30), (11, 99, 25), (19, 95, -40), (27, 92, 35)]
for s, m, d in pat: put(b, st(s), musicbox(m, d) * .6)
mk('chime2', [s for s, _, _ in pat], delay(b, 3, .5, .5), wet=.45, rv_decay=.9)

t = np.arange(N) / SR
w = lp(noise(N), 900) * (0.5 + 0.5 * np.sin(2 * np.pi * t / (N / SR) * 2 - 1))
howl = np.sin(2 * np.pi * np.cumsum(330 + 120 * np.sin(2 * np.pi * t / (N / SR))) / SR) * 0.18 * (0.5 + 0.5 * np.sin(2 * np.pi * t / (N / SR) * 2))
mk('sweep2', [0, 16], w + howl, wet=.3, rv_decay=.9)

b = np.zeros(N); pat = [(2, 60), (3, 58), (4, 56), (10, 63), (11, 63), (18, 55), (19, 54), (20, 53), (26, 66), (27, 66), (28, 66)]
for s, m in pat: put(b, st(s), blip(m, .05, crush=True) * .6)
mk('blip2', [s for s, _ in pat], b, wet=.2)

b = np.zeros(N); mel = [(0, 72, 2), (2, 75, 2), (4, 79, 2), (6, 78, 2), (8, 79, 4), (12, 75, 2), (14, 74, 2), (16, 72, 2), (18, 71, 2), (20, 68, 4), (24, 67, 4), (28, 71, 4)]
for s, m, l in mel: put(b, st(s), musicbox(m + 12, rng.uniform(-25, 25)))
mk('bells2', [s for s, _, _ in mel], b, wet=.4, rv_decay=.8)

b = np.zeros(N); mel = [(0, 72, 75, 8), (8, 75, 72, 8), (16, 68, 71, 8), (24, 71, 67, 8)]
for s, a_, b_, l in mel: put(b, st(s), theremin(a_, b_, l * S16 * .95))
mk('lead2', [0, 8, 16, 24], b, wet=.4, rv_decay=.9)

b = np.zeros(N)
for h, ch in enumerate(P2_CH): put(b, st(h * 8), organ([m - 12 for m in ch], 8 * S16))
mk('pad2', [0, 8, 16, 24], b, wet=.35, rv_decay=.9)

b = np.zeros(N)
for h, ch in enumerate(P2_CH): put(b, st(h * 8), choir([ch[0], ch[2]], 8 * S16, 'u', vib=3, eerie=True))
mk('choir2', [0, 8, 16, 24], b, wet=.5, rv_decay=1.0)

# ---------- export ----------
out = {}
for k, v in loops.items():
    L = int(0.004 * SR)
    if abs(v[-1] - v[0]) > 0.01:
        v = v.copy(); v[:L] *= np.linspace(0, 1, L); v[-L:] *= np.linspace(1, 0, L)
    bio = io.BytesIO()
    wavfile.write(bio, SR, (v * 32767).astype(np.int16))
    out[k] = 'data:audio/wav;base64,' + base64.b64encode(bio.getvalue()).decode()
    wavfile.write(f'build/wav/{k}.wav', SR, (v * 32767).astype(np.int16))
json.dump({'loops': out, 'onsets': onsets, 'bpm': BPM, 'steps': STEPS}, open('build/audio.json', 'w'))
print('loops', len(out), 'json MB', round(len(json.dumps(out)) / 1e6, 2))
