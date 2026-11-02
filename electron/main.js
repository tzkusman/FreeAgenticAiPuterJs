const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const os = require('os');
const { exec, spawn } = require('child_process');

let mainWindow = null;
let server = null;
let serverPort = null;

// Built-in lightweight local HTTP server for standard origin & seamless Puter.js auth popups
function startLocalServer(rootDir) {
  return new Promise((resolve, reject) => {
    const mimeTypes = {
      '.html': 'text/html; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
      '.woff2': 'font/woff2',
      '.woff': 'font/woff',
      '.ttf': 'font/ttf'
    };

    server = http.createServer((req, res) => {
      let reqPath = decodeURI(req.url.split('?')[0]);
      if (reqPath === '/' || reqPath === '') {
        reqPath = '/index.html';
      }

      const safePath = path.normalize(path.join(rootDir, reqPath));
      if (!safePath.startsWith(rootDir)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }

      fs.stat(safePath, (err, stats) => {
        if (err || !stats.isFile()) {
          // If directory, try index.html
          const indexPath = path.join(safePath, 'index.html');
          if (fs.existsSync(indexPath)) {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            fs.createReadStream(indexPath).pipe(res);
            return;
          }
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('404 Not Found');
          return;
        }

        const ext = path.extname(safePath).toLowerCase();
        const contentType = mimeTypes[ext] || 'application/octet-stream';
        res.writeHead(200, {
          'Content-Type': contentType,
          'Cache-Control': 'no-cache',
          'Access-Control-Allow-Origin': '*'
        });
        fs.createReadStream(safePath).pipe(res);
      });
    });

    const preferredPorts = [39281, 39282, 39283, 39284, 39285, 0];
    let portIndex = 0;

    function tryListen() {
      const portToTry = preferredPorts[portIndex];
      server.listen(portToTry, '127.0.0.1', () => {
        serverPort = server.address().port;
        console.log(`[PuterAgent Electron] Local server running on http://127.0.0.1:${serverPort}`);
        resolve(serverPort);
      });

      server.once('error', (err) => {
        if (err.code === 'EADDRINUSE' && portIndex < preferredPorts.length - 1) {
          portIndex++;
          tryListen();
        } else {
          reject(err);
        }
      });
    }

    tryListen();
  });
}

// ---------------------------------------------------------------------------
// NATIVE PUTER AUTH TOKEN PERSISTENCE (AppData/puter_auth.json)
// ---------------------------------------------------------------------------
function getAuthFilePath() {
  const userData = app.getPath('userData');
  return path.join(userData, 'puter_auth.json');
}

function readSavedAuthToken() {
  try {
    const p = getAuthFilePath();
    if (fs.existsSync(p)) {
      const data = JSON.parse(fs.readFileSync(p, 'utf8'));
      return data.token || null;
    }
  } catch (err) {
    console.warn('[PuterAgent Desktop] Failed to read saved auth token:', err);
  }
  return null;
}

function writeSavedAuthToken(token) {
  try {
    const p = getAuthFilePath();
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, JSON.stringify({ token, savedAt: new Date().toISOString() }, null, 2), 'utf8');
    console.log('[PuterAgent Desktop] Auth token saved successfully to', p);
  } catch (err) {
    console.warn('[PuterAgent Desktop] Failed to save auth token:', err);
  }
}

function clearSavedAuthToken() {
  try {
    const p = getAuthFilePath();
    if (fs.existsSync(p)) {
      fs.unlinkSync(p);
      console.log('[PuterAgent Desktop] Auth token cleared.');
    }
  } catch (err) {
    console.warn('[PuterAgent Desktop] Failed to clear auth token:', err);
  }
}

async function createWindow() {
  const rootDir = path.resolve(__dirname, '..');
  serverPort = await startLocalServer(rootDir);

  mainWindow = new BrowserWindow({
    width: 1420,
    height: 920,
    minWidth: 960,
    minHeight: 640,
    title: 'PuterAgent Studio - Autonomous Coding OS',
    icon: path.join(rootDir, 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webSecurity: true
    },
    backgroundColor: '#0a1020',
    show: false
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Handle external URLs vs Puter login popups
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // If it is Puter login or auth dialog, allow popup window inside Electron
    if (url.includes('puter.com') || url.includes('js.puter.com') || url.startsWith('http://127.0.0.1')) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 520,
          height: 680,
          autoHideMenuBar: true,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
          }
        }
      };
    }
    // For other web links (documentation, external sites), open in default OS browser
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.loadURL(`http://127.0.0.1:${serverPort}`);
}

// ---------------------------------------------------------------------------
// IPC HANDLERS: Native Local Computer Access & Puter Authentication
// ---------------------------------------------------------------------------

// 0. Puter Authentication & Token Storage
ipcMain.handle('desktop:get-saved-token', async () => {
  return readSavedAuthToken();
});

ipcMain.handle('desktop:save-token', async (event, token) => {
  if (token && typeof token === 'string') {
    writeSavedAuthToken(token.trim());
    return { success: true };
  }
  return { success: false, error: 'Invalid token' };
});

ipcMain.handle('desktop:clear-token', async () => {
  clearSavedAuthToken();
  return { success: true };
});

ipcMain.handle('desktop:login-puter', async () => {
  const crypto = require('crypto');
  const state = crypto.randomBytes(24).toString('base64url');
  
  return new Promise((resolve) => {
    let consumed = false;
    let authServer = null;

    const timeout = setTimeout(() => {
      if (!consumed) {
        consumed = true;
        if (authServer) {
          try { authServer.close(); } catch {}
        }
        resolve({ success: false, error: 'Authentication timed out. Please try again or paste your token manually.' });
      }
    }, 5 * 60 * 1000); // 5 min timeout

    authServer = http.createServer((req, res) => {
      let callbackUrl;
      try {
        callbackUrl = new URL(req.url, 'http://127.0.0.1/');
      } catch {
        res.writeHead(400);
        res.end('Invalid authentication callback.');
        return;
      }

      const token = callbackUrl.searchParams.get('token');
      const returnedState = callbackUrl.searchParams.get('state');

      if (consumed || req.method !== 'GET' || callbackUrl.pathname !== '/' || returnedState !== state || !token) {
        res.writeHead(400);
        res.end('Invalid or expired authentication callback.');
        return;
      }

      consumed = true;
      clearTimeout(timeout);
      try { authServer.close(); } catch {}

      writeSavedAuthToken(token);

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Authentication Successful - PuterAgent Studio</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background: #0a1020;
      color: #f8fafc;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0;
    }
    .card {
      background: #0f172a;
      border: 1px solid #2563eb;
      border-radius: 16px;
      padding: 40px;
      text-align: center;
      max-width: 440px;
      box-shadow: 0 20px 50px rgba(0,0,0,0.6);
    }
    .badge {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: #2563eb;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      margin: 0 auto 20px;
    }
    h1 { font-size: 22px; margin-bottom: 10px; color: #fff; font-weight: 700; }
    p { color: #94a3b8; font-size: 15px; line-height: 1.6; margin-bottom: 0; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">&#x2713;</div>
    <h1>Authentication Successful</h1>
    <p>Your Puter account is now connected to PuterAgent Studio Desktop. You may close this tab and return to the application.</p>
  </div>
</body>
</html>`);

      resolve({ success: true, token });
    });

    authServer.listen(0, '127.0.0.1', function() {
      const callbackPort = this.address().port;
      const callbackUrl = `http://127.0.0.1:${callbackPort}/?state=${state}`;
      const puterAuthUrl = `https://puter.com/?action=authme&redirectURL=${encodeURIComponent(callbackUrl)}`;
      
      console.log(`[PuterAgent Desktop] Opening Puter auth in browser: ${puterAuthUrl}`);
      shell.openExternal(puterAuthUrl).catch(err => {
        clearTimeout(timeout);
        try { authServer.close(); } catch {}
        resolve({ success: false, error: `Failed to open system browser: ${err.message}` });
      });
    });
  });
});

// 1. System Info
ipcMain.handle('desktop:get-system-info', async () => {
  return {
    platform: process.platform,
    arch: process.arch,
    release: os.release(),
    hostname: os.hostname(),
    username: os.userInfo().username,
    homedir: os.homedir(),
    cwd: process.cwd(),
    cpus: os.cpus().length,
    totalMemoryGB: (os.totalmem() / (1024 ** 3)).toFixed(1),
    freeMemoryGB: (os.freemem() / (1024 ** 3)).toFixed(1)
  };
});

// 2. Select Workspace Directory
ipcMain.handle('desktop:select-directory', async (event, defaultPath) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Local Workspace / Project Folder',
    defaultPath: defaultPath || process.cwd(),
    properties: ['openDirectory', 'createDirectory']
  });

  if (result.canceled || !result.filePaths.length) {
    return { canceled: true, path: null };
  }
  return { canceled: false, path: result.filePaths[0] };
});

// 3. Read Local File
ipcMain.handle('desktop:read-file', async (event, { filePath, encoding = 'utf-8', startLine, endLine }) => {
  try {
    const resolvedPath = path.resolve(filePath);
    if (!fs.existsSync(resolvedPath)) {
      return { success: false, error: `File not found: ${resolvedPath}` };
    }
    const stat = await fs.promises.stat(resolvedPath);
    if (stat.isDirectory()) {
      return { success: false, error: `Target path is a directory, not a file: ${resolvedPath}` };
    }

    const content = await fs.promises.readFile(resolvedPath, encoding);

    // If slice requested
    if (typeof startLine === 'number' || typeof endLine === 'number') {
      const lines = content.split('\n');
      const start = Math.max(1, startLine || 1) - 1;
      const end = Math.min(lines.length, endLine || lines.length);
      const sliced = lines.slice(start, end).join('\n');
      return {
        success: true,
        filePath: resolvedPath,
        content: sliced,
        totalLines: lines.length,
        startLine: start + 1,
        endLine: end,
        sizeBytes: stat.size
      };
    }

    return {
      success: true,
      filePath: resolvedPath,
      content,
      totalLines: content.split('\n').length,
      sizeBytes: stat.size
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// 4. Write Local File (Creates parent folders automatically)
ipcMain.handle('desktop:write-file', async (event, { filePath, content, append = false }) => {
  try {
    const resolvedPath = path.resolve(filePath);
    const dir = path.dirname(resolvedPath);
    await fs.promises.mkdir(dir, { recursive: true });

    if (append) {
      await fs.promises.appendFile(resolvedPath, content, 'utf-8');
    } else {
      await fs.promises.writeFile(resolvedPath, content, 'utf-8');
    }

    const stat = await fs.promises.stat(resolvedPath);
    return {
      success: true,
      filePath: resolvedPath,
      sizeBytes: stat.size,
      lines: content.split('\n').length
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// 5. Edit Local File (Targeted string replacement)
ipcMain.handle('desktop:edit-file', async (event, { filePath, targetContent, replacementContent, allowMultiple = false }) => {
  try {
    const resolvedPath = path.resolve(filePath);
    if (!fs.existsSync(resolvedPath)) {
      return { success: false, error: `File not found: ${resolvedPath}` };
    }

    let content = await fs.promises.readFile(resolvedPath, 'utf-8');
    if (!content.includes(targetContent)) {
      return {
        success: false,
        error: `Target content to replace was not found in ${resolvedPath}. Please verify exact lines/whitespace.`
      };
    }

    const occurrences = content.split(targetContent).length - 1;
    if (occurrences > 1 && !allowMultiple) {
      return {
        success: false,
        error: `Found ${occurrences} occurrences of targetContent in ${resolvedPath}. Specify more surrounding lines to make it unique, or set allowMultiple to true.`
      };
    }

    let newContent;
    if (allowMultiple) {
      newContent = content.replaceAll(targetContent, replacementContent);
    } else {
      newContent = content.replace(targetContent, replacementContent);
    }

    await fs.promises.writeFile(resolvedPath, newContent, 'utf-8');
    return {
      success: true,
      filePath: resolvedPath,
      occurrencesReplaced: occurrences,
      sizeBytes: Buffer.byteLength(newContent, 'utf-8')
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// 6. List Directory
ipcMain.handle('desktop:list-directory', async (event, { dirPath, recursive = false, maxDepth = 2, showHidden = false }) => {
  try {
    const resolvedPath = path.resolve(dirPath || process.cwd());
    if (!fs.existsSync(resolvedPath)) {
      return { success: false, error: `Directory not found: ${resolvedPath}` };
    }

    async function walk(currentPath, currentDepth) {
      const dirents = await fs.promises.readdir(currentPath, { withFileTypes: true });
      const items = [];

      for (const dirent of dirents) {
        if (!showHidden && dirent.name.startsWith('.') && dirent.name !== '.env') {
          // Skip hidden dotfiles except .env
          continue;
        }
        if (dirent.name === 'node_modules' || dirent.name === '.git') {
          // Skip huge metadata folders
          items.push({
            name: dirent.name,
            path: path.join(currentPath, dirent.name),
            isDirectory: true,
            size: 0,
            isPackageCache: true
          });
          continue;
        }

        const fullPath = path.join(currentPath, dirent.name);
        const isDir = dirent.isDirectory();
        let size = 0;
        try {
          if (!isDir) {
            const stat = await fs.promises.stat(fullPath);
            size = stat.size;
          }
        } catch { }

        const entry = {
          name: dirent.name,
          path: fullPath,
          relativePath: path.relative(resolvedPath, fullPath).replace(/\\/g, '/'),
          isDirectory: isDir,
          size
        };

        if (isDir && recursive && currentDepth < maxDepth) {
          entry.children = await walk(fullPath, currentDepth + 1);
        }

        items.push(entry);
      }
      return items;
    }

    const items = await walk(resolvedPath, 1);
    return {
      success: true,
      directory: resolvedPath,
      totalItems: items.length,
      items
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// 7. Create Directory
ipcMain.handle('desktop:create-directory', async (event, { dirPath }) => {
  try {
    const resolvedPath = path.resolve(dirPath);
    await fs.promises.mkdir(resolvedPath, { recursive: true });
    return { success: true, directory: resolvedPath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// 8. Delete File or Directory
ipcMain.handle('desktop:delete-path', async (event, { targetPath, recursive = false }) => {
  try {
    const resolvedPath = path.resolve(targetPath);
    if (!fs.existsSync(resolvedPath)) {
      return { success: false, error: `Path does not exist: ${resolvedPath}` };
    }

    const stat = await fs.promises.stat(resolvedPath);
    if (stat.isDirectory()) {
      await fs.promises.rm(resolvedPath, { recursive, force: true });
    } else {
      await fs.promises.unlink(resolvedPath);
    }
    return { success: true, path: resolvedPath, wasDirectory: stat.isDirectory() };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// 9. File/Folder Exists
ipcMain.handle('desktop:exists', async (event, { targetPath }) => {
  try {
    const resolvedPath = path.resolve(targetPath);
    const exists = fs.existsSync(resolvedPath);
    let isDirectory = false;
    let size = 0;
    if (exists) {
      const stat = await fs.promises.stat(resolvedPath);
      isDirectory = stat.isDirectory();
      size = stat.size;
    }
    return { success: true, exists, isDirectory, size, path: resolvedPath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// 10. Run Shell Command (PowerShell / CMD / Bash)
ipcMain.handle('desktop:run-command', async (event, { command, cwd, timeout = 120000 }) => {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const workingDir = cwd ? path.resolve(cwd) : process.cwd();

    // Use PowerShell on Windows for modern command-line compatibility
    const shellOpt = process.platform === 'win32' ? 'powershell.exe' : '/bin/bash';

    const child = exec(command, {
      cwd: workingDir,
      timeout,
      shell: shellOpt,
      maxBuffer: 10 * 1024 * 1024, // 10 MB buffer
      windowsHide: true,
      env: { ...process.env, PAGER: 'cat' }
    }, (error, stdout, stderr) => {
      const durationMs = Date.now() - startTime;
      if (error) {
        resolve({
          success: false,
          command,
          cwd: workingDir,
          stdout: stdout ? stdout.trim() : '',
          stderr: stderr ? stderr.trim() : '',
          exitCode: typeof error.code === 'number' ? error.code : 1,
          timedOut: error.killed && error.signal === 'SIGTERM',
          durationMs,
          error: error.message
        });
      } else {
        resolve({
          success: true,
          command,
          cwd: workingDir,
          stdout: stdout ? stdout.trim() : '',
          stderr: stderr ? stderr.trim() : '',
          exitCode: 0,
          durationMs
        });
      }
    });
  });
});

// 11. Reveal in Explorer
ipcMain.handle('desktop:reveal-in-folder', async (event, targetPath) => {
  const resolved = path.resolve(targetPath);
  shell.showItemInFolder(resolved);
  return { success: true };
});

// App Lifecycle
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (server) {
    server.close();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
