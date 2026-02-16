import sys
import os
import sounddevice as sd
import queue
import json
from vosk import Model, KaldiRecognizer


LANG = sys.argv[1] if len(sys.argv) > 1 else "ru"

Model.verbosity = -1

q = queue.Queue()

def callback(indata, frames, time, status):
    if status:
        print(status, file=sys.stderr)
    q.put(bytes(indata))

models_path = "models"
model_path = f"{models_path}/{LANG}"

if not os.path.exists(model_path):
    print(f"Error: Model for language '{LANG}' not found at {model_path}", file=sys.stderr)
    sys.exit(1)

print(f"Loading model: {LANG}...", file=sys.stderr)
try:
    model = Model(model_path)
except Exception as e:
    print(f"Error loading model: {e}", file=sys.stderr)
    sys.exit(1)

rec = KaldiRecognizer(model, 16000)
print("READY", flush=True)

with sd.RawInputStream(samplerate=16000, blocksize=1400, device=None, dtype='int16',
                       channels=1, callback=callback):
    while True:
        data = q.get()
        if rec.AcceptWaveform(data):
            res = json.loads(rec.Result())
            if res['text']:
                print(f"{LANG}:{res['text']}", flush=True)