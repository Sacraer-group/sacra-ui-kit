"""Linux/macOS pseudo-terminal smoke: demo cleanup, resize, q, Ctrl-C, SIGTERM."""
from __future__ import annotations
import fcntl
import os
from pathlib import Path
import pty
import select
import signal
import struct
import subprocess
import sys
import termios
import time

ROOT = Path(__file__).resolve().parents[1]
BIN = os.environ['SACRA_TUI_BIN']


def test(argv, *, key=None, sig=None):
    master, slave = pty.openpty()
    fcntl.ioctl(slave, termios.TIOCSWINSZ, struct.pack('HHHH', 44, 160, 0, 0))
    before = termios.tcgetattr(slave)
    env = {**os.environ, 'TERM': 'xterm-256color'}
    p = subprocess.Popen(argv, stdin=slave, stdout=slave, stderr=slave, env=env)
    data = b''
    try:
        until = time.monotonic() + 3
        while time.monotonic() < until:
            if select.select([master], [], [], .1)[0]:
                data += os.read(master, 65536)
                if b'SACRA' in data:
                    break
        assert b'SACRA' in data, (argv, data[-1000:])
        fcntl.ioctl(slave, termios.TIOCSWINSZ, struct.pack('HHHH', 24, 80, 0, 0))
        p.send_signal(signal.SIGWINCH)
        time.sleep(.2)
        if key:
            os.write(master, key)
        if sig:
            p.send_signal(sig)
        until = time.monotonic() + 8
        while time.monotonic() < until:
            if select.select([master], [], [], .1)[0]:
                data += os.read(master, 65536)
            if p.poll() is not None:
                break
        p.wait(timeout=1)
        while select.select([master], [], [], 0)[0]:
            data += os.read(master, 65536)
        assert p.returncode == 0, (argv, p.returncode, data[-1000:])
        assert b'\x1b[?1049l' in data, (argv, 'alternate screen was not restored')
        after = termios.tcgetattr(slave)
        assert before == after, (argv, 'terminal attributes were not restored')
    finally:
        if p.poll() is None:
            p.kill(); p.wait()
        os.close(master); os.close(slave)


test([BIN, '--demo', '--color', 'truecolor'], sig=signal.SIGTERM)
test([BIN, '--demo'], sig=signal.SIGINT)
test([sys.executable, str(ROOT/'examples/python_native.py')], key=b'q')
test(['node', str(ROOT/'examples/node_native.mjs')], key=b'q')
print('OK: Go SIGINT/SIGTERM; Python/Node q; PTY resize and terminal mode restoration')
