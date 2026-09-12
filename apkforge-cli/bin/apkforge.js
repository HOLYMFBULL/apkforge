#!/usr/bin/env node

const { info } = require('../lib/apkeditor');
const { createProject, loadProject } = require('../lib/project');
const { compileProject } = require('../lib/compiler');
const { setup } = require('../lib/setup');
const { selectWorkspace } = require('../lib/workspace');
const { setupAgent } = require('../lib/agent-setup');
const { startAgent } = require('../lib/ai-agent');
const pkg = require('../package.json');
const { showBanner } = require('../lib/banner');

function usage() {
    console.log(`
APKForge ${pkg.version}

Usage:
  apkforge
  apkforge create <project>
  apkforge build <project> [output.apk]
  apkforge info <app.apk>
  apkforge setup
  apkforge --help
  apkforge --version

Commands:
  apkforge             Start APKForge AI
  create               Create a new APKForge project
  build                Build an APKForge project
  info                 Show APK information
  setup                Prepare the APKForge toolchain

Examples:
  apkforge
  apkforge create ./my-app
  apkforge build ./my-app
  apkforge info ./app.apk
`);
}

async function startInteractive() {
    showBanner();

    console.log('');
    console.log('Welcome to APKForge AI.');
    console.log('');

    // STEP 1 — Workspace
    const workspace = await selectWorkspace();

    if (!workspace) {
        console.log('');
        console.log('APKForge exited.');
        return;
    }

    console.log('');
    console.log('✓ Workspace selected');
    console.log(workspace);
    console.log('');

    // STEP 2 — API key
    const apiKey = await setupAgent();

    if (!apiKey) {
        console.log('');
        console.log('APKForge AI setup cancelled.');
        return;
    }

    console.log('');
    console.log('✓ AI agent ready');
    console.log('');

    // STEP 3 — AI coding chat
    await startAgent(workspace, apiKey);
}

async function main() {
    const args = process.argv.slice(2);
    const command = args[0];

    /*
     * No command = real APKForge AI experience.
     */
    if (!command) {
        await startInteractive();
        return;
    }

    if (command === '--help' || command === '-h') {
        showBanner();
        usage();
        return;
    }

    if (command === '--version' || command === '-v') {
        console.log(pkg.version);
        return;
    }

    /*
     * Explicit setup remains available.
     */
    if (command === 'setup') {
        await setup();
        return;
    }

    if (command === 'create') {
        showBanner();

        if (!args[1]) {
            console.error('Error: project directory is required.');
            console.error('Usage: apkforge create <project>');
            process.exit(1);
        }

        createProject(args[1]);
        return;
    }

    if (command === 'build') {
        showBanner();

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

        fs.mkdirSync(path.dirname(outputPath), {
            recursive: true
        });

        fs.copyFileSync(builtApk, outputPath);

        console.log(`APKForge build complete: ${outputPath}`);
        return;
    }

    if (command === 'info') {
        showBanner();

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

main().catch(error => {
    console.error(`APKForge error: ${error.message}`);
    process.exit(1);
});
