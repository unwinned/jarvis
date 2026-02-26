welcome, and thank you for downloading!

unfortunately, Jarvis works only on Ubuntu (Linux) now I'll try to adapt it for Windows in v3 as well

Jarvis' functions:

open any desktop application which is in base (I'll teach him to read all the programs on your pc, and write all it down, to launch easily in future) find any search request in Google within your default browser (in v3 I'll try to give him permission to create links, and go straight on the site, not just search for it in the internet QA mode, you can feel free to talk with Jarvis about whatever you want (don't ask him about actual data, because it updates less on API requests) set your api keys right in launcher (I'll remake fields for that smaller, for smoother UI)
so, let's start from installation:

first of all you need Node.js (don't care about the version), and Python 3.12.3 (Jarvis' was made using this one, and I can guarantee it'll work for sure) once you've downloaded that, you can easily proceed to virtual environment setup for Python: python3 -m venv venv then download all the needed libraries - Javascript: fs, openai, child_process, path, @google/genai. and here's for python: vosk, pyaudio, json, tkinter, subprocess, os, signal
for Ubuntu (I use 24.04): mpg123 xdg-utils

important - install voice models for vosk library from their official site. Install UK, RU, EN libraries (the smallest ones, it'll be enough)

once you've installed all the libraries, and venv is workable - launch Jarvis using "python3 menu.py"
enjoy!