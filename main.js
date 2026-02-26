import fs from 'fs';
import { spawn } from 'child_process';
import path from 'path';

class JarvisLauncher {
    constructor() {
        this.appsPath = path.join(process.cwd(), 'apps.json');
        this.appMap = {};
        this.config = JSON.parse(fs.readFileSync('config.json', 'utf-8'));
        
        this.scanApps(); 
    }

    scanApps() {
        console.log("Scanning applications on your PC...");
        const newAppMap = {};
        
        const desktopDirs = [
            '/usr/share/applications/',
            path.join(process.env.HOME, '.local/share/applications/'),
            '/var/lib/snapd/desktop/applications/'
        ];

        desktopDirs.forEach(dir => {
            if (!fs.existsSync(dir)) return;

            try {
                const files = fs.readdirSync(dir).filter(f => f.endsWith('.desktop'));

                files.forEach(file => {
                    try {
                        const content = fs.readFileSync(path.join(dir, file), 'utf-8');
                        const nameMatch = content.match(/^Name=(.*)$/m);
                        const execMatch = content.match(/^Exec=([^\s%\n]+|"[^"]+")/m);

                        if (nameMatch && execMatch) {
                            const name = nameMatch[1].trim().toLowerCase();
                            let command = execMatch[1].trim().replace(/"/g, '');

                            if (!newAppMap[name]) {
                                newAppMap[name] = command;
                            }
                        }
                    } catch (e) {
                    }
                });
            } catch (e) {
                console.error(`Could not read directory ${dir}`);
            }
        });

        fs.writeFileSync(this.appsPath, JSON.stringify(newAppMap, null, 4));
        console.log(`Success: Indexed ${Object.keys(newAppMap).length} applications.`);
    }

    switchProcess() {
        const targetai = `${this.config.user.ai}.js`;

        const nodePath = process.execPath;
        const scriptPath = path.resolve(targetai);

        const child = spawn(nodePath, [scriptPath], {
            detached: true, 
            stdio: 'inherit'
        });

        child.unref();

        process.exit(0);
    }
}

const launcher = new JarvisLauncher().switchProcess();
export default launcher;