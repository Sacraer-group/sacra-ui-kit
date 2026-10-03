import json
import os
from pathlib import Path
import subprocess
from jsonschema import Draft202012Validator

root = Path(__file__).resolve().parents[1]
schema = json.loads((root/'schema/request.schema.json').read_text(encoding='utf-8'))
Draft202012Validator.check_schema(schema)
validate = Draft202012Validator(schema)
data = json.loads((root/'examples/topology.json').read_text(encoding='utf-8'))
requests = [
    {'version':1,'id':'info','op':'info'},
    {'version':1,'id':'frame','op':'render','block':{'type':'topology','data':data},'options':{'width':160,'height':44}},
    {'version':1,'id':'typed','op':'hydrate','template':{'x':'{{n}}'},'bindings':{'n':0}},
]
for r in requests:
    validate.validate(r)
p = subprocess.run([os.environ['SACRA_TUI_BIN'],'--stdio'],input='\n'.join(map(json.dumps,requests))+'\n',text=True,capture_output=True,check=True,timeout=5)
responses = list(map(json.loads,p.stdout.splitlines()))
assert len(responses)==len(requests) and all(x['ok'] for x in responses)
assert responses[-1]['data']['x']==0
for bad in [dict(requests[0],version=2), dict(requests[1],options={'width':0,'height':24}), dict(requests[1],block={'type':'panel','children':[]})]:
    assert list(validate.iter_errors(bad)), bad
print('OK: JSON Schema and actual JSONL worker agree on fixtures')
