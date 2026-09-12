const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const ANDROID_JAR = path.join(ROOT, 'toolchain/android-35.jar');
const KEYSTORE = path.join(ROOT, 'toolchain/apkforge-debug.jks');

function run(command, args, options = {}) {
    const result = spawnSync(command, args, {
        stdio: 'inherit',
        ...options
    });

    if (result.error) throw result.error;
    if (result.status !== 0) {
        throw new Error(`${command} failed with exit code ${result.status}`);
    }
}

function collectJava(dir) {
    const files = [];

    function walk(current) {
        for (const item of fs.readdirSync(current)) {
            const full = path.join(current, item);
            const stat = fs.statSync(full);

            if (stat.isDirectory()) {
                walk(full);
            } else if (full.endsWith('.java')) {
                files.push(full);
            }
        }
    }

    walk(dir);
    return files;
}

function compileProject(projectDir) {
    const dir = path.resolve(projectDir);
    const configPath = path.join(dir, 'apkforge.json');
    const sourceDir = path.join(dir, 'source');
    const resourceDir = path.join(dir, 'resources', 'res');
    const manifest = path.join(dir, 'AndroidManifest.xml');
    const buildDir = path.join(dir, 'build');

    if (!fs.existsSync(configPath))
        throw new Error(`Missing apkforge.json in ${dir}`);

    if (!fs.existsSync(sourceDir))
        throw new Error(`Missing source directory: ${sourceDir}`);

    if (!fs.existsSync(resourceDir))
        throw new Error(`Missing resource directory: ${resourceDir}`);

    if (!fs.existsSync(manifest))
        throw new Error(`Missing AndroidManifest.xml in ${dir}`);

    if (!fs.existsSync(ANDROID_JAR))
        throw new Error(`Missing Android framework: ${ANDROID_JAR}`);

    if (!fs.existsSync(KEYSTORE))
        throw new Error(`Missing APKForge keystore: ${KEYSTORE}`);

    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const javaFiles = collectJava(sourceDir);

    if (!javaFiles.length)
        throw new Error('No Java source files found');

    fs.rmSync(buildDir, { recursive: true, force: true });

    const classesDir = path.join(buildDir, 'classes');
    const dexDir = path.join(buildDir, 'dex');
    const resDir = path.join(buildDir, 'res');
    const unsignedApk = path.join(buildDir, 'unsigned.apk');
    const outputApk = path.join(buildDir, `${config.name.replace(/[^a-zA-Z0-9._-]/g, '_')}.apk`);

    fs.mkdirSync(classesDir, { recursive: true });
    fs.mkdirSync(dexDir, { recursive: true });
    fs.mkdirSync(resDir, { recursive: true });

    console.log(`[1/6] Compiling ${javaFiles.length} Java source file(s)...`);

    run('javac', [
        '-Xlint:-options',
        '-source', '8',
        '-target', '8',
        '-classpath', ANDROID_JAR,
        '-d', classesDir,
        ...javaFiles
    ]);

    console.log('[2/6] Converting Java bytecode to DEX...');

    run('d8', [
        '--lib', ANDROID_JAR,
        '--min-api', String(config.minSdk || 23),
        '--output', dexDir,
        ...(() => {
            const classFiles = [];
            function collectClasses(dir) {
                for (const item of fs.readdirSync(dir)) {
                    const full = path.join(dir, item);
                    if (fs.statSync(full).isDirectory()) collectClasses(full);
                    else if (full.endsWith('.class')) classFiles.push(full);
                }
            }
            collectClasses(classesDir);
            if (!classFiles.length) throw new Error('No compiled .class files found');
            return classFiles;
        })()
    ]);

    console.log('[3/6] Compiling Android resources...');

    run('aapt2', [
        'compile',
        '--dir', resourceDir,
        '-o', path.join(resDir, 'resources.zip')
    ]);

    console.log('[4/6] Linking manifest and resources...');

    run('aapt2', [
        'link',
        '-o', unsignedApk,
        '--manifest', manifest,
        '-I', ANDROID_JAR,
        '--min-sdk-version', String(config.minSdk || 23),
        '--target-sdk-version', String(config.targetSdk || 35),
        '--version-code', String(config.versionCode || 1),
        '--version-name', String(config.versionName || '1.0'),
        path.join(resDir, 'resources.zip')
    ]);

    run('zip', [
        '-q',
        '-j',
        unsignedApk,
        path.join(dexDir, 'classes.dex')
    ]);

    console.log('[5/6] Signing APK...');

    run('apksigner', [
        'sign',
        '--ks', KEYSTORE,
        '--ks-pass', 'pass:apkforge',
        '--out', outputApk,
        unsignedApk
    ]);

    console.log('[6/6] Verifying APK signature...');

    run('apksigner', [
        'verify',
        '--verbose',
        outputApk
    ]);

    console.log('');
    console.log(`APKForge build complete: ${outputApk}`);

    return outputApk;
}

module.exports = { compileProject };
