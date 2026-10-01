from pathlib import Path
import json
r=Path(__file__).resolve().parents[1]; css=(r/'src/base.css').read_text()+''.join((r/f).read_text() for f in ['src/extensions.css','src/checkbox.css','src/controls.css','src/feedback.css']); (r/'sacra-ui.css').write_text(css); doc=(r/'src/documentation.js.in').read_text().replace('__EXPORT_CSS_JSON__',json.dumps(css,ensure_ascii=False)); (r/'src/documentation.js').write_text(doc); print('SACRA assets rebuilt; repository entrypoint remains ../index.html')
