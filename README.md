# OneAI 每日 AI 竖屏视频

把指定的 AI 信息源自动整理成 3-5 分钟中文日报视频，适合手机竖屏播放，内嵌中文字幕，并额外导出 `.srt` 字幕文件。

## 功能

- 每次执行先抓最新数据，再生成当天视频
- 跟踪 20 个 X 账号、5 个播客、1 个工程博客
- 自动筛出更值得讲的更新，而不是机械平铺所有内容
- 生成中文口播稿，优先使用 `ANTHROPIC_API_KEY` 或 `OPENAI_API_KEY` 做高质量改写
- 无 API Key 时也可运行，使用启发式中文模板兜底
- Edge TTS 中文男声配音
- Remotion 渲染 1080x1920 竖屏视频
- 支持传入背景图目录；没有背景图时自动使用黑底
- 输出 MP4 和 `.srt` 中文字幕

## 数据源

### X / Twitter

Andrej Karpathy、Sam Altman、Swyx、Guillermo Rauch、Amjad Masad、Aaron Levie、Garry Tan、Alex Albert、Josh Woodward、Peter Yang、Nan Yu、Cat Wu、Thariq、Matt Turck、Zara Zhang、Nikunj Kothari、Peter Steinberger、Dan Shipper、Aditya Agarwal、Claude 官方。

### 播客

Latent Space、Training Data、No Priors、Unsupervised Learning、The MAD Podcast。

### 博客

Anthropic Engineering（RSS 镜像）。

## 环境要求

- Node.js 20+
- Python 3.11+
- `ffmpeg` 和 `ffprobe`
- 本地已登录 Chrome，并启用 `mcp-chrome-bridge` / Chrome MCP 扩展，用于抓 X 数据

可选：

- `ANTHROPIC_API_KEY` 或 `OPENAI_API_KEY`，用于把英文源内容改写成更自然的中文视频稿
- `TELEGRAM_BOT_TOKEN`，用于发到 Telegram

## 安装

```bash
cd /Users/alexmini/Codex/oneAi
npm run install:all
pip3 install -r requirements.txt
```

如果你还没有 `ffmpeg`：

```bash
brew install ffmpeg
```

## 环境变量

在项目根目录创建 `.env`：

```bash
# 二选一，提升中文脚本质量
ANTHROPIC_API_KEY=sk-ant-xxx
# ANTHROPIC_MODEL=claude-3-5-haiku-latest

# 或
OPENAI_API_KEY=sk-xxx
# OPENAI_MODEL=gpt-4.1-mini

# 可选
TELEGRAM_BOT_TOKEN=123456:abc
BACKGROUND_DIR=/absolute/path/to/backgrounds
```

## 使用

直接生成当天视频：

```bash
npm run video
```

抓取当天数据前，请先确保本地 Chrome MCP 已经启动并能在 `http://127.0.0.1:12306/mcp` 提供服务。

显式指定背景图目录：

```bash
node scripts/generate-video.js --background-dir /absolute/path/to/backgrounds
```

只用本地已抓取数据，不重新抓：

```bash
node scripts/generate-video.js --skip-fetch
```

只预览模板：

```bash
npm run studio
```

## 输出

生成完成后会得到：

- `release/digest-YYYY-MM-DD.mp4`
- `release/digest-YYYY-MM-DD.srt`
- `output/script-with-audio.json`
- `output/remotion-props.json`

## 背景图规则

- 传入目录后，会从目录根层读取 `.jpg`、`.jpeg`、`.png`、`.webp`、`.mp4`、`.mov`、`.webm`
- 内容段落会按顺序轮换使用这些背景
- 没有背景图或目录为空时，自动退回默认黑底

## 目录结构

```text
scripts/
  fetch-feeds.js
  prepare-digest.js
  generate-script.js
  generate-video.js

video/
  src/
    components/
    styles/
  public/
    fonts/

release/
output/
```
