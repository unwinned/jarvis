import { GoogleGenAI } from "@google/genai";
import fs from 'fs';
import { spawn } from 'child_process';

const rawData = fs.readFileSync('config.json');
const config = JSON.parse(rawData);
const CURRENT_LANG = config.user.gemini.language || 'ru';

const aiClient = new GoogleGenAI({ apiKey: config.user.apiKey });

let isSpeaking = false;

async function generateText(userPrompt) {    
    try {
        const response = await aiClient.models.generateContent({
            model: "gemini-2.0-flash", 
            config: {
                systemInstruction: {
                    parts: [{ text: `You're Jarvis, AI assistent from Iron-Man 
                    Your answers must be short, exact and without water (you can write 2 sentences max, 
                    unless user asks for detailed explanation).
                    Answer the same language you were asked`}]
                }
            },
            contents: [{ parts: [{ text: userPrompt }] }]
        });

        const text = response.candidates[0].content.parts[0].text;
        console.log(`AI answer: ${text}`);
        return text;
    } catch (error) {
        console.error("Error with text generation:", error);
        return "Sorry, error happened with voice...";
    }
}

async function speak(textToSay) {
    if (!textToSay) return;
    
    isSpeaking = true;
    console.log("Generating voice...");
    
    try {
        const response = await aiClient.models.generateContent({
            model: "gemini-2.5-flash-preview-tts", 
            contents: [{ parts: [{ text: textToSay }] }],
            config: {
                responseModalities: ['AUDIO'],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Puck' },
                    },
                },
            },
        });

        const data = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        
        if (!data) {
            console.error("No audio data");
            isSpeaking = false;
            return;
        }

        const audioBuffer = Buffer.from(data, 'base64');
        
        const player = spawn('aplay', ['-c', '1', '-r', '24000', '-f', 'S16_LE', '-q']);
        player.stdin.write(audioBuffer);
        player.stdin.end();

        await new Promise((resolve) => {
            player.on('close', () => {
                isSpeaking = false;
                resolve();
            });
        });

    } catch (error) {
        console.error("Error with voice:", error);
        isSpeaking = false;
    }
}

function startListening() {
    console.log(`Launching Jarvis with language: ${CURRENT_LANG}...`);
    
    const pythonProcess = spawn('./venv/bin/python3', ['speech.py', CURRENT_LANG]);

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

            console.log(`You said: (${CURRENT_LANG}): "${text}"`);

            const lowerText = text.toLowerCase();
            if (
                lowerText.includes("джарвис") || 
                lowerText.includes("jarvis") || 
                lowerText.includes("привет") ||
                lowerText.includes("привіт")
            ) {
                const aiResponse = await generateText(text);
                await speak(aiResponse);
                
                console.log("Listening...");
            }
        }
    });

    // pythonProcess.stderr.on('data', (data) => {
    //     console.error(`[Python]: ${data}`);
    // });
    
    pythonProcess.on('close', (code) => {
        console.log(`Python process felt with code: ${code}`);
        setTimeout(startListening, 1000); 
    });
}

(async () => {
    try {
        startListening();
    } catch (e) {
        console.error("Critical error:", e);
    }
})();