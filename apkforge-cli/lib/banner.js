const pkg = require('../package.json');

const RESET = '\x1b[0m';
const CYAN = '\x1b[36m';
const BLUE = '\x1b[34m';

function showBanner() {
  console.log(`${CYAN}
 █████╗ ██████╗ ██╗  ██╗███████╗ ██████╗ ██████╗  ██████╗ ███████╗
██╔══██╗██╔══██╗██║ ██╔╝██╔════╝██╔═══██╗██╔══██╗██╔════╝ ██╔════╝
███████║██████╔╝█████╔╝ █████╗  ██║   ██║██████╔╝██║  ███╗█████╗
██╔══██║██╔═══╝ ██╔═██╗ ██╔══╝  ██║   ██║██╔══██╗██║   ██║██╔══╝
██║  ██║██║     ██║  ██╗███████╗╚██████╔╝██║  ██║╚██████╔╝███████╗
╚═╝  ╚═╝╚═╝     ╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚══════╝
${RESET}
${BLUE}Version :- v${pkg.version}${RESET}
${CYAN}AI Android Build System${RESET}
`);
}

module.exports = { showBanner };
