# 溜溜消消乐：生成拼音单元 14 课的关卡（每课 3 关），写进 content/match_levels.json（插在识字 4 后面，重跑会替换掉旧的拼音课）
# 用法：python tools/build_match_pinyin.py
# 方块：声母（sm）、韵母（ym）、整体认读音节（zt:读音文件）；第 1、2 课只有单韵母，方块是带声调的 ā á ǎ à（yd:读音文件），练听声调。
# 拼音魔法：魔法瓶满了，把能拼成课本音节的声母和韵母换到一起。只用两拼（三拼 gua 这种不放），整体认读音节是整块，不拆；声母没有 k。
import json, os, random, sys
sys.path.insert(0, os.path.dirname(__file__))
from pinyin_data import mark, file_key, untone, norm

stages = {s['id']: s for s in json.load(open('content/stages.json', encoding='utf-8'))['stages']}
book = [L for L in json.load(open('content/lessons.json', encoding='utf-8'))['lessons'] if 'new' in L]
rnd = random.Random(7)

# 障碍轮着用；第 1 关不放障碍，换个棋盘形状
BOARDS = {
    'plain': [["#......#", "........", "........", "........", "........", "........", "........", "#......#"],
              ["##....##", "#......#", "........", "........", "........", "........", "#......#", "##....##"],
              ["........", "........", "........", "...##...", "...##...", "........", "........", "........"]],
    'ice': ["........", "........", "..iiii..", "..iIIi..", "..iIIi..", "..iiii..", "........", "........"],
    'crate': ["........", "........", "........", "........", "........", "........", "c..cc..c", "cc.cc.cc"],
    'lock': ["........", ".L....L.", "..L..L..", "........", "........", "..L..L..", ".L....L.", "........"],
    'mud': ["........", "........", "........", "...##...", "........", "........", "mm....mm", "mmm..mmm"],
    'drop': ["..d..d..", "........", "#......#", "#......#", "........", "........", "........", "........"],
}
OBST = ['ice', 'crate', 'lock', 'mud', 'drop']
STARS = [[8000, 16000, 26000], [9000, 18000, 28000], [10000, 20000, 30000]]

def obstacle_goal(o):
    return {'type': 'drop', 'n': 2} if o == 'drop' else {'type': o}

def book_tone(lesson, syl):   # 课本里这个音节标的是第几声，没有就读第一声
    for py in lesson.get('syllables', []):
        s, t = untone(py)
        if norm(s) == syl: return t or 1
    return 1

def pick_kinds(must, cands, valid, sh, avoid=()):
    kinds = list(must)
    pairs = lambda ks: sum(1 for a in ks for b in ks if a in sh and b not in sh and a + b in valid)
    while len(kinds) < 6:
        rest = [c for c in cands if c not in kinds]
        if not rest: break
        best = max(rest, key=lambda c: (pairs(kinds + [c]) - pairs(kinds), c not in avoid, rnd.random()))
        kinds.append(best)
    return kinds

lessons = []
for n, L in enumerate(book, 1):
    st = stages[n + 4]
    out = {'id': f'p{n}', 'unit': '拼音', 'no': n, 'title': st['lesson'], 'type': 'pinyin'}
    obst = [OBST[(n * 2) % 5], OBST[(n * 2 + 1) % 5]]
    if not st['sheng']:   # 第 1、2 课：单韵母和四个声调
        v = st['yun']
        sets = [[(v[0], t) for t in (1, 2, 3, 4)] + [(v[1], 1), (v[1], 3)],
                [(v[1], t) for t in (1, 2, 3, 4)] + [(v[2], 1), (v[2], 3)],
                [(v[0], 1), (v[0], 3), (v[1], 2), (v[1], 4), (v[2], 1), (v[2], 4)]]
        chars = [[mark(x, t), 'yd:' + file_key(x, t)] for x in v for t in (1, 2, 3, 4)]
        idx = {c[0]: i for i, c in enumerate(chars)}
        out.update(chars=chars, words=[], say={})
        goals = [[{'type': 'listen', 'n': 3}], [{'type': 'listen', 'n': 4}, obstacle_goal(obst[0])], [{'type': 'listen', 'n': 4}, obstacle_goal(obst[1])]]
        boards = [BOARDS['plain'][n % 3], BOARDS[obst[0]], BOARDS[obst[1]]]
        out['levels'] = [{'use': [idx[mark(x, t)] for x, t in s], 'moves': 20 + 2 * i, 'goals': goals[i], 'stars': STARS[i], 'board': boards[i]} for i, s in enumerate(sets)]
        lessons.append(out); continue
    sh, yun, valid = st['sheng'], st['yun'], set(st['valid'])
    whole = L.get('whole', [])
    new = [x for x in L['new']]
    cands = sh + yun
    k1 = pick_kinds(new[:4], cands, valid, sh)
    k2 = pick_kinds(new[-4:], cands, valid, sh, avoid=set(k1) - set(new))   # 新学的超过 4 个（an en in un ün），第 2 关用后 4 个
    k3 = (whole[:3] + pick_kinds(new[:3], cands, valid, sh))[:6] if whole else pick_kinds(new[-2:], cands, valid, sh, avoid=set(k1))
    allk = list(dict.fromkeys(k1 + k2 + k3))
    chars = [[x, 'sm' if x in sh else ('zt:' + file_key(x, 1)) if x in whole else 'ym'] for x in allk]
    idx = {c[0]: i for i, c in enumerate(chars)}
    words, say = [], {}
    for a in sh:
        for b in yun:
            if a + b in valid and a in allk and b in allk:
                w = f'{a}+{b}'; t = book_tone(L, a + b); words.append(w); say[w] = [mark(a + b, t), file_key(a + b, t)]
    out.update(chars=chars, words=words, say=say)
    nw = lambda ks: sum(1 for w in words if all(p in ks for p in w.split('+')))
    lv = []
    for i, ks in enumerate([k1, k2, k3]):
        learn = {'type': 'word', 'n': 2} if i > 0 and nw(ks) >= 2 else {'type': 'listen', 'n': 3 if i == 0 else 4}
        if i == 0: g, b = [{'type': 'collect', 'ch': new[0], 'n': 10}, learn], BOARDS['plain'][n % 3]
        else: g, b = [obstacle_goal(obst[i - 1]), learn], BOARDS[obst[i - 1]]
        if i == 2 and learn['type'] == 'word': g.append({'type': 'listen', 'n': 3})
        lv.append({'use': [idx[x] for x in ks], 'moves': 20 + 2 * i + (2 if len(g) > 2 else 0), 'goals': g, 'stars': STARS[i], 'board': b})
    out['levels'] = lv
    lessons.append(out)

# 写回：去掉旧的拼音课，插在识字 4 后面；格式和手写的一样（一课一段，一关两行）
data = json.load(open('content/match_levels.json', encoding='utf-8'))
keep = [x for x in data['lessons'] if x.get('type') != 'pinyin']
at = next(i for i, x in enumerate(keep) if x['id'] == 4) + 1
data['lessons'] = keep[:at] + lessons + keep[at:]
d = lambda o: json.dumps(o, ensure_ascii=False)
rows = []
for ls in data['lessons']:
    head = {k: v for k, v in ls.items() if k != 'levels'}
    lv = ',\n'.join(f'        {{ {d({k: v for k, v in l.items() if k != "board"})[1:-1]},\n          "board": {d(l["board"])} }}' for l in ls['levels'])
    rows.append(f'    {{ {d(head)[1:-1]},\n      "levels": [\n{lv}\n      ] }}')
open('content/match_levels.json', 'w', encoding='utf-8').write('{\n  "note": ' + d(data['note']) + ',\n  "lessons": [\n' + ',\n'.join(rows) + '\n  ]\n}\n')
for ls in lessons:
    print(ls['id'], ls['title'], [[ls['chars'][u][0] for u in l['use']] for l in ls['levels']], len(ls['words']), [g['type'] for l in ls['levels'] for g in l['goals']])
