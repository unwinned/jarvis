import os
import sys
import json
import queue
import sounddevice as sd
from vosk import Model, KaldiRecognizer

def start_recognition():
    lang = sys.argv[1] if len(sys.argv) > 1 else "ua"
    
    model_path = f"models/vosk-model-small-{lang}"
    if not os.path.exists(model_path):
        model_path = "models/vosk-model-small-ru"

    model = Model(model_path)
    rec = KaldiRecognizer(model, 16000)
    
    q = queue.Queue()

    def callback(indata, frames, time, status):
        if status:
            print(status, file=sys.stderr)
        q.put(bytes(indata))

    with sd.RawInputStream(samplerate=16000, blocksize=8000, dtype='int16',
                           channels=1, callback=callback):
        print("READY", flush=True)
        
        while True:
            data = q.get()
            if rec.AcceptWaveform(data):
                result = json.loads(rec.Result())
                text = result.get("text", "")
                if text:
                    print(f"{lang}:{text}", flush=True)
            else:
                partial = json.loads(rec.PartialResult())
                partial_text = partial.get("partial", "")
                if partial_text:
                    print(f"{lang}:{partial_text}", flush=True)

if __name__ == "__main__":
    try:
        start_recognition()
    except KeyboardInterrupt:
        sys.exit(0)
    except Exception as e:
        print(f"ERROR:{str(e)}", file=sys.stderr)
        sys.exit(1)