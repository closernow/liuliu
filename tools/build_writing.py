# 写字表（课本第 108 页，100 个字）→ content/writing.json，并下载每个字的笔画数据到 content/strokes/
# 笔画数据来自 hanzi-writer-data（Make Me a Hanzi，Arphic Public License），见 content/strokes/LICENSE.txt
# 用法：python tools/build_writing.py   （要联网；已经下载的不重下）
import fitz, glob, json, os, re, sys, urllib.request, urllib.parse
sys.stdout.reconfigure(encoding='utf-8')
DEC = dict(zip('QWASERDFUIJKTYGHOPLMNBVC', 'āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ'))

# 课本写字表，按课分组；stage 是学完游戏第几关后可以写（语文园地跟在那个单元最后一关后面）
GROUPS = [
    ('识字 2 金木水火土', 2, '一二三上'), ('识字 3 口耳目手足', 3, '口耳目手'), ('识字 4 日月山川', 4, '日火田禾'),
    ('语文园地一', 4, '六七八十'), ('语文园地二', 8, '九王'), ('语文园地三', 13, '午下'), ('语文园地四', 18, '个去'),
    ('阅读 1 秋天', 19, '了子大人'), ('阅读 2 江南', 20, '可叶东西'), ('阅读 3 雪地里的小画家', 21, '竹马牙用几'),
    ('阅读 4 四季', 22, '四小鸟是天'), ('语文园地五', 22, '女开关先'),
    ('识字 5 对韵歌', 23, '云雨虫山水'), ('识字 6 日月明', 24, '力男土木心'), ('识字 7 小书包', 25, '尺本刀不少'),
    ('识字 8 升国旗', 26, '中五风立正'), ('语文园地六', 26, '工厂门卫'),
    ('阅读 5 小小的船', 27, '月儿头里见'), ('阅读 6 影子', 28, '在我左右'), ('阅读 7 两件宝', 29, '和也又才'),
    ('语文园地七', 29, '爸妈'), ('阅读 8 比尾巴', 30, '比巴长公'), ('阅读 9 乌鸦喝水', 31, '只多办石出'),
    ('阅读 10 雨点儿', 32, '来半你有'), ('语文园地八', 32, '牛羊爪白'),
]

def pinyin_map():
    f = [x for x in glob.glob('private/*.pdf') if '9787' in x][0]
    t = fitz.open(f)[112].get_text()
    toks = re.findall(r'[一-鿿]|[A-Za-zü]+', t)
    out = {}
    for a, b in zip(toks, toks[1:]):
        if re.match(r'[一-鿿]', a) and re.match(r'[A-Za-zü]+$', b): out.setdefault(a, ''.join(DEC.get(c, c) for c in b))
    return out

def main():
    py = pinyin_map()
    os.makedirs('content/strokes', exist_ok=True)
    groups, n = [], 0
    for title, stage, chars in GROUPS:
        items = []
        for c in chars:
            items.append([c, py.get(c, '')])
            path = f'content/strokes/{ord(c):x}.json'
            if not os.path.exists(path):
                url = 'https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0.1/' + urllib.parse.quote(c) + '.json'
                data = urllib.request.urlopen(url, timeout=30).read()
                open(path, 'wb').write(data); n += 1
        groups.append({'title': title, 'stage': stage, 'chars': items})
    total = sum(len(g['chars']) for g in groups)
    json.dump({'note': '课本写字表（第 108 页），共 100 个字。stage：学完第几关后可以写。', 'groups': groups},
              open('content/writing.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    missing = [c for g in groups for c, p in g['chars'] if not p]
    print('chars', total, 'downloaded', n, 'no pinyin', missing)

main()
