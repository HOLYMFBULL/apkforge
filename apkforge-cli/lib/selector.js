const { showBanner } = require('./banner');

function selectMenu(title, items) {
  return new Promise(resolve => {
    let selected = 0;

    function clearScreen() {
      process.stdout.write('\x1b[2J\x1b[H');
    }

    function render() {
      clearScreen();
      showBanner();
      console.log('');

      console.log(title);
      console.log('────────────────────────────────────────');
      console.log('');

      items.forEach((item, index) => {
        const pointer = index === selected ? '❯' : ' ';
        console.log(`${pointer} ${item}`);
      });

      console.log('');
      console.log('↑ ↓ Navigate    Enter Select    Q Quit');
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

      if (key === '\x1b[A') {
        selected--;

        if (selected < 0) {
          selected = items.length - 1;
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
        cleanup({
          index: selected,
          value: items[selected]
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
  selectMenu
};
