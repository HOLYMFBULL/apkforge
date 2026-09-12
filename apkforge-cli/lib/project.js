const fs = require('fs');
const path = require('path');

function escapeXml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function escapeJavaString(value) {
    return String(value)
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\r/g, '\\r')
        .replace(/\n/g, '\\n');
}

function makePackageName(projectName) {
    let part = projectName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '');

    part = part.replace(/^[0-9]+/, '');

    if (!part) {
        throw new Error(
            `Project name "${projectName}" cannot be converted into a valid package name`
        );
    }

    return `com.apkforge.${part}`;
}

function createProject(dir) {
    dir = path.resolve(dir);

    if (fs.existsSync(dir) && fs.readdirSync(dir).length > 0) {
        throw new Error(`Project directory is not empty: ${dir}`);
    }

    const projectName = path.basename(dir);
    const packageName = makePackageName(projectName);

    const safeProjectName = escapeXml(projectName);
    const javaProjectName = escapeJavaString(projectName);

    const config = {
        name: projectName,
        package: packageName,
        versionCode: 1,
        versionName: '1.0',
        minSdk: 23,
        targetSdk: 36
    };

    const sourceDir = path.join(dir, 'source');
    const valuesDir = path.join(dir, 'resources', 'res', 'values');

    fs.mkdirSync(sourceDir, { recursive: true });
    fs.mkdirSync(valuesDir, { recursive: true });

    fs.writeFileSync(
        path.join(dir, 'apkforge.json'),
        JSON.stringify(config, null, 2) + '\n'
    );

    fs.writeFileSync(
        path.join(dir, 'AndroidManifest.xml'),
`<?xml version="1.0" encoding="utf-8"?>
<manifest
    package="${packageName}"
    xmlns:android="http://schemas.android.com/apk/res/android">

    <application
        android:theme="@style/AppTheme"
        android:label="@string/app_name">

        <activity
            android:name=".MainActivity"
            android:exported="true">

            <intent-filter>
                <action android:name="android.intent.action.MAIN"/>
                <category android:name="android.intent.category.LAUNCHER"/>
            </intent-filter>

        </activity>
    </application>

</manifest>
`
    );

    fs.writeFileSync(
        path.join(sourceDir, 'MainActivity.java'),
`package ${packageName};

import android.app.Activity;
import android.os.Bundle;
import android.widget.TextView;

public class MainActivity extends Activity {
    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);

        TextView text = new TextView(this);
        text.setText("Hello from ${javaProjectName}!");
        text.setTextSize(24);
        text.setPadding(40, 40, 40, 40);

        setContentView(text);
    }
}
`
    );

    fs.writeFileSync(
        path.join(valuesDir, 'strings.xml'),
`<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">${safeProjectName}</string>
</resources>
`
    );

    fs.writeFileSync(
        path.join(valuesDir, 'styles.xml'),
`<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="AppTheme"
        parent="@android:style/Theme.Material.Light.NoActionBar"/>
</resources>
`
    );

    console.log(`Created APKForge project: ${dir}`);
    console.log(`Package: ${packageName}`);
}

function loadProject(dir) {
    dir = path.resolve(dir);

    const configPath = path.join(dir, 'apkforge.json');

    if (!fs.existsSync(configPath)) {
        throw new Error(`Missing apkforge.json in ${dir}`);
    }

    let config;

    try {
        config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (error) {
        throw new Error(`Invalid apkforge.json: ${error.message}`);
    }

    validateProject(dir, config);

    return config;
}

function validateProject(dir, config) {
    const requiredFiles = [
        'apkforge.json',
        'AndroidManifest.xml',
        path.join('source', 'MainActivity.java'),
        path.join('resources', 'res', 'values', 'strings.xml'),
        path.join('resources', 'res', 'values', 'styles.xml')
    ];

    for (const file of requiredFiles) {
        if (!fs.existsSync(path.join(dir, file))) {
            throw new Error(`Invalid APKForge project: missing ${file}`);
        }
    }

    if (!config.name) {
        throw new Error('Invalid apkforge.json: missing "name"');
    }

    if (!config.package) {
        throw new Error('Invalid apkforge.json: missing "package"');
    }

    if (!Number.isInteger(config.versionCode) || config.versionCode < 1) {
        throw new Error(
            'Invalid apkforge.json: versionCode must be a positive integer'
        );
    }

    if (!config.versionName) {
        throw new Error('Invalid apkforge.json: missing "versionName"');
    }

    if (!Number.isInteger(config.minSdk) || config.minSdk < 1) {
        throw new Error(
            'Invalid apkforge.json: minSdk must be a positive integer'
        );
    }

    if (
        !Number.isInteger(config.targetSdk) ||
        config.targetSdk < config.minSdk
    ) {
        throw new Error(
            'Invalid apkforge.json: targetSdk must be >= minSdk'
        );
    }
}

module.exports = {
    createProject,
    loadProject,
    validateProject
};
