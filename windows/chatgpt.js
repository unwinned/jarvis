import OpenAI from 'openai';
import fs from 'fs';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import sound from 'sound-play';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf-8'));
const openai = new OpenAI({ apiKey: config.chatgpt.apiKey });

let isSpeaking = false;
let accumulatedText = "";
let recognitionTimeout = null;

async function speak(textToSay) {
    if (!textToSay) return;
    isSpeaking = true;
    try {
        const mp3 = await openai.audio.speech.create({
            model: "tts-1", voice: "onyx", input: textToSay, speed: 1.1,
        });
        
        const buffer = Buffer.from(await mp3.arrayBuffer());
        const tempFile = path.resolve(__dirname, 'temp_speech.mp3');
        fs.writeFileSync(tempFile, buffer);

        console.log(`tts...`);
        
        await sound.play(tempFile);
        
        if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
        isSpeaking = false;
    } catch (e) {
        console.error("tts error:", e.message);
        isSpeaking = false;
    }
}

function startListening() {
    const pythonExec = path.join(__dirname, 'venv', 'Scripts', 'python.exe');
    const speechScript = path.join(__dirname, 'speech.py');

    const pythonProcess = spawn(pythonExec, [speechScript, config.user.language || 'ua'], {
        env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
    });

    pythonProcess.stdout.on('data', (data) => {
        const raw = data.toString().trim();
        if (!raw || raw === "READY" || isSpeaking) return;

        const part = raw.includes(':') ? raw.split(':').slice(1).join(':').trim() : raw;
        accumulatedText += " " + part;

        clearTimeout(recognitionTimeout);
        
        recognitionTimeout = setTimeout(async () => {
            const finalSpeech = accumulatedText.trim();
            accumulatedText = ""; 

            if (finalSpeech.length < 2) return;

            console.log(`[you]: ${finalSpeech}`);

            const wakeWords = ["джарвис", "jarvis", "привет", "привіт", "джарвіс"];
            if (wakeWords.some(w => finalSpeech.toLowerCase().includes(w))) {
                try {
                    const completion = await openai.chat.completions.create({
                        messages: [
                            { role: "system", content: "Short assistant response." },
                            { role: "user", content: finalSpeech }
                        ],
                        model: "gpt-4o-mini"
                    });
                    
                    const reply = completion.choices[0].message.content;
                    console.log(`[jarvis]: ${reply}`);
                    await speak(reply);
                } catch (err) {
                    console.error("gpt error:", err.message);
                }
            }
        }, 1200);
    });

    pythonProcess.on('close', () => setTimeout(startListening, 2000));
}

console.log("launching...");
startListening();