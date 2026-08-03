📖 About

Jarvis is a personal desktop AI assistant with a graphical UI, voice recognition, and control over your system: launch and close apps, run Google searches, and have open-ended conversations powered by ChatGPT / Gemini.

Currently runs on Ubuntu (Linux); Windows support is being worked on.

✨ Features
🔌 Power off your PC on command
🖥️ Open and close any desktop application
🔎 Run Google searches in your default browser
💬 Free-form conversation via ChatGPT / Gemini (bring your own API keys)
🎙️ Offline speech recognition (Vosk) — EN / RU / UK
🎨 Clean, easy-to-use UI
🛠️ Stack
Category	Technologies
Python	vosk, pyaudio, tkinter, psutil
Node.js	openai, @google/genai, fs, child_process, path
System	mpg123, xdg-utils, xdotool (Ubuntu)

📁 Project structure
jarvis/
├── windows/          # Windows-specific build/launch files
├── apps.json          # scanned/known desktop applications
├── apps_scanner.js     # detects installed apps for launch/close
├── chatgpt.js           # ChatGPT / Gemini API integration
├── config.json           # API keys & settings
├── main.js                # Electron/Node entry point
├── menu.py                 # main launcher & UI (Linux)
└── speech.py                # voice recognition (Vosk)
🚀 Installation

Prerequisites: Node.js (any recent version), Python 3.12.3

bash
git clone https://github.com/unwinned/jarvis.git
cd jarvis

# Python virtual environment
python3 -m venv venv
source venv/bin/activate
pip install vosk pyaudio psutil

# Node.js dependencies
npm install openai @google/genai

Ubuntu system packages:

bash
sudo apt install mpg123 xdg-utils xdotool

Voice models: download the small EN / RU / UK models from the official Vosk site — that's enough for speech recognition to work.

⚙️ Configuration

Set your API keys (OpenAI / Gemini) in config.json before launching.

▶️ Usage

Linux:

bash
source venv/bin/activate
python3 menu.py

Windows (v3.5+): launch chatgpt.js directly — menu.py isn't fully supported on Windows yet.

🗺️ Roadmap
 Full Windows support
 Updated UI (v3.4)
 Faster response times
⚠️ Disclaimer

For personal, educational use. Voice assistant responses depend on the underlying AI API and may not reflect real-time data.

📬 Contact
X (Twitter): @0xunwinned
