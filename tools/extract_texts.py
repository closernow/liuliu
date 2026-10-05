# 从课本 PDF 提取阅读课文（字 + 拼音），输出 private/texts.json
# 现代作者的课文只放 private/（不上传）；公共领域的古诗另存 content/rap_public.json
# 用法：python tools/extract_texts.py
import fitz, glob, json, re, sys
sys.stdout.reconfigure(encoding='utf-8')

DEC = dict(zip('QWASERDFUIJKTYGHOPLMNBVC', 'āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ'))
def decode(tok): return ''.join(DEC.get(c, c) for c in tok)

CJK = re.compile(r'[一-鿿]')
PUNCT = set('，。！？：；、“”‘’…—')

# 课名、书页、要跳过的开头（作者名）、是否公共领域
LESSONS = [
    ('qiutian', '秋天', [60], '', False),
    ('jiangnan', '江南', [62], '汉乐府', True),
    ('xuedi', '雪地里的小画家', [64], '', False),
    ('siji', '四季', [66, 67], '', False),
    ('duiyunge', '对韵歌', [73], '', False),
    ('xiaoxiaodechuan', '小小的船', [84], '', False),
    ('yingzi', '影子', [86], '', False),
    ('liangjianbao', '两件宝', [88], '', False),
    ('biweiba', '比尾巴', [95, 96], '', False),
    ('wuyaheshui', '乌鸦喝水', [97, 98], '', False),
    ('yudianer', '雨点儿', [99], '', False),
]

def tokens(page):
    t = page.get_text()
    t = re.sub(r'①.*', '', t)                       # 去掉脚注
    out = []
    for tok in re.findall(r'[一-鿿]|[A-Za-zü]+|[，。！？：；、“”‘’…—]', t):
        out.append(tok)
    return out

def parse(toks):
    """把 字 拼音 字 拼音 … 配成 [(字, 拼音)]，标点单独一项"""
    items, i = [], 0
    while i < len(toks):
        t = toks[i]
        if CJK.match(t):
            py = toks[i + 1] if i + 1 < len(toks) and re.match(r'[A-Za-zü]+$', toks[i + 1]) else None
            if py: items.append((t, decode(py))); i += 2; continue
            if t == '儿' and items and items[-1][1] and items[-1][1].endswith('r'):
                items.append((t, '')); i += 1; continue
            items.append((t, None)); i += 1; continue
        if t in PUNCT: items.append((t, 'P'))
        i += 1
    return items

def sentences(items, skip, title=''):
    # 去掉没有拼音的字（标题、脚注残留），去掉开头的作者名
    items = [x for x in items if x[1] is not None]
    s = ''.join(c for c, _ in items)
    if skip and s.startswith(skip): items = items[len(skip):]
    s = ''.join(c for c, _ in items)
    # 课题出现在正文前面的（比尾巴）才去掉；《影子》正文本身就以"影子"开头，不能去
    if title in TITLE_FIRST and s.startswith(title): items = items[len(title):]
    lines, cur = [], []
    for c, p in items:
        cur.append((c, p))
        if p == 'P' and c in '。！？；' or (p == 'P' and c == '”' and len(cur) > 1 and cur[-2][0] in '。！？'):
            lines.append(cur); cur = []
    # 末尾没有句号结尾的是标题，丢掉
    # 句号后面的右引号归到上一句
    for k in range(1, len(lines)):
        while lines[k] and lines[k][0][0] == '”': lines[k - 1].append(lines[k].pop(0))
    out = []
    for ln in lines:
        while ln and ln[0][1] == 'P' and ln[0][0] not in '“': ln = ln[1:]
        if ''.join(c for c, _ in ln) in ('朗读课文。', '背诵课文。'): continue
        if not ln: continue
        # 太长的句子在逗号处切开
        chars = [x for x in ln if x[1] != 'P']
        if len(chars) > 18:
            cut = [k for k, x in enumerate(ln) if x[0] == '，' and 5 <= k <= len(ln) - 5]
            if cut:
                mid = min(cut, key=lambda k: abs(k - len(ln) / 2))
                out += [ln[:mid + 1], ln[mid + 1:]]; continue
        out.append(ln)
    return [{'t': ''.join(c for c, _ in ln), 'p': [p for c, p in ln if p != 'P']} for ln in out]

# 提取后人工修正：练习题的句子去掉，夹在中间的课题去掉
DROP = {'你喜欢哪个季节？', '仿照课文说一说。', '样爱？', '照样子做问答游戏。', '孔雀。', '说一说乌鸦是用什么办法喝着水的。'}
STRIP = {'四季谷穗': '四季', '乌鸦喝水，乌鸦把': '乌鸦喝水，'}

def fix(lines):
    out = []
    for ln in lines:
        if ln['t'] in DROP: continue
        for start, pre in STRIP.items():
            if ln['t'].startswith(start):
                n = len(CJK.findall(pre)); ln = {'t': ln['t'][len(pre):], 'p': ln['p'][n:]}
        out.append(ln)
    return out

TITLE_FIRST = {'比尾巴'}
MAXL = 7     # 最多 7 句：舞台 10 个位置，给乐手留 3 个

def merge(lines):
    # 句子太多时，把相邻最短的两句合成一句
    lines = [dict(l) for l in lines]
    while len(lines) > MAXL:
        k = min(range(len(lines) - 1), key=lambda i: len(lines[i]['p']) + len(lines[i + 1]['p']))
        lines[k:k + 2] = [{'t': lines[k]['t'] + lines[k + 1]['t'], 'p': lines[k]['p'] + lines[k + 1]['p']}]
    return lines

def main():
    f = [x for x in glob.glob('private/*.pdf') if '9787' in x][0]
    d = fitz.open(f)
    priv, pub = {}, {}
    for key, title, pages, skip, public in LESSONS:
        items = []
        for p in pages: items += parse(tokens(d[p + 4]))
        lines = merge(fix(sentences(items, skip, title)))
        (pub if public else priv)[key] = {'title': title, 'lines': lines}
        print(f'== {title} ({len(lines)} 句)')
        for ln in lines: print('  ', ln['t'], len(ln['p']))
    json.dump(priv, open('private/texts.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    json.dump(pub, open('content/rap_public.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

main()
