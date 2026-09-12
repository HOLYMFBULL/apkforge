const fs = require('fs');
const path = require('path');
const os = require('os');
const { selectMenu } = require('./selector');
const { showBanner } = require('./banner');

const CONFIG_DIR = path.join(os.homedir(), '.config', 'apkforge');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

function ensureConfigDir() {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });

  try {
    fs.chmodSync(CONFIG_DIR, 0o700);
  } catch {}
}

function loadConfig() {
  try {
    if (!fs.existsSync(CONFIG_FILE)) return null;

    const data = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));

    if (!data.apiKey || typeof data.apiKey !== 'string') {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

function saveApiKey(apiKey) {
  ensureConfigDir();

  const config = {
    apiKey: apiKey.trim()
  };

  fs.writeFileSync(
    CONFIG_FILE,
    JSON.stringify(config, null, 2),
    { mode: 0o600 }
  );

  try {
    fs.chmodSync(CONFIG_FILE, 0o600);
  } catch {}
}

function removeApiKey() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      fs.unlinkSync(CONFIG_FILE);
    }
  } catch {}
}

function readHiddenInput(prompt) {
  return new Promise(resolve => {
    process.stdout.write(prompt);

    if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== 'function') {
      process.stdout.write('\n');
      resolve('');
      return;
    }

    let value = '';

    const cleanup = () => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.removeListener('data', onData);
      process.stdout.write('\n');
    };

    const onData = data => {
      const key = data.toString();

      if (key === '\u0003') {
        cleanup();
        resolve('');
        return;
      }

      if (key === '\r' || key === '\n') {
        cleanup();
        resolve(value);
        return;
      }

      if (key === '\u007f' || key === '\b') {
        if (value.length > 0) {
          value = value.slice(0, -1);
          process.stdout.write('\b \b');
        }
        return;
      }

      if (key >= ' ' && key <= '~') {
        value += key;
        process.stdout.write('*');
      }
    };

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', onData);
  });
}

async function enterApiKey() {
  console.log('');
  showBanner();
  console.log('');
  console.log('🤖 AI AGENT SETUP');
  console.log('────────────────────────────────────────');
  console.log('');
  console.log('Enter your AI API key.');
  console.log('The key will be stored privately in Termux.');
  console.log('');

  const key = await readHiddenInput('API key: ');

  if (!key.trim()) {
    console.log('❌ No API key entered.');
    return null;
  }

  saveApiKey(key.trim());

  console.log('✓ API key saved securely.');
  return key.trim();
}

async function setupAgent() {
  ensureConfigDir();

  let config = loadConfig();

  if (!config) {
    const result = await selectMenu('🤖 AI AGENT SETUP', [
      'Enter API key',
      'Exit'
    ]);

    if (!result || result.index === 1) {
      return null;
    }

    return await enterApiKey();
  }

  while (true) {
    const result = await selectMenu('🔑 SAVED API KEY FOUND', [
      'Use saved key',
      'Change API key',
      'Remove API key',
      'Exit'
    ]);

    if (!result) {
      return null;
    }

    if (result.index === 0) {
      return config.apiKey;
    }

    if (result.index === 1) {
      const newKey = await enterApiKey();

      if (newKey) {
        config = loadConfig();
        return newKey;
      }

      continue;
    }

    if (result.index === 2) {
      removeApiKey();
      console.log('✓ Saved API key removed.');
      return null;
    }

    if (result.index === 3) {
      return null;
    }
  }
}

module.exports = {
  setupAgent,
  loadConfig,
  saveApiKey,
  removeApiKey
};
