from __future__ import annotations
import json
import os
from pathlib import Path
import subprocess
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'python'))
from sacra_tui import Client, SDKError, panel, text, block, topology
BIN = os.environ['SACRA_TUI_BIN']


class Integration(unittest.TestCase):
    def test_timeout_closes_worker(self):
        for value in ['wait', 'x' * 200000]:
            with Client(ROOT/'tests/timeout_worker.py', timeout=.08) as c:
                with self.assertRaisesRegex(SDKError, 'timed out'):
                    c.render(text(value))
                self.assertIsNotNone(c._proc.poll())

    def test_blocks_and_contract(self):
        with Client(BIN) as client:
            f = client.render(panel('HEADER', text('Привет e\u0301 世界')), width=50, height=8)
            self.assertEqual(len(f.lines), 8)
            self.assertIn('Привет', f.plain)
            out = client.hydrate({'a':'{{x.zero}}','b':'{{x.flag}}','c':'{{x.list}}'}, {'x':{'zero':0,'flag':False,'list':[1,2]}})
            self.assertEqual(out, {'a':0,'b':False,'c':[1,2]})
            with self.assertRaises(SDKError):
                client.hydrate('{{missing}}', {})
            with self.assertRaises(SDKError):
                client.render(text('bad size'), width=0)
            self.assertTrue(client.render(text('still alive'), width=20, height=1).plain.startswith('still alive'))
        with self.assertRaises(SDKError):
            client.render(text('closed'))

    def test_reject_nonfinite(self):
        with Client(BIN) as c:
            with self.assertRaises(ValueError):
                c.render(block('meter', value=float('nan')))

    def test_all_themes_fixed_geometry_and_real_states(self):
        data = json.loads((ROOT/'examples/topology.json').read_text(encoding='utf-8'))
        data['session']['source'] = 'adapter'
        data['nodes'][2]['state'] = 'blocked'
        with Client(BIN) as c:
            themes = c.request('info')['data']['themes']
            baseline = None
            for theme in themes:
                f = c.render(topology(data), width=160, height=44, theme=theme, selected_id='worker')
                self.assertIn('[BLOCK]', f.plain)
                if baseline is not None:
                    self.assertEqual(f.lines, baseline)
                baseline = f.lines

    def test_jsonl_recovers_after_malformed_line(self):
        good = {'version':1,'id':'a','op':'info'}
        p = subprocess.run([BIN,'--stdio'], input='{bad\n'+json.dumps(good)+'\n', text=True, capture_output=True, timeout=5)
        self.assertEqual(p.returncode,0,p.stderr)
        a,b = map(json.loads,p.stdout.splitlines())
        self.assertFalse(a['ok']); self.assertTrue(b['ok']); self.assertEqual(b['id'],'a')

    def test_examples_once(self):
        for argv in [[sys.executable,str(ROOT/'examples/python_native.py'),'--once'], ['node',str(ROOT/'examples/node_native.mjs'),'--once']]:
            p = subprocess.run(argv,text=True,capture_output=True,timeout=10)
            self.assertEqual(p.returncode,0,p.stderr)
            self.assertIn('SACRA',p.stdout)
            self.assertNotIn('\x1b[?1049h',p.stdout)

    def test_input_limit(self):
        p = subprocess.run([BIN,'--stdio'],input='x'*1048577+'\n',text=True,capture_output=True,timeout=5)
        self.assertNotEqual(p.returncode,0)

if __name__=='__main__': unittest.main()
