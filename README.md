# ⚡ PuterAgent Studio

> **Autonomous Multi-Model AI Agent & Chat OS powered by Puter.js**  
> *Zero API Keys. Zero Backend Servers. $0.00 Developer Cost via the User-Pays Model.*

[![Puter.js](https://img.shields.io/badge/Puter.js-v2-8b5cf6.svg)](https://docs.puter.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-06b6d4.svg)](LICENSE)
[![Zero API Keys](https://img.shields.io/badge/API%20Keys-None%20Required-10b981.svg)](https://docs.puter.com/AI/)
[![User-Pays Model](https://img.shields.io/badge/Developer%20Cost-%240.00%20Forever-f59e0b.svg)](https://docs.puter.com/user-pays-model/)

---

## 🌟 Overview

**PuterAgent Studio** is a full-stack, serverless autonomous AI agent and chat application built entirely on [Puter.js](https://js.puter.com/v2/). 

Unlike traditional AI architectures that require you to manage credit cards, proxy servers, and expiring API keys (such as Alibaba Cloud Model Studio's 90-day free tier), PuterAgent Studio operates on Puter's **User-Pays Model**. Your users cover their own usage through their personal Puter accounts with generous free allowances, while you as the developer pay **$0.00 no matter how many people use your application**.

### 🚀 Key Capabilities

- **🧠 Multi-Model Intelligence**: Instantly access **Alibaba Qwen** (`qwen-2.5-72b`, `qwen-2.5-coder-32b`, `qwen3.8-flash`), **DeepSeek V3 / R1 Reasoner**, **OpenAI GPT-4o / o1**, **Anthropic Claude 3.5 Sonnet**, **Google Gemini 2.0 Flash**, and **Mistral Large** without configuring API keys.
- **🤖 Autonomous Agentic ReAct Engine**: The agent doesn't just return static text; it iteratively reasons, selects tools, executes actions, analyzes observations, and loops until the task is complete.
- **🛠️ Rich Agent Tool Suite**:
  - 🌐 **Live Web Search**: Query live web results via DuckDuckGo.
  - 📄 **Web Content Reader**: Extract clean text/markdown from any URL.
  - 💻 **JavaScript Sandbox**: Execute client-side scripts in a safe sandbox with stdout and return value capture.
  - 📊 **Dynamic Data Charts**: Generate interactive visual charts (Bar, Line, Pie, Radar, Doughnut) using Chart.js.
  - 🎨 **Puter AI Image Generation**: Generate artwork on demand via `puter.ai.txt2img(prompt)`.
  - 💾 **Puter Cloud Filesystem**: Write, read, and list files stored in the user's personal Puter Drive (`puter.fs`).
  - 🔑 **Puter Cloud Key-Value Store**: Save and retrieve persistent memory and settings (`puter.kv`).
  - 🔊 **Voice & Speech**: Synthesize voice audio playback via `puter.ai.txt2speech(text)`.
- **💎 Crisp Blue & White Tech UI**: Built with modern Vanilla CSS3, smooth micro-animations, expandable Chain-of-Thought accordions, code blocks with "Copy" and "Run in Sandbox" actions, and responsive layout.
- **🚀 1-Click Free Hosting on Puter**: Host your app directly on `*.puter.site` using the built-in deployer or `puter.hosting.create()`.

---

## 🏛️ Architecture & The User-Pays Model

```
┌────────────────────────────────────────────────────────────────────────┐
│                          User's Web Browser                            │
│                                                                        │
│  ┌───────────────────────┐         ┌────────────────────────────────┐  │
│  │ PuterAgent Studio UI  │ ◄─────► │     Autonomous Agent Engine    │  │
│  │ (Obsidian Glass Theme)│         │     (ReAct / Tool Call Loop)   │  │
│  └──────────┬────────────┘         └───────────────┬────────────────┘  │
│             │                                      │                   │
│             ▼                                      ▼                   │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                     Puter.js Client Library                      │  │
│  │              (https://js.puter.com/v2/)                          │  │
│  └──────┬───────────────┬───────────────┬───────────────────┬───────┘  │
└─────────┼───────────────┼───────────────┼───────────────────┼──────────┘
          │               │               │                   │
          ▼               ▼               ▼                   ▼
    ┌───────────┐   ┌───────────┐   ┌───────────┐       ┌───────────┐
    │  Puter AI │   │ Puter KV  │   │  Puter FS │       │   Puter   │
    │  Gateway  │   │  Database │   │Cloud Drive│       │  Hosting  │
    └─────┬─────┘   └───────────┘   └───────────┘       └───────────┘
          │
          ├─► Alibaba Qwen (2.5 72B / Coder 32B / 3.8 Flash)
          ├─► DeepSeek (V3 Chat / R1 Reasoner)
          ├─► OpenAI (GPT-4o / GPT-4o Mini / o1)
          ├─► Anthropic (Claude 3.5 Sonnet / Haiku)
          └─► Google (Gemini 2.0 Flash)
```

### Why Puter.js Beats Traditional Cloud Tiers

| Feature | Alibaba Cloud Model Studio | Standard Backend (OpenAI/Anthropic) | PuterAgent Studio (Puter.js) |
| :--- | :--- | :--- | :--- |
| **Setup Cost** | Credit Card required | Credit Card required | **$0.00 (Zero Card)** |
| **API Keys** | Must be hidden in backend | Must be protected | **Zero API Keys Needed** |
| **Trial Limits** | **90-Day Expiration** | Fixed dollar credits | **No Expiration** |
| **Developer Risk** | High bills after 90 days | High bills if app goes viral | **$0.00 Developer Cost Forever** |
| **Backend Servers** | Node/Python proxy server | Node/Python proxy server | **100% Serverless & Client-Side** |
| **User Persistence** | External SQL/NoSQL DB | External SQL/NoSQL DB | **Built-in Puter KV & Drive** |

---

## ⚡ Quickstart

### Option 1: Run Locally

1. Clone or navigate to the project directory:
   ```bash
   cd e:\puterjs
   ```

2. Start a local HTTP server using Python or Node:
   ```bash
   # Using Python
   python -m http.server 3000

   # Or using Node
   npx serve .
   ```

3. Open your browser at:
   ```
   http://localhost:3000
   ```

### Option 2: Deploy Free on Puter Cloud Hosting

1. Open the application in your browser.
2. Click the **"🚀 Host on Puter"** button in the top header.
3. Choose a custom subdomain (e.g. `my-puter-agent`).
4. Click **"Deploy Application Now"**. Your app is immediately live at `https://my-puter-agent.puter.site`!

---

## 🛠️ Built-in Agent Tools

The autonomous engine can call any of the following tools during its reasoning loop:

```javascript
// 1. Live Web Search
await AGENT_TOOLS.web_search.execute({ query: "Alibaba Qwen 2.5 benchmarks" });

// 2. Client-Side Code Sandbox
await AGENT_TOOLS.run_javascript.execute({ 
  code: "return [1, 2, 3, 4, 5].map(x => x ** 2);" 
});

// 3. Interactive Chart Renderer
await AGENT_TOOLS.render_chart.execute({
  title: "Quarterly Revenue",
  chartType: "bar",
  labels: ["Q1", "Q2", "Q3", "Q4"],
  datasets: [{ label: "ARR ($M)", data: [12, 19, 28, 42] }]
});

// 4. Puter Cloud File Write
await AGENT_TOOLS.puter_fs_write.execute({
  path: "Documents/fibonacci.json",
  content: JSON.stringify([1, 1, 2, 3, 5, 8, 13])
});

// 5. AI Image Generation
await AGENT_TOOLS.generate_image.execute({
  prompt: "A neon cyberpunk cityscape with flying vehicles in 8k resolution"
});

// 7. Local Computer Filesystem (Desktop Mode)
await AGENT_TOOLS.local_write_file.execute({
  filePath: "src/server.js",
  content: "console.log('Built autonomously by PuterAgent');"
});

// 8. Local Terminal Execution (Desktop Mode)
await AGENT_TOOLS.local_run_command.execute({
  command: "git status"
});
```

---

## 💻 Desktop Application & Installer (Local Machine Access)

PuterAgent Studio is available both as a web app and as a **native Windows Desktop application**.

When running in Desktop mode, PuterAgent Studio has **full access to your local computer**:
- 📝 **Create, edit, and read files** on your hard drive (Powering autonomous agentic coding).
- ⚡ **Execute PowerShell & shell terminal commands** (`npm install`, `git`, `python`, compiler commands, testing suites).
- 📂 **Select any local folder** as the active project workspace.
- 🔑 **Continue enjoying 100% Free AI access** (Qwen 2.5, DeepSeek V3, Claude 3, GPT-4o Mini) powered by Puter.js with **zero API keys**.

### Running & Installing Desktop Mode:

```bash
# 1. Launch the Desktop App instantly
npm start

# 2. Build the Windows NSIS Installer (.exe)
npm run dist:nsis
# Output: dist/PuterAgent Studio Setup 2.5.0.exe

# 3. Build the Portable Executable (.exe)
npm run dist:portable
# Output: dist/PuterAgent Studio 2.5.0.exe
```

---

## 📖 In-App Documentation

Click the **"📚 Docs & Guide"** button inside the app to browse the full interactive documentation covering:
1. **Zero-API-Key Architecture**
2. **User-Pays Economic Model**
3. **Supported AI Models Catalog**
4. **Agentic Work Engine & Tools**
5. **Local Computer Access & Desktop App**
6. **Puter.js Developer API Reference**

---

## 📄 License

MIT License. Built with ❤️ using [Puter.js](https://puter.com).

