import tkinter as tk
from tkinter import messagebox
import json
import subprocess
import os
import psutil

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_FILE = os.path.join(BASE_DIR, 'config.json')

class JarvisUI:
    def __init__(self, root):
        self.root = root
        self.root.title("Jarvis Control Panel (Windows)")
        self.root.geometry("500x700")
        self.root.configure(bg="#1e1e1e")
        self.root.resizable(False, False)
        
        self.process = None
        self.config = {
            "user": {"language": "ru", "ai": "chatgpt"},
            "chatgpt": {"apiKey": ""}
        }
        
        self.model_var = tk.StringVar(value="chatgpt")
        self.lang_var = tk.StringVar(value="ru")
        
        self.container = tk.Frame(self.root, bg="#1e1e1e")
        self.container.pack(fill="both", expand=True)
        self.container.grid_rowconfigure(0, weight=1)
        self.container.grid_columnconfigure(0, weight=1)
        
        self.frames = {}
        for F in (MainPage, SettingsPage):
            page_name = F.__name__
            frame = F(parent=self.container, controller=self)
            self.frames[page_name] = frame
            frame.grid(row=0, column=0, sticky="nsew")

        self.load_config()
        self.show_frame("MainPage")
        self.root.protocol("WM_DELETE_WINDOW", self.on_closing)

    def show_frame(self, page_name):
        frame = self.frames[page_name]
        frame.tkraise()

    def load_config(self):
        if os.path.exists(CONFIG_FILE):
            try:
                with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.config.update(data)
                    self.lang_var.set(self.config["user"].get("language", "ru"))
                    self.model_var.set(self.config["user"].get("ai", "chatgpt"))
                    
                    settings = self.frames["SettingsPage"]
                    settings.chatgpt_entry.delete(0, tk.END)
                    settings.chatgpt_entry.insert(0, self.config.get("chatgpt", {}).get("apiKey", ""))
            except Exception as e:
                print(f"Error loading config: {e}")

    def save_config(self):
        settings = self.frames["SettingsPage"]
        self.config["user"]["language"] = self.lang_var.get()
        self.config["user"]["ai"] = self.model_var.get()
        self.config["chatgpt"]["apiKey"] = settings.chatgpt_entry.get().strip()
        
        try:
            with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
                json.dump(self.config, f, indent=4, ensure_ascii=False)
            messagebox.showinfo("Success", "Configuration saved!")
        except Exception as e:
            messagebox.showerror("Error", f"Failed to save: {e}")

    def start_jarvis(self):
        if self.process is None:
            selected_ai = self.model_var.get().lower()
            target_path = os.path.join(BASE_DIR, f"{selected_ai}.js")
            
            if not os.path.exists(target_path):
                target_path = os.path.join(BASE_DIR, f"{selected_ai}.js")

            # print(f"DEBUG: Launching {target_path}")

            if not os.path.exists(target_path):
                messagebox.showerror("Error", f"file {selected_ai}.js не найден!\check: {target_path}")
                return

            try:
                self.process = subprocess.Popen(
                    ['node', target_path], 
                    cwd=BASE_DIR,
                    creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if os.name == 'nt' else 0
                )

                self.frames["MainPage"].status_label.config(text=f"STATUS: ONLINE ({selected_ai})", fg="#238636")
                self.frames["MainPage"].start_btn.config(state=tk.DISABLED)
                self.frames["MainPage"].stop_btn.config(state=tk.NORMAL)
            except Exception as e:
                messagebox.showerror("Error", f"Execution failed: {e}")

    def scan_apps(self):
        scan_path = os.path.join(BASE_DIR, "windows", "apps_scanner.js")
        if not os.path.exists(scan_path):
            scan_path = os.path.join(BASE_DIR, "apps_scanner.js")
        
        if not os.path.exists(scan_path):
            messagebox.showerror("Error", f"Scanner not found at {scan_path}")
            return
        try:
            subprocess.Popen(['node', scan_path], cwd=BASE_DIR)
            messagebox.showinfo("Scanner", "Apps scanner started!")
        except Exception as e:
            messagebox.showerror("Error", f"Failed to start scanner: {e}")

    def stop_jarvis(self):
        if self.process is not None:
            try:
                subprocess.run(['taskkill', '/F', '/T', '/PID', str(self.process.pid)], capture_output=True)
            except:
                pass

        for proc in psutil.process_iter(['name', 'cmdline']):
            try:
                cmd = proc.info.get('cmdline')
                if cmd:
                    cmd_str = " ".join(cmd).lower()
                    if 'node' in proc.info['name'].lower() and any(x in cmd_str for x in ['chatgpt.js', 'gemini.js', 'main.js']):
                        proc.kill()
                    if 'python' in proc.info['name'].lower() and 'speech.py' in cmd_str:
                        proc.kill()
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue

        self.process = None
        self.frames["MainPage"].status_label.config(text="STATUS: OFFLINE", fg="#da3633")
        self.frames["MainPage"].start_btn.config(state=tk.NORMAL)
        self.frames["MainPage"].stop_btn.config(state=tk.DISABLED)

    def on_closing(self):
        self.stop_jarvis()
        self.root.destroy()

class MainPage(tk.Frame):
    def __init__(self, parent, controller):
        super().__init__(parent, bg="#1e1e1e")
        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(0, weight=1)
        
        content = tk.Frame(self, bg="#1e1e1e")
        content.grid(row=0, column=0, sticky="nsew", padx=40, pady=40)
        content.grid_columnconfigure(0, weight=1)

        tk.Label(content, text="Jarvis", bg="#1e1e1e", fg="#ffffff", font=("Segoe UI", 24, "bold")).pack(pady=(10, 30))

        self.start_btn = tk.Button(content, text="Start", command=controller.start_jarvis, bg="#238636", fg="#ffffff", relief=tk.FLAT, font=("Segoe UI", 14, "bold"), cursor="hand2")
        self.start_btn.pack(fill=tk.X, pady=8, ipady=15)

        self.stop_btn = tk.Button(content, text="Stop", command=controller.stop_jarvis, bg="#da3633", fg="#ffffff", relief=tk.FLAT, font=("Segoe UI", 14, "bold"), state=tk.DISABLED, cursor="hand2")
        self.stop_btn.pack(fill=tk.X, pady=8, ipady=15)

        tk.Button(content, text="Scan Apps", command=controller.scan_apps, bg="#6a1b9a", fg="#ffffff", relief=tk.FLAT, font=("Segoe UI", 12, "bold"), cursor="hand2").pack(fill=tk.X, pady=8, ipady=10)

        tk.Button(content, text="Settings", command=lambda: controller.show_frame("SettingsPage"), bg="#2d2d2d", fg="#ffffff", relief=tk.FLAT, font=("Segoe UI", 11)).pack(fill=tk.X, pady=(20, 0), ipady=8)

        self.status_label = tk.Label(content, text="STATUS: OFFLINE", bg="#1e1e1e", fg="#da3633", font=("Segoe UI", 11, "bold"))
        self.status_label.pack(side=tk.BOTTOM, pady=10)

class SettingsPage(tk.Frame):
    def __init__(self, parent, controller):
        super().__init__(parent, bg="#1e1e1e")
        self.grid_columnconfigure(0, weight=1)
        
        content = tk.Frame(self, bg="#1e1e1e")
        content.grid(row=0, column=0, sticky="nsew", padx=40, pady=20)
        content.grid_columnconfigure(0, weight=1)

        tk.Label(content, text="CONFIGURATION", bg="#1e1e1e", fg="#ffffff", font=("Segoe UI", 16, "bold")).pack(pady=(0, 15))

        tk.Label(content, text="ChatGPT API Key", bg="#1e1e1e", fg="#aaaaaa", font=("Segoe UI", 9)).pack()
        self.chatgpt_entry = tk.Entry(content, bg="#2d2d2d", fg="#ffffff", insertbackground="white", relief=tk.FLAT, font=("Consolas", 10), justify='center')
        self.chatgpt_entry.pack(fill=tk.X, pady=(2, 10), ipady=6)

        tk.Label(content, text="Language", bg="#1e1e1e", fg="#aaaaaa", font=("Segoe UI", 9)).pack()
        lang_menu = tk.OptionMenu(content, controller.lang_var, "en", "ru", "uk")
        lang_menu.config(bg="#2d2d2d", fg="#ffffff", relief=tk.FLAT, highlightthickness=0, font=("Segoe UI", 9))
        lang_menu.pack(fill=tk.X, pady=(2, 10))

        tk.Label(content, text="System Type", bg="#1e1e1e", fg="#aaaaaa", font=("Segoe UI", 9)).pack()
        os_frame = tk.Frame(content, bg="#1e1e1e")
        os_frame.pack(pady=5)
        tk.Radiobutton(os_frame, text="Windows", variable=controller.os_var, value="windows", bg="#1e1e1e", fg="#ffffff", selectcolor="#2d2d2d").pack(side=tk.LEFT, padx=10)

        tk.Button(content, text="Save & Back", command=lambda: [controller.save_config(), controller.show_frame("MainPage")], bg="#0e639c", fg="#ffffff", relief=tk.FLAT, font=("Segoe UI", 12, "bold")).pack(fill=tk.X, pady=(15, 0), ipady=10)
        tk.Button(content, text="Cancel", command=lambda: controller.show_frame("MainPage"), bg="#3d3d3d", fg="#ffffff", relief=tk.FLAT).pack(fill=tk.X, pady=5)

if __name__ == "__main__":
    root = tk.Tk()
    app = JarvisUI(root)
    root.mainloop()