# 临场 · AI 面试准备室

面向求职者的面试练习工具。可以按岗位梳理知识、做自测，也可以进行带倒计时的语音模拟面试，练完回看复盘。

## 快速启动

在 GitHub 仓库页面通过 **Code → Download ZIP** 下载源码并解压，也可以用 Git 克隆。准备 Node.js 24 LTS（含 npm），首次安装依赖需要联网。

### Windows 双击启动

双击项目文件夹里的 `启动临场.cmd`。脚本会在需要时安装依赖，并自动打开浏览器。使用期间请保留启动窗口，关闭窗口即可停止程序。

### 使用终端启动（Windows、macOS、Linux）

在包含 `package.json` 的项目目录执行：

```sh
npm ci
npm run dev
```

打开终端显示的网址，默认是 [http://127.0.0.1:5173](http://127.0.0.1:5173)。如果默认端口被占用，可执行 `npm run dev -- --port 5174`。停止程序时在终端按 `Ctrl+C`。

## 怎么使用

1. **文字准备室**。点击「调整目标」，填写目标岗位和经验阶段，可补充岗位描述和相关经历。保存后点击「生成准备清单」，在模块卡片里查看知识点、自测题和动手练习，掌握后可勾选「我能独立解释」。接入模型后，可以点击自测题请 AI 讲解，也可以在同一张卡片的「知识陪练」里提问。
2. **语音面试室**。设置面试语言、风格、轮数和每题时限，再点击「开始语音面试」或「开始题库语音演练」。题目可由浏览器朗读。点击「开始语音回答」后授权麦克风，也可以直接打字。确认转写文字后点击「提交回答」，需要时可暂停或跳题。
3. **复盘与记录**。完成面试后查看原回答和重练建议，也可以导出 Markdown。当前浏览器保留最近 10 份完整记录，可在「练习记录」里回看。

## 接入 AI（可选）

未配置密钥时，应用自动使用本地题库。要启用 AI 讲解、追问和复盘，在项目根目录创建 `.env.local`，填入自己的 DeepSeek API 密钥并重启应用。

```dotenv
DEEPSEEK_API_KEY=替换成你自己的DeepSeek密钥
```

密钥只由服务端读取。`.env.local` 已被 Git 忽略，分享或打包源码时也要排除它。仓库中的 `.env.example` 可作为配置模板。配置模型后，仍可从页面右上角切换回题库模式。

| 变量 | 用途 |
|---|---|
| `DEEPSEEK_API_KEY` | DeepSeek 服务端密钥，配置后优先用于备考、问答与复盘 |
| `DEEPSEEK_MODEL` | DeepSeek 模型，默认 `deepseek-flash` |
| `OPENAI_API_KEY` | 服务端模型凭据，需通过安全方式配置 |
| `OPENAI_MODEL` | 问答、准备清单与复盘模型，默认 `gpt-4.1-mini` |
| `OPENAI_TRANSCRIPTION_MODEL` | 录音转写模型，默认 `gpt-transcribe` |

页面显示「模型凭据已配置」表示服务端已读到密钥，实际调用取决于账户额度和模型权限。部署到 Sites 时，在线凭据应单独通过站点环境变量设置。

## 隐私与使用范围

点击录音后才请求麦克风权限，通常需要 HTTPS 或 localhost。DeepSeek 和题库模式使用浏览器语音识别，可能使用浏览器厂商的在线服务。OpenAI 模式将录音提交给 OpenAI 转写。岗位、经历与相关回答会随真实模型请求发送给模型提供方。练习记录存于当前浏览器，清理站点数据后会丢失。

评分仅用于练习，题库复盘只提供基础统计和固定建议。

## 开发检查

```sh
npm test
npm run typecheck
npm run build
```

## 主要文件

| 路径 | 内容 |
|---|---|
| `components/interview-studio.tsx` | 双模式页面、面试流程、录音与朗读、复盘 |
| `lib/interview.ts` | 共享类型、输出校验、题库与示例流程 |
| `app/api/interview/route.ts` | 准备清单、知识辅导、面试追问、复盘 |
| `app/api/transcribe/route.ts` | 服务端录音转写 |
| `scripts/local-model-api.ts` | 本地开发接口，复用系统代理 |
| `scripts/dev-local.mjs` | 本地启动与私密环境变量加载 |
| `app/globals.css` | 响应式界面与面试室样式 |
| `tests/practice.test.mjs` | 核心流程测试 |

## 技术栈与部署

React、TypeScript、Vinext/Vite、Zod、Lucide、原生 CSS。服务端通过 DeepSeek 或 OpenAI 的 Responses API 获取结构化结果。语音使用浏览器的 SpeechRecognition、SpeechSynthesis，以及 OpenAI 模式下的 MediaRecorder 和转写 API。线上由 Sites 部署到 Cloudflare Workers，本地与线上复用同一套接口处理函数。

[DeepSeek Responses API](https://api-docs.deepseek.com/guides/responses_api/)、[OpenAI 结构化输出](https://developers.openai.com/api/docs/guides/structured-outputs)、[OpenAI 语音转写](https://developers.openai.com/api/docs/guides/speech-to-text)、[Cloudflare Node 环境变量](https://developers.cloudflare.com/workers/runtime-apis/nodejs/process/)。
