import numpy as np, json, base64, io, zlib
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

def pluck(m, dur=0.9):
    """古筝一样的拨弦（Karplus-Strong）"""
    f = mtof(m); n = int(dur * SR); L = max(2, int(SR / f))
    buf = noise(L) * 0.8; out = np.zeros(n)
    for k in range(n):
        v = buf[k % L]; out[k] = v
        buf[k % L] = 0.5 * (v + buf[(k + 1) % L]) * 0.996
    return lp(out, 4500) * env(tt(dur), 0.001, dur * 0.5)

def flute(m, dur):
    t = tt(dur + 0.1); f = mtof(m)
    vib = 1 + 0.008 * np.sin(2 * np.pi * 5 * t) * np.clip((t - 0.1) / 0.2, 0, 1)
    ph = 2 * np.pi * np.cumsum(f * vib) / SR
    x = np.sin(ph) + 0.25 * np.sin(2 * ph) + 0.08 * np.sin(3 * ph) + bp(noise(len(t)), f * .8, f * 2.5) * 0.25
    e = np.clip(t / 0.06, 0, 1) * np.clip((dur + 0.1 - t) / 0.1, 0, 1)
    return x * e * 0.6

def woodblock(f=900):
    t = tt(0.12)
    return (np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * f * 2.7 * t)) * env(t, 0.0005, 0.025)

def waterdrop(m):
    t = tt(0.25); f0 = mtof(m)
    f = f0 * (1 + 0.8 * np.exp(-t / 0.02))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(t, 0.001, 0.06)

def snap():
    t = tt(0.15)
    return bp(noise(len(t)), 1800, 4500) * env(t, 0.0005, 0.012) + np.sin(2 * np.pi * 2300 * t) * env(t, 0.0005, 0.005) * 0.5

def drone(m, dur, dark=False):
    t = tt(dur); f = mtof(m)
    x = np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 2.003 * t) + (0.3 * np.sin(2 * np.pi * f * 1.498 * t) if dark else 0)
    return lp(x, 700 if dark else 1100) * np.minimum(1, t / 0.08) * np.minimum(1, (dur - t) / 0.15) * 0.35

# ===== 新乐手的音色（电音和管弦） =====
def epiano(m, dur=0.6, dark=False):
    """电钢琴：FM 合成，带一点颤音"""
    t = tt(dur + 0.3); f = mtof(m) * (2 ** (rng.uniform(-12, 12) / 1200) if dark else 1)
    I = 1.6 * np.exp(-t / 0.18)
    x = np.sin(2 * np.pi * f * t + I * np.sin(2 * np.pi * f * t)) + 0.15 * np.sin(2 * np.pi * f * 4 * t) * np.exp(-t / 0.03)
    return x * env(t, 0.002, dur * 0.7) * (1 + 0.25 * np.sin(2 * np.pi * (4 if dark else 5.5) * t)) * 0.35

def bowed(m, dur, bright=1400, vib=5.0, att=0.08, trem=0.0):
    """弓弦乐器：大提琴、小提琴"""
    t = tt(dur + 0.15); f = mtof(m)
    ph = 2 * np.pi * np.cumsum(f * (1 + 0.006 * np.sin(2 * np.pi * vib * t) * np.clip((t - 0.15) / 0.2, 0, 1))) / SR
    x = np.zeros_like(t)
    for k in range(1, 30):
        if f * k > SR / 2 * 0.9: break
        x += np.sin(k * ph) / k
    x = lp(x, bright) + bp(noise(len(t)), f, f * 6) * 0.04
    e = np.clip(t / att, 0, 1) * np.clip((dur + 0.15 - t) / 0.15, 0, 1)
    if trem: e = e * (0.6 + 0.4 * np.sign(np.sin(2 * np.pi * trem * t)))
    return x * e * 0.5

def screech(m0, m1, dur):
    """恐怖片里的尖叫小提琴：滑音"""
    t = tt(dur); f = mtof(m0) * (mtof(m1) / mtof(m0)) ** (t / dur)
    ph = 2 * np.pi * np.cumsum(f * (1 + 0.02 * np.sin(2 * np.pi * 9 * t))) / SR
    x = sum(np.sin(k * ph) / k for k in range(1, 12))
    return lp(x, 5000) * np.clip(t / 0.05, 0, 1) * np.clip((dur - t) / 0.1, 0, 1) * 0.35

def guitar(ms, dur=0.25, drive=4.0):
    """电吉他强力和弦：拨弦再过失真"""
    x = sum(pluck(m, dur + 0.1) for m in ms)
    return np.tanh(x * drive) * 0.5

def supersaw(notes, dur, cut=3000):
    t = tt(dur); x = np.zeros_like(t)
    for m in notes:
        for d in (-18, -11, -5, 0, 5, 11, 18):
            x += saw(mtof(m) * 2 ** (d / 1200), t, 24) * (0.6 if d else 1)
    return lp(x, cut) * 0.08

def sidechain(x, depth=0.8):
    """每拍压一下音量，电音里那种一呼一吸的感觉"""
    beat_len = st(4); y = x.copy()
    for k in range(0, N, beat_len):
        n = min(beat_len, N - k); r = np.arange(n) / SR
        y[k:k + n] *= 1 - depth * np.exp(-r / 0.09)
    return y

def openhat():
    t = tt(0.25)
    return hp(noise(len(t)), 6000) * env(t, 0.001, 0.09)

def sub808(m, dur, glide=0.0, drive=1.6):
    t = tt(dur); f = mtof(m) * (1 + glide * np.exp(-t / 0.06))
    x = np.sin(2 * np.pi * np.cumsum(f) / SR)
    return np.tanh(x * drive) * env(t, 0.003, dur * 0.6) * 0.8

def chop(m, vowel='a', dur=0.18):
    """人声切片：短短一声 a / o / u"""
    t = tt(dur); f = mtof(m)
    ph = 2 * np.pi * f * t; x = sum(np.sin(k * ph) / k for k in range(1, 25) if f * k < SR / 2 * 0.9)
    F = FORMANTS[vowel]; y = sum(bp(x, fc * 0.85, fc * 1.15) * a for fc, a in zip(F, (1, .7, .25)))
    return y * np.clip(t / 0.01, 0, 1) * np.clip((dur - t) / 0.04, 0, 1) * 1.4

def hey():
    t = tt(0.22)
    x = bp(noise(len(t)), 600, 2600) * 0.6 + chop(64, 'a', 0.22) * 0.8
    return x * np.exp(-t / 0.12)

def new_insts(sfx, CH, BS, tr=0, dark=False):
    """新加的 10 个乐手：当当 嗡嗡 悠悠 铮铮 滋滋 动次 哒哒 轰轰 啾啾 嘿嘿"""
    # 当当 电钢琴：切分节奏弹和弦
    b = np.zeros(N); s_ = [0, 3, 6, 10, 12, 16, 19, 22, 26, 28]
    for s in s_:
        c = CH[s // 8]
        for m in c: put(b, st(s), epiano(m + 12, .45 if s % 4 else .7, dark))
    mk('epiano' + sfx, s_, b, wet=.25 if not dark else .5, rv_decay=.5 if not dark else .9)
    # 嗡嗡 大提琴：每小节两个长音
    b = np.zeros(N); s_ = []
    for h, root in enumerate(BS):
        for o, oc in ((0, 12), (4, 19)):
            s = h * 8 + o; s_.append(s)
            put(b, st(s), bowed(root + oc, 4 * S16 * .95, 1200 if not dark else 800, trem=12 if dark else 0))
    mk('cello' + sfx, s_, b, wet=.3 if not dark else .5, rv_decay=.6)
    # 悠悠 小提琴：高声部的对位旋律；恐怖时是尖叫滑音
    b = np.zeros(N)
    if not dark:
        mel = [(0, 84, 4), (4, 83, 2), (6, 81, 2), (8, 79, 6), (14, 81, 2), (16, 84, 3), (19, 86, 1), (20, 88, 4), (24, 86, 4), (28, 84, 4)]
        for s, m, l in mel: put(b, st(s), bowed(m + tr, l * S16 * .95, 4000, vib=6, att=.04))
        s_ = [s for s, _, _ in mel]
    else:
        s_ = [0, 12, 20]
        for s, (a, z) in zip(s_, [(88, 96), (95, 84), (90, 100)]): put(b, st(s), screech(a, z, 3 * S16))
    mk('violin' + sfx, s_, b, wet=.35 if not dark else .55, rv_decay=.6 if not dark else 1.0)
    # 铮铮 电吉他：强力和弦八分音符
    b = np.zeros(N); s_ = [0, 2, 3, 6, 8, 10, 11, 14, 16, 18, 19, 22, 24, 26, 27, 30]
    for s in s_:
        r = BS[s // 8] + 12 + (-12 if dark else 0)
        put(b, st(s), guitar([r, r + 7, r + 12], .14 if s % 2 else .22, 6 if dark else 4))
    mk('guitar' + sfx, s_, b, wet=.15)
    # 滋滋 合成器：超级锯齿波长和弦，每拍被压一下
    b = np.zeros(N)
    for h, c in enumerate(CH): put(b, st(h * 8), supersaw([m + 12 for m in c], 8 * S16, 2400 if dark else 3500))
    mk('saw' + sfx, [0, 4, 8, 12, 16, 20, 24, 28], sidechain(b, .85), wet=.2)
    # 动次 打碟：四拍底鼓加反拍开镲（动次打次）
    b = np.zeros(N); s_ = [0, 4, 8, 12, 16, 20, 24, 28]
    for s in s_:
        put(b, st(s), np.tanh(kick(170, 48, .28) * (3 if dark else 1.4)) * .9)
        put(b, st(s + 2), openhat() * .5)
    mk('edm' + sfx, s_, b, wet=.1 if not dark else .3, rv_decay=.7)
    # 哒哒 踩镲：十六分音符，小节末尾有连打
    b = np.zeros(N); s_ = []
    for s in range(32):
        if dark and s % 2: continue
        put(b, st(s), hat(.03, 8000) * (1 if s % 4 == 0 else .5)); s_.append(s)
    for s in (14, 30):
        for k in range(6): put(b, st(s) + int(k * S16 / 3 * SR), hat(.02, 9000) * (.3 + k * .1))
    mk('trap' + sfx, [x for x in s_ if x % 2 == 0], b, wet=.05 if not dark else .4, rv_decay=.8)
    # 轰轰 808 低音
    b = np.zeros(N); s_ = []
    for h, root in enumerate(BS):
        for o, l in ((0, 5), (6, 2)):
            s = h * 8 + o; s_.append(s)
            put(b, st(s), sub808(root - 12 if not dark else root - 14, l * S16 * .95, glide=.6 if o == 0 else 0))
    mk('808' + sfx, s_, b)
    # 啾啾 琶音：十六分音符上下跑和弦
    b = np.zeros(N); s_ = list(range(32))
    for s in s_:
        c = CH[s // 8]; seq = [c[0], c[1], c[2], c[0] + 12, c[2], c[1]]
        m = seq[s % len(seq)] + 12 + (1 if dark and s % 5 == 0 else 0)
        put(b, st(s), blip(m, .07) * .45 if not dark else musicbox(m + 12, rng.uniform(-30, 30)) * .4)
    mk('arp' + sfx, [x for x in s_ if x % 4 == 0], delay(b, 3, .35, .35), wet=.25 if not dark else .5, rv_decay=.8)
    # 嘿嘿 人声切片
    b = np.zeros(N); pat = [(0, 0, 'a'), (3, 1, 'o'), (6, 2, 'a'), (10, 1, 'u'), (16, 0, 'a'), (19, 2, 'o'), (22, 1, 'a')]
    for s, k, v in pat:
        c = CH[s // 8]; put(b, st(s), chop(c[k] + 12 - (12 if dark else 0), v) * .7)
    for s in (12, 28): put(b, st(s), hey() * (.9 if not dark else .5))
    mk('vox' + sfx, [s for s, _, _ in pat] + [12, 28], delay(b, 3, .3, .3) if not dark else delay(b, 3, .6, .6), wet=.2 if not dark else .6, rv_decay=.9)

MEL_A = [(0, 72, 1), (1, 72, 1), (3, 79, 2), (6, 76, 2), (8, 74, 1), (9, 74, 1), (11, 72, 2), (14, 69, 2), (16, 72, 1), (17, 72, 1), (19, 79, 2), (22, 81, 2), (24, 79, 3), (28, 76, 4)]
MEL_B = [(0, 76, 3), (3, 79, 1), (4, 81, 4), (8, 79, 2), (10, 76, 2), (12, 74, 4), (16, 72, 3), (19, 74, 1), (20, 76, 2), (22, 79, 2), (24, 76, 6), (30, 74, 2)]
MEL_C = [(0, 79, 2), (2, 76, 2), (4, 74, 4), (8, 72, 2), (10, 74, 2), (12, 76, 4), (16, 81, 2), (18, 79, 2), (20, 76, 2), (22, 74, 2), (24, 72, 8)]
BELL_A = [(0, 76, 2), (2, 79, 2), (4, 81, 2), (6, 79, 2), (8, 76, 4), (12, 74, 2), (14, 72, 2), (16, 72, 2), (18, 74, 2), (20, 76, 2), (22, 79, 2), (24, 74, 6), (30, 72, 2)]
BELL_B = [(0, 84, 2), (4, 81, 2), (6, 79, 2), (8, 76, 4), (14, 79, 2), (16, 84, 4), (20, 86, 2), (22, 84, 2), (24, 81, 8)]

def bright_set(sfx, tr=0, lead_kind='square', mel=MEL_A, bell_kind='fm', bells=BELL_A, kit='pop', chords=None, bass=None):
    """明亮风格的一整套乐器循环。sfx 是套名，tr 是整体移调（半音）。"""
    global rng; rng = np.random.default_rng(zlib.crc32(sfx.encode()))
    CH = [[m + tr for m in c] for c in (chords or P1_CH)]
    BS = [m + tr for m in (bass or P1_BASS)]
    b = np.zeros(N); s_ = [0, 8, 10, 16, 24, 26]
    for s in s_: put(b, st(s), (kick() if kit != 'wood' else lp(kick(110, 50, .4), 900)) * (1 if s % 8 == 0 else .7))
    mk('kick' + sfx, s_, b, wet=.1 if kit == 'wood' else 0)

    b = np.zeros(N); s_ = list(range(32))
    for s in s_: put(b, st(s), shaker(.04 if kit == 'soft' else .05) * (1 if s % 4 == 2 else .45) * (.7 if kit == 'soft' else 1))
    mk('shaker' + sfx, [x for x in s_ if x % 2 == 0], b)

    b = np.zeros(N); s_ = [4, 12, 20, 28, 30, 31]
    for s in s_: put(b, st(s), (woodblock(1000 if s in (4, 20) else 760) if kit == 'wood' else clap()) * (1 if s in (4, 12, 20, 28) else .45))
    mk('clap' + sfx, s_, b, wet=.15)

    b = np.zeros(N); s_ = []
    for h, root in enumerate(BS):
        for o, oc in ((0, 0), (3, 12), (6, 0)):
            s = h * 8 + o; s_.append(s); put(b, st(s), pluck_bass(root + oc, .25))
    mk('bass' + sfx, s_, b)

    b = np.zeros(N); s_ = []
    for base in (12, 28):
        for k, m in enumerate([84, 88, 91, 96, 100]):
            put(b, st(base) + int(k * 0.045 * SR), fm_bell(m + tr, .8, 2.0, 1.5) * .5)
        s_.append(base)
    mk('chime' + sfx, s_, b, wet=.35)

    x = noise(N); cut = np.geomspace(250, 7000, N); y = np.zeros(N); zi = None
    for k in range(0, N, 256):
        c = cut[k]; bb, aa = signal.butter(2, [c * .7 / (SR / 2), min(c * 1.3, SR / 2 * .95) / (SR / 2)], 'band')
        if zi is None: zi = signal.lfilter_zi(bb, aa) * 0
        y[k:k + 256], zi = signal.lfilter(bb, aa, x[k:k + 256], zi=zi)
    swp = y * np.clip((np.arange(N) / N - 0.45) / 0.55, 0, 1) ** 2
    swp[:st(1)] *= np.linspace(1, 0, st(1))
    mk('sweep' + sfx, [0, 24, 28], swp, wet=.2)

    b = np.zeros(N); pat = [(2, 79), (5, 84), (7, 76), (10, 81), (13, 79), (18, 84), (21, 88), (23, 79), (26, 81), (29, 76)]
    for s, m in pat: put(b, st(s), (waterdrop(m + tr) if kit == 'soft' else blip(m + tr)) * .7)
    mk('blip' + sfx, [s for s, _ in pat], delay(b, 3, .35, .3))

    b = np.zeros(N)
    for s, m, l in bells: put(b, st(s), (musicbox(m + tr) * .7 if bell_kind == 'box' else fm_bell(m + tr, 1.0, 3.5, 3) * .8))
    mk('bells' + sfx, [s for s, _, _ in bells], b, wet=.3)

    b = np.zeros(N)
    for s, m, l in mel:
        if lead_kind == 'pluck': sig = pluck(m + tr, max(.5, l * S16 * 1.5))
        elif lead_kind == 'flute': sig = flute(m + tr, l * S16 * .9)
        else: sig = lead(m + tr, l * S16 * .9)
        put(b, st(s), sig)
    mk('lead' + sfx, [s for s, _, _ in mel], b, wet=.25)

    b = np.zeros(N)
    for h, c in enumerate(CH): put(b, st(h * 8), pad(c, 8 * S16))
    mk('pad' + sfx, [0, 8, 16, 24], b, wet=.3)

    b = np.zeros(N); top = [67, 69, 69, 67]
    for h, c in enumerate(CH): put(b, st(h * 8), choir([c[0] - 12, top[h] + tr - 12], 8 * S16, 'a'))
    mk('choir' + sfx, [0, 8, 16, 24], b, wet=.35)

    b = np.zeros(N); s_ = [4, 12, 20, 28]
    for s in s_: put(b, st(s), snap())
    for h, m in enumerate([45, 45, 43, 48]): put(b, st(h * 8), drone(m + tr, 7.5 * S16))
    mk('snap' + sfx, s_, b, wet=.25)
    new_insts(sfx, CH, BS, tr)

# ===== Phase 1：第 1 阶段 天和地 =====
bright_set('1')
# 第 2 阶段 金木水火土：五声调式，古筝、木鱼、八音盒
bright_set('wx', tr=2, lead_kind='pluck', mel=MEL_B, bell_kind='box', bells=BELL_B, kit='wood',
           chords=[[60, 64, 67], [57, 62, 64], [55, 60, 64], [57, 60, 64]], bass=[48, 45, 43, 45])
# 第 4 阶段 日月山川：笛子、水滴声，柔和
bright_set('sc', tr=-3, lead_kind='flute', mel=MEL_C, kit='soft',
           chords=[[60, 64, 67], [53, 57, 60], [57, 60, 64], [55, 59, 62]], bass=[48, 41, 45, 43])
# 拼音一 海底：水滴、八音盒
bright_set('oc', tr=5, lead_kind='square', mel=MEL_B, bell_kind='box', bells=BELL_A, kit='soft')
# 拼音二 太空：电子感
bright_set('sp', tr=-2, lead_kind='square', mel=MEL_C, bells=BELL_B, kit='pop',
           chords=[[57, 60, 64], [53, 57, 60], [60, 64, 67], [55, 59, 62]], bass=[45, 41, 48, 43])
# 识字二 校园和节日
bright_set('xy', tr=0, lead_kind='square', mel=MEL_B, kit='pop',
           chords=[[53, 57, 60], [55, 59, 62], [52, 55, 59], [57, 60, 64]], bass=[41, 43, 40, 45])
# 阅读一 四季和江南
bright_set('sj', tr=2, lead_kind='flute', mel=MEL_A, bell_kind='box', bells=BELL_B, kit='wood',
           chords=[[60, 64, 67], [53, 57, 60], [57, 60, 64], [55, 59, 62]], bass=[48, 41, 45, 43])
# 阅读二 夜空和动物
bright_set('ye', tr=-5, lead_kind='pluck', mel=MEL_B, bell_kind='box', kit='soft',
           chords=[[60, 64, 67], [59, 64, 67], [57, 60, 65], [55, 59, 62]], bass=[48, 52, 53, 43])

# ===== 恐怖声音套 =====
def groan(m, dur):
    """僵尸低吼：o 音往下滑"""
    t = tt(dur); f = mtof(m) * (1 - 0.25 * t / dur) * (1 + 0.03 * np.sin(2 * np.pi * 7 * t))
    ph = 2 * np.pi * np.cumsum(f) / SR; x = sum(np.sin(k * ph) / k for k in range(1, 30))
    F = FORMANTS['o']; y = sum(bp(x, fc * .85, fc * 1.15) * a for fc, a in zip(F, (1, .6, .2)))
    return np.tanh(y * 3) * np.sin(np.pi * t / dur) * 0.5

def siren(dur, lo=500, hi=900, rate=0.5):
    """警报：慢慢升降"""
    t = tt(dur); f = lo + (hi - lo) * (0.5 - 0.5 * np.cos(2 * np.pi * rate * t))
    return square(1, t, 1) * 0 + np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.25

def alarm(dur):
    t = tt(dur); f = np.where((t * 4).astype(int) % 2 == 0, 880, 660)
    return bp(np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)), 500, 3000) * 0.35

def clang(m=60):
    """铁皮敲击：不和谐的 FM"""
    t = tt(0.9); f = mtof(m)
    return np.sin(2 * np.pi * f * t + 3 * np.exp(-t / .2) * np.sin(2 * np.pi * f * 2.76 * t)) * env(t, .001, .3) * 0.6

def static_burst(dur=0.3):
    t = tt(dur); x = noise(len(t)) * (rng.uniform(size=len(t)) > 0.7)
    return bp(x, 1000, 5000) * np.sin(np.pi * t / dur) * 0.5

def heartbeat():
    return lp(kick(70, 35, .25), 300) * 1.0

def glitch(m):
    t = tt(0.08); x = square(mtof(m), t, 8)
    x = np.round(x * 3) / 3
    return x * env(t, .001, .03) * 0.5

def dark_set(sfx, tr=0, flavor='forest'):
    """恐怖风格的一整套 22 个乐器。flavor：forest 黑森林、zombie 僵尸、virus 生化、ghost 鬼屋、fog 雾镇、shadow 影子、ultimate 大混合"""
    global rng; rng = np.random.default_rng(zlib.crc32(sfx.encode()))
    CH = [[m + tr for m in c] for c in P2_CH]; BS = [m + tr for m in P2_BASS]
    # 鼓
    b = np.zeros(N); s_ = []
    for base in (0, 8, 16, 24):
        if flavor in ('shadow', 'ghost'):
            put(b, st(base), heartbeat()); put(b, st(base) + int(.22 * SR), heartbeat() * .6)
        else:
            k1 = lp(kick(90, 38, .4), 500)
            if flavor in ('zombie', 'fog', 'ultimate'): k1 = np.tanh(k1 * 3) * .8
            put(b, st(base), k1); put(b, st(base) + int(.18 * SR), lp(kick(80, 36, .35), 400) * .6)
        s_.append(base)
    mk('kick' + sfx, s_, b, wet=.25, rv_decay=.6)
    # 沙锤
    b = np.zeros(N); s_ = []
    for s in range(0, 32, 4):
        if flavor in ('fog', 'virus'): put(b, st(s), static_burst(.12) * (1 if s % 8 == 0 else .6))
        else: put(b, st(s), bp(noise(st(.4)), 2500 if (s // 4) % 2 == 0 else 1600, 4500 if (s // 4) % 2 == 0 else 2600) * env(tt(.4)[:st(.4)], .001, .012))
        s_.append(s)
    for s in (14, 30):
        t = tt(.5); put(b, st(s), bp(noise(len(t)), 300, 900) * np.sin(np.pi * t / .5) * .25 * (1 + .5 * np.sin(2 * np.pi * 25 * t)))
    mk('shaker' + sfx, s_, b, wet=.3, rv_decay=.7)
    # 拍手
    b = np.zeros(N); s_ = [12, 28]
    for s in s_:
        if flavor in ('fog', 'ultimate'): put(b, st(s), clang(60 + tr))
        elif flavor == 'zombie': put(b, st(s), np.tanh(woodblock(300) * 4) * .6)
        else:
            t = tt(.2); put(b, st(s), (np.sin(2 * np.pi * 820 * t) * env(t, .001, .02) + bp(noise(len(t)), 2000, 5000) * env(t, .001, .015)))
    mk('clap' + sfx, [12, 15, 28, 31], delay(b, 3, .5, .6), wet=.3, rv_decay=.8)
    # 贝斯：滑音低音
    x = np.zeros(N); f = np.zeros(N)
    for h, root in enumerate(BS): f[st(h * 8):st(h * 8 + 8)] = mtof(root)
    f = np.convolve(np.concatenate([f[-2000:], f]), np.ones(2000) / 2000, 'valid')[:N]
    ph = 2 * np.pi * np.cumsum(f) / SR
    for k in range(1, 15): x += np.sin(k * ph) / k
    x = lp(x, 500) * (0.7 + 0.3 * np.sin(2 * np.pi * np.arange(N) / N * 4))
    mk('bass' + sfx, [0, 8, 16, 24], x, wet=.15)
    # 叮叮
    b = np.zeros(N); pat = [(3, 96, -30), (11, 99, 25), (19, 95, -40), (27, 92, 35)]
    for s, m, d in pat: put(b, st(s), musicbox(m + tr, d) * .6 if flavor != 'virus' else glitch(m + tr - 12))
    mk('chime' + sfx, [s for s, _, _ in pat], delay(b, 3, .5, .5), wet=.45, rv_decay=.9)
    # 呜呜：每个主题的招牌声音
    t = np.arange(N) / SR
    if flavor == 'zombie':
        b = np.zeros(N)
        for s, m in ((0, 50), (16, 47)): put(b, st(s), groan(m + tr, 7 * S16))
        w = b + lp(noise(N), 600) * .15
    elif flavor == 'virus': w = alarm(N / SR) * (0.5 + 0.5 * np.sin(2 * np.pi * t / (N / SR)))
    elif flavor in ('fog', 'ultimate'): w = siren(N / SR, 400, 800, 1 / (N / SR)) * .6 + lp(noise(N), 500) * .2
    elif flavor == 'shadow':
        w = lp(noise(N), 1200) * (t / (N / SR)) ** 3       # 越来越响的倒放感
    else:
        w = lp(noise(N), 900) * (0.5 + 0.5 * np.sin(2 * np.pi * t / (N / SR) * 2 - 1))
        w = w + np.sin(2 * np.pi * np.cumsum(330 + 120 * np.sin(2 * np.pi * t / (N / SR))) / SR) * 0.18 * (0.5 + 0.5 * np.sin(2 * np.pi * t / (N / SR) * 2))
    mk('sweep' + sfx, [0, 16], w, wet=.3, rv_decay=.9)
    # 嘀嘟
    b = np.zeros(N); pat = [(2, 60), (3, 58), (4, 56), (10, 63), (11, 63), (18, 55), (19, 54), (20, 53), (26, 66), (27, 66), (28, 66)]
    for s, m in pat: put(b, st(s), (glitch(m + tr + 12) if flavor in ('virus', 'ultimate') else blip(m + tr, .05, crush=True)) * .6)
    mk('blip' + sfx, [s for s, _ in pat], b, wet=.2)
    # 铃铃：八音盒
    b = np.zeros(N); mel = [(0, 72, 2), (2, 75, 2), (4, 79, 2), (6, 78, 2), (8, 79, 4), (12, 75, 2), (14, 74, 2), (16, 72, 2), (18, 71, 2), (20, 68, 4), (24, 67, 4), (28, 71, 4)]
    for s, m, l in mel: put(b, st(s), musicbox(m + 12 + tr, rng.uniform(-25, 25) * (2 if flavor == 'ghost' else 1)))
    mk('bells' + sfx, [s for s, _, _ in mel], b, wet=.4 if flavor != 'ghost' else .6, rv_decay=.8)
    # 嘟嘟：特雷门琴
    b = np.zeros(N); mel = [(0, 72, 75, 8), (8, 75, 72, 8), (16, 68, 71, 8), (24, 71, 67, 8)]
    up = 12 if flavor == 'ghost' else -12 if flavor == 'zombie' else 0
    for s, a_, b_, l in mel: put(b, st(s), theremin(a_ + tr + up, b_ + tr + up, l * S16 * .95))
    mk('lead' + sfx, [0, 8, 16, 24], b, wet=.4, rv_decay=.9)
    # 呼呼：风琴
    b = np.zeros(N)
    for h, c in enumerate(CH): put(b, st(h * 8), organ([m - 12 for m in c], 8 * S16) if flavor != 'virus' else supersaw([m - 12 for m in c], 8 * S16, 900) * 1.5)
    mk('pad' + sfx, [0, 8, 16, 24], b, wet=.35, rv_decay=.9)
    # 啦啦：阴森合唱
    b = np.zeros(N)
    for h, c in enumerate(CH): put(b, st(h * 8), choir([c[0] + (12 if flavor == 'ghost' else 0), c[2]], 8 * S16, 'u' if flavor != 'zombie' else 'o', vib=3, eerie=True))
    mk('choir' + sfx, [0, 8, 16, 24], b, wet=.5, rv_decay=1.0)
    # 影影
    b = np.zeros(N); s_ = [4, 12, 14, 20, 28]
    for s in s_: put(b, st(s), snap() * (1 if s != 14 else .5))
    for h, m in enumerate([40, 41, 40, 39]): put(b, st(h * 8), drone(m + tr, 7.5 * S16, dark=True))
    mk('snap' + sfx, s_, delay(b, 3, .45, .4), wet=.45, rv_decay=.9)
    new_insts(sfx, CH, BS, tr, dark=True)

dark_set('2', 0, 'forest')        # 第 3 关 黑森林
dark_set('zb', -2, 'zombie')      # 第 8 关 僵尸
dark_set('vr', 1, 'virus')        # 第 12 关 生化
dark_set('gh', 3, 'ghost')        # 第 16 关 鬼屋
dark_set('fg', -4, 'fog')         # 第 21 关 雾镇
dark_set('sd', -1, 'shadow')      # 第 28 关 影子
dark_set('ul', 0, 'ultimate')     # 第 33 关 大混合

# ---------- export ----------
import soundfile as sf
INSTS = ['kick', 'shaker', 'clap', 'bass', 'chime', 'sweep', 'blip', 'bells', 'lead', 'pad', 'choir', 'snap',
         'epiano', 'cello', 'violin', 'guitar', 'saw', 'edm', 'trap', '808', 'arp', 'vox']
def SPLIT(k):
    for i in INSTS:
        if k.startswith(i): return i, k[len(i):]
    raise ValueError(k)
out = {}
for k, v in loops.items():
    L = int(0.004 * SR)
    if abs(v[-1] - v[0]) > 0.01:
        v = v.copy(); v[:L] *= np.linspace(0, 1, L); v[-L:] *= np.linspace(1, 0, L)
    bio = io.BytesIO()
    wavfile.write(bio, SR, (v * 32767).astype(np.int16))
    if SPLIT(k)[1] in ('1', '2'): out[k] = 'data:audio/wav;base64,' + base64.b64encode(bio.getvalue()).decode()
    wavfile.write(f'build/wav/{k}.wav', SR, (v * 32767).astype(np.int16))
    inst, setname = SPLIT(k)
    os.makedirs(f'audio/loops/{setname}', exist_ok=True)
    sf.write(f'audio/loops/{setname}/{inst}.flac', v.astype(np.float32), SR, subtype='PCM_16')
json.dump({'loops': out, 'onsets': {k: v for k, v in onsets.items() if SPLIT(k)[1] in ('1', '2')}, 'bpm': BPM, 'steps': STEPS}, open('build/audio.json', 'w'))
json.dump({'bpm': BPM, 'steps': STEPS, 'onsets': onsets}, open('audio/loops/onsets.json', 'w'))
print('loops', len(out), 'json MB', round(len(json.dumps(out)) / 1e6, 2))
