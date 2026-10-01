from pathlib import Path
import base64,hashlib,json
r=Path(__file__).resolve().parents[1]; b=(r/'wasm/geometry.wasm').read_bytes(); (r/'wasm/geometry-binary.js').write_text('window.SACRA_WASM_BINARY = '+json.dumps({'base64':base64.b64encode(b).decode(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()})+';\n'); (r/'wasm/manifest.json').write_text(json.dumps({'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest(),'source':'src/geometry.c'},indent=2)+'\n')
