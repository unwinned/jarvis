welcome, and thank you for downloading!

unfortunately, Jarvis works only on Ubuntu (Linux) now I'll try to adapt it for Windows in v3.5 as well


V3.2 IMPROVEMENTS:
- added opportunity to shut Jarvis down. just say it: "Jarvis, goodbye"

V3.3 IMPROVEMENTS:
- removed Gemini. I've removed it because of its unstability, and because it creates a lot of sync problems. so it's better to stay with ChatGPT only now

V3.4 IMPROVEMENTS:
- setting everything up for Windows


Jarvis' functions:
- Jarvis' poweroff
- open any desktop application on your pc. he can close it all as well.
- find any search request in Google within your default browser 
- you can feel free to talk with Jarvis about whatever you want (don't ask him about actual data, because it updates less on API requests) just set your api keys right in launcher (I'll remake fields for that smaller, for smoother UI in v3.5)


UPDATE V3.5 IS COMING FOR:
- giving you smoother and prettier UI
- windows version
- faster Jarvis' responses
- updating Gemini as well as chatgpt was upgraded


so, let's start from installation:

first of all you need Node.js (don't care about the version), and Python 3.12.3 (Jarvis' was made using this one, and I can guarantee it'll work for sure) once you've downloaded that, you can easily proceed to virtual environment setup for Python: python3 -m venv venv then download all the needed libraries - Javascript: fs, openai, child_process, path, @google/genai. and here's for python: vosk, pyaudio, json, tkinter, subprocess, os, signal
for Ubuntu (I use 24.04): mpg123 xdg-utils xdotool


important - install voice models for vosk library from their official site. Install UK, RU, EN libraries (the smallest ones, it'll be enough)

once you've installed all the libraries, and venv is workable - launch Jarvis using "source venv/bin/activate" and "python3 menu.py"

enjoy!