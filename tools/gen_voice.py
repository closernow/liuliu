# 用法：在仓库根目录运行  python tools/gen_voice.py
# 用 edge-tts 生成读音（需要 pip install edge-tts，要联网）
#   单字：把带调拼音交给晓晓读（家长试听过，拼音读得准，能避开多音字）
#   词语、提示语：直接给汉字
# 输出 audio/voice/，已经有的文件不重新生成；想重做某个就删掉那个文件。
# 同时生成 build/voice-check.html，家长逐个试听，查读错的。
import asyncio, json, os, html
import edge_tts

VOICE, RATE = 'zh-CN-XiaoxiaoNeural', '-35%'
OUT = 'audio/voice'
code = lambda w: '-'.join(f'{ord(c):x}' for c in w)

# 游戏里的语音提示，key 对应 js 里的 say('key')
PROMPTS = {
    'hello': '把字宝宝拖到音豆身上，听它唱歌吧！',
    'found': '找到彩蛋啦！',
    'ready': '彩蛋找够啦！点一点进化按钮。',
    'evolve': '进化啦！',
    'full': '台上站满啦，先点小叉叉，请一个音豆下台吧。',
    'locked': '这一关还没打开，先在上一关多找几个彩蛋吧。',
    'soon': '这一关正在做，很快就来！',
    'dark': '天黑啦，音豆们变样子啦！别怕，它们还是会唱歌。',
    'allfound': '这一关的彩蛋全找到啦，你真棒！',
    'last': '前面的关卡正在做，先回地图玩玩别的关吧。',
}
# 乐手的名字，长按乐手时读
NAMES = {'dong': '咚咚', 'cha': '嚓嚓', 'papa': '啪啪', 'beng': '嘣嘣', 'ding': '叮叮', 'wuwu': '呜呜', 'didu': '嘀嘟',
         'ling': '铃铃', 'dudu': '嘟嘟', 'huhu': '呼呼', 'lala': '啦啦', 'ying': '影影'}
PROMPTS.update({'n_' + k: v for k, v in NAMES.items()})

async def tts(text, path):
    if os.path.exists(path): return False
    os.makedirs(os.path.dirname(path), exist_ok=True)
    await edge_tts.Communicate(text, VOICE, rate=RATE).save(path)
    return True

async def main():
    data = json.load(open('content/stages.json', encoding='utf-8'))
    rows, n = [], 0
    for stg in data['stages']:
        for ch, py in stg['chars']:
            p = f'{OUT}/z/{code(ch)}.mp3'; n += await tts(py, p); rows.append((stg['lesson'], ch, py, p))
        for e in stg['eggs']:
            p = f'{OUT}/w/{code(e["w"])}.mp3'; n += await tts(e['w'], p); rows.append((stg['lesson'], e['w'], e['p'], p))
    for k, t in PROMPTS.items():
        p = f'{OUT}/ui/{k}.mp3'; n += await tts(t, p); rows.append(('提示语', t, '', p))
    os.makedirs('build', exist_ok=True)
    out = ['<!doctype html><meta charset=utf-8><title>读音检查</title><style>body{font:16px sans-serif;max-width:760px;margin:20px auto;padding:0 16px;background:#fff;color:#222}td{padding:4px 8px;border-bottom:1px solid #ddd}.c{font-size:26px}</style>',
           '<h1>读音检查</h1><p>逐个点播放，读错的记下来告诉 Claude。</p><table>']
    for les, w, py, p in rows:
        out.append(f'<tr><td>{html.escape(les)}</td><td class=c>{html.escape(w)}</td><td>{py}</td><td><audio controls preload=none src="../{p}"></audio></td></tr>')
    out.append('</table>')
    open('build/voice-check.html', 'w', encoding='utf-8').write(''.join(out))
    print('new files', n, 'total', len(rows))

asyncio.run(main())
