/**
 * PuterAgent Studio - Main Application Controller
 * Theme: Crisp Blue & White
 * Coordinates PuterClient, AgentEngine, UIController, and Session Management.
 */

class App {
  constructor() {
    this.sessions = [];
    this.currentSessionId = null;
    this.activeModel = 'default';
    this.agentMode = 'agentic_coder';
    this.maxSteps = 5;
    this.activeTools = [
      'local_get_workspace',
      'local_read_file',
      'local_write_file',
      'local_edit_file',
      'local_list_directory',
      'local_create_directory',
      'local_run_command',
      'local_file_exists',
      'local_delete_path',
      'web_search',
      'fetch_web_content',
      'run_javascript',
      'render_chart',
      'generate_image',
      'puter_fs_write',
      'puter_fs_read',
      'puter_fs_list',
      'puter_kv_store',
      'puter_kv_retrieve',
      'text_to_speech'
    ];
  }

  async init() {
    console.log('[PuterAgent] Initializing application in Blue & White Theme...');

    // Initialize UI
    window.ui.init();

    // Initialize Desktop Workspace
    await this.initDesktopWorkspace();

    // Initialize Puter Client
    await window.puterClient.init();

    // Listen for auth changes
    window.puterClient.onUserChange((user) => this.handleUserAuthChange(user));

    // Load available AI models
    await this.loadModels();

    // Load saved sessions from Puter KV
    await this.loadSessions();

    // Setup Event Listeners
    this.setupEventListeners();

    // Render Documentation in Modal
    window.ui.renderDocumentation();

    console.log('[PuterAgent] Ready! Active model:', this.activeModel);
  }

  /**
   * Handle user login state updates
   */
  handleUserAuthChange(user) {
    const userBadge = document.getElementById('user-auth-badge');
    const userStatusText = document.getElementById('user-status-text');
    const authUnauthView = document.getElementById('auth-unauth-view');
    const authAuthView = document.getElementById('auth-auth-view');
    const authUserName = document.getElementById('auth-user-name');
    const authUserAvatar = document.getElementById('auth-user-avatar');

    if (user) {
      if (userBadge) {
        userBadge.className = 'btn btn-glass';
        userBadge.innerHTML = `
          <div style="width: 22px; height: 22px; border-radius: 50%; background: #2563eb; display: flex; align-items: center; justify-content: center; font-size: 0.72rem; color: #fff; font-weight: 700;">
            ${(user.username || 'U')[0].toUpperCase()}
          </div>
          <span style="font-weight: 700; color: #1e40af;">@${user.username || 'Puter User'}</span>
        `;
      }
      if (userStatusText) userStatusText.textContent = `Signed in as @${user.username} (Free Quota Active)`;

      // Update #auth-modal views
      if (authUnauthView) authUnauthView.style.display = 'none';
      if (authAuthView) authAuthView.style.display = 'block';
      if (authUserName) authUserName.textContent = `@${user.username || 'user'}`;
      if (authUserAvatar) authUserAvatar.textContent = (user.username || 'U')[0].toUpperCase();
    } else {
      if (userBadge) {
        userBadge.className = 'btn btn-primary';
        userBadge.innerHTML = `<span>🔑 Sign In with Puter (Free)</span>`;
      }
      if (userStatusText) userStatusText.textContent = 'Guest Mode (Click to Sign In Free)';

      // Update #auth-modal views
      if (authUnauthView) authUnauthView.style.display = 'block';
      if (authAuthView) authAuthView.style.display = 'none';
    }
  }

  /**
   * Load model catalog with curated free models at the top
   */
  async loadModels() {
    this.models = await window.puterClient.listModels();
    const select = document.getElementById('model-select');
    if (select) {
      select.innerHTML = '';

      // Curated Flagship Free Models
      const topGroup = document.createElement('optgroup');
      topGroup.label = '⭐ Flagship Free Models (Zero API Keys)';

      const otherGroup = document.createElement('optgroup');
      otherGroup.label = '🌐 Other Available Models';

      const curatedIds = [
        'default',
        'qwen/qwen-2.5-72b-instruct',
        'qwen/qwen-2.5-coder-32b-instruct',
        'qwen/qwen3.8-flash',
        'deepseek/deepseek-chat',
        'deepseek/deepseek-reasoner',
        'openai/gpt-4o-mini',
        'anthropic/claude-3-haiku',
        'google/gemini-2.0-flash',
        'mistral/mistral-large-latest',
        'meta-llama/llama-3.3-70b-instruct'
      ];

      this.models.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.textContent = `${m.provider ? m.provider + ' - ' : ''}${m.name || m.id}`;
        if (m.id === this.activeModel) opt.selected = true;

        if (curatedIds.includes(m.id)) {
          topGroup.appendChild(opt);
        } else {
          otherGroup.appendChild(opt);
        }
      });

      select.appendChild(topGroup);
      if (otherGroup.children.length > 0) {
        select.appendChild(otherGroup);
      }

      select.value = this.activeModel;
      select.onchange = (e) => this.setActiveModel(e.target.value);
    }

    // Render Model Catalog Modal
    window.ui.renderModelsCatalog(this.models, this.activeModel, (modelId) => {
      this.setActiveModel(modelId);
      if (select) select.value = modelId;
    });
  }

  setActiveModel(modelId) {
    this.activeModel = modelId;
    window.puterClient.activeModel = modelId;
    const modelBadge = document.getElementById('active-model-display');
    if (modelBadge) {
      const found = this.models?.find(m => m.id === modelId);
      modelBadge.textContent = found ? found.name : modelId;
    }
    console.log('[PuterAgent] Active model set to:', modelId);
  }

  /**
   * Session Management
   */
  async loadSessions() {
    try {
      const stored = await window.puterClient.kvGet('agent_sessions');
      if (Array.isArray(stored) && stored.length > 0) {
        this.sessions = stored;
        this.switchSession(this.sessions[0].id);
      } else {
        this.createNewSession();
      }
    } catch {
      this.createNewSession();
    }
    this.renderSessionList();
  }

  async saveSessions() {
    await window.puterClient.kvSet('agent_sessions', this.sessions);
    this.renderSessionList();
  }

  createNewSession(title = 'New Agent Task') {
    const id = `session_${Date.now()}`;
    const newSession = {
      id,
      title,
      createdAt: new Date().toISOString(),
      messages: []
    };
    this.sessions.unshift(newSession);
    this.currentSessionId = id;
    this.saveSessions();
    this.clearChatDisplay();
    window.ui.showWelcomeHero();
    return newSession;
  }

  switchSession(sessionId) {
    const session = this.sessions.find(s => s.id === sessionId);
    if (!session) return;
    this.currentSessionId = sessionId;
    this.clearChatDisplay();

    if (session.messages.length === 0) {
      window.ui.showWelcomeHero();
    } else {
      window.ui.hideWelcomeHero();
      // Render existing messages
      for (const msg of session.messages) {
        if (msg.role === 'user') {
          window.ui.appendUserMessage(msg.content);
        } else if (msg.role === 'assistant') {
          const assistantCard = window.ui.createAssistantMessage(this.activeModel);
          window.ui.updateAssistantMessage(assistantCard.contentContainer, msg.content);
        }
      }
    }
    this.renderSessionList();
  }

  deleteSession(sessionId, e) {
    if (e) e.stopPropagation();
    this.sessions = this.sessions.filter(s => s.id !== sessionId);
    if (this.sessions.length === 0) {
      this.createNewSession();
    } else if (this.currentSessionId === sessionId) {
      this.switchSession(this.sessions[0].id);
    }
    this.saveSessions();
  }

  renderSessionList() {
    const list = document.getElementById('chat-history-list');
    if (!list) return;
    list.innerHTML = '';

    this.sessions.forEach(sess => {
      const item = document.createElement('div');
      item.className = `chat-item ${sess.id === this.currentSessionId ? 'active' : ''}`;
      item.innerHTML = `
        <span class="chat-item-title">${window.ui.escapeHtml(sess.title)}</span>
        <div class="chat-item-actions">
          <button class="chat-item-btn" title="Delete" onclick="window.app.deleteSession('${sess.id}', event)">✕</button>
        </div>
      `;
      item.onclick = () => this.switchSession(sess.id);
      list.appendChild(item);
    });
  }

  clearChatDisplay() {
    const container = document.getElementById('chat-messages');
    if (!container) return;
    const hero = document.getElementById('welcome-hero');
    container.innerHTML = '';
    if (hero) container.appendChild(hero);
  }

  /**
   * Setup Event Listeners
   */
  setupEventListeners() {
    const btnSend = document.getElementById('btn-send');
    const input = document.getElementById('chat-input');
    const btnNewChat = document.getElementById('btn-new-chat');
    const btnStopAgent = document.getElementById('btn-stop-agent');
    const userAuthBadge = document.getElementById('user-auth-badge');

    // Send button
    if (btnSend) {
      btnSend.onclick = () => this.handleSendMessage();
    }

    // Enter key to send (Shift+Enter for newline)
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.handleSendMessage();
        }
      });
    }

    // New Chat
    if (btnNewChat) {
      btnNewChat.onclick = () => this.createNewSession();
    }

    // Stop Agent Execution
    if (btnStopAgent) {
      btnStopAgent.onclick = () => {
        window.agentEngine.abort();
        window.ui.hideLiveBanner();
      };
    }

    // User Auth Badge Click -> Opens auth modal
    if (userAuthBadge) {
      userAuthBadge.onclick = () => {
        const authModal = document.getElementById('auth-modal');
        if (authModal) {
          authModal.showModal();
        }
      };
    }

    // Modal: 1-Click Browser Sign In
    const btnAuthBrowserLogin = document.getElementById('btn-auth-browser-login');
    if (btnAuthBrowserLogin) {
      btnAuthBrowserLogin.onclick = async () => {
        const statusDiv = document.getElementById('auth-browser-status');
        const statusMsg = document.getElementById('auth-browser-status-msg');
        const btnText = document.getElementById('btn-auth-browser-text');

        if (statusDiv) statusDiv.style.display = 'block';
        if (statusMsg) statusMsg.textContent = 'Opening browser... Please authorize PuterAgent.';
        if (btnText) btnText.textContent = 'Waiting for Authorization...';
        btnAuthBrowserLogin.disabled = true;

        try {
          const user = await window.puterClient.signIn();
          if (user) {
            if (statusMsg) statusMsg.textContent = `Connected as @${user.username}! Session saved.`;
            setTimeout(() => {
              document.getElementById('auth-modal')?.close();
              if (statusDiv) statusDiv.style.display = 'none';
              btnAuthBrowserLogin.disabled = false;
              if (btnText) btnText.textContent = 'Sign In via Default Browser';
            }, 600);
          } else {
            if (statusDiv) statusDiv.style.display = 'none';
            btnAuthBrowserLogin.disabled = false;
            if (btnText) btnText.textContent = 'Sign In via Default Browser';
          }
        } catch (err) {
          if (statusMsg) statusMsg.textContent = 'Error: ' + err.message;
          btnAuthBrowserLogin.disabled = false;
          if (btnText) btnText.textContent = 'Sign In via Default Browser';
        }
      };
    }

    // Modal: Manual Token Entry
    const btnAuthManualSubmit = document.getElementById('btn-auth-manual-submit');
    const authManualInput = document.getElementById('auth-manual-token-input');
    const authManualStatus = document.getElementById('auth-manual-status');

    if (btnAuthManualSubmit && authManualInput) {
      const handleManualConnect = async () => {
        const token = authManualInput.value.trim();
        if (!token) {
          if (authManualStatus) {
            authManualStatus.style.display = 'block';
            authManualStatus.style.color = '#dc2626';
            authManualStatus.textContent = 'Please enter or paste a Puter auth token.';
          }
          return;
        }

        btnAuthManualSubmit.disabled = true;
        if (authManualStatus) {
          authManualStatus.style.display = 'block';
          authManualStatus.style.color = '#2563eb';
          authManualStatus.textContent = 'Validating token with Puter...';
        }

        try {
          const user = await window.puterClient.setManualToken(token);
          if (user) {
            if (authManualStatus) {
              authManualStatus.style.color = '#16a34a';
              authManualStatus.textContent = `Connected as @${user.username}! Session saved.`;
            }
            setTimeout(() => {
              document.getElementById('auth-modal')?.close();
              authManualInput.value = '';
              if (authManualStatus) authManualStatus.style.display = 'none';
              btnAuthManualSubmit.disabled = false;
            }, 700);
          }
        } catch (err) {
          if (authManualStatus) {
            authManualStatus.style.color = '#dc2626';
            authManualStatus.textContent = err.message || 'Failed to authenticate token.';
          }
          btnAuthManualSubmit.disabled = false;
        }
      };

      btnAuthManualSubmit.onclick = handleManualConnect;
      authManualInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleManualConnect();
        }
      });
    }

    // Modal: Sign Out
    const btnAuthSignout = document.getElementById('btn-auth-signout');
    if (btnAuthSignout) {
      btnAuthSignout.onclick = async () => {
        if (confirm('Are you sure you want to sign out of Puter?')) {
          await window.puterClient.signOut();
          document.getElementById('auth-modal')?.close();
        }
      };
    }

    // Tool Toggles in Input Bar
    document.querySelectorAll('.tool-chip-toggle').forEach(chip => {
      chip.onclick = () => {
        const toolName = chip.dataset.tool;
        chip.classList.toggle('active');
        if (chip.classList.contains('active')) {
          if (!this.activeTools.includes(toolName)) this.activeTools.push(toolName);
        } else {
          this.activeTools = this.activeTools.filter(t => t !== toolName);
        }
        window.agentEngine.setActiveTools(this.activeTools);
      };
    });

    // Agent Mode Selector
    const modeSelect = document.getElementById('agent-mode-select');
    if (modeSelect) {
      modeSelect.onchange = (e) => this.setAgentPreset(e.target.value);
    }

    // Max Steps Selector
    const stepsSelect = document.getElementById('max-steps-select');
    if (stepsSelect) {
      stepsSelect.onchange = (e) => {
        this.maxSteps = parseInt(e.target.value, 10) || 5;
        window.agentEngine.setMaxSteps(this.maxSteps);
      };
    }

    // Drawer Toggles
    const btnOpenFiles = document.getElementById('btn-open-files');
    const btnCloseFiles = document.getElementById('btn-close-files');
    if (btnOpenFiles) {
      btnOpenFiles.onclick = async () => {
        const files = await window.puterClient.fsList();
        window.ui.renderFilesDrawer(files);
        document.getElementById('file-drawer')?.classList.add('open');
      };
    }
    if (btnCloseFiles) {
      btnCloseFiles.onclick = () => {
        document.getElementById('file-drawer')?.classList.remove('open');
      };
    }

    // Host on Puter Modal
    const btnOpenHost = document.getElementById('btn-open-host');
    if (btnOpenHost) {
      btnOpenHost.onclick = () => {
        document.getElementById('hosting-modal')?.showModal();
      };
    }

    // Docs Modal
    const btnOpenDocs = document.getElementById('btn-open-docs');
    if (btnOpenDocs) {
      btnOpenDocs.onclick = () => {
        document.getElementById('docs-modal')?.showModal();
      };
    }

    // Models Modal
    const btnOpenModels = document.getElementById('btn-open-models');
    if (btnOpenModels) {
      btnOpenModels.onclick = () => {
        document.getElementById('models-modal')?.showModal();
      };
    }
  }

  /**
   * Initialize Local Desktop Workspace & Integration
   */
  async initDesktopWorkspace() {
    const isDesktop = !!window.desktopAPI;
    const workspaceBtn = document.getElementById('btn-desktop-workspace');
    const label = document.getElementById('desktop-workspace-label');
    const dot = document.getElementById('desktop-indicator-dot');
    const statusTitle = document.getElementById('desktop-status-title');
    const statusBadge = document.getElementById('desktop-status-badge');
    const statusDesc = document.getElementById('desktop-status-desc');
    const folderPath = document.getElementById('desktop-active-folder-path');
    const changeFolderBtn = document.getElementById('btn-modal-change-folder');

    window.updateWorkspaceIndicator = () => {
      const ws = window.currentWorkspacePath;
      if (ws && label) {
        const folderName = ws.split(/[\\\/]/).filter(Boolean).pop() || ws;
        label.textContent = `💻 Local: ${folderName}`;
        label.title = `Local Workspace: ${ws}`;
      }
      if (folderPath && ws) folderPath.textContent = ws;
    };

    if (isDesktop) {
      try {
        const sys = await window.desktopAPI.getSystemInfo();
        let ws = window.currentWorkspacePath;
        if (!ws) {
          ws = sys.cwd;
          window.setWorkspacePath(ws);
        } else {
          window.updateWorkspaceIndicator();
        }

        if (dot) dot.style.background = '#10b981';
        if (statusTitle) statusTitle.textContent = `💻 Desktop Computer Access Active`;
        if (statusBadge) {
          statusBadge.textContent = 'CONNECTED';
          statusBadge.style.background = '#dcfce7';
          statusBadge.style.color = '#166534';
        }
        if (statusDesc) statusDesc.textContent = `Direct access to local hard drive and PowerShell shell on ${sys.platform} (${sys.arch}) - user ${sys.username}.`;
        if (changeFolderBtn) changeFolderBtn.style.display = 'inline-block';
      } catch (err) {
        console.warn('[PuterAgent Desktop] Failed to fetch system info:', err);
      }
    } else {
      if (label) label.textContent = '💻 Desktop App & Local Mode';
      if (dot) dot.style.background = '#3b82f6';
      if (statusTitle) statusTitle.textContent = `🌐 Web Browser Sandbox Mode`;
      if (statusBadge) {
        statusBadge.textContent = 'WEB BROWSER';
        statusBadge.style.background = '#eff6ff';
        statusBadge.style.color = '#1e40af';
      }
      if (statusDesc) statusDesc.textContent = `In web mode, PuterAgent uses Puter Cloud Drive. Launch the Desktop App to give PuterAgent direct local access to create files, folders, and run terminal commands on your computer.`;
      if (folderPath) folderPath.textContent = 'E:\\puterjs (Default)';
    }

    if (workspaceBtn) {
      workspaceBtn.onclick = () => {
        document.getElementById('desktop-installer-modal')?.showModal();
      };
    }
  }

  /**
   * Set Agent Preset Configurations
   */
  setAgentPreset(preset) {
    this.agentMode = preset;
    const chips = document.querySelectorAll('.tool-chip-toggle');

    if (preset === 'agentic_coder') {
      this.activeTools = [
        'local_get_workspace',
        'local_read_file',
        'local_write_file',
        'local_edit_file',
        'local_list_directory',
        'local_create_directory',
        'local_run_command',
        'local_file_exists',
        'run_javascript',
        'web_search'
      ];
      this.systemPrompt = 'You are an autonomous Agentic Coding AI with direct access to the user\'s local computer and filesystem. You can inspect project directories, read existing code, create new files and folders, make targeted code modifications, and execute PowerShell/terminal commands (npm install, git, compile, run tests) to autonomously build, fix, and deliver complete software projects.';
    } else if (preset === 'coder') {
      this.activeTools = ['run_javascript', 'render_chart', 'puter_fs_write', 'puter_fs_read', 'puter_fs_list'];
      this.systemPrompt = 'You are an autonomous Full-Stack Coder. Write clean, working code, execute scripts in the sandbox, verify correctness, and save project files to Puter Cloud drive.';
    } else if (preset === 'researcher') {
      this.activeTools = ['web_search', 'fetch_web_content', 'puter_fs_write', 'puter_kv_store'];
      this.systemPrompt = 'You are an autonomous Deep Web Researcher. Thoroughly investigate queries by searching multiple sources, fetching details, extracting facts, and synthesizing reports.';
    } else if (preset === 'creative') {
      this.activeTools = ['generate_image', 'text_to_speech', 'puter_fs_write'];
      this.systemPrompt = 'You are a Creative Studio AI. Brainstorm imaginative concepts, generate AI images using Puter txt2img, and synthesize voice narration using text_to_speech.';
    } else {
      // General Agent
      this.activeTools = [
        'local_get_workspace', 'local_read_file', 'local_write_file', 'local_edit_file',
        'local_list_directory', 'local_create_directory', 'local_run_command', 'local_file_exists',
        'local_delete_path', 'web_search', 'fetch_web_content', 'run_javascript', 'render_chart',
        'generate_image', 'puter_fs_write', 'puter_fs_read', 'puter_fs_list',
        'puter_kv_store', 'puter_kv_retrieve', 'text_to_speech'
      ];
      this.systemPrompt = '';
    }

    chips.forEach(c => {
      c.classList.toggle('active', this.activeTools.includes(c.dataset.tool));
    });
    window.agentEngine.setActiveTools(this.activeTools);
  }

  /**
   * Execute User Message with Autonomous Agent Loop
   */
  async handleSendMessage(customPrompt = '') {
    const input = document.getElementById('chat-input');
    const text = customPrompt || (input ? input.value.trim() : '');
    if (!text || window.agentEngine.isRunning) return;

    if (input) {
      input.value = '';
      input.style.height = 'auto';
    }

    // Append user message
    window.ui.appendUserMessage(text);

    const session = this.sessions.find(s => s.id === this.currentSessionId);
    if (session) {
      if (session.messages.length === 0) {
        session.title = text.slice(0, 32) + (text.length > 32 ? '...' : '');
        this.renderSessionList();
      }
      session.messages.push({ role: 'user', content: text });
    }

    // Create assistant response card
    const modelObj = this.models?.find(m => m.id === this.activeModel);
    const modelDisplayName = modelObj ? modelObj.name : this.activeModel;
    const assistantCard = window.ui.createAssistantMessage(modelDisplayName);

    // Call Agent Engine
    try {
      window.ui.showLiveBanner(1, this.maxSteps);

      const result = await window.agentEngine.run({
        messages: session ? session.messages : [{ role: 'user', content: text }],
        model: this.activeModel,
        systemPrompt: this.systemPrompt || '',
        callbacks: {
          onStepStart: ({ stepNumber, maxSteps, model }) => {
            window.ui.showLiveBanner(stepNumber, maxSteps);
          },
          onThought: ({ thoughtText }) => {
            window.ui.appendThoughtCard(assistantCard.stepsContainer, thoughtText);
          },
          onToolStart: ({ toolCallId, toolName, args }) => {
            window.ui.showLiveBanner(window.agentEngine.currentStep, this.maxSteps, toolName);
            window.ui.appendToolStartCard(assistantCard.stepsContainer, { toolCallId, toolName, args });
          },
          onToolEnd: (toolPayload) => {
            window.ui.updateToolEndCard(toolPayload);
          },
          onComplete: ({ finalResponse }) => {
            window.ui.hideLiveBanner();
            window.ui.updateAssistantMessage(assistantCard.contentContainer, finalResponse);
            if (session) {
              session.messages.push({ role: 'assistant', content: finalResponse });
              this.saveSessions();
            }
          },
          onError: ({ error }) => {
            window.ui.hideLiveBanner();

            if (error === 'AUTH_REQUIRED' || error?.includes('aborted') || error?.includes('token') || error?.includes('quota')) {
              assistantCard.contentContainer.innerHTML = `
                <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 1.25rem; margin: 0.5rem 0;">
                  <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                    <span style="font-size: 1.2rem;">🔑</span>
                    <strong style="color: #1e3a8a; font-size: 1rem;">No API Key Required — Sign In for Free Access!</strong>
                  </div>
                  <p style="color: #334155; font-size: 0.88rem; line-height: 1.55; margin-bottom: 1rem;">
                    Puter uses the <strong>User-Pays Model</strong>. You never need to pay or provide an API key. 
                    Puter gives every user free AI allowances to access Alibaba Qwen, DeepSeek, Claude, and GPT-4o.
                    Simply sign in with your free Puter account (1-click, no credit card required) to activate your tokens!
                  </p>
                  <button class="btn btn-primary" onclick="window.signInAndRetry('${encodeURIComponent(text)}')">
                    <span>🔑 Click to Sign In with Puter Free & Retry</span>
                  </button>
                </div>
              `;
            } else {
              window.ui.updateAssistantMessage(
                assistantCard.contentContainer,
                `⚠️ **Agent Notice**: ${error}\n\nClick the **Sign In with Puter** button in the header to ensure active quota.`
              );
            }
          }
        }
      });
    } catch (err) {
      console.error('[PuterAgent] Run error:', err);
      window.ui.hideLiveBanner();
    }
  }
}

// Global Helper Functions
window.signInAndRetry = async (encodedText) => {
  const text = decodeURIComponent(encodedText);
  try {
    const user = await window.puterClient.signIn();
    if (user) {
      window.app.handleSendMessage(text);
    }
  } catch (e) {
    alert('Sign in: ' + e.message);
  }
};

window.copyToClipboard = (text, btnElement) => {
  navigator.clipboard.writeText(text).then(() => {
    if (btnElement) {
      const orig = btnElement.innerHTML;
      btnElement.innerHTML = '✓ Copied!';
      setTimeout(() => { btnElement.innerHTML = orig; }, 1500);
    }
  });
};

window.copyMessageText = (messageId, btnElement) => {
  const container = document.getElementById(`content_${messageId}`);
  if (container) {
    window.copyToClipboard(container.innerText || container.textContent, btnElement);
  }
};

window.speakMessageText = async (messageId) => {
  const container = document.getElementById(`content_${messageId}`);
  if (container) {
    const text = container.innerText || container.textContent;
    try {
      await window.puterClient.txt2speech(text.slice(0, 500));
    } catch (e) {
      alert('Text-to-speech error: ' + e.message);
    }
  }
};

window.runCodeInSandbox = async (code) => {
  const res = await window.AGENT_TOOLS.run_javascript.execute({ code });
  alert('Sandbox Execution Output:\n\n' + res);
};

window.saveChartToPuter = async (chartId, title) => {
  const canvas = document.getElementById(chartId);
  if (!canvas) return;
  const dataUrl = canvas.toDataURL('image/png');
  const path = `Charts/${title.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.png`;
  try {
    await window.puterClient.fsWrite(path, dataUrl);
    alert(`Chart saved successfully to Puter Cloud: ${path}`);
  } catch (e) {
    alert('Failed to save chart: ' + e.message);
  }
};

window.exportChartPNG = (chartId) => {
  const canvas = document.getElementById(chartId);
  if (!canvas) return;
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = `chart_${Date.now()}.png`;
  a.click();
};

window.saveImageToPuter = async (encodedUrl, filename) => {
  const url = decodeURIComponent(encodedUrl);
  const path = `Images/${filename}`;
  try {
    await window.puterClient.fsWrite(path, url);
    alert(`Image saved to Puter Cloud: ${path}`);
  } catch (e) {
    alert('Failed to save image: ' + e.message);
  }
};

window.viewFileContent = async (path) => {
  try {
    const content = await window.puterClient.fsRead(path);
    alert(`--- File: ${path} ---\n\n${content.slice(0, 2000)}`);
  } catch (e) {
    alert('Could not read file: ' + e.message);
  }
};

window.deployOnPuter = async () => {
  const input = document.getElementById('host-subdomain-input');
  const statusDiv = document.getElementById('host-status-msg');
  const subdomain = input ? input.value.trim() : '';

  if (statusDiv) {
    statusDiv.innerHTML = '<span style="color: #2563eb; font-weight: 600;">🚀 Deploying to Puter Cloud Hosting...</span>';
  }

  try {
    const site = await window.puterClient.hostApp(subdomain);
    if (statusDiv) {
      statusDiv.innerHTML = `
        <div style="background: #f0fdf4; border: 1px solid #16a34a; padding: 1rem; border-radius: 8px; color: #15803d;">
          🎉 <strong>Application Deployed Successfully!</strong><br><br>
          Your app is now live at: <a href="https://${site.subdomain}.puter.site" target="_blank" style="color: #2563eb; text-decoration: underline; font-weight: 700;">https://${site.subdomain}.puter.site</a>
        </div>
      `;
    }
  } catch (e) {
    if (statusDiv) {
      statusDiv.innerHTML = `<span style="color: #b91c1c; font-weight: 600;">❌ Deployment failed: ${e.message}</span>`;
    }
  }
};

window.selectLocalWorkspace = async () => {
  if (window.desktopAPI) {
    const res = await window.desktopAPI.selectDirectory(window.currentWorkspacePath);
    if (!res.canceled && res.path) {
      window.setWorkspacePath(res.path);
      const folderPath = document.getElementById('desktop-active-folder-path');
      if (folderPath) folderPath.textContent = res.path;
      const label = document.getElementById('desktop-workspace-label');
      if (label) {
        const folderName = res.path.split(/[\\\/]/).filter(Boolean).pop() || res.path;
        label.textContent = `💻 Local: ${folderName}`;
        label.title = `Local Workspace: ${res.path}`;
      }
      alert(`Active Local Workspace set to:\n${res.path}\n\nPuterAgent can now create files, edit code, and run terminal commands in this folder.`);
    }
  } else {
    alert('To select a local directory and grant computer access, please run PuterAgent via the Desktop Installer or "npm start"!');
  }
};

// Initialize app when window loads
window.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
  window.app.init();
});
