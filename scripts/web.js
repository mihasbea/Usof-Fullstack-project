const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const dotenv = require('dotenv');

const rootDir = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(rootDir, '.env'), quiet: true });
const webDir = path.join(rootDir, 'web');
const appManifest = path.join(webDir, 'package.json');
const rootManifest = require(path.join(rootDir, 'package.json'));

const commands = {
    start: 'start',
    build: 'build',
};
const command = commands[process.argv[2]];

if (!command) {
    throw new Error('Usage: node scripts/web.js <start|build>');
}

const manifest = {
    name: 'usof-web-generated',
    version: rootManifest.version,
    private: true,
    generatedBy: 'scripts/web.js',
    browserslist: rootManifest.browserslist,
};

let ownsManifest = false;
if (fs.existsSync(appManifest)) {
    let existingManifest;
    try {
        existingManifest = JSON.parse(fs.readFileSync(appManifest, 'utf8'));
    } catch {
        throw new Error(`Cannot read ${appManifest}; remove or repair it before running CRA.`);
    }

    if (existingManifest.generatedBy !== manifest.generatedBy) {
        throw new Error(
            `CRA needs a temporary web/package.json. Remove the manually created file at ${appManifest} and run the root command again.`
        );
    }
} else {
    fs.writeFileSync(appManifest, `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx' });
    ownsManifest = true;
}

function removeGeneratedManifest() {
    if (!ownsManifest || !fs.existsSync(appManifest)) return;

    try {
        const existingManifest = JSON.parse(fs.readFileSync(appManifest, 'utf8'));
        if (existingManifest.generatedBy === manifest.generatedBy) {
            fs.unlinkSync(appManifest);
        }
    } catch (error) {
        console.error(`Failed to remove temporary CRA manifest at ${appManifest}:`, error);
    }
}

process.on('exit', removeGeneratedManifest);
process.env.PORT = process.env.WEB_PORT || '3001';
const reactScripts = path.join(rootDir, 'node_modules', 'react-scripts', 'scripts', `${command}.js`);
const child = spawn(process.execPath, [reactScripts], {
    cwd: webDir,
    env: process.env,
    stdio: 'inherit',
});

child.on('error', (error) => {
    console.error('Failed to start Create React App:', error);
    removeGeneratedManifest();
    process.exitCode = 1;
});
child.on('exit', (code, signal) => {
    removeGeneratedManifest();
    process.exitCode = code ?? (signal ? 1 : 0);
});
