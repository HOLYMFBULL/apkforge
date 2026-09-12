#!/usr/bin/env node

const { info } = require('../lib/apkeditor');
const { createProject, loadProject } = require('../lib/project');
const { compileProject } = require('../lib/compiler');
const { setup } = require('../lib/setup');
const pkg = require('../package.json');

function usage() {
    console.log(`
APKForge ${pkg.version}

Usage:
  apkforge create <project>
  apkforge build <project> [output.apk]
  apkforge info <app.apk>
  apkforge setup
  apkforge --help
  apkforge --version

Commands:
  build    Build an APKForge project into an APK
  info     Show APK information
  setup    Check and prepare the APKForge toolchain

Examples:
  apkforge build ./my-app
  apkforge build ./my-app ./output/app.apk
  apkforge info ./app.apk
`);
}

async function main() {
    const args = process.argv.slice(2);
    const command = args[0];

    if (!command || command === '--help' || command === '-h') {
        usage();
        return;
    }

    if (command === '--version' || command === '-v') {
        console.log(pkg.version);
        return;
    }

    if (command === 'create') {
        if (!args[1]) {
            console.error('Error: project directory is required.');
            console.error('Usage: apkforge create <project>');
            process.exit(1);
        }
        createProject(args[1]);
        return;
    }

    if (command === 'build') {
        if (!args[1]) {
            console.error('Error: project directory is required.');
            console.error('Usage: apkforge build <project> [output.apk]');
            process.exit(1);
        }

        const project = args[1];
        const output = args[2] || './output.apk';

        console.log(`Building APKForge project: ${project}`);
        console.log(`Output: ${output}`);

        const config = loadProject(project);
        console.log(`Project: ${config.name}`);
        console.log(`Package: ${config.package}`);
        console.log(`Version: ${config.versionName} (${config.versionCode})`);

        const builtApk = compileProject(project);

        const fs = require('fs');
        const path = require('path');
        const outputPath = path.resolve(output);
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
        fs.copyFileSync(builtApk, outputPath);

        console.log(`APKForge build complete: ${outputPath}`);
        return;
    }

    if (command === 'setup') {
        setup();
        return;
    }

    if (command === 'info') {
        if (!args[1]) {
            console.error('Error: APK file is required.');
            console.error('Usage: apkforge info <app.apk>');
            process.exit(1);
        }

        await info(args[1]);
        return;
    }

    console.error(`Unknown command: ${command}`);
    usage();
    process.exit(1);
}

main().catch((error) => {
    console.error(`APKForge error: ${error.message}`);
    process.exit(1);
});
