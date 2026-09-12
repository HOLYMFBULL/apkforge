const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const TOOLCHAIN = path.join(ROOT, 'toolchain');

const TERMUX_PREFIX =
    process.env.PREFIX || '/data/data/com.termux/files/usr';

const REQUIRED = [
    {
        name: 'Java',
        command: 'java',
        package: 'openjdk-21'
    },
    {
        name: 'Javac',
        command: 'javac',
        package: 'openjdk-21'
    },
    {
        name: 'D8',
        command: 'd8',
        package: 'd8'
    },
    {
        name: 'AAPT2',
        command: 'aapt2',
        package: 'aapt2'
    },
    {
        name: 'apksigner',
        command: 'apksigner',
        package: 'apksigner'
    },
    {
        name: 'zip',
        command: 'zip',
        package: 'zip'
    }
];

function commandExists(command) {
    const result = spawnSync('sh', ['-c', `command -v ${command}`], {
        stdio: 'ignore'
    });

    return result.status === 0;
}

function run(command, args) {
    const result = spawnSync(command, args, {
        stdio: 'inherit'
    });

    if (result.error) {
        throw result.error;
    }

    return result.status === 0;
}

function isTermux() {
    return (
        process.env.TERMUX_VERSION ||
        process.env.PREFIX === TERMUX_PREFIX ||
        fs.existsSync('/data/data/com.termux/files/usr')
    );
}

function installTermuxPackages(packages) {
    if (!packages.length) {
        return true;
    }

    console.log('');
    console.log('Installing missing Termux packages:');
    console.log(`  ${packages.join(' ')}`);
    console.log('');

    if (!commandExists('pkg')) {
        console.error('APKForge could not find the Termux package manager.');
        console.error('Please make sure Termux package management is available.');
        return false;
    }

    console.log('Updating package information...');
    
    if (!run('pkg', ['update', '-y'])) {
        console.error('Failed to update Termux package information.');
        return false;
    }

    console.log('');
    console.log('Installing packages...');

    if (!run('pkg', ['install', '-y', ...packages])) {
        console.error('Failed to install one or more required packages.');
        return false;
    }

    return true;
}

function checkFramework() {
    const candidates = [
        path.join(TOOLCHAIN, 'android-35.jar'),
        path.join(TERMUX_PREFIX, 'share', 'aapt', 'android.jar')
    ];

    return candidates.find(file => fs.existsSync(file)) || null;
}

function setup() {
    console.log('');
    console.log('APKForge Setup');
    console.log('==============');
    console.log('');

    fs.mkdirSync(TOOLCHAIN, { recursive: true });

    if (!isTermux()) {
        console.log('Platform: unsupported by this installer');
        console.log('');
        console.log('The current automatic installer supports Termux.');
        console.log('Your existing APKForge toolchain can still be used manually.');
        process.exitCode = 1;
        return;
    }

    console.log('Platform: Termux');
    console.log(`Architecture: ${process.arch}`);
    console.log('');

    const missing = [];

    for (const item of REQUIRED) {
        if (commandExists(item.command)) {
            console.log(`✓ ${item.name}`);
        } else {
            console.log(`✗ ${item.name}`);
            missing.push(item.package);
        }
    }

    let framework = checkFramework();

    if (framework) {
        console.log(`✓ Android framework (${framework})`);
    } else {
        console.log('✗ Android framework (android-35.jar)');
    }

    if (missing.length) {
        const uniquePackages = [...new Set(missing)];

        if (!installTermuxPackages(uniquePackages)) {
            process.exitCode = 1;
            return;
        }
    }

    framework = checkFramework();

    if (!framework) {
        console.log('');
        console.log('Android framework is missing.');
        console.log('');
        console.log(
            'APKForge currently expects android-35.jar in its toolchain directory:'
        );
        console.log(`  ${path.join(TOOLCHAIN, 'android-35.jar')}`);
        console.log('');
        console.log(
            'The framework download/install step will be added separately'
        );
        console.log('so APKForge does not redistribute Android SDK files incorrectly.');
        process.exitCode = 1;
        return;
    }

    console.log('');
    console.log('Verifying final toolchain...');
    console.log('');

    let failed = false;

    for (const item of REQUIRED) {
        if (commandExists(item.command)) {
            console.log(`✓ ${item.name}`);
        } else {
            console.log(`✗ ${item.name}`);
            failed = true;
        }
    }

    if (!failed) {
        console.log(`✓ Android framework (${framework})`);
    } else {
        console.log('');
        console.log('APKForge setup failed.');
        process.exitCode = 1;
        return;
    }

    console.log('');
    console.log('APKForge setup complete.');
    console.log('');
    console.log('You can now run:');
    console.log('  apkforge create MyApp');
    console.log('  apkforge build MyApp');
    console.log('');
}

module.exports = { setup };
