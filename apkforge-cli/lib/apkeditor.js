const { spawn } = require('child_process');
const path = require('path');

const APKEDITOR_JAR = path.resolve(__dirname, '../../APKEditor-1.4.9.jar');

function run(args) {
    return new Promise((resolve, reject) => {
        const child = spawn('java', ['-jar', APKEDITOR_JAR, ...args], {
            stdio: 'inherit'
        });

        child.on('error', reject);

        child.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`APKEditor exited with code ${code}`));
            }
        });
    });
}

async function build(input, output) {
    return run([
        'b',
        '-i', path.resolve(input),
        '-o', path.resolve(output)
    ]);
}

async function info(input) {
    return run([
        'info',
        '-i', path.resolve(input)
    ]);
}

module.exports = {
    build,
    info,
    APKEDITOR_JAR
};
