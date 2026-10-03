"""Refresh the embedded native palette registry from the canonical TUI JSON."""
from pathlib import Path
import argparse
import json

root = Path(__file__).resolve().parents[1]
p = argparse.ArgumentParser()
p.add_argument('--source', type=Path, default=root.parent/'assets/themes.json')
args = p.parse_args()
registry = json.loads(args.source.read_text(encoding='utf-8'))
themes = registry['themes']
if len(themes) != 8 or len({t['id'] for t in themes}) != 8:
    raise ValueError('Expected eight distinct canonical palettes')
(root/'go/themes.json').write_text(json.dumps(themes,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Updated go/themes.json; rebuild the binary and run tests before committing.')
