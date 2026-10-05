# 用法：在仓库根目录运行  python tools/gen_voice.py
# 用 edge-tts 生成读音（需要 pip install edge-tts，要联网；唱词对齐节拍需要 ffmpeg）
#   单字、拼音音节：把带调拼音交给晓晓读（家长试听过，拼音读得准，能避开多音字）
#   词语、提示语：直接给汉字
#   唱词（阅读课文、古诗）：晓伊读，再用 ffmpeg 不变调地拉伸压缩，正好占一个、两个或三个循环
#     公共领域的放 audio/voice/rap/，现代作者的课文放 private/voice/rap/（不上传）
# 已经有的文件不重新生成；想重做某个就删掉那个文件。
# 同时生成 build/voice-check.html，家长逐个试听，查读错的。
import asyncio, json, os, html, subprocess, sys
import edge_tts
sys.path.insert(0, 'tools')
from pinyin_data import mark, file_key, untone, norm

ADULT, ADULT_RATE = 'zh-CN-XiaoxiaoNeural', '-35%'
CHILD, CHILD_RATE = 'zh-CN-XiaoyiNeural', '-30%'
OUT = 'audio/voice'
LOOP = 32 * 60 / 110 / 4          # 一个循环的秒数（两小节）
code = lambda w: '-'.join(f'{ord(c):x}' for c in w)

# 游戏里的语音提示，key 对应 js 里的 say('key')
PROMPTS = {
    'hello': '把字宝宝拖到溜溜身上，听它唱歌吧！',
    'found': '找到彩蛋啦！',
    'ready': '彩蛋找够啦！点一点进化按钮。',
    'evolve': '进化啦！',
    'locked': '这一关还没打开，先在上一关多找几个彩蛋吧。',
    'soon': '这一关正在做，很快就来！',
    'dark': '天黑啦，溜溜们变样子啦！别怕，它们还是会唱歌。',
    'allfound': '这一关的彩蛋全找到啦，你真棒！',
    'last': '这是最后一关啦，回地图玩玩别的关吧。',
    'pyhello': '把声母和韵母拖到同一个溜溜身上，拼出一个音，再给它一个声调。',
    'nope': '这两个拼不到一起哦，换一个试试。',
    'tonefirst': '先拼出一个音，再给它声调。',
    'raphello': '把唱词拖到溜溜身上，按顺序排好，大家一起唱！',
    'rapall': '整首都排对啦！大家一起唱一遍！',
    'local': '这一课的课文只在家里的电脑上有。',
    'recready': '按住大红键，开始录音，说完松开。',
    'recok': '录好啦！',
    'mixhello': '全书大混音！学过的字、音节、唱词，都拿来玩吧！',
}
# 乐手的名字，长按乐手时读
NAMES = {'dong': '咚咚', 'cha': '嚓嚓', 'papa': '啪啪', 'beng': '嘣嘣', 'ding': '叮叮', 'wuwu': '呜呜', 'didu': '嘀嘟',
         'ling': '铃铃', 'dudu': '嘟嘟', 'huhu': '呼呼', 'lala': '啦啦', 'ying': '影影',
         'dang': '当当', 'weng': '嗡嗡', 'you': '悠悠', 'zheng': '铮铮', 'zizi': '滋滋', 'dongci': '动次', 'dada': '哒哒',
         'hong': '轰轰', 'jiu': '啾啾', 'hei': '嘿嘿',
         'dada2': '嗒嗒', 'gudong': '咕咚', 'dingdang': '叮当', 'puca': '噗嚓', 'xiuxiu': '咻咻', 'wawa': '哇哇', 'kaka': '咔咔',
         'dongda': '咚哒', 'bengcha': '嘣嚓', 'tongtong': '嗵嗵', 'qiangqiang': '锵锵', 'pada': '啪嗒', 'dida': '嘀嗒', 'dongqiang': '咚锵',
         'dingdong': '叮咚', 'gulu': '咕噜', 'baba': '叭叭', 'dengdeng': '噔噔', 'bibi': '哔哔', 'pengpeng': '嘭嘭', 'heiha': '嘿哈',
         'bobo': '啵啵', 'gege': '咯咯', 'wengwu': '嗡呜', 'dongba': '咚吧', 'guagua': '刮刮', 'miaomiao': '喵喵', 'wangwang': '汪汪'}
PROMPTS.update({'n_' + k: v for k, v in NAMES.items()})

sem = None
# 单独的 i u ü 晓晓读不出来，用同音的 yi wu yu 代替
LONE_U = {'ǖ': 'yū', 'ǘ': 'yú', 'ǚ': 'yǔ', 'ǜ': 'yù', 'ī': 'yī', 'í': 'yí', 'ǐ': 'yǐ', 'ì': 'yì', 'ū': 'wū', 'ú': 'wú', 'ǔ': 'wǔ', 'ù': 'wù'}

async def tts(text, path, voice=ADULT, rate=ADULT_RATE):
    if os.path.exists(path) and os.path.getsize(path) > 1000: return 0
    text = LONE_U.get(text, text)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    async with sem:
        for attempt in range(4):
            try:
                await edge_tts.Communicate(text, voice, rate=rate).save(path)
                if os.path.getsize(path) > 1000: return 1
                os.remove(path); raise RuntimeError('empty audio')
            except Exception as e:
                if attempt == 3: print('FAIL', text, e)
                await asyncio.sleep(3)
    return 0

def duration(path):
    r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path], capture_output=True, text=True)
    return float(r.stdout.strip() or 0)

# 多音字：读给 edge-tts 时换成同音字，免得读错（只影响朗读，屏幕上显示的还是原字）
TTS_FIX = {'曲项': '区项', '花还在': '花孩在', '背上小书包': '杯上小书包'}

async def rap_line(text, path):
    """唱词：先生成，再拉伸压缩到正好一个、两个或三个循环"""
    if os.path.exists(path): return 0
    for a, b in TTS_FIX.items(): text = text.replace(a, b)
    raw = path[:-4] + '.raw.mp3'
    await tts(text, raw, CHILD, CHILD_RATE)
    if not os.path.exists(raw): return 0
    d = duration(raw)
    loops = 1 if d <= LOOP * 1.2 else 2 if d <= LOOP * 2.3 else 3
    tempo = min(1.6, max(0.85, d / (loops * LOOP * 0.9)))
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', raw, '-filter:a', f'atempo={tempo:.3f}', '-b:a', '64k', path], check=True)
    os.remove(raw)
    return 1

async def main():
    global sem
    sem = asyncio.Semaphore(8)
    data = json.load(open('content/stages.json', encoding='utf-8'))
    lessons = json.load(open('content/lessons.json', encoding='utf-8'))['lessons']
    # 课本里出现过的音节：检查清单只列这些（全部 1000 多个太多）
    book = set()
    for L in lessons:
        for py in L.get('syllables', []):
            s, t = untone(py); book.add(file_key(norm(s), t))
    rows, jobs, seen = [], [], set()
    def add(group, label, py, path, make, show=True):
        if path in seen: return
        seen.add(path); jobs.append(make()); rows.append((group, label, py, path, show))
    for stg in data['stages']:
        g = f"第{stg['id']}关 {stg['lesson']}"
        for ch, py in stg.get('chars', []):
            p = f'{OUT}/z/{code(ch)}.mp3'; add(g, ch, py, p, lambda py=py, p=p: tts(py, p))
        if stg['type'] == 'pinyin':
            for syl in stg['valid']:
                for t in (1, 2, 3, 4):
                    p = f'{OUT}/p/{file_key(syl, t)}.mp3'
                    add(g, mark(syl, t), '', p, lambda s=mark(syl, t), p=p: tts(s, p), file_key(syl, t) in book)
        for e in stg.get('eggs', []):
            if 'kind' in e: continue
            p = f'{OUT}/w/{code(e["w"])}.mp3'; add(g, e['w'], e['p'], p, lambda w=e['w'], p=p: tts(w, p))
    # 唱词
    for f, base in (('content/rap_public.json', 'audio/voice/rap'), ('private/texts.json', 'private/voice/rap')):
        if not os.path.exists(f): continue
        for k, v in json.load(open(f, encoding='utf-8')).items():
            for i, ln in enumerate(v['lines']):
                p = f'{base}/{k}/{i}.mp3'; add('唱词 ' + v['title'], ln['t'], ' '.join(ln['p']), p, lambda t=ln['t'], p=p: rap_line(t, p))
    # 声母、韵母的读法（点图标时读）
    SM = {'b': 'bō', 'p': 'pō', 'm': 'mō', 'f': 'fō', 'd': 'dē', 't': 'tē', 'n': 'nē', 'l': 'lē', 'g': 'gē', 'h': 'hē', 'j': 'jī', 'q': 'qī', 'x': 'xī',
          'zh': 'zhī', 'ch': 'chī', 'sh': 'shī', 'r': 'rì', 'z': 'zī', 'c': 'cī', 's': 'sī', 'y': 'yī', 'w': 'wū'}
    YM = {'a': 'ā', 'o': 'ō', 'e': 'ē', 'i': 'yī', 'u': 'wū', 'ü': 'yū', 'ai': 'āi', 'ei': 'ēi', 'ui': 'wēi', 'ao': 'āo', 'ou': 'ōu', 'iu': 'yōu',
          'ie': 'yē', 'üe': 'yuē', 'er': 'ér', 'an': 'ān', 'en': 'ēn', 'in': 'yīn', 'un': 'wēn', 'ün': 'yūn', 'ang': 'āng', 'eng': 'ēng', 'ing': 'yīng', 'ong': 'ōng'}
    for k, t in SM.items():
        p = f'{OUT}/sm/{k}.mp3'; add('声母', k, t, p, lambda t=t, p=p: tts(t, p))
    for k, t in YM.items():
        p = f'{OUT}/ym/{k.replace("ü", "v")}.mp3'; add('韵母', k, t, p, lambda t=t, p=p: tts(t, p), False)
    for k, t in PROMPTS.items():
        p = f'{OUT}/ui/{k}.mp3'; add('提示语', t, '', p, lambda t=t, p=p: tts(t, p))
    n = sum(await asyncio.gather(*jobs))
    os.makedirs('build', exist_ok=True)
    out = ['<!doctype html><meta charset=utf-8><title>读音检查</title><style>body{font:16px sans-serif;max-width:860px;margin:20px auto;padding:0 16px;background:#fff;color:#222}td{padding:4px 8px;border-bottom:1px solid #ddd}.c{font-size:22px}h2{margin-top:28px}</style>',
           '<h1>读音检查</h1><p>逐个点播放，读错的记下来告诉 Claude。拼音音节只列课本里出现过的，其余是程序按规则拼出来的，抽查即可。唱词要用本地预览打开才有声音。</p><table>']
    cur = None
    for g, w, py, p, show in rows:
        if not show: continue
        if g != cur: out.append(f'</table><h2>{html.escape(g)}</h2><table>'); cur = g
        out.append(f'<tr><td class=c>{html.escape(w)}</td><td>{html.escape(py)}</td><td><audio controls preload=none src="../{p}"></audio></td></tr>')
    out.append('</table>')
    open('build/voice-check.html', 'w', encoding='utf-8').write(''.join(out))
    print('new files', n, 'total', len(rows))

asyncio.run(main())
