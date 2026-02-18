import OpenAI from 'openai';
import fs from 'fs';
import { spawn, exec } from 'child_process';
import path from 'path';

const rawData = fs.readFileSync('config.json');
const config = JSON.parse(rawData);
const CURRENT_LANG = config.user.language || 'ru';

// dict where you must add your apps. key is what you can say, value is command to launch it in terminal
const appsData = fs.readFileSync('apps.json');
const appMap = JSON.parse(appsData);

const openai = new OpenAI({
    apiKey: config.user.chatgpt.apiKey, 
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
                    app_name: { type: "string", description: "name of app" }
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
    }
];

let isSpeaking = false;
async function googleSearch(query) {
    console.log(`Opening browser: ${query}`);
    const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    exec(`xdg-open "${url}"`);
    return `Searching for: ${query}`;
}

async function openApp(appName) {
    console.log(`Launching app: ${appName}`);

    let command = appMap[appName.toLowerCase()] || appName;

    exec(`nohup ${command} > /dev/null 2>&1 &`, (error) => {
        if (error) console.error(`Error of launching ${command}:`, error.message);
    });

    return `Launching: ${appName}`;
}


async function generateText(userPrompt) {    
    try {
        const completion = await openai.chat.completions.create({
            messages: [
                { 
                    role: "system", 
                    content: `You are Jarvis. You control the Linux PC.
                    If user asks to open something or search, USE THE TOOLS provided.
                    Otherwise, answer briefly (max 2 sentences).
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
            const toolCall = message.tool_calls[0];
            const args = JSON.parse(toolCall.function.arguments);
            let resultText = "";

            if (toolCall.function.name === "open_app") {
                resultText = await openApp(args.app_name);
            } 
            else if (toolCall.function.name === "google_search") {
                resultText = await googleSearch(args.query);
            }

            console.log(`Opened app: ${resultText}`);
            return resultText;
        }

        console.log(`Jarvis answered: ${message.content}`);
        return message.content;

    } catch (error) {
        console.error("OpenAI Error:", error.message);
        return "Connection error.";
    }
}

async function speak(textToSay) {
    if (!textToSay) return;
    isSpeaking = true;
    
    try {
        const mp3 = await openai.audio.speech.create({
            model: "tts-1",          
            voice: "onyx",       
            input: textToSay,
            speed: 1.2,
        });

        const buffer = Buffer.from(await mp3.arrayBuffer());
        
        const player = spawn('mpg123', ['-f', '80000', '-q', '-']); 
        player.stdin.write(buffer);
        player.stdin.end();

        return new Promise((resolve) => {
            player.on('close', () => {
                isSpeaking = false;
                resolve();
            });
        });
    } catch (error) {
        console.error("TTS Error:", error);
        isSpeaking = false;
    }
}

function startListening() {
    console.log(`Launching Jarvis with language: ${CURRENT_LANG}...`);
    
    const pythonExec = path.join(process.cwd(), 'venv', 'bin', 'python3');
    const speechScript = path.join(process.cwd(), 'speech.py');

    const pythonProcess = spawn(pythonExec, [speechScript, CURRENT_LANG]);

    pythonProcess.stdout.on('data', async (data) => {
        if (isSpeaking) return;

        const lines = data.toString().split('\n');

        for (const line of lines) {
            const rawText = line.trim();
            if (!rawText) continue;

            if (rawText === "READY") {
                console.log("Listening...");
                continue;
            }

            let text = rawText;
            if (rawText.includes(':')) {
                const parts = rawText.split(':');
                text = parts.slice(1).join(':').trim(); 
            }

            console.log(`You said: "${text}"`);

            const lowerText = text.toLowerCase();
            if (
                lowerText.includes("джарвис") || 
                lowerText.includes("jarvis") || 
                lowerText.includes("привет") ||
                lowerText.includes("привіт")
            ) {
                const aiResponse = await generateText(text);
                if (aiResponse) {
                    await speak(aiResponse);
                }
            }
        }
    });
    
    pythonProcess.on('close', (code) => {
        console.log(`Speech process stopped with code: ${code}. Restarting...`);
        setTimeout(startListening, 2000); 
    });
}

(async () => {
    startListening();
})();