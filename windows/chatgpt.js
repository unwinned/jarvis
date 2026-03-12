import OpenAI from 'openai';
import fs from 'fs';
import { spawn, exec } from 'child_process';
import path from 'path';

const rawData = fs.readFileSync('config.json');
const config = JSON.parse(rawData);
const CURRENT_LANG = config.user.language || 'ru';

const appsData = fs.readFileSync('apps.json');
const appMap = JSON.parse(appsData);
const availableApps = Object.keys(appMap).join(', ');

const openai = new OpenAI({
    apiKey: config.chatgpt.apiKey, 
});

const tools = [
    {
        type: "function",
        function: {
            name: "open_app",
            description: "opens desktop apps",
            parameters: {
                type: "object",
                properties: {
                    app_name: { type: "string", description: "The exact name of the app selected from the available system apps list." }
                },
                required: ["app_name"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "poweroff",
            description: "Shuts Jarvis down",
            parameters: {
                type: "object",
                properties: {
                    title: { type: "string", description: "Turns Jarvis off" }
                },
                required: ["title"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "close_app",
            description: "Terminates a running application or process entirely.",
            parameters: {
                type: "object",
                properties: {
                    app_name: { type: "string", description: "The process name of the application to terminate (e.g., chrome, code, discord)" }
                },
                required: ["app_name"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "google_search",
            description: "searches sth in default browser",
            parameters: {
                type: "object",
                properties: {
                    query: { type: "string", description: "The search query" }
                },
                required: ["query"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "open_url",
            description: "opens a specific website in the browser",
            parameters: {
                type: "object",
                properties: {
                    url: { type: "string", description: "The full URL to open, e.g. https://youtube.com" }
                },
                required: ["url"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "search_website",
            description: "Searches for a query on a specific website.",
            parameters: {
                type: "object",
                properties: {
                    website: { type: "string", description: "Target website name (e.g., youtube, pinterest, github, wikipedia)" },
                    query: { type: "string", description: "Search query" }
                },
                required: ["website", "query"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "setup_workspace",
            description: "Sets up the user's workspace by opening predefined applications and URLs based on the work category.",
            parameters: {
                type: "object",
                properties: {
                    category: { 
                        type: "string", 
                        enum: ["coding", "twitter", "ai"],
                        description: "The specific category of work to set up." 
                    }
                },
                required: ["category"]
            }
        }
    }
];

let isSpeaking = false;

async function googleSearch(query) {
    console.log(`Executing search: ${query}`);
    const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    exec(`start "" "${url}"`);
    return `Searching for: ${query}`;
}

async function setupWorkspace(category) {
    console.log(`Executing workspace setup for category: ${category}`);
    if (category === "coding") {
        exec(`start code`); 
        exec(`start "" "https://github.com"`);
    } 
    else if (category === "twitter") {
        exec(`start "" "https://x.com"`);
    } 
    else if (category === "ai") {
        exec(`start "" "https://chatgpt.com"`);
        exec(`start "" "https://gemini.google.com"`);
    }
}

async function openApp(appName) {
    console.log(`Executing application launch: ${appName}`);
    let command = appMap[appName.toLowerCase()] || appName;
    exec(`start "" "${command}"`, (error) => {
        if (error) console.error(`Failed to launch ${command}:`, error.message);
    });
}

async function closeApp(appName) {
    console.log(`Executing termination for application: ${appName}`);
    exec(`taskkill /F /IM "${appName}.exe" /T`, (error) => {
        if (error) {
            exec(`taskkill /F /FI "WINDOWTITLE eq ${appName}*" /T`);
        }
    });
}

async function poweroff() {
    console.log(`Executing Jarvis' shutdown`);
    exec('taskkill /F /IM node.exe /T');
    process.exit();
}

async function openUrl(url) {
    console.log(`Executing URL execution: ${url}`);
    exec(`start "" "${url}"`);
}

async function searchWebsite(website, query) {
    console.log(`Executing website search on ${website} for: ${query}`);
    const siteUrls = {
        "youtube": `https://www.youtube.com/results?search_query=`,
        "pinterest": `https://www.pinterest.com/search/pins/?q=`,
        "github": `https://github.com/search?q=`,
        "wikipedia": `https://ru.wikipedia.org/wiki/Special:Search?search=`
    };
    const baseUrl = siteUrls[website.toLowerCase()];
    const targetUrl = baseUrl ? `${baseUrl}${encodeURIComponent(query)}` : `https://www.google.com/search?q=${encodeURIComponent(website + ' ' + query)}`;
    exec(`start "" "${targetUrl}"`);
}

async function generateText(userPrompt) {    
    try {
        const completion = await openai.chat.completions.create({
            messages: [
                { 
                    role: "system", 
                    content: `You are Jarvis. You control the Windows PC.
                    Available system apps: ${availableApps}.
                    Language: ${CURRENT_LANG}` 
                },
                { role: "user", content: userPrompt }
            ],
            model: "gpt-4o-mini",
            tools: tools,
            tool_choice: "auto",
        });

        const message = completion.choices[0].message;

        if (message.tool_calls) {
            for (const toolCall of message.tool_calls) {
                const args = JSON.parse(toolCall.function.arguments);
                if (toolCall.function.name === "open_app") await openApp(args.app_name);
                else if (toolCall.function.name === "close_app") await closeApp(args.app_name);
                else if (toolCall.function.name === "google_search") await googleSearch(args.query);
                else if (toolCall.function.name === "open_url") await openUrl(args.url);
                else if (toolCall.function.name === "search_website") await searchWebsite(args.website, args.query);
                else if (toolCall.function.name === "setup_workspace") await setupWorkspace(args.category);
                else if (toolCall.function.name === "poweroff") await poweroff();
            }
            return "Executing commands...";
        }
        return message.content;
    } catch (error) {
        return "Connection error.";
    }
}

async function speak(textToSay) {
    if (!textToSay) return;
    isSpeaking = true;
    try {
        const mp3 = await openai.audio.speech.create({
            model: "tts-1", voice: "onyx", input: textToSay, speed: 1.2,
        });
        const buffer = Buffer.from(await mp3.arrayBuffer());
        const tempFile = path.join(process.cwd(), 'temp_speech.mp3');
        fs.writeFileSync(tempFile, buffer);

        const player = spawn('powershell', [
            '-c', `Add-Type -AssemblyName PresentationCore; $wmplayer = New-Object System.Windows.Media.MediaPlayer; $wmplayer.Open('${tempFile}'); $wmplayer.Play(); Start-Sleep -s 100; while($wmplayer.Position -lt $wmplayer.NaturalDuration){Start-Sleep -m 100}`
        ]);

        return new Promise((resolve) => {
            player.on('close', () => {
                if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
                isSpeaking = false;
                resolve();
            });
        });
    } catch (error) {
        isSpeaking = false;
    }
}

function startListening() {
    console.log(`System init. Windows Mode. Language: ${CURRENT_LANG}.`);
    
    const pythonExec = path.join(process.cwd(), 'venv', 'Scripts', 'python.exe');
    const speechScript = path.join(process.cwd(), 'speech.py');

    const pythonProcess = spawn(pythonExec, [speechScript, CURRENT_LANG]);

    pythonProcess.stdout.on('data', async (data) => {
        if (isSpeaking) return;
        const lines = data.toString().split('\n');
        for (const line of lines) {
            const text = line.trim();
            if (!text || text === "READY") continue;
            
            const cleanText = text.includes(':') ? text.split(':').slice(1).join(':').trim() : text;
            const lowerText = cleanText.toLowerCase();

            if (["джарвис", "jarvis", "привет", "привіт", "джарвіс"].some(key => lowerText.includes(key))) {
                const aiResponse = await generateText(cleanText);
                if (aiResponse) await speak(aiResponse);
            }
        }
    });

    pythonProcess.on('close', () => {
        setTimeout(startListening, 2000);
    });
}

startListening();