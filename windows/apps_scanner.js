import fs from 'fs';
import { spawnSync } from 'child_process';
import path from 'path';

class JarvisLauncher {
    constructor() {
        this.appsPath = path.join(process.cwd(), 'apps.json');
        this.appMap = {};
        
        this.scanApps(); 
    }

    scanApps() {
        console.log("Scanning applications on your PC...");
        const newAppMap = {};
        
        const startMenuDirs = [
            path.join(process.env.PROGRAMDATA, 'Microsoft\\Windows\\Start Menu\\Programs'),
            path.join(process.env.APPDATA, 'Microsoft\\Windows\\Start Menu\\Programs')
        ];

        startMenuDirs.forEach(dir => {
            if (!fs.existsSync(dir)) return;

            const getFiles = (baseDir) => {
                let results = [];
                const list = fs.readdirSync(baseDir);
                list.forEach(file => {
                    const filePath = path.join(baseDir, file);
                    const stat = fs.statSync(filePath);
                    if (stat && stat.isDirectory()) {
                        results = results.concat(getFiles(filePath));
                    } else if (file.endsWith('.lnk')) {
                        results.push(filePath);
                    }
                });
                return results;
            };

            try {
                const shortcuts = getFiles(dir);

                shortcuts.forEach(shortcutPath => {
                    try {
                        const name = path.basename(shortcutPath, '.lnk').toLowerCase();
                        
                        const psCommand = `(New-Object -ComObject WScript.Shell).CreateShortcut('${shortcutPath}').TargetPath`;
                        const result = spawnSync('powershell', ['-command', psCommand], { encoding: 'utf-8' });
                        
                        const execPath = result.stdout.trim();

                        if (execPath && execPath.length > 0 && !newAppMap[name]) {
                            newAppMap[name] = execPath;
                        }
                    } catch (e) {}
                });
            } catch (e) {
                console.error(`Could not read directory ${dir}`);
            }
        });

        fs.writeFileSync(this.appsPath, JSON.stringify(newAppMap, null, 4));
        console.log(`Success: Indexed ${Object.keys(newAppMap).length} applications.`);
    }
}

const launcher = new JarvisLauncher();
export default launcher;