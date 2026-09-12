const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { showBanner } = require('./banner');

const STORAGE_ROOT = '/storage/emulated/0';

function lsDirectory(dir) {
  try {
    const output = execFileSync(
      'ls',
      ['-la', '--color=never', dir],
      { encoding: 'utf8' }
    );

    const entries = [];

    for (const line of output.split('\n')) {
      if (!line.trim() || line.startsWith('total ')) continue;

      const match = line.match(/^([d-][^\s]*)\s+\S+\s+\S+\s+\S+\s+\S+\s+\S+\s+(.+)$/);

      if (!match) continue;

      const permissions = match[1];
      let name = match[2].trim();

      if (name === '.' || name === '..') continue;

      // ls may quote filenames containing spaces.
      if (
        (name.startsWith("'") && name.endsWith("'")) ||
        (name.startsWith('"') && name.endsWith('"'))
      ) {
        name = name.slice(1, -1);
      }

      entries.push({
        name,
        isDirectory: permissions.startsWith('d')
      });
    }

    return entries.sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) {
        return a.isDirectory ? -1 : 1;
      }

      return a.name.localeCompare(b.name);
    });
  } catch (error) {
    console.log(`\n❌ ls failed: ${error.message}`);
    return [];
  }
}

function clearScreen() {
  process.stdout.write('\x1b[2J\x1b[H');
}

function insideStorage(target) {
  const resolved = path.resolve(target);

  return (
    resolved === STORAGE_ROOT ||
    resolved.startsWith(STORAGE_ROOT + path.sep)
  );
}

function selectWorkspace() {
  return new Promise(resolve => {
    let currentDir = STORAGE_ROOT;
    let selected = 0;

    function render() {
      clearScreen();
      showBanner();
      console.log('');

      const entries = lsDirectory(currentDir);

      const items = [];

      if (currentDir !== STORAGE_ROOT) {
        items.push({
          name: '..',
          isDirectory: true,
          parent: true
        });
      }

      items.push(...entries);

      if (selected >= items.length) {
        selected = Math.max(0, items.length - 1);
      }

      console.log('📁 APKFORGE WORKSPACE');
      console.log('────────────────────────────────────────');
      console.log(`📍 ${currentDir}`);
      console.log('────────────────────────────────────────');
      console.log('');

      if (!items.length) {
        console.log('  (empty)');
      }

      items.forEach((item, index) => {
        const pointer = index === selected ? '❯' : ' ';

        if (item.parent) {
          console.log(`${pointer} ..`);
        } else if (item.isDirectory) {
          console.log(`${pointer} 📂 ${item.name}`);
        } else {
          console.log(`  📄 ${item.name}`);
        }
      });

      console.log('');
      console.log('↑ ↓ Navigate    N New folder    Q Quit');
    }

    function cleanup(result) {
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
      }

      process.stdin.pause();
      process.stdin.removeListener('data', onKey);

      clearScreen();
      resolve(result);
    }

    function onKey(data) {
      const key = data.toString();

      if (key === '\u0003' || key.toLowerCase() === 'q') {
        cleanup(null);
        return;
      }

      const entries = lsDirectory(currentDir);

      const items = [];

      if (currentDir !== STORAGE_ROOT) {
        items.push({
          name: '..',
          isDirectory: true,
          parent: true
        });
      }

      items.push(...entries);

      if (key === '\x1b[A') {
        selected--;

        if (selected < 0) {
          selected = Math.max(0, items.length - 1);
        }

        render();
        return;
      }

      if (key === '\x1b[B') {
        selected++;

        if (selected >= items.length) {
          selected = 0;
        }

        render();
        return;
      }

      if (key === '\r' || key === '\n') {
        const item = items[selected];

        if (!item) return;

        if (item.parent) {
          currentDir = path.dirname(currentDir);
          selected = 0;
          render();
          return;
        }

        if (item.isDirectory) {
          const target = path.join(currentDir, item.name);

          if (!insideStorage(target)) {
            console.log('\n❌ Access outside /storage/emulated/0 is blocked.');
            return;
          }

          const contents = lsDirectory(target);

          if (contents.length === 0) {
            cleanup(target);
            return;
          }

          currentDir = target;
          selected = 0;
          render();
        }

        return;
      }

      if (key.toLowerCase() === 'n') {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdin.removeListener('data', onKey);

        const readline = require('readline');

        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });

        rl.question('\nNew folder/project name: ', answer => {
          rl.close();

          const name = answer.trim();

          if (
            !name ||
            name === '.' ||
            name === '..' ||
            name.includes('/') ||
            name.includes('\\')
          ) {
            console.log('❌ Invalid folder name.');
          } else {
            const target = path.join(currentDir, name);

            if (!insideStorage(target)) {
              console.log('❌ Workspace must stay inside shared storage.');
            } else if (fs.existsSync(target)) {
              console.log(`❌ Already exists: ${target}`);
            } else {
              try {
                fs.mkdirSync(target);
                console.log(`✓ Created: ${target}`);
                currentDir = target;
                selected = 0;
              } catch (error) {
                console.log(`❌ Failed: ${error.message}`);
              }
            }
          }

          setTimeout(() => {
            process.stdin.setRawMode(true);
            process.stdin.resume();
            process.stdin.on('data', onKey);
            selected = 0;
            render();
          }, 700);
        });
      }
    }

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', onKey);

    render();
  });
}

module.exports = {
  selectWorkspace,
  STORAGE_ROOT
};
