/**
 * PuterAgent Studio - Puter.js Client Wrapper
 * Handles Authentication, AI Chat, Streaming, Image Gen, TTS, KV Store, FS, and Hosting.
 */

class PuterClient {
  constructor() {
    this.isReady = false;
    this.currentUser = null;
    this.activeModel = 'default'; // Use Puter's high-speed auto-routed default model
    this.onUserChangeCallbacks = [];
  }

  /**
   * Initialize Puter.js and check authentication state
   */
  async init() {
    // If running in Desktop app, restore persistently saved auth token
    if (window.desktopAPI?.getSavedToken) {
      try {
        const savedToken = await window.desktopAPI.getSavedToken();
        if (savedToken && typeof savedToken === 'string') {
          console.log('[PuterClient] Restoring persistent Desktop Puter auth token...');
          if (window.puter?.setAuthToken) {
            window.puter.setAuthToken(savedToken);
          }
          try {
            localStorage.setItem('puter.auth.token', savedToken);
          } catch {}
        }
      } catch (e) {
        console.warn('[PuterClient] Could not read saved token:', e);
      }
    }

    if (typeof window.puter !== 'undefined') {
      this.isReady = true;
      await this.checkAuth();
      return true;
    }

    // Wait for Puter script to load if needed
    return new Promise((resolve) => {
      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;
        if (typeof window.puter !== 'undefined') {
          clearInterval(interval);
          this.isReady = true;
          // Apply desktop token if was waiting for script
          if (window.desktopAPI?.getSavedToken) {
            try {
              const savedToken = await window.desktopAPI.getSavedToken();
              if (savedToken && window.puter?.setAuthToken) {
                window.puter.setAuthToken(savedToken);
              }
            } catch {}
          }
          await this.checkAuth();
          resolve(true);
        } else if (attempts > 30) {
          clearInterval(interval);
          console.warn('[PuterClient] Puter.js not detected on window, using offline mock fallback');
          this.isReady = false;
          resolve(false);
        }
      }, 100);
    });
  }

  /**
   * Check if user is signed in to Puter
   */
  async checkAuth() {
    if (!this.isReady || !window.puter?.auth) return null;
    try {
      // Ensure token from desktop is set
      if (window.desktopAPI?.getSavedToken && !window.puter.authToken) {
        const savedToken = await window.desktopAPI.getSavedToken();
        if (savedToken && window.puter.setAuthToken) {
          window.puter.setAuthToken(savedToken);
        }
      }

      const signedIn = await window.puter.auth.isSignedIn();
      if (signedIn) {
        this.currentUser = await window.puter.auth.getUser();
        // Save active token to desktop persistence
        if (this.currentUser && window.desktopAPI?.saveToken && window.puter.authToken) {
          await window.desktopAPI.saveToken(window.puter.authToken);
        }
      } else {
        this.currentUser = null;
      }
      this.notifyUserChange();
      return this.currentUser;
    } catch (err) {
      console.error('[PuterClient] Error checking auth:', err);
      this.currentUser = null;
      this.notifyUserChange();
      return null;
    }
  }

  /**
   * Sign in with Puter account (Desktop OAuth redirect or Web popup)
   */
  async signIn() {
    // 1. Desktop Mode: Native Browser OAuth Loop (bypasses Electron child popup issues)
    if (window.desktopAPI?.loginPuter) {
      try {
        console.log('[PuterClient] Initiating Desktop OAuth Loop via default browser...');
        const res = await window.desktopAPI.loginPuter();
        if (res && res.success && res.token) {
          if (window.puter?.setAuthToken) {
            window.puter.setAuthToken(res.token);
          }
          try {
            localStorage.setItem('puter.auth.token', res.token);
          } catch {}
          if (window.desktopAPI?.saveToken) {
            await window.desktopAPI.saveToken(res.token);
          }
          await this.checkAuth();
          return this.currentUser;
        } else if (res && res.error) {
          alert('Desktop Sign-In: ' + res.error);
          return null;
        }
      } catch (err) {
        console.error('[PuterClient] Desktop sign-in error:', err);
        alert('Desktop Sign-In error: ' + err.message);
        return null;
      }
    }

    // 2. Web Mode: Standard Puter Auth Popup
    if (!this.isReady || !window.puter?.auth) {
      alert('Puter.js is loading or unavailable. Please check your internet connection.');
      return null;
    }
    try {
      await window.puter.auth.signIn();
      await this.checkAuth();
      return this.currentUser;
    } catch (err) {
      console.error('[PuterClient] Sign in cancelled or failed:', err);
      return null;
    }
  }

  /**
   * Manually connect with a Puter Auth Token from puter.com/dashboard#account
   */
  async setManualToken(token) {
    if (!token || typeof token !== 'string') {
      throw new Error('Please enter a valid Puter auth token.');
    }
    const cleanToken = token.trim();
    if (window.puter?.setAuthToken) {
      window.puter.setAuthToken(cleanToken);
    }
    try {
      localStorage.setItem('puter.auth.token', cleanToken);
    } catch {}
    if (window.desktopAPI?.saveToken) {
      await window.desktopAPI.saveToken(cleanToken);
    }
    const user = await this.checkAuth();
    if (!user) {
      if (window.desktopAPI?.clearToken) await window.desktopAPI.clearToken();
      throw new Error('The token could not be verified by Puter. Please check that you copied the complete token from puter.com/dashboard#account.');
    }
    return user;
  }

  /**
   * Sign out of Puter
   */
  async signOut() {
    if (window.desktopAPI?.clearToken) {
      await window.desktopAPI.clearToken();
    }
    try {
      localStorage.removeItem('puter.auth.token');
    } catch {}
    if (this.isReady && window.puter?.auth?.signOut) {
      try {
        await window.puter.auth.signOut();
      } catch {}
    }
    this.currentUser = null;
    this.notifyUserChange();
  }

  onUserChange(callback) {
    this.onUserChangeCallbacks.push(callback);
  }

  notifyUserChange() {
    for (const cb of this.onUserChangeCallbacks) {
      try { cb(this.currentUser); } catch (e) { console.error(e); }
    }
  }

  /**
   * List available AI models with rock-solid, verified free models first
   */
  async listModels() {
    // 1. Curated, 100% verified free working models
    const verifiedModels = [
      { id: 'default', name: '⚡ Puter Auto-Routed AI (Fastest & 100% Free)', provider: 'Puter AI', desc: 'Auto-selects the fastest available free model on Puter', free: true },
      { id: 'qwen/qwen-2.5-72b-instruct', name: 'Alibaba Qwen 2.5 72B Instruct', provider: 'Alibaba Qwen', desc: 'Flagship multilingual reasoning, coding, and agentic workflows', free: true },
      { id: 'qwen/qwen-2.5-coder-32b-instruct', name: 'Alibaba Qwen 2.5 Coder 32B', provider: 'Alibaba Qwen', desc: 'Specialized for code generation, bug fixing, and script execution', free: true },
      { id: 'deepseek/deepseek-chat', name: 'DeepSeek V3 Chat', provider: 'DeepSeek', desc: 'Elite general intelligence, math, and code benchmark leader', free: true },
      { id: 'deepseek/deepseek-reasoner', name: 'DeepSeek R1 Reasoner', provider: 'DeepSeek', desc: 'Deep Chain-of-Thought reasoning, complex problem solving', free: true },
      { id: 'openai/gpt-4o-mini', name: 'OpenAI GPT-4o Mini', provider: 'OpenAI', desc: 'Fast, lightweight and cost-effective daily driver', free: true },
      { id: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku', provider: 'Anthropic', desc: 'Near-instant responses for high-throughput chats', free: true },
      { id: 'google/gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'Google', desc: 'Next-gen speed with multimodal and tool-use prowess', free: true }
    ];

    if (this.isReady && window.puter?.ai?.listModels) {
      try {
        const rawModels = await window.puter.ai.listModels();
        if (Array.isArray(rawModels) && rawModels.length > 0) {
          // Filter out preview/experimental drivers that often report 'AI provider unavailable'
          const cleanExtra = rawModels.filter(m => {
            const name = (m.name || m.id || '').toLowerCase();
            return !name.includes('preview') && !name.includes('infron') && !name.includes('internal');
          });
          // Merge avoiding duplicates
          const seenIds = new Set(verifiedModels.map(m => m.id));
          for (const m of cleanExtra) {
            if (!seenIds.has(m.id)) {
              seenIds.add(m.id);
              verifiedModels.push(m);
            }
          }
        }
      } catch (err) {
        console.warn('[PuterClient] Could not fetch extra models dynamically, using curated list:', err);
      }
    }

    return verifiedModels;
  }

  /**
   * Execute chat completion via puter.ai.chat() with multi-tier automatic fallback
   */
  async chat(messages, options = {}) {
    if (!this.isReady || !window.puter?.ai?.chat) {
      throw new Error('Puter.js is not loaded. Please ensure internet access to https://js.puter.com/v2/');
    }

    const selectedModel = options.model || this.activeModel;
    const requestOptions = { ...options };

    // When model is 'default', omit model property so Puter's auto-router handles it
    if (!selectedModel || selectedModel === 'default') {
      delete requestOptions.model;
    } else {
      requestOptions.model = selectedModel;
    }

    try {
      return await window.puter.ai.chat(messages, requestOptions);
    } catch (err) {
      console.warn(`[PuterClient] Model "${selectedModel}" failed with:`, err.message);

      // Auto-fallback sequence if the selected model is unavailable or encounters a driver error
      if (
        err.message?.includes('unavailable') ||
        err.message?.includes('aborted') ||
        err.message?.includes('driver') ||
        err.message?.includes('500') ||
        err.message?.includes('404')
      ) {
        console.log('[PuterClient] Attempting automatic fallback to Puter default auto-route...');
        const fallbackOptions = { ...options };
        delete fallbackOptions.model; // Use Puter default

        try {
          return await window.puter.ai.chat(messages, fallbackOptions);
        } catch (fallbackErr) {
          console.warn('[PuterClient] Default fallback failed, attempting fallback to gpt-4o-mini:', fallbackErr);
          fallbackOptions.model = 'gpt-4o-mini';
          return await window.puter.ai.chat(messages, fallbackOptions);
        }
      }

      throw err;
    }
  }

  /**
   * Generate an image from prompt using puter.ai.txt2img()
   */
  async txt2img(prompt) {
    if (!this.isReady || !window.puter?.ai?.txt2img) {
      throw new Error('Puter AI Image generation is not available');
    }
    return await window.puter.ai.txt2img(prompt);
  }

  /**
   * Text-to-speech audio generation via puter.ai.txt2speech()
   */
  async txt2speech(text) {
    if (!this.isReady || !window.puter?.ai?.txt2speech) {
      throw new Error('Puter Text-to-Speech is not available');
    }
    return await window.puter.ai.txt2speech(text);
  }

  /**
   * Key-Value Store: Set
   */
  async kvSet(key, value) {
    if (this.isReady && window.puter?.kv?.set && this.currentUser) {
      try {
        await window.puter.kv.set(key, value);
        return true;
      } catch (e) {
        console.warn('[PuterClient] Cloud KV set failed, falling back to local storage:', e);
      }
    }
    localStorage.setItem(`puteragent_kv_${key}`, JSON.stringify(value));
    return true;
  }

  /**
   * Key-Value Store: Get
   */
  async kvGet(key) {
    if (this.isReady && window.puter?.kv?.get && this.currentUser) {
      try {
        const val = await window.puter.kv.get(key);
        if (val !== undefined && val !== null) return val;
      } catch (e) {
        console.warn('[PuterClient] Cloud KV get failed, falling back to local storage:', e);
      }
    }
    const local = localStorage.getItem(`puteragent_kv_${key}`);
    return local ? JSON.parse(local) : null;
  }

  /**
   * Key-Value Store: Delete
   */
  async kvDel(key) {
    if (this.isReady && window.puter?.kv?.del && this.currentUser) {
      try {
        await window.puter.kv.del(key);
      } catch (e) {
        console.warn('[PuterClient] Cloud KV del failed:', e);
      }
    }
    localStorage.removeItem(`puteragent_kv_${key}`);
    return true;
  }

  /**
   * Key-Value Store: List Keys
   */
  async kvList() {
    if (this.isReady && window.puter?.kv?.list && this.currentUser) {
      try {
        return await window.puter.kv.list();
      } catch (e) {
        console.warn('[PuterClient] Cloud KV list failed:', e);
      }
    }
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('puteragent_kv_')) {
        keys.push(k.replace('puteragent_kv_', ''));
      }
    }
    return keys;
  }

  /**
   * Filesystem: Write file to Puter Cloud
   */
  async fsWrite(path, content, options = { overwrite: true, createMissingParents: true }) {
    if (this.isReady && window.puter?.fs?.write && this.currentUser) {
      return await window.puter.fs.write(path, content, options);
    }
    // Local fallback for guest users
    const files = JSON.parse(localStorage.getItem('puteragent_virtual_fs') || '{}');
    files[path] = {
      path,
      content,
      name: path.split('/').pop(),
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem('puteragent_virtual_fs', JSON.stringify(files));
    return { name: path.split('/').pop(), path, size: content.length };
  }

  /**
   * Filesystem: Read file from Puter Cloud
   */
  async fsRead(path) {
    if (this.isReady && window.puter?.fs?.read && this.currentUser) {
      const file = await window.puter.fs.read(path);
      if (file instanceof Blob) {
        return await file.text();
      }
      return file;
    }
    const files = JSON.parse(localStorage.getItem('puteragent_virtual_fs') || '{}');
    if (files[path]) {
      return files[path].content;
    }
    throw new Error(`File not found: ${path}`);
  }

  /**
   * Filesystem: List files in Puter Cloud
   */
  async fsList(dirPath = '') {
    if (this.isReady && window.puter?.fs?.readdir && this.currentUser) {
      try {
        return await window.puter.fs.readdir(dirPath || '.');
      } catch (e) {
        console.warn('[PuterClient] fs.readdir failed:', e);
      }
    }
    const files = JSON.parse(localStorage.getItem('puteragent_virtual_fs') || '{}');
    return Object.values(files).map(f => ({
      name: f.name,
      path: f.path,
      is_dir: false,
      size: f.content.length,
      modified: f.updatedAt
    }));
  }

  /**
   * One-Click App Hosting on Puter
   */
  async hostApp(subdomain = '') {
    if (!this.isReady || !window.puter?.hosting?.create) {
      throw new Error('Puter Hosting API is unavailable. Please sign in to Puter.');
    }
    return await window.puter.hosting.create(subdomain, '.');
  }
}

// Export singleton
window.puterClient = new PuterClient();
