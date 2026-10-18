"""KB GPU node: llama-swap (порт 8100, модели по запросу) + TUI-монитор.

kb-gpu.bat            генерирует конфиг из models.json, запускает llama-swap, показывает TUI.
kb-gpu.bat --no-start только монитор (прокси уже запущен).
kb-gpu.bat --stop     остановить прокси и все llama-server.
Закрытие окна / q / Ctrl+C останавливает прокси и дочерние llama-server (Job Object KILL_ON_JOB_CLOSE).
"""
import argparse
import ctypes
import ctypes.wintypes as wt
import json
import msvcrt
import os
import re
import secrets
import shutil
import string
import subprocess
import time
import urllib.request
from collections import deque
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import psutil
import threading
from rich.console import Console, Group
from rich.live import Live
from rich.panel import Panel
from rich.table import Table
from rich.text import Text

import swapgen

ROOT = Path(__file__).resolve().parent
SWAP_EXE = ROOT / "llama-swap" / "llama-swap.exe"
TOKEN_FILE = ROOT / "token"
CONFIG = ROOT / "swap.generated.yaml"
SWAP_LOG = ROOT / "logs" / "swap.log"
REFRESH = 2.0
GROUP_COLORS = {"small": "#22d3ee", "llm": "#4ade80", "large": "#e879f9"}
console = Console(color_system="truecolor")


# ---------- Job object: дети умирают вместе с окном ----------
def make_kill_job():
    k = ctypes.WinDLL("kernel32", use_last_error=True)
    k.CreateJobObjectW.restype = wt.HANDLE
    job = k.CreateJobObjectW(None, None)

    class BASIC(ctypes.Structure):
        _fields_ = [("a", ctypes.c_int64), ("b", ctypes.c_int64), ("LimitFlags", wt.DWORD),
                    ("c", ctypes.c_size_t), ("d", ctypes.c_size_t), ("e", wt.DWORD),
                    ("f", ctypes.c_size_t), ("g", wt.DWORD), ("h", wt.DWORD)]

    class IOC(ctypes.Structure):
        _fields_ = [(n, ctypes.c_uint64) for n in "abcdef"]

    class EXT(ctypes.Structure):
        _fields_ = [("Basic", BASIC), ("Io", IOC), ("p", ctypes.c_size_t), ("j", ctypes.c_size_t),
                    ("pm", ctypes.c_size_t), ("pk", ctypes.c_size_t)]

    info = EXT()
    info.Basic.LimitFlags = 0x2000
    k.SetInformationJobObject(job, 9, ctypes.byref(info), ctypes.sizeof(info))
    return k, job


def ensure_token() -> str:
    if not TOKEN_FILE.exists() or not TOKEN_FILE.read_text().strip():
        alphabet = string.ascii_letters + string.digits
        TOKEN_FILE.write_text("".join(secrets.choice(alphabet) for _ in range(40)))
        user = psutil.Process().username().split("\\")[-1]
        subprocess.run(["icacls", str(TOKEN_FILE), "/inheritance:r", "/grant:r", f"{user}:(R,W)"], capture_output=True)
    return TOKEN_FILE.read_text().strip()


def kill_all():
    for p in psutil.process_iter(["name", "exe"]):
        try:
            if p.info["name"] in ("llama-swap.exe", "llama-server.exe") and str(ROOT) in (p.info["exe"] or ""):
                p.kill()
        except psutil.Error:
            pass


# ---------- сбор данных ----------
def http_get(url, token, timeout=1.2):
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.read().decode("utf-8", "replace")
    except Exception:
        return None


def parse_metrics(text):
    m = {}
    for line in (text or "").splitlines():
        if line and line[0] != "#":
            parts = line.split()
            try:
                m[parts[0]] = float(parts[1])
            except (IndexError, ValueError):
                pass
    return m


def gpu_stats():
    try:
        out = subprocess.run(
            ["nvidia-smi", "--query-gpu=utilization.gpu,memory.used,memory.total,power.draw,temperature.gpu",
             "--format=csv,noheader,nounits"], capture_output=True, text=True, timeout=3).stdout.strip()
        return [float(x) for x in out.splitlines()[0].split(",")]
    except Exception:
        return None


def gpu_procs():
    """pid -> MiB (на WDDM драйвер может не отдавать, тогда пусто)"""
    try:
        out = subprocess.run(["nvidia-smi", "--query-compute-apps=pid,used_memory", "--format=csv,noheader,nounits"],
                             capture_output=True, text=True, timeout=3).stdout
        res = {}
        for l in out.splitlines():
            a, b = [x.strip() for x in l.split(",")]
            if b.isdigit():
                res[int(a)] = int(b)
        return res
    except Exception:
        return {}


def poll_model(entry, token):
    """Прямые запросы к llama-server (минуя прокси, чтобы не сбрасывать ttl)."""
    base = entry["proxy"].replace("localhost", "127.0.0.1")
    m = parse_metrics(http_get(base + "/metrics", token))
    slots = None
    try:
        sl = json.loads(http_get(base + "/slots", token) or "null")
        if sl:
            slots = (sum(1 for x in sl if x.get("is_processing")), len(sl))
    except Exception:
        pass
    return m, slots


PALETTES = {  # градиенты (24-бит): начало → середина → конец
    "load": ("#2ecc71", "#f1c40f", "#ff4757"),
    "mem": ("#00d2ff", "#7b61ff", "#ff2e93"),
    "heat": ("#4facfe", "#ffb347", "#ff3b3b"),
    "power": ("#a8ff78", "#ffd200", "#ff6a00"),
}


def _lerp(c1, c2, t):
    a = [int(c1[i:i + 2], 16) for i in (1, 3, 5)]
    b = [int(c2[i:i + 2], 16) for i in (1, 3, 5)]
    return "#%02x%02x%02x" % tuple(round(x + (y - x) * t) for x, y in zip(a, b))


def grad(stops, t):
    t = max(0.0, min(1.0, t))
    return _lerp(stops[0], stops[1], t * 2) if t < .5 else _lerp(stops[1], stops[2], (t - .5) * 2)


def bar(frac, width=18, pal="load"):
    frac = max(0.0, min(1.0, frac))
    n = round(frac * width)
    out = Text()
    for i in range(width):
        out.append("█" if i < n else "░", style=grad(PALETTES[pal], i / max(width - 1, 1)) if i < n else "#2b3040")
    return out


CPU_TEMP = {"v": None}   # ACPI-зона (запасной вариант)
CPU_SENS = {"pkg_t": None, "core_t": [], "pkg_w": None}  # LibreHardwareMonitor (WMI), нужен запущенный LHM от админа
_LHM_PS = ("Get-CimInstance -Namespace root\LibreHardwareMonitor -ClassName Sensor -ErrorAction Stop | "
           "Where-Object { $_.Identifier -like '/intelcpu/*' -or $_.Identifier -like '/amdcpu/*' } | "
           "Select-Object Name,SensorType,Value | ConvertTo-Json -Compress")


def _temp_thread():
    while True:
        try:  # реальные температуры ядер и мощность пакета: встроенный веб-сервер LibreHardwareMonitor (порт 8085)
            tree = json.loads(urllib.request.urlopen("http://127.0.0.1:8085/data.json", timeout=2).read().decode("utf-8"))
            core, pkg, pw = [], [], []

            def walk(n):
                sid = n.get("SensorId") or ""
                if sid.startswith(("/intelcpu/", "/amdcpu/")):
                    m = re.match(r"\s*(-?[\d.,]+)", n.get("Value", ""))
                    if m:
                        v = float(m.group(1).replace(",", "."))
                        name = n.get("Text", "")
                        if "/temperature/" in sid:
                            (pkg if "Package" in name else core if "Core" in name and "Distance" not in name else []).append(v)
                        elif "/power/" in sid and "Package" in name:
                            pw.append(v)
                for c in n.get("Children", []):
                    walk(c)
            walk(tree)
            CPU_SENS.update(pkg_t=pkg[0] if pkg else None, core_t=core, pkg_w=pw[0] if pw else None)
            if core or pkg:
                time.sleep(2)
                continue
        except Exception:
            CPU_SENS.update(pkg_t=None, core_t=[], pkg_w=None)
        try:  # запасной: ACPI thermal zone (не ядра)
            out = subprocess.run(["typeperf", r"\Thermal Zone Information(*)\Temperature", "-sc", "1"],
                                 capture_output=True, text=True, timeout=8, creationflags=0x08000000).stdout.splitlines()
            row = [l for l in out if l.startswith('"') and "PDH" not in l][-1]
            vals = [float(x.strip('"')) for x in row.split(",")[1:] if x.strip('"').replace(".", "").isdigit()]
            CPU_TEMP["v"] = max(vals) - 273.15 if vals else None
        except Exception:
            CPU_TEMP["v"] = None
        time.sleep(3)


CPU_TDP = (10.0, 125.0)  # i7-12700KF: оценка потребления между простоем и PL1


def tail(path, n):
    try:
        with open(path, "rb") as f:
            f.seek(0, 2)
            f.seek(max(0, f.tell() - 65536))
            data = f.read().decode("utf-8", "replace")
        return [l.rstrip() for l in data.splitlines() if l.strip()][-n:]
    except Exception:
        return []


EVENT_RE = re.compile(r"Health check passed|unload|Unload|swapping|Stopping|stopped|Starting|exited|TTL|ttl|killed", re.I)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--no-start", action="store_true", help="только мониторинг")
    ap.add_argument("--stop", action="store_true", help="остановить прокси и llama-server")
    a = ap.parse_args()
    if a.stop:
        kill_all()
        print("остановлено")
        return

    token = ensure_token()
    yaml_text, present, missing, spec = swapgen.generate()
    CONFIG.write_text(yaml_text, encoding="utf-8")
    port = spec["listen"].split(":")[-1]
    base = f"http://127.0.0.1:{port}"
    all_models = spec["models"]
    present_ids = {m["id"] for m in present}
    (ROOT / "logs").mkdir(exist_ok=True)

    if not a.no_start:
        env = {**os.environ, "KB_TOKEN": token}
        chk = subprocess.run([str(SWAP_EXE), "-config", str(CONFIG), "-validate"], env=env, capture_output=True, text=True)
        if chk.returncode:
            print("Конфиг невалиден:\n", chk.stdout, chk.stderr)
            input("Enter…")
            return
        for i, p in missing:
            print(f"нет файла для {i}: {p}")
        k, job = make_kill_job()
        log = open(SWAP_LOG, "wb")
        proc = subprocess.Popen([str(SWAP_EXE), "-config", str(CONFIG), "-listen", spec["listen"]], env=env,
                                stdout=log, stderr=subprocess.STDOUT, creationflags=0x08000000)
        k.AssignProcessToJobObject(job, wt.HANDLE(int(proc._handle)))
    else:
        proc = None

    prev, last_act, peak = {}, {}, dict(vram=0.0, power=0.0, temp=0.0, tps={})
    pool = ThreadPoolExecutor(max_workers=8)
    ram_peak = 0.0

    def render():
        nonlocal ram_peak
        now = time.time()
        g = gpu_stats()
        run_json = http_get(base + "/running", token)
        try:
            running = {r["model"]: r for r in json.loads(run_json)["running"]}
        except Exception:
            running = None
        ready = {k_: v for k_, v in (running or {}).items() if v.get("state") == "ready"}
        polled = dict(zip(ready, pool.map(lambda e: poll_model(e, token), ready.values())))
        gp = gpu_procs()
        # pid -> модель (по имени файла в командной строке дочерних процессов)
        vram_of = {}
        if proc or running:
            for ch in psutil.process_iter(["pid", "name", "cmdline"]):
                try:
                    if ch.info["name"] == "llama-server.exe":
                        cl = " ".join(ch.info["cmdline"] or [])
                        for m in all_models:
                            if Path(os.path.expandvars(m["file"].replace("${KB_GPU}", ROOT.as_posix()))).name in cl:
                                vram_of[m["id"]] = gp.get(ch.info["pid"])
                except psutil.Error:
                    pass

        # железо
        vm = psutil.virtual_memory()
        ram_used = vm.used / 2**30
        ram_peak = max(ram_peak, ram_used)
        lg = Table.grid(padding=(0, 1))
        rg = Table.grid(padding=(0, 1))
        lab = lambda s, c: Text(s, style=f"bold {c}")
        if g:
            util, vu, vt, pw, tp = g
            peak["vram"] = max(peak["vram"], vu); peak["power"] = max(peak["power"], pw); peak["temp"] = max(peak["temp"], tp)
            lg.add_row(lab("Load ", "#2ecc71"), bar(util / 100), f"{util:4.0f}%")
            lg.add_row(lab("VRAM ", "#00d2ff"), bar(vu / vt, pal="mem"), f"{vu/1024:4.1f}/{vt/1024:.0f} GB  [#8a93a6]пик {peak['vram']/1024:.1f}[/]")
            lg.add_row(lab("Power", "#ffd200"), bar(pw / 165, pal="power"), f"{pw:4.0f} W  [#8a93a6]пик {peak['power']:.0f}[/]")
            lg.add_row(lab("Temp ", "#ffb347"), bar((tp - 30) / 60, pal="heat"), f"{tp:4.0f} °C [#8a93a6]пик {peak['temp']:.0f}[/]")
        else:
            lg.add_row("GPU", Text("nvidia-smi недоступен", style="#ff5c6c"))
        cpu = psutil.cpu_percent()
        fr = psutil.cpu_freq()
        real_w = CPU_SENS["pkg_w"]
        cp = real_w if real_w is not None else CPU_TDP[0] + (CPU_TDP[1] - CPU_TDP[0]) * (cpu / 100)
        cores = CPU_SENS["core_t"]
        ct = max(cores) if cores else (CPU_SENS["pkg_t"] or CPU_TEMP["v"])
        rg.add_row(lab("Load ", "#2ecc71"), bar(cpu / 100), f"{cpu:4.0f}%  [#8a93a6]{fr.current/1000:.1f} GHz[/]" if fr else f"{cpu:4.0f}%")
        rg.add_row(lab("RAM  ", "#00d2ff"), bar(vm.percent / 100, pal="mem"), f"{ram_used:4.1f}/{vm.total/2**30:.0f} GB  [#8a93a6]пик {ram_peak:.1f}[/]")
        rg.add_row(lab("Power", "#ffd200"), bar(cp / CPU_TDP[1], pal="power"),
                   f"{cp:4.0f} W  [#8a93a6]пакет CPU[/]" if real_w is not None else f"~{cp:3.0f} W  [#8a93a6]оценка, LHM: Options→Remote Web Server→Run[/]")
        if cores:
            rg.add_row(lab("Temp ", "#ffb347"), bar((ct - 30) / 60, pal="heat"),
                       f"{ct:4.0f} °C  [#8a93a6]макс ядро, ср. {sum(cores)/len(cores):.0f}, мин {min(cores):.0f}[/]")
        elif ct:
            rg.add_row(lab("Temp ", "#ffb347"), bar((ct - 30) / 60, pal="heat"),
                       f"{ct:4.0f} °C  [#8a93a6]{'пакет' if CPU_SENS['pkg_t'] else 'ACPI, не ядра; LHM: Options→Remote Web Server→Run'}[/]")
        else:
            rg.add_row(lab("Temp ", "#ffb347"), bar(0, pal="heat"), "[#8a93a6]нет данных[/]")
        gt = Table.grid(expand=True)
        gt.add_column(ratio=1); gt.add_column(ratio=1)
        gt.add_row(Panel(lg, title="[bold #2ecc71]GPU · RTX 4060 Ti[/]", border_style="#2ecc71", padding=(0, 1)),
                   Panel(rg, title="[bold #4facfe]CPU · i7-12700KF[/]", border_style="#4facfe", padding=(0, 1)))
        gt.row_count_hw = 6

        # модели
        st = Table(expand=True, header_style="bold #e5e7eb on #1f2937", border_style="#374151")
        for col in ("модель", "группа", "состояние", "до выгр.", "ток/с", "декод/с", "всего ток.", "слоты", "очередь", "VRAM", "пик ток/с"):
            st.add_column(col, justify="left" if col in ("модель", "группа") else "right", no_wrap=True)
        for mdl in all_models:
            mid = mdl["id"]
            gc = GROUP_COLORS.get(mdl["group"], "white")
            if mid not in present_ids:
                st.add_row(Text(mid, style="#6b7280"), Text(mdl["group"], style="#6b7280"), Text("нет файла", style="#ff5c6c"), *[""] * 8)
                continue
            r = running.get(mid) if running else None
            if running is None:
                state = Text("прокси недоступен", style="#ff5c6c")
            elif not r:
                state = Text("выгружена", style="#6b7280")
            elif r.get("state") == "ready":
                state = Text("работает", style="bold #4ade80")
            else:
                state = Text(str(r.get("state")), style="bold #facc15")
            tps = dps = 0.0
            left = Text("")
            slots_t, queue_t = "", ""
            tot = ""
            if mid in polled:
                m, slots = polled[mid]
                key = (m.get("llamacpp:prompt_tokens_total", 0), m.get("llamacpp:tokens_predicted_total", 0), m.get("llamacpp:n_decode_total", 0))
                busy = m.get("llamacpp:requests_processing", 0) + m.get("llamacpp:requests_deferred", 0)
                if mid in prev:
                    pk, pt = prev[mid]
                    dt = max(now - pt, 1e-6)
                    tps = max(0.0, (key[0] - pk[0]) + (key[1] - pk[1])) / dt
                    dps = max(0.0, key[2] - pk[2]) / dt
                    if key != pk:
                        last_act[mid] = now
                prev[mid] = (key, now)
                last_act.setdefault(mid, now)
                if busy or (slots and slots[0]):
                    last_act[mid] = now
                rem = mdl["ttl"] - (now - last_act[mid])
                left = Text(f"{int(max(rem, 0)//60)}:{int(max(rem, 0)%60):02d}", style="#facc15" if rem < 60 else "white")
                peak["tps"][mid] = max(peak["tps"].get(mid, 0.0), tps)
                tot = f"{key[0] + key[1]:,.0f}"
                if slots:
                    slots_t = Text(f"{slots[0]}/{slots[1]}", style="#facc15" if slots[0] else "#4ade80")
                queue_t = f"{m.get('llamacpp:requests_processing', 0):.0f}/{m.get('llamacpp:requests_deferred', 0):.0f}"
            else:
                prev.pop(mid, None); last_act.pop(mid, None)
            v = vram_of.get(mid)
            st.add_row(Text(mid, style=f"bold {gc}"), Text(mdl["group"], style=gc), state, left,
                       Text(f"{tps:,.0f}", style="bold #86efac" if tps else "#6b7280"), f"{dps:,.1f}" if mid in polled else "",
                       tot, slots_t, queue_t, f"{v} MiB" if v else ("~" + f"{mdl['vram_gb']:.1f} GB" if mid in polled else ""),
                       f"{peak['tps'].get(mid, 0):,.0f}" if mid in polled or mid in peak["tps"] else "")

        # события загрузки/выгрузки и логи
        size = shutil.get_terminal_size((120, 40))
        lines = tail(SWAP_LOG, 400)
        events = [l for l in lines if EVENT_RE.search(l) and "[INFO]" in l][-5:]
        ev = Text(no_wrap=True, overflow="ellipsis")
        for e in events or ["—"]:
            ev.append(e[:size.columns - 6] + "\n", style="#93c5fd")
        n_log = max(3, size.lines - 6 - (len(all_models) + 4) - 7 - 2 - 1 - 1)
        log = Text(no_wrap=True, overflow="ellipsis")
        for l in lines[-n_log:]:
            low = l.lower()
            style = ("bold #ff5c6c" if re.search(r"error|fail|\[err|\se\s", low)
                     else "#ffc857" if re.search(r"\[warn|\sw\s", low)
                     else "#7dd3a8" if "health check passed" in low else "#8b95a9")
            log.append(l[:size.columns - 6] + "\n", style=style)
        if not lines:
            log.append("—")

        return Group(
            gt,
            Panel(st, title=f"[bold #22d3ee]llama-swap :{port}[/]", border_style="#22d3ee", padding=(0, 1)),
            Panel(ev, title="[bold #818cf8]События (последние 5)[/]", border_style="#818cf8", padding=(0, 1), height=7),
            Panel(log, title="[bold #f472b6]Логи[/]", border_style="#f472b6", padding=(0, 1), height=n_log + 2),
            Text(" q / Ctrl+C / закрытие окна — остановить всё · «до выгр.» = ttl минус простой", style="#6b7a99", no_wrap=True, overflow="ellipsis"),
        )

    if os.environ.get("KB_ONESHOT"):
        threading.Thread(target=_temp_thread, daemon=True).start(); time.sleep(4)
        console.print(render()); time.sleep(2.2); console.print(render()); return
    try:
        threading.Thread(target=_temp_thread, daemon=True).start()
        with Live(render(), console=console, refresh_per_second=4, screen=True) as live:
            nxt = time.time() + REFRESH
            while True:
                while msvcrt.kbhit():
                    if msvcrt.getwch().lower() == "q":
                        return
                if time.time() >= nxt:
                    live.update(render())
                    nxt = time.time() + REFRESH
                time.sleep(0.1)
    except KeyboardInterrupt:
        pass
    finally:
        if proc and proc.poll() is None:
            kill_all()


if __name__ == "__main__":
    main()
