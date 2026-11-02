/**
 * PuterAgent Studio - UI Controller & Renderer
 * Handles DOM rendering, Markdown formatting, syntax highlighting, Chart.js graphs,
 * Tool execution cards, modern <dialog> modals, and slide-out drawers.
 */

class UIController {
  constructor() {
    this.chatMessagesContainer = document.getElementById('chat-messages');
    this.chatViewport = document.getElementById('chat-viewport');
    this.chatInput = document.getElementById('chat-input');
    this.btnSend = document.getElementById('btn-send');
    this.liveBanner = document.getElementById('agent-live-banner');
    this.bannerStatusText = document.getElementById('banner-status-text');
    this.bannerStatusDetail = document.getElementById('banner-status-detail');
    this.bannerProgressFill = document.getElementById('banner-progress-fill');
    this.btnStopAgent = document.getElementById('btn-stop-agent');
    this.fileDrawer = document.getElementById('file-drawer');
    this.docsModal = document.getElementById('docs-modal');
    this.modelsModal = document.getElementById('models-modal');
    this.hostingModal = document.getElementById('hosting-modal');
    this.settingsModal = document.getElementById('settings-modal');

    this.chartInstances = new Map();
    this.activeStreamingBubble = null;
  }

  init() {
    this.setupModernDialogs();
    this.setupMarkdownParser();
    this.setupTextareaAutoResize();
  }

  /**
   * Modern Web Guidance compliance for <dialog closedby="any">
   */
  setupModernDialogs() {
    // Check if browser natively supports closedby property
    if (!('closedBy' in HTMLDialogElement.prototype)) {
      const isOutside = (e, dialog) => {
        const r = dialog.getBoundingClientRect();
        return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
      };

      for (const dialog of document.querySelectorAll('dialog[closedby="any"]')) {
        let pressedOutside = false;
        dialog.addEventListener('pointerdown', (e) => {
          pressedOutside = isOutside(e, dialog);
        });
        dialog.addEventListener('pointerup', (e) => {
          if (pressedOutside && isOutside(e, dialog)) {
            dialog.close();
            dialog.returnValue = '';
          }
        });
      }
    }

    // Reset returnValue on close to avoid stale leakage
    for (const dialog of document.querySelectorAll('dialog')) {
      dialog.addEventListener('close', () => {
        dialog.returnValue = '';
      });
    }
  }

  /**
   * Setup marked.js options with Highlight.js code highlighting
   */
  setupMarkdownParser() {
    if (typeof marked !== 'undefined') {
      marked.setOptions({
        gfm: true,
        breaks: true,
        highlight: (code, lang) => {
          if (typeof hljs !== 'undefined' && lang && hljs.getLanguage(lang)) {
            try {
              return hljs.highlight(code, { language: lang }).value;
            } catch (e) {
              console.error(e);
            }
          }
          return code;
        }
      });
    }
  }

  /**
   * Auto-resize input textarea as user types
   */
  setupTextareaAutoResize() {
    if (!this.chatInput) return;
    this.chatInput.addEventListener('input', () => {
      this.chatInput.style.height = 'auto';
      this.chatInput.style.height = Math.min(this.chatInput.scrollHeight, 180) + 'px';
    });
  }

  /**
   * Parse Markdown text safely with custom code blocks
   */
  renderMarkdown(text) {
    if (!text) return '';
    if (typeof marked !== 'undefined') {
      let html = marked.parse(text);
      // Enhance pre/code blocks with interactive toolbars
      html = html.replace(/<pre><code class="language-([^"]*)">([\s\S]*?)<\/code><\/pre>/gi, (match, lang, code) => {
        const cleanLang = lang || 'code';
        const unescapedCode = code.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
        const encodedCode = encodeURIComponent(unescapedCode);

        const runButton = (cleanLang.toLowerCase() === 'javascript' || cleanLang.toLowerCase() === 'js')
          ? `<button class="code-btn btn-run-sandbox" onclick="window.runCodeInSandbox(decodeURIComponent('${encodedCode}'))">▶ Run in Sandbox</button>`
          : '';

        return `
          <div class="code-block-container">
            <div class="code-block-header">
              <span class="code-block-lang">${cleanLang}</span>
              <div class="code-block-actions">
                ${runButton}
                <button class="code-btn" onclick="window.copyToClipboard(decodeURIComponent('${encodedCode}'), this)">📋 Copy</button>
              </div>
            </div>
            <pre><code class="language-${cleanLang}">${code}</code></pre>
          </div>
        `;
      });
      return html;
    }
    // Fallback if marked is loading
    return `<div style="white-space: pre-wrap;">${this.escapeHtml(text)}</div>`;
  }

  escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  scrollToBottom() {
    if (this.chatViewport) {
      this.chatViewport.scrollTo({
        top: this.chatViewport.scrollHeight,
        behavior: 'smooth'
      });
    }
  }

  /**
   * Clear welcome hero screen if present
   */
  hideWelcomeHero() {
    const hero = document.getElementById('welcome-hero');
    if (hero) hero.style.display = 'none';
  }

  /**
   * Show welcome hero if messages empty
   */
  showWelcomeHero() {
    const hero = document.getElementById('welcome-hero');
    if (hero) hero.style.display = 'flex';
  }

  /**
   * Render User Message
   */
  appendUserMessage(text) {
    this.hideWelcomeHero();
    const row = document.createElement('div');
    row.className = 'message-row user';
    row.innerHTML = `
      <div class="message-avatar">👤</div>
      <div class="message-content-wrapper">
        <div class="message-header">
          <span class="message-sender">You</span>
          <span class="message-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div class="message-bubble">${this.escapeHtml(text)}</div>
      </div>
    `;
    this.chatMessagesContainer.appendChild(row);
    this.scrollToBottom();
    return row;
  }

  /**
   * Create Assistant Message placeholder for streaming / agent steps
   */
  createAssistantMessage(modelName = 'Qwen 2.5 72B') {
    this.hideWelcomeHero();
    const row = document.createElement('div');
    row.className = 'message-row assistant';
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    row.id = messageId;

    row.innerHTML = `
      <div class="message-avatar">⚡</div>
      <div class="message-content-wrapper">
        <div class="message-header">
          <div class="message-sender">
            <span>PuterAgent</span>
            <span class="message-model-tag">${modelName}</span>
          </div>
          <span class="message-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div class="agent-steps-stream" id="steps_${messageId}"></div>
        <div class="message-bubble markdown-body" id="content_${messageId}">
          <span class="streaming-cursor"></span>
        </div>
        <div class="message-footer-actions">
          <button class="action-icon-btn" onclick="window.speakMessageText('${messageId}')">🔊 Listen</button>
          <button class="action-icon-btn" onclick="window.copyMessageText('${messageId}', this)">📋 Copy</button>
        </div>
      </div>
    `;

    this.chatMessagesContainer.appendChild(row);
    this.scrollToBottom();
    return {
      messageId,
      row,
      stepsContainer: row.querySelector(`#steps_${messageId}`),
      contentContainer: row.querySelector(`#content_${messageId}`)
    };
  }

  /**
   * Add Expandable Thought Card
   */
  appendThoughtCard(stepsContainer, thoughtText) {
    if (!stepsContainer || !thoughtText) return;
    const details = document.createElement('details');
    details.className = 'thought-card';
    details.open = true;
    details.innerHTML = `
      <summary>
        <span class="thought-label">🧠 Chain of Thought / Reasoning</span>
        <span class="thought-indicator">▶</span>
      </summary>
      <div class="thought-body">${this.escapeHtml(thoughtText)}</div>
    `;
    stepsContainer.appendChild(details);
    this.scrollToBottom();
  }

  /**
   * Add Tool Execution Card (Pending / Running state)
   */
  appendToolStartCard(stepsContainer, { toolCallId, toolName, args }) {
    if (!stepsContainer) return null;
    const card = document.createElement('div');
    card.className = 'agent-step-card running';
    card.id = `tool_card_${toolCallId}`;

    const toolMeta = window.AGENT_TOOLS[toolName] || { name: toolName, description: 'Autonomous agent action' };

    card.innerHTML = `
      <div class="step-header">
        <div class="step-info-left">
          <div class="step-status-icon">
            <div class="step-spinner"></div>
          </div>
          <span class="step-tool-badge">${toolName}</span>
          <span class="step-title">${toolMeta.description}</span>
        </div>
        <div class="step-meta-right">
          <span class="step-badge badge-running">Running</span>
        </div>
      </div>
      <div class="step-details">
        <span class="step-section-title">Arguments</span>
        <pre class="step-params">${this.escapeHtml(JSON.stringify(args, null, 2))}</pre>
      </div>
    `;

    stepsContainer.appendChild(card);
    this.scrollToBottom();
    return card;
  }

  /**
   * Update Tool Execution Card upon completion
   */
  updateToolEndCard({ toolCallId, toolName, args, result, resultString, durationMs, status }) {
    const card = document.getElementById(`tool_card_${toolCallId}`);
    if (!card) return;

    card.className = `agent-step-card ${status}`;
    const headerRight = card.querySelector('.step-meta-right');
    const statusIcon = card.querySelector('.step-status-icon');

    if (status === 'success') {
      statusIcon.innerHTML = '✅';
      headerRight.innerHTML = `
        <span class="step-duration">${durationMs}ms</span>
        <span class="step-badge badge-success">Completed</span>
      `;
    } else {
      statusIcon.innerHTML = '❌';
      headerRight.innerHTML = `
        <span class="step-duration">${durationMs}ms</span>
        <span class="step-badge badge-error">Failed</span>
      `;
    }

    const details = card.querySelector('.step-details');
    const outputSection = document.createElement('div');
    outputSection.innerHTML = `
      <span class="step-section-title" style="margin-top: 0.5rem; display: block;">Execution Output</span>
      <pre class="step-output ${status === 'success' ? 'output-success' : 'output-error'}">${this.escapeHtml(resultString)}</pre>
    `;
    details.appendChild(outputSection);

    // If result contains interactive chart or generated image, render specialized widgets
    if (result && typeof result === 'object') {
      if (result.action === 'CHART_RENDERED' && result.chartData) {
        this.renderInteractiveChart(details, result.chartData);
      } else if (result.action === 'IMAGE_GENERATED' && result.imageUrl) {
        this.renderGeneratedImageWidget(details, result.imageUrl, result.prompt);
      }
    }

    this.scrollToBottom();
  }

  /**
   * Render Interactive Chart.js in step container
   */
  renderInteractiveChart(container, chartConfig) {
    const chartId = `chart_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const widget = document.createElement('div');
    widget.className = 'chart-widget-card';
    widget.innerHTML = `
      <div class="chart-header">
        <div class="chart-title">
          <span>📊</span>
          <span>${this.escapeHtml(chartConfig.title)}</span>
        </div>
        <span class="step-badge badge-running">${chartConfig.chartType.toUpperCase()}</span>
      </div>
      <div class="chart-canvas-wrapper">
        <canvas id="${chartId}"></canvas>
      </div>
      <div class="chart-footer-actions">
        <button class="btn btn-glass" onclick="window.saveChartToPuter('${chartId}', '${this.escapeHtml(chartConfig.title)}')">💾 Save to Puter Drive</button>
        <button class="btn btn-glass" onclick="window.exportChartPNG('${chartId}')">📥 Export PNG</button>
      </div>
    `;
    container.appendChild(widget);

    setTimeout(() => {
      const canvas = document.getElementById(chartId);
      if (canvas && typeof Chart !== 'undefined') {
        const defaultColors = [
          'rgba(139, 92, 246, 0.75)',
          'rgba(6, 182, 212, 0.75)',
          'rgba(16, 185, 129, 0.75)',
          'rgba(245, 158, 11, 0.75)',
          'rgba(244, 63, 94, 0.75)',
          'rgba(99, 102, 241, 0.75)'
        ];

        // Format datasets with vibrant cyber colors
        const datasets = (chartConfig.datasets || []).map((ds, idx) => ({
          ...ds,
          backgroundColor: ds.backgroundColor || defaultColors[idx % defaultColors.length],
          borderColor: ds.borderColor || '#07090e',
          borderWidth: 1.5
        }));

        const newChart = new Chart(canvas, {
          type: chartConfig.chartType || 'bar',
          data: {
            labels: chartConfig.labels || [],
            datasets: datasets
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                labels: { color: '#cbd5e1', font: { family: 'Plus Jakarta Sans', size: 12 } }
              }
            },
            scales: chartConfig.chartType === 'pie' || chartConfig.chartType === 'doughnut' ? {} : {
              x: {
                ticks: { color: '#94a3b8' },
                grid: { color: 'rgba(255, 255, 255, 0.06)' }
              },
              y: {
                ticks: { color: '#94a3b8' },
                grid: { color: 'rgba(255, 255, 255, 0.06)' }
              }
            }
          }
        });
        this.chartInstances.set(chartId, newChart);
      }
    }, 50);
  }

  /**
   * Render Generated Image Widget
   */
  renderGeneratedImageWidget(container, imageUrl, prompt) {
    const card = document.createElement('div');
    card.className = 'generated-image-card';
    card.innerHTML = `
      <img src="${imageUrl}" alt="${this.escapeHtml(prompt)}" loading="lazy" />
      <span class="image-prompt-label">"${this.escapeHtml(prompt)}"</span>
      <div class="image-actions">
        <button class="btn btn-glass" onclick="window.saveImageToPuter('${encodeURIComponent(imageUrl)}', 'image_${Date.now()}.png')">💾 Save to Puter Drive</button>
        <a class="btn btn-glass" href="${imageUrl}" target="_blank" download="generated_image.png">📥 Download</a>
      </div>
    `;
    container.appendChild(card);
  }

  /**
   * Update Assistant Message Final Content
   */
  updateAssistantMessage(contentContainer, text) {
    if (!contentContainer) return;
    contentContainer.innerHTML = this.renderMarkdown(text);
    this.scrollToBottom();
  }

  /**
   * Update Live Progress Banner
   */
  showLiveBanner(stepNumber, maxSteps, toolName = '') {
    if (!this.liveBanner) return;
    this.liveBanner.classList.add('active');
    this.bannerStatusText.textContent = `Autonomous Agent Step ${stepNumber} of ${maxSteps}`;
    this.bannerStatusDetail.textContent = toolName ? `Executing ${toolName}...` : 'Analyzing and reasoning...';
    const percent = Math.min(100, Math.round((stepNumber / maxSteps) * 100));
    this.bannerProgressFill.style.width = `${percent}%`;
  }

  hideLiveBanner() {
    if (!this.liveBanner) return;
    this.liveBanner.classList.remove('active');
  }

  /**
   * Render Documentation Modal Tabs
   */
  renderDocumentation() {
    const nav = document.getElementById('docs-tabs-nav');
    const content = document.getElementById('docs-tab-content');
    if (!nav || !content) return;

    nav.innerHTML = '';
    content.innerHTML = '';

    window.PUTER_DOCUMENTATION.forEach((doc, idx) => {
      const btn = document.createElement('button');
      btn.className = `tab-btn ${idx === 0 ? 'active' : ''}`;
      btn.textContent = `${doc.icon} ${doc.title}`;
      btn.onclick = () => {
        document.querySelectorAll('#docs-tabs-nav .tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('#docs-tab-content .tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(`doc_sec_${doc.id}`).classList.add('active');
      };
      nav.appendChild(btn);

      const sec = document.createElement('div');
      sec.id = `doc_sec_${doc.id}`;
      sec.className = `tab-content markdown-body ${idx === 0 ? 'active' : ''}`;
      sec.innerHTML = this.renderMarkdown(doc.content);
      content.appendChild(sec);
    });
  }

  /**
   * Render Models Catalog Grid
   */
  renderModelsCatalog(models, activeModelId, onSelectModel) {
    const grid = document.getElementById('model-catalog-grid');
    if (!grid) return;
    grid.innerHTML = '';

    models.forEach(model => {
      const card = document.createElement('div');
      card.className = `model-card ${model.id === activeModelId ? 'selected' : ''}`;
      card.innerHTML = `
        <div class="model-card-header">
          <span class="model-provider-badge">${model.provider || 'AI Provider'}</span>
          ${model.free ? '<span class="step-badge badge-success">Free Tier</span>' : ''}
        </div>
        <span class="model-card-name">${model.name || model.id}</span>
        <span class="model-card-desc">${model.desc || 'Standard LLM chat completion'}</span>
      `;
      card.onclick = () => {
        document.querySelectorAll('.model-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        onSelectModel(model.id);
        const modal = document.getElementById('models-modal');
        if (modal && modal.close) modal.close();
      };
      grid.appendChild(card);
    });
  }

  /**
   * Render Cloud Files in Sidecar Drawer
   */
  renderFilesDrawer(files) {
    const list = document.getElementById('drawer-file-list');
    if (!list) return;
    list.innerHTML = '';

    if (!files || files.length === 0) {
      list.innerHTML = `<div style="color: var(--text-dim); text-align: center; padding: 2rem;">No files found in Puter Cloud storage. Let an agent create some for you!</div>`;
      return;
    }

    files.forEach(file => {
      const item = document.createElement('div');
      item.className = 'file-item';
      item.innerHTML = `
        <div class="file-info-left">
          <span>📄</span>
          <span class="file-name" title="${file.path}">${file.name}</span>
        </div>
        <div style="display: flex; gap: 0.35rem;">
          <button class="code-btn" onclick="window.viewFileContent('${file.path}')">Read</button>
        </div>
      `;
      list.appendChild(item);
    });
  }
}

window.UIController = UIController;
window.ui = new UIController();
