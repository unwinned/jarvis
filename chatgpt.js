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
            name: "close_window",
            description: "Closes a specific window or active browser tab by matching its title.",
            parameters: {
                type: "object",
                properties: {
                    title: { type: "string", description: "Keyword in the window or tab title (e.g., Twitter, YouTube)" }
                },
                required: ["title"]
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
    exec(`xdg-open "${url}"`);
    return `Searching for: ${query}`;
}

async function setupWorkspace(category) {
    console.log(`Executing workspace setup for category: ${category}`);
    let executedActions = [];

    if (category === "coding") {
        // Replace 'code' with your specific IDE command if different
        exec(`nohup code > /dev/null 2>&1 &`); 
        exec(`xdg-open "https://github.com"`);
        executedActions.push("IDE and GitHub");
    } 
    else if (category === "twitter") {
        exec(`xdg-open "https://x.com"`);
        executedActions.push("Twitter");
    } 
    else if (category === "ai") {
        exec(`xdg-open "https://chatgpt.com"`);
        exec(`xdg-open "https://gemini.google.com"`);
        executedActions.push("AI platforms");
    }

    return `Configured workspace for ${category}: opened ${executedActions.join(', ')}.`;
}


async function openApp(appName) {
    console.log(`Executing application launch: ${appName}`);
    let command = appMap[appName.toLowerCase()] || appName;
    exec(`nohup ${command} > /dev/null 2>&1 &`, (error) => {
        if (error) console.error(`Failed to launch ${command}:`, error.message);
    });
    return `Opened application: ${appName}`;
}

async function closeApp(appName) {
    console.log(`Executing termination for application: ${appName}`);
    exec(`pkill -i -f "${appName}"`, (error) => {
        if (error) console.error(`Failed to terminate ${appName}:`, error.message);
    });
    return `Terminated application: ${appName}`;
}

async function closeWindow(title) {
    console.log(`Executing window closure for title: ${title}`);
    exec(`xdotool search --name "${title}" windowclose`, (error) => {
        if (error) console.error(`Failed to close window with title ${title}:`, error.message);
    });
    return `Closed window matching: ${title}`;
}

async function openUrl(url) {
    console.log(`Executing URL execution: ${url}`);
    exec(`xdg-open "${url}"`);
    return `Opened website: ${url}`;
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
    
    exec(`xdg-open "${targetUrl}"`);
    return `Searched ${website} for ${query}`;
}

async function generateText(userPrompt) {    
    try {
        const completion = await openai.chat.completions.create({
            messages: [
                { 
                    role: "system", 
                    content: `You are Jarvis. You control the Linux PC.
                    Available system apps: ${availableApps}.
                    You can execute multiple actions simultaneously.
                    If user says it is time to work, ask them to clarify if they mean 'coding', 'twitter', or 'ai'. Do not use tools until they specify.
                    If user specifies they want to work on 'coding', 'twitter', or 'ai', use the setup_workspace tool.
                    If user asks to open an app, use open_app.
                    If user asks to close an app entirely, use close_app.
                    If user asks to close a specific tab or window, use close_window.
                    If user asks to search on a specific website, use search_website.
                    If user asks to open a website, use open_url.
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
            let executionResults = [];
            
            for (const toolCall of message.tool_calls) {
                const args = JSON.parse(toolCall.function.arguments);
                let resultText = "";

                if (toolCall.function.name === "open_app") {
                    resultText = await openApp(args.app_name);
                } 
                else if (toolCall.function.name === "close_app") {
                    resultText = await closeApp(args.app_name);
                }
                else if (toolCall.function.name === "close_window") {
                    resultText = await closeWindow(args.title);
                }
                else if (toolCall.function.name === "google_search") {
                    resultText = await googleSearch(args.query);
                }
                else if (toolCall.function.name === "open_url") {
                    resultText = await openUrl(args.url);
                }
                else if (toolCall.function.name === "search_website") {
                    resultText = await searchWebsite(args.website, args.query);
                }
                else if (toolCall.function.name === "setup_workspace") {
                    resultText = await setupWorkspace(args.category);
                }
                
                executionResults.push(resultText);
            }

            const finalOutput = executionResults.join(' | ');
            console.log(`Tools executed: ${finalOutput}`);
            return finalOutput;
        }

        console.log(`Model response: ${message.content}`);
        return message.content;

    } catch (error) {
        console.error("API Connection Error:", error.message);
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
        console.error("TTS Engine Error:", error.message);
        isSpeaking = false;
    }
}

function startListening() {
    console.log(`System init. Language: ${CURRENT_LANG}. Awaiting input...`);
    
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
                console.log("Audio stream active. Listening...");
                continue;
            }

            let text = rawText;
            if (rawText.includes(':')) {
                text = rawText.split(':').slice(1).join(':').trim(); 
            }

            if (text.length > 0) {
                console.log(`Input received: "${text}"`);
            }

            const lowerText = text.toLowerCase();
            if (lowerText.includes("джарвис") || lowerText.includes("jarvis") || lowerText.includes("привет") || lowerText.includes("привіт")) {
                const aiResponse = await generateText(text);
                if (aiResponse) await speak(aiResponse);
            }
        }
    });
    
    pythonProcess.on('close', (code) => {
        console.log(`Speech process terminated. Code: ${code}. Restarting sequence initiated.`);
        setTimeout(startListening, 2000);
    });
}

startListening();