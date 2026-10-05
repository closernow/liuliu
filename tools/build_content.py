# 生成第 5 到 33 关的关卡内容，写进 content/stages.json（第 1 到 4 关保持手写的不动）
# 用法：python tools/build_content.py
import json, sys
sys.path.insert(0, 'tools')
from pinyin_data import *

lessons = {str(l['no']): l for l in json.load(open('content/lessons.json', encoding='utf-8'))['lessons']}
data = json.load(open('content/stages.json', encoding='utf-8'))
stages = [s for s in data['stages'] if s['id'] <= 4]
MAXT = 20      # 图标栏里拼音零件最多几个

def syl_of(py):
    s, t = untone(py)
    return norm(s), t

def parts_of(syl):
    sp = split(syl)
    if sp[0] == 'whole': return set(), set(), {syl}
    sh, ys = sp
    return ({sh} if sh else set()), set(ys), set()

def egg(w, p):
    return {'w': w, 'p': p, 'syl': [list(syl_of(x)) for x in p.split()]}

# ---------- 拼音关 ----------
# 关号 -> (课号, 风格, 彩蛋)
PINYIN = {
    5: ('1', 'ocean', [egg('鹅', 'é'), egg('饿', 'è'), egg('啊', 'ā'), egg('哦', 'ó')]),
    6: ('2', 'ocean', [{'w': '衣', 'p': 'ī', 'syl': [['i', 1]]}, {'w': '五', 'p': 'ǔ', 'syl': [['u', 3]]}, {'w': '鱼', 'p': 'ǘ', 'syl': [['ü', 2]]}, {'w': '雨', 'p': 'ǚ', 'syl': [['ü', 3]]}]),
    7: ('3', 'ocean', [egg('爸爸', 'bà ba'), egg('妈妈', 'mā ma'), egg('爬坡', 'pá pō'), egg('木马', 'mù mǎ')]),
    8: ('4', 'zombie', [egg('大地', 'dà dì'), egg('马路', 'mǎ lù'), egg('泥土', 'ní tǔ'), egg('弟弟', 'dì di')]),
    9: ('5', 'ocean', [egg('哥哥', 'gē ge'), egg('弟弟', 'dì di'), egg('画画', 'huà huà'), egg('荷花', 'hé huā')]),
    10: ('6', 'ocean', [egg('打鼓', 'dǎ gǔ'), egg('下棋', 'xià qí'), egg('搭积木', 'dā jī mù'), egg('西瓜', 'xī guā')]),
    11: ('7', 'ocean', [egg('字', 'zì'), egg('词', 'cí'), egg('句子', 'jù zi'), egg('四', 'sì')]),
    12: ('8', 'virus', [egg('擦桌子', 'cā zhuō zi'), egg('折纸', 'zhé zhǐ'), egg('读书', 'dú shū'), egg('吃', 'chī')]),
    13: ('9', 'space', [egg('鱼', 'yú'), egg('鸭子', 'yā zi'), egg('乌鸦', 'wū yā'), egg('蚂蚁', 'mǎ yǐ')]),
    14: ('10', 'space', [egg('白菜', 'bái cài'), egg('西瓜', 'xī guā'), egg('水果', 'shuǐ guǒ'), egg('萝卜', 'luó bo')]),
    15: ('11', 'space', [egg('小桥', 'xiǎo qiáo'), egg('流水', 'liú shuǐ'), egg('垂柳', 'chuí liǔ'), egg('桃花', 'táo huā')]),
    16: ('12', 'ghost', [egg('雪花飘', 'xuě huā piāo'), egg('夜色美', 'yè sè měi'), egg('学', 'xué'), egg('姐姐', 'jiě jie')]),
    17: ('13', 'space', [egg('蓝天', 'lán tiān'), egg('白云', 'bái yún'), egg('草原', 'cǎo yuán'), egg('森林', 'sēn lín')]),
    18: ('14', 'space', [egg('游泳', 'yóu yǒng'), egg('滑冰', 'huá bīng'), egg('骑自行车', 'qí zì xíng chē'), egg('打乒乓球', 'dǎ pīng pāng qiú')]),
}
learned_sh, learned_yun, learned_whole = set(), set(), set()
for sid, (no, style, eggs) in PINYIN.items():
    L = lessons[no]
    new = L.get('new', [])
    learned_sh |= {x for x in new if x in SHENG_ALL}
    learned_yun |= {x for x in new if x in YUN_ALL}
    learned_whole |= set(L.get('whole', []))
    sh, yun, wh = set(), set(), set()
    # 新学的一定在；彩蛋要用的一定在
    sh |= {x for x in new if x in SHENG_ALL}; yun |= {x for x in new if x in YUN_ALL}; wh |= set(L.get('whole', []))
    for e in eggs:
        for syl, t in e['syl']:
            if sid <= 6: yun.add(syl); continue
            a, b, c = parts_of(syl); sh |= a; yun |= b; wh |= c
    # 再从课本这一课的音节里补零件，直到图标栏够用
    for py in L.get('syllables', []):
        if len(sh) + len(yun) + len(wh) >= MAXT: break
        syl, _ = syl_of(py)
        try: a, b, c = parts_of(syl)
        except ValueError: continue          # 课本声母表没有 k，带 k 的音节跳过
        sh |= a; yun |= b; wh |= c
    # 能拼出来的所有音节
    valid = set(wh)
    if sid <= 6: valid |= yun
    else: valid |= {y for y in yun if y in ALONE}
    for s in sh:
        for y in yun:
            if s + y in VALID: valid.add(s + y)
            for y2 in yun:
                if (y, y2) in THREE and s + y + y2 in VALID: valid.add(s + y + y2)
    for e in eggs:
        for syl, t in e['syl']: assert syl in valid, (sid, e['w'], syl)
    order = lambda xs, ref: sorted(xs, key=lambda x: ref.index(x))
    stages.append({'id': sid, 'lesson': L['title'], 'unit': f'汉语拼音 {no}', 'type': 'pinyin', 'style': style,
                   'sheng': order(sh, SHENG_ALL), 'yun': order(yun, YUN_ALL), 'whole': order(wh, WHOLE_ALL),
                   'valid': sorted(valid), 'eggs': eggs})

# ---------- 识字二（第 23 到 26 关） ----------
def chars(s, pys): return [[c, p] for c, p in zip(s, pys.split())]
SHIZI2 = [
    (23, '对韵歌', '第六单元·识字 5', chars('对歌雨风虫清绿桃红', 'duì gē yǔ fēng chóng qīng lǜ táo hóng'),
     [{'w': '风雨', 'p': 'fēng yǔ'}, {'w': '清风', 'p': 'qīng fēng'}, {'w': '桃红', 'p': 'táo hóng'}, {'w': '对歌', 'p': 'duì gē'}]),
    (24, '日月明', '第六单元·识字 6', chars('力尖尘众双林森不条心金日月明木人', 'lì jiān chén zhòng shuāng lín sēn bù tiáo xīn jīn rì yuè míng mù rén'),
     [{'w': '日月明', 'p': 'rì yuè míng'}, {'w': '双木林', 'p': 'shuāng mù lín'}, {'w': '众人', 'p': 'zhòng rén'}, {'w': '森林', 'p': 'sēn lín'}]),
    (25, '小书包', '第六单元·识字 7', chars('包尺作业笔刀宝贝少课早小书本', 'bāo chǐ zuò yè bǐ dāo bǎo bèi shǎo kè zǎo xiǎo shū běn'),
     [{'w': '作业', 'p': 'zuò yè'}, {'w': '宝贝', 'p': 'bǎo bèi'}, {'w': '书包', 'p': 'shū bāo'}, {'w': '课本', 'p': 'kè běn'}]),
    (26, '升国旗', '第六单元·识字 8', chars('升国旗中们声起多么向立', 'shēng guó qí zhōng men shēng qǐ duō me xiàng lì'),
     [{'w': '国旗', 'p': 'guó qí'}, {'w': '升旗', 'p': 'shēng qí'}, {'w': '中国', 'p': 'zhōng guó'}, {'w': '多么', 'p': 'duō me'}]),
]
for sid, lesson, unit, cs, eggs in SHIZI2:
    stages.append({'id': sid, 'lesson': lesson, 'unit': unit, 'type': 'shizi', 'style': 'campus', 'chars': cs, 'eggs': eggs})

# ---------- 阅读和古诗：rap 模式 ----------
# public=True 的课文在 content/rap_public.json（公共领域），其余在 private/texts.json（只在本机）
RAP = [(19, 'qiutian', '秋天', 'season', False), (20, 'jiangnan', '江南', 'season', True), (21, 'xuedi', '雪地里的小画家', 'fog', False),
       (22, 'siji', '四季', 'season', False), (27, 'xiaoxiaodechuan', '小小的船', 'night', False), (28, 'yingzi', '影子', 'shadow', False),
       (29, 'liangjianbao', '两件宝', 'night', False), (30, 'biweiba', '比尾巴', 'night', False), (31, 'wuyaheshui', '乌鸦喝水', 'night', False),
       (32, 'yudianer', '雨点儿', 'night', False)]
for sid, key, lesson, style, public in RAP:
    stages.append({'id': sid, 'lesson': lesson, 'unit': '阅读', 'type': 'rap', 'style': style, 'text': key, 'public': public,
                   'eggs': [{'w': '前两句排对', 'kind': 'first2'}, {'w': '前一半排对', 'kind': 'half'}, {'w': '整首排对', 'kind': 'all'}, {'w': '录一句自己的声音', 'kind': 'rec'}]})

# ---------- 第 33 关：全书大混音 ----------
stages.append({'id': 33, 'lesson': '全书大混音', 'unit': '综合', 'type': 'mix', 'style': 'ultimate'})

# ---------- 彩蛋关：语文园地里的古诗和绕口令（公共领域，网上也能玩） ----------
# after：学完第几关后打开
BONUS = [(101, 'yong-e', '咏鹅', 'shanchuan', 4), (102, 'hua', '画', 'wuxing', 8), (103, 'si-shi-si', '绕口令', 'campus', 12),
         (104, 'min-nong', '悯农', 'season', 18), (105, 'gu-lang-yue-xing', '古朗月行', 'night', 26)]
for sid, key, lesson, style, after in BONUS:
    stages.append({'id': sid, 'lesson': lesson, 'unit': '语文园地', 'type': 'rap', 'style': style, 'text': key, 'public': True, 'bonus': True, 'after': after,
                   'eggs': [{'w': '前两句排对', 'kind': 'first2'}, {'w': '前一半排对', 'kind': 'half'}, {'w': '整首排对', 'kind': 'all'}, {'w': '录一句自己的声音', 'kind': 'rec'}]})

stages.sort(key=lambda s: s['id'])
data['stages'] = stages
json.dump(data, open('content/stages.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
for s in stages:
    if s['type'] == 'pinyin': print(s['id'], s['lesson'], len(s['sheng']) + len(s['yun']) + len(s['whole']), 'tiles', len(s['valid']), 'syllables')
print('stages', len(stages))
