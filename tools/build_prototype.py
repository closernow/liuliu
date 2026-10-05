# 用法：在仓库根目录运行
#   python tools/render_loops.py      生成 build/audio.json 和 build/wav/
#   python tools/build_prototype.py   生成 build/yindou-band-v3.html
import json, os
os.makedirs('build', exist_ok=True)
tpl = open('prototype/yindou-band-v3-template.html', encoding='utf-8').read()
audio = json.load(open('build/audio.json'))
open('build/yindou-band-v3.html', 'w', encoding='utf-8').write(tpl.replace('__AUDIO_JSON__', json.dumps(audio)))
print('build/yindou-band-v3.html ready')
