from pathlib import Path
R = Path(__file__).resolve().parents[1]
required = [
    R / 'src' / 'sacra-docs.css',
    R / 'src' / 'sacra-docs.js',
    R / 'examples' / 'documentation.html',
    R / 'examples' / 'documentation-guide.html',
    R / 'docs' / 'DOCUMENTATION.md',
]
for path in required:
    assert path.exists(), path
api = (R / 'examples' / 'documentation.html').read_text(encoding='utf-8')
assert 'data-doc-languages' in api
assert 'data-doc-copy' in api
assert '../src/sacra-docs.js' in api
print('SACRA documentation smoke OK')
