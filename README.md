welcome, and thank you for downloading!

unfortunately, Jarvis works only on Ubuntu (Linux) now I'll try to adapt it for Windows in v3.5 as well

V3.4 IMPROVEMENTS:
- setting everything up for Windows, and updating UI, it's a way better now

V3.5 IMROVEMENTS:
- ability to work with Jarvis on Windows (launch chatgpt.js directly, because menu.py doesn't want to work somewhy, I hate windows btw)
- faster responses


Jarvis' functions:
- Jarvis' poweroff
- open any desktop application on your pc. he can close it all as well.
- find any search request in Google within your default browser 
- you can feel free to talk with Jarvis about whatever you want (don't ask him about actual data, because it updates less on API requests) just set your api keys right in launcher
- really good ui


so, let's start from installation:

first of all you need Node.js (don't care about the version), and Python 3.12.3 (Jarvis' was made using this one, and I can guarantee it'll work for sure) once you've downloaded that, you can easily proceed to virtual environment setup for Python: python3 -m venv venv then download all the needed libraries - Javascript: fs, openai, child_process, path, @google/genai. and here's for python: vosk, pyaudio, json, tkinter, subprocess, os, signal, psutil
for Ubuntu (I use 24.04): mpg123 xdg-utils xdotool


important - install voice models for vosk library from their official site. Install UK, RU, EN libraries (the smallest ones, it'll be enough)

once you've installed all the libraries, and venv is workable - launch Jarvis using "source venv/bin/activate" and "python3 menu.py"

enjoy!