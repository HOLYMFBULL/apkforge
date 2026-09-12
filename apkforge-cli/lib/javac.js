const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

function run(command, args, options = {}) {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, {
            stdio: 'inherit',
            ...options
        });

        child.on('error', reject);
        child.on('close', code => {
            if (code === 0) resolve();
            else reject(new Error(`${command} exited with code ${code}`));
        });
    });
}

async function compileJava(projectDir, outputDir) {
    const sourceDir = path.join(projectDir, 'source');

    if (!fs.existsSync(sourceDir)) {
        throw new Error(`Missing source directory: ${sourceDir}`);
    }

    const files = [];

    function collect(dir) {
        for (const item of fs.readdirSync(dir)) {
            const full = path.join(dir, item);
            if (fs.statSync(full).isDirectory()) collect(full);
            else if (full.endsWith('.java')) files.push(full);
        }
    }

    collect(sourceDir);

    if (!files.length) {
        throw new Error('No Java source files found');
    }

    fs.mkdirSync(outputDir, { recursive: true });

    await run('javac', [
        '-source', '8',
        '-target', '8',
        '-d', outputDir,
        ...files
    ]);

    console.log(`APKForge Java compiler: ${files.length} source file(s) compiled`);
}

module.exports = { compileJava };
