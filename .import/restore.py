from pathlib import Path
import base64, hashlib, tarfile, io
root=Path(__file__).resolve().parent
manifest=__import__('json').loads((root/'manifest.json').read_text())
encoded=''.join((root/name).read_text().strip() for name in manifest['chunks'])
blob=base64.b64decode(encoded)
digest=hashlib.sha256(blob).hexdigest()
if digest != manifest['sha256']:
    raise SystemExit(f'archive checksum mismatch: {digest}')
with tarfile.open(fileobj=io.BytesIO(blob), mode='r:gz') as tf:
    for member in tf.getmembers():
        target=(Path.cwd()/member.name).resolve()
        if not str(target).startswith(str(Path.cwd().resolve())):
            raise SystemExit('unsafe archive member: '+member.name)
    tf.extractall(Path.cwd())
print('restored', manifest['version'], 'from', len(blob), 'bytes')
