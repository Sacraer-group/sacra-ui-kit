"""Native Rust CLI integration. Unix PTY is test-only; runtime is pure Rust.
Build: cargo build --features terminal; SACRA_RUST_BIN=... python3 tests/cli.py
"""
import fcntl
import json
import os
from pathlib import Path
import pty
import select
import signal
import struct
import subprocess
import termios
import time
import unittest

BIN = os.environ.get('SACRA_RUST_BIN', str(Path(__file__).resolve().parents[1]/'target/debug/sacra-tui-rs'))


class CLI(unittest.TestCase):
    def test_jsonl_errors_then_render(self):
        requests = [
            {'version':1,'id':'info','op':'info'},
            {'version':1,'id':'render','op':'render','block':{'type':'panel','title':'MODEL','children':[{'type':'text','text':'Привет'}]},'options':{'width':40,'height':8}},
            {'version':1,'id':'types','op':'hydrate','template':{'v':'{{v}}','b':'{{b}}'},'bindings':{'v':0,'b':False}},
        ]
        p = subprocess.run([BIN,'--stdio'],input='{bad\n'+'\n'.join(json.dumps(x) for x in requests)+'\n',text=True,capture_output=True,timeout=5)
        self.assertEqual(p.returncode,0,p.stderr)
        responses = [json.loads(x) for x in p.stdout.splitlines()]
        self.assertFalse(responses[0]['ok'])
        self.assertTrue(all(x['ok'] for x in responses[1:]))
        self.assertIn('Привет','\n'.join(responses[2]['frame']['lines']))
        self.assertEqual(responses[3]['data'],{'v':0,'b':False})
        self.assertEqual(responses[1]['data']['implementation'],'rust-native')

    def test_snapshot_and_no_color(self):
        env = {**os.environ,'NO_COLOR':'1'}
        p = subprocess.run([BIN,'--snapshot','--width','160','--height','44','--color','truecolor'],text=True,capture_output=True,env=env,timeout=5)
        self.assertEqual(p.returncode,0,p.stderr)
        self.assertEqual(len(p.stdout.splitlines()),44)
        self.assertIn('SACRA / RUST NATIVE',p.stdout)
        self.assertNotIn('\x1b',p.stdout)
        p = subprocess.run([BIN,'--demo'],capture_output=True,timeout=5)
        self.assertNotEqual(p.returncode,0)
        self.assertNotIn(b'\x1b[?1049h',p.stdout)

    def check_pty(self, *, key=None, sig=None, bad=False):
        master, slave = pty.openpty()
        fcntl.ioctl(slave,termios.TIOCSWINSZ,struct.pack('HHHH',44,160,0,0))
        before = termios.tcgetattr(slave)
        args=[BIN,'--demo','--color','truecolor']+(['--theme','invalid'] if bad else [])
        p=subprocess.Popen(args,stdin=slave,stdout=slave,stderr=slave,env={**os.environ,'TERM':'xterm-256color'})
        output=b''
        try:
            end=time.monotonic()+5
            while time.monotonic()<end:
                if select.select([master],[],[],.05)[0]:
                    output+=os.read(master,65536)
                if b'SACRA' in output or p.poll() is not None: break
            if not bad:
                self.assertIn(b'SACRA',output)
                fcntl.ioctl(slave,termios.TIOCSWINSZ,struct.pack('HHHH',24,80,0,0))
                p.send_signal(signal.SIGWINCH)
                os.write(master,b'\t\rpt')  # focus, selection, pause, theme
                time.sleep(.15)
                if key: os.write(master,key)
                if sig: p.send_signal(sig)
            end=time.monotonic()+5
            while time.monotonic()<end:
                if select.select([master],[],[],.05)[0]: output+=os.read(master,65536)
                if p.poll() is not None: break
            p.wait(timeout=1)
            while select.select([master],[],[],0)[0]: output+=os.read(master,65536)
            self.assertEqual(p.returncode,1 if bad else 0,output[-1000:])
            self.assertIn(b'\x1b[?1049l',output)
            self.assertIn(b'\x1b[?25h',output)
            self.assertEqual(termios.tcgetattr(slave),before)
        finally:
            if p.poll() is None: p.kill();p.wait()
            os.close(master);os.close(slave)

    def test_q_exit(self): self.check_pty(key=b'q')
    def test_ctrl_c_exit(self): self.check_pty(key=b'\x03')
    def test_sigterm_exit(self): self.check_pty(sig=signal.SIGTERM)
    def test_sigint_exit(self): self.check_pty(sig=signal.SIGINT)
    def test_render_error_restores_terminal(self): self.check_pty(bad=True)


if __name__=='__main__': unittest.main()
