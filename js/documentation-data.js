/**
 * PuterAgent Studio - Interactive In-App Documentation Data
 * Comprehensive guide covering Zero-API-Key Architecture, User-Pays Model,
 * Qwen & Multi-Model Ecosystem, Autonomous Agentic Tools, and Puter.js API Reference.
 */

window.PUTER_DOCUMENTATION = [
  {
    id: 'architecture',
    title: 'Zero-API-Key Architecture',
    icon: '⚡',
    content: `
# Zero-API-Key Architecture: The Modern AI Paradigm

Traditionally, building an AI application required:
1. Setting up a dedicated backend server (Node.js, Python, or Go).
2. Creating accounts with cloud providers (e.g. Alibaba Cloud Model Studio, OpenAI, Anthropic).
3. Adding credit cards and purchasing API credits or managing free trials.
4. Storing sensitive API keys in \`.env\` files and guarding them against leaks.
5. Implementing proxy servers, rate limiters, token metering, and auth middleware.
6. Paying hefty monthly server bills whenever user traffic surged.

---

### The Puter.js Revolution

**Puter.js** completely flips this model on its head by delivering an **Operating System for the Browser**.

\`\`\`html
<!-- Include Puter.js with a single script tag -->
<script src="https://js.puter.com/v2/"></script>
\`\`\`

With Puter.js:
- **No API Keys**: You never configure, manage, or rotate AI keys.
- **No Backend Server**: The entire application runs directly on the user's browser as a static web app.
- **No Credit Card Required**: You don't need a corporate billing setup to publish apps.
- **Client-Side Security**: There are no backend secrets to leak, no server vulnerabilities, and no database exploits.
- **Serverless Hosting**: Puter allows you to host your web app on a free \`.puter.site\` domain with a single function call!
    `
  },

  {
    id: 'user-pays',
    title: 'User-Pays Economic Model',
    icon: '💰',
    content: `
# The User-Pays Model Explained

Alibaba Cloud Model Studio provides a free tier for Qwen with 1 million input tokens and 1 million output tokens—**valid for only 90 days**. Once those 90 days elapse or the tokens are consumed, developers are forced into standard pay-as-you-go billing, where every single prompt from any visitor is charged to the developer's credit card.

If your app goes viral, you face an existential dilemma: pay exorbitant AI bills or shut the app down.

---

### How the User-Pays Model Works

With Puter's **User-Pays Model** ([docs.puter.com/user-pays-model/](https://docs.puter.com/user-pays-model/)):
1. **Developer Cost is $0.00 Forever**: You build and host the app without any AI usage costs.
2. **Users Cover Their Own Usage**: Each user accesses AI models through their personal Puter account.
3. **Generous Free Tiers for Users**: Puter grants free daily allowances and quotas to every user.
4. **No Financial Risk**: Whether you have 1 user or 1,000,000 users, your marginal developer cost remains **zero**.

### Comparison: Traditional Model vs Puter.js

| Feature | Alibaba Cloud Model Studio (Direct) | Traditional API (OpenAI/Anthropic) | Puter.js + PuterAgent |
| :--- | :--- | :--- | :--- |
| **Backend Required** | Yes (Node/Python proxy) | Yes | **No (100% Client-Side)** |
| **API Keys** | Must be managed & secured | Must be secured | **Zero API Keys** |
| **Trial Limits** | 90-day trial expiration | Free trial expires quickly | **No Expiration** |
| **Developer Cost** | High after trial | High per-request bills | **$0.00 Forever** |
| **Scalability Risk** | Viral apps bankrupt creator | Viral apps bankrupt creator | **Infinitely Scalable** |
| **User Sign-In** | Custom database needed | Custom database needed | **Built-in 1-Click Puter Auth** |
    `
  },

  {
    id: 'models',
    title: 'Supported AI Models Catalog',
    icon: '🧠',
    content: `
# Supported AI Models & Providers

Puter.js gives your web application instant access to hundreds of world-class AI models across every major provider.

---

### Alibaba Qwen Models
- **\`qwen/qwen-2.5-72b-instruct\`**: Alibaba's flagship 72-billion parameter model. Outstanding at coding, math, structured output, and multilingual reasoning.
- **\`qwen/qwen-2.5-coder-32b-instruct\`**: State-of-the-art coding specialist tailored for script writing, debugging, and software engineering.
- **\`qwen/qwen3.8-flash\` & \`qwen/qwen3.6-flash\`**: Extremely low-latency models engineered for real-time streaming and fast responses.

### DeepSeek Models
- **\`deepseek/deepseek-chat\` (DeepSeek V3)**: Cutting-edge open-weights model matching top proprietary LLMs across reasoning and engineering benchmarks.
- **\`deepseek/deepseek-reasoner\` (DeepSeek R1)**: Groundbreaking reasoning model featuring deep chain-of-thought scratchpads.

### OpenAI Models
- **\`openai/gpt-4o\`**: Omni model for multimodal reasoning and fast responses.
- **\`openai/gpt-4o-mini\`**: Lightweight, high-throughput daily driver.
- **\`openai/o1\`**: Advanced reasoning for complex mathematics and algorithmic problems.

### Anthropic Claude
- **\`anthropic/claude-3-5-sonnet\`**: The industry benchmark for code writing, autonomous agency, and complex synthesis.
- **\`anthropic/claude-3-haiku\`**: Ultra-fast responses with low resource footprints.

### Google & Open-Source
- **\`google/gemini-2.0-flash\`**: Google's next-gen multimodal speedster.
- **\`mistral/mistral-large-latest\`**: Mistral's flagship enterprise-grade model.
- **\`meta-llama/llama-3.3-70b-instruct\`**: Meta's flagship open-source weights.
    `
  },

  {
    id: 'agentic',
    title: 'Agentic Work Engine & Tools',
    icon: '🛠️',
    content: `
# Autonomous Agent Engine & Tool Suite

PuterAgent Studio turns standard chat into an **Autonomous Agent**. Instead of just returning static text, the agent can reason, plan, execute tools in an iterative **ReAct loop**, observe intermediate outputs, and synthesize findings!

---

### Built-in Agent Tools

1. **\`web_search\`**:
   - Searches the live web for breaking news, live data, documentation, and research articles.
   - Syntax: \`{ "query": "latest AI agent benchmarks 2026" }\`

2. **\`fetch_web_content\`**:
   - Downloads and parses clean markdown/text content from any web page URL.
   - Syntax: \`{ "url": "https://example.com/spec" }\`

3. **\`run_javascript\`**:
   - Executes JavaScript in an isolated client-side execution sandbox.
   - Captures \`console.log\` output and returned values. Ideal for math, simulations, sorting, and regex.
   - Syntax: \`{ "code": "const sum = [1,2,3,4,5].reduce((a,b)=>a+b); return sum;" }\`

4. **\`render_chart\`**:
   - Generates interactive Chart.js visualizations (bar, line, pie, doughnut, radar) rendered directly in the chat stream!
   - Syntax: \`{ "title": "Revenue Growth", "chartType": "bar", "labels": ["Q1","Q2"], "datasets": [...] }\`

5. **\`generate_image\`**:
   - Calls Puter's native \`puter.ai.txt2img(prompt)\` to generate AI artwork on demand.
   - Syntax: \`{ "prompt": "Futuristic cyberpunk terminal with neon violet lighting" }\`

6. **\`puter_fs_write\`, \`puter_fs_read\`, \`puter_fs_list\`**:
   - Interacts with the user's personal Puter Cloud Drive. Files saved here are accessible from any device!
   - Syntax: \`{ "path": "Documents/analysis.md", "content": "# Report..." }\`

7. **\`puter_kv_store\`, \`puter_kv_retrieve\`**:
   - Persistent key-value memory store for agent state, preferences, and long-term memories.
   - Syntax: \`{ "key": "user_preferences", "value": { "theme": "cyberpunk" } }\`

8. **\`text_to_speech\`**:
   - Calls Puter's \`puter.ai.txt2speech(text)\` to speak answers or agent thoughts aloud.

---

### Autonomous Execution Safeguards
- **Max Steps Limit**: Users can configure the execution limit (1 to 10 steps) to prevent runaway loops.
- **Live Stop Button**: Powered by \`AbortController\`, users can halt an agent in mid-flight instantly.
- **Full Transparency**: Every thought, tool call, argument, and execution duration is visible in expandable cards.
    `
  },

  {
    id: 'api-reference',
    title: 'Puter.js API Reference & Hosting',
    icon: '📖',
    content: `
# Puter.js Developer API Reference

Quick cheatsheet of all Puter.js core APIs used in this app:

### 1. AI Chat & Completions
\`\`\`javascript
// Basic completion
const response = await puter.ai.chat('Explain quantum computing');

// Streaming response
const stream = await puter.ai.chat('Write a poem', {
  model: 'qwen/qwen-2.5-72b-instruct',
  stream: true
});
for await (const chunk of stream) {
  process.stdout.write(chunk?.text || '');
}

// Function / Tool Calling
const result = await puter.ai.chat('What is the weather?', {
  model: 'openai/gpt-4o',
  tools: myToolsArray
});
\`\`\`

### 2. AI Multimodal & Voice
\`\`\`javascript
// Image Generation
const img = await puter.ai.txt2img('A cute red panda astronaut');
document.body.appendChild(img);

// Text-to-Speech
const audio = await puter.ai.txt2speech('Hello from Puter!');
audio.play();
\`\`\`

### 3. Cloud Key-Value Store
\`\`\`javascript
// Save value
await puter.kv.set('agent_config', { mode: 'coder', maxSteps: 5 });

// Retrieve value
const config = await puter.kv.get('agent_config');

// Delete value
await puter.kv.del('agent_config');
\`\`\`

### 4. Cloud Filesystem
\`\`\`javascript
// Write file
await puter.fs.write('Documents/report.md', '# Q3 Report');

// Read file
const text = await puter.fs.read('Documents/report.md');

// List directory
const files = await puter.fs.readdir('Documents');
\`\`\`

### 5. Authentication
\`\`\`javascript
// Check if user is logged in
const signedIn = await puter.auth.isSignedIn();

// Sign in with Puter popup
await puter.auth.signIn();

// Get current user profile
const user = await puter.auth.getUser();

// Sign out
await puter.auth.signOut();
\`\`\`

### 6. One-Click Free App Hosting
\`\`\`javascript
// Deploy this app folder to a live subdomain on *.puter.site
const site = await puter.hosting.create('my-agentic-app', '.');
console.log('App is live at:', site.subdomain + '.puter.site');
\`\`\`
    `
  },

  {
    id: 'desktop-agentic',
    title: 'Local Computer Access & Desktop App',
    icon: '💻',
    content: `
# PuterAgent Desktop: Full Local Computer Access & Agentic Coding

When running inside the **PuterAgent Desktop Application**, the AI agent transitions from a sandboxed web chat into an **autonomous local software engineer**.

---

### What Can PuterAgent Do on Your Computer?

1. **📁 Read & Inspect Local Codebases**:
   - The agent reads source files, configuration files, and documentation across any folder on your hard drive.
   - Slices line ranges for fast, token-efficient code reviews.

2. **📝 Create & Overwrite Local Files**:
   - Autonomously generates full project scaffolding, new modules, test files, and styles.
   - Automatically creates any missing parent directories recursively.

3. **✏️ Targeted Code Editing**:
   - Performs precision search-and-replace edits on existing code without needing to rewrite entire massive files.

4. **⚡ PowerShell & Terminal Command Execution**:
   - Runs compiler commands, package managers (\`npm install\`, \`pip install\`, \`cargo\`), test suites, and git operations.
   - Captures standard output, standard error, exit codes, and execution duration.

5. **🔍 Autonomous Debugging & Self-Correction**:
   - If a test or build command fails, the agent inspects the terminal error output, edits the code to fix the root cause, and re-executes until it succeeds.

---

### Desktop Architecture & Security Bridge

\`\`\`
┌────────────────────────────────────────────────────────┐
│              PuterAgent Desktop (Electron)            │
│                                                        │
│  ┌───────────────────────┐   window.desktopAPI         │
│  │ PuterAgent Frontend   │ ──────────────────────┐     │
│  │ (Puter.js Multi-Model)│                       │     │
│  └───────────────────────┘                       ▼     │
│                                           ┌──────────┐ │
│                                           │ Preload  │ │
│                                           │ Bridge   │ │
│                                           └────┬─────┘ │
└────────────────────────────────────────────────┼───────┘
                                                 │ IPC
                                                 ▼
                              ┌─────────────────────────────────────┐
                              │ Electron Main Process (Node.js)     │
                              ├──────────────────┬──────────────────┤
                              │ Local FileSystem │ PowerShell Shell │
                              │ (fs.promises)    │ (child_process)  │
                              └──────────────────┴──────────────────┘
\`\`\`

### Running the Desktop App:
- **Instant Launch**: Run \`npm start\` in the terminal.
- **Windows Installer**: Run \`npm run dist:nsis\` to generate the \`dist/PuterAgent Studio Setup 2.5.0.exe\` installer.
- **Portable App**: Run \`npm run dist:portable\` to generate the single-file executable.
    `
  }
];
