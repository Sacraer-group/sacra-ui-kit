"""Build offline UTF-8 HTML companions. Development dependency: markdown-it-py."""
from pathlib import Path
import html
from markdown_it import MarkdownIt

root = Path(__file__).resolve().parents[1]
parser = MarkdownIt('commonmark', {'html': False}).enable('table')
sources = [root / 'README.md', *sorted((root / 'docs').glob('*.md'))]
for source in sources:
    relative = source.parent.relative_to(root)
    prefix = '../' if relative.parts else ''
    text = source.read_text(encoding='utf-8')
    body = parser.render(text)
    for target in ['README', 'CONTRACT', 'UNICODE', 'QA']:
        body = body.replace(target + '.md"', target + '.html"')
    title = text.splitlines()[0].lstrip('# ')
    output = ('<!doctype html><html lang="ru"><head><meta charset="utf-8">'
              '<meta name="viewport" content="width=device-width,initial-scale=1">'
              f'<title>{html.escape(title)}</title><link rel="stylesheet" href="{prefix}docs/docs.css">'
              '</head><body><nav>'
              f'<a href="{prefix}README.html">SACRA / TUI SDK</a> · '
              f'<a href="{prefix}docs/CONTRACT.html">Протокол</a> · '
              f'<a href="{prefix}docs/QA.html">Проверки</a> · '
              f'<a href="{prefix}../topology/index.html">Браузерный стенд</a>'
              '</nav><main>' + body + '</main></body></html>\n')
    source.with_suffix('.html').write_text(output, encoding='utf-8')
print(f'Built {len(sources)} offline UTF-8 HTML documents')
