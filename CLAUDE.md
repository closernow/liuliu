# 给 Claude Code 的说明

这是给我女儿（一年级）做的语文学习游戏"溜溜"，Sprunki 式混音玩法，覆盖整本一年级上册语文（拼音、识字、儿歌）。角色家族叫"音豆"。

开始任何工作前先读 docs/DESIGN.md，那是唯一的设计依据。课本内容在 content/lessons.json 和 content/poems.json，课本 PDF 放在 private/ 目录（已加入 .gitignore，不提交，因为网站公开）。完整课本请家长另放一份到 private/。

## 工作规则
- 先讨论设计，我说开始再写代码
- 回答用中文，简洁直接，不要客套
- 设计有变化时同步更新 docs/DESIGN.md
- 角色和声音全部原创，不复刻 Sprunki 或任何版权角色的外形和声音
- 内容严格跟课本：整体认读音节不拆拼，声母不含 k
- 现代作者的儿歌课文全文不进仓库（网站公开）

## 常用命令
- 生成音效：python tools/render_loops.py （需要 numpy、scipy）
- 生成原型：python tools/build_prototype.py ，输出 build/yindou-band-v3.html
- 本地预览：python -m http.server ，用浏览器打开

## 部署
GitHub Pages，main 分支根目录。build/ 里的临时文件不提交，正式版的音频放在 audio/ 目录。
