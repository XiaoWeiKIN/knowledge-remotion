# knowledge-remotion

把一篇文档做成程序绘制的竖屏知识科普短片。每一期是一份场景代码，旁白逐句配音，画面按录音长度自动排节奏。

## 安装

    npm install
    python3 -m venv tools/venv && tools/venv/bin/pip install edge-tts

渲染需要无头浏览器：首次运行会自动下载，或用环境变量 `REMOTION_BROWSER_EXECUTABLE` 指向已有的
chrome-headless-shell。ffmpeg 随 `npm install` 装在 node_modules 里。

## 做一期

做法和要求写在 [.claude/skills/explainer-director/SKILL.md](.claude/skills/explainer-director/SKILL.md)，先读它。

    node tools/render.mjs gs-paradox --stills 150,900 --scale 0.5
    node tools/narration.mjs gs-paradox
    python3 tools/voice.py gs-paradox
    node tools/render.mjs gs-paradox
    python3 tools/mix.py gs-paradox 音乐文件

产物在 `out/<期名>/`。配音文本会发送给微软的 Edge 语音服务。

## 目录

- `engine/`：每期共用的外框（字幕、术语行、进度线索、按录音排节奏）。
- `episodes/<期名>/`：一期的场景代码和它自己的画法。`gs-paradox` 是第一期：格罗斯曼-斯蒂格利茨悖论。
- `tools/`：导出旁白、配音、渲染、垫音乐。

## 现状

只做过一期。没有自动化测试；没人听过的配音在 `timing.json` 里标着 `listened: false`。
