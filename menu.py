
import tkinter as tk
from tkinter import messagebox
import json
import subprocess
import os
import signal

CONFIG_FILE = 'config.json'

# BETA | IT MEANS THIS ISN'T FINISHED YET.

class JarvisUI:
    def __init__(self, root):
        self.root = root
        self.root.title("Jarvis Control Panel")
        self.root.geometry("500x550")
        self.root.configure(bg="#1e1e1e")
        self.root.resizable(False, False)
        
        self.process = None
        
        self.config = {
            "user": {
                "language": "en",
                "gemini": {"apiKey": ""},
                "chatgpt": {"apiKey": ""}
            }
        }
        self.load_config()

        self.setup_ui()

    def setup_ui(self):
        main_frame = tk.Frame(self.root, bg="#1e1e1e", padx=25, pady=25)
        main_frame.pack(fill=tk.BOTH, expand=True)

        header = tk.Label(main_frame, text="SYSTEM CONFIGURATION", bg="#1e1e1e", fg="#ffffff", font=("Segoe UI", 14, "bold"))
        header.pack(anchor=tk.W, pady=(0, 20))

        tk.Label(main_frame, text="ChatGPT API Key", bg="#1e1e1e", fg="#aaaaaa", font=("Segoe UI", 10)).pack(anchor=tk.W)
        self.chatgpt_entry = tk.Entry(main_frame, width=55, bg="#2d2d2d", fg="#ffffff", insertbackground="white", relief=tk.FLAT, font=("Consolas", 10))
        self.chatgpt_entry.insert(0, self.config["user"].get("chatgpt", {}).get("apiKey", ""))
        self.chatgpt_entry.pack(fill=tk.X, pady=(5, 15), ipady=6)

        tk.Label(main_frame, text="Gemini API Key", bg="#1e1e1e", fg="#aaaaaa", font=("Segoe UI", 10)).pack(anchor=tk.W)
        self.gemini_entry = tk.Entry(main_frame, width=55, bg="#2d2d2d", fg="#ffffff", insertbackground="white", relief=tk.FLAT, font=("Consolas", 10))
        self.gemini_entry.insert(0, self.config["user"].get("gemini", {}).get("apiKey", ""))
        self.gemini_entry.pack(fill=tk.X, pady=(5, 15), ipady=6)

        tk.Label(main_frame, text="System Language", bg="#1e1e1e", fg="#aaaaaa", font=("Segoe UI", 10)).pack(anchor=tk.W)
        self.lang_var = tk.StringVar(value=self.config["user"].get("language", "en"))
        lang_menu = tk.OptionMenu(main_frame, self.lang_var, "en", "ru", "uk")
        lang_menu.config(bg="#2d2d2d", fg="#ffffff", activebackground="#3d3d3d", relief=tk.FLAT, highlightthickness=0)
        lang_menu.pack(fill=tk.X, pady=(5, 15), ipady=3)

        tk.Label(main_frame, text="Select AI Model", bg="#1e1e1e", fg="#aaaaaa", font=("Segoe UI", 10)).pack(anchor=tk.W)
        self.model_var = tk.StringVar(value="chatgpt")
        
        radio_frame = tk.Frame(main_frame, bg="#1e1e1e")
        radio_frame.pack(fill=tk.X, pady=(5, 20))
        
        rb_style = {"bg": "#1e1e1e", "fg": "#ffffff", "activebackground": "#1e1e1e", "activeforeground": "#0e639c", "selectcolor": "#2d2d2d", "font": ("Segoe UI", 10)}
        tk.Radiobutton(radio_frame, text="ChatGPT (chatgpt.js)", variable=self.model_var, value="chatgpt", **rb_style).pack(side=tk.LEFT, padx=(0, 20))
        tk.Radiobutton(radio_frame, text="Gemini (gemini.js)", variable=self.model_var, value="gemini", **rb_style).pack(side=tk.LEFT)

        btn_frame = tk.Frame(main_frame, bg="#1e1e1e")
        btn_frame.pack(fill=tk.X, pady=(10, 0))

        self.save_btn = tk.Button(btn_frame, text="Save Settings", command=self.save_config, bg="#0e639c", fg="#ffffff", relief=tk.FLAT, font=("Segoe UI", 10, "bold"), cursor="hand2")
        self.save_btn.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 5), ipady=8)

        self.start_btn = tk.Button(btn_frame, text="Start", command=self.start_jarvis, bg="#238636", fg="#ffffff", relief=tk.FLAT, font=("Segoe UI", 10, "bold"), cursor="hand2")
        self.start_btn.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=5, ipady=8)

        self.stop_btn = tk.Button(btn_frame, text="Stop", command=self.stop_jarvis, bg="#da3633", fg="#ffffff", relief=tk.FLAT, font=("Segoe UI", 10, "bold"), state=tk.DISABLED, cursor="hand2")
        self.stop_btn.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(5, 0), ipady=8)

        self.status_label = tk.Label(main_frame, text="STATUS: OFFLINE", bg="#1e1e1e", fg="#da3633", font=("Segoe UI", 10, "bold"))
        self.status_label.pack(side=tk.BOTTOM, pady=(20, 0))

        self.root.protocol("WM_DELETE_WINDOW", self.on_closing)

    def load_config(self):
        if os.path.exists(CONFIG_FILE):
            try:
                with open(CONFIG_FILE, 'r') as f:
                    file_data = json.load(f)
                    if "user" in file_data:
                        self.config["user"].update(file_data["user"])
            except:
                pass

    def save_config(self):
        self.config["user"]["chatgpt"]["apiKey"] = self.chatgpt_entry.get().strip()
        self.config["user"]["gemini"]["apiKey"] = self.gemini_entry.get().strip()
        self.config["user"]["language"] = self.lang_var.get()
        
        try:
            with open(CONFIG_FILE, 'w') as f:
                json.dump(self.config, f, indent=4)
            messagebox.showinfo("Success", "Settings saved to config.json")
        except Exception as e:
            messagebox.showerror("Error", f"Save failed: {e}")

    def start_jarvis(self):
        if self.process is None:
            selected_model = self.model_var.get()
            script_name = "chatgpt.js" if selected_model == "chatgpt" else "gemini.js"
            
            if not os.path.exists(script_name):
                messagebox.showerror("Error", f"File {script_name} not found!")
                return

            try:
                self.process = subprocess.Popen(
                    ['node', script_name], 
                    preexec_fn=os.setsid
                )
                self.status_label.config(text=f"STATUS: ONLINE ({script_name})", fg="#238636")
                self.start_btn.config(state=tk.DISABLED)
                self.stop_btn.config(state=tk.NORMAL)
            except Exception as e:
                messagebox.showerror("Error", f"Failed to start: {e}")

    def stop_jarvis(self):
        if self.process is not None:
            try:
                os.killpg(os.getpgid(self.process.pid), signal.SIGTERM)
            except:
                pass
            finally:
                self.process = None
                self.status_label.config(text="STATUS: OFFLINE", fg="#da3633")
                self.start_btn.config(state=tk.NORMAL)
                self.stop_btn.config(state=tk.DISABLED)

    def on_closing(self):
        self.stop_jarvis()
        self.root.destroy()

if __name__ == "__main__":
    root = tk.Tk()
    app = JarvisUI(root)
    root.mainloop()