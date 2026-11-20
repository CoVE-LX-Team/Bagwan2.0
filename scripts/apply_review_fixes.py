"""Apply source-backed repairs found in the full review; never invent policies."""
from pathlib import Path
from urllib.parse import quote
from bs4 import BeautifulSoup
import html
import json
import zipfile
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
NS = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}


def docx_html(path):
    with zipfile.ZipFile(path) as archive:
        body = ET.fromstring(archive.read('word/document.xml')).find('w:body', NS)
    def text(element):
        return ''.join(node.text or '' for node in element.findall('.//w:t', NS))
    def paragraph(element):
        value = text(element).strip()
        if not value:
            return ''
        style = element.find('w:pPr/w:pStyle', NS)
        level = style.get('{' + NS['w'] + '}val', '').lower() if style is not None else ''
        tag = 'h2' if 'heading' in level else 'p'
        return '<' + tag + '>' + html.escape(value) + '</' + tag + '>'
    blocks = []
    for element in body:
        if element.tag.endswith('}p'):
            blocks.append(paragraph(element))
        elif element.tag.endswith('}tbl'):
            rows = []
            for row in element.findall('w:tr', NS):
                rows.append('<tr>' + ''.join('<td>' + ''.join(paragraph(p) for p in cell.findall('w:p', NS)) + '</td>' for cell in row.findall('w:tc', NS)) + '</tr>')
            blocks.append('<div class="table-responsive"><table>' + ''.join(rows) + '</table></div>')
    return '<div class="source-policy">' + ''.join(blocks) + '</div>'


def apply(root=ROOT):
    replacements = json.loads((root / 'data/link-repairs.json').read_text())
    changed = []
    policies = {
        'privacy': 'Bagwan Health - Privacy - v1.0.docx',
        'code-of-conduct': 'Bagwan Health - Code of conduct - V1.0.docx',
    }
    for path in sorted(root.rglob('*.html')):
        if any(x in path.parts for x in ('.git', 'output', 'node_modules', '3.0')):
            continue
        original = path.read_text()
        soup = BeautifulSoup(original, 'lxml')
        before = str(soup)
        for a in soup.select('a[href]'):
            if a['href'] in replacements:
                repair = replacements[a['href']]
                a['href'] = repair['url']
                a.clear()
                a.string = repair['label']
        if soup.select_one('main .grid-item .org_name'):
            main = soup.main
            main['class'] = list(dict.fromkeys(main.get('class', []) + ['department-org-chart']))
            if not soup.select_one('link[href*="review-fixes.css"]'):
                soup.head.append(soup.new_tag('link', rel='stylesheet', href='/Bagwan2.0/assets/review-fixes.css'))
            for script in list(soup.find_all('script')):
                if 'masonry' in (script.get('src', '') + script.get_text()).lower():
                    script.decompose()
        for slug, filename in policies.items():
            if path.relative_to(root).as_posix() == 'scorm/quick-link-pages/policy-and-procedures/' + slug + '/index.html':
                main = soup.main
                heading = main.h1.extract()
                main.clear()
                main.append(heading)
                document = 'documents/policies-and-procedures/' + filename
                markup = '<p><a href="/Bagwan2.0/' + quote(document) + '">Download the source policy (Word document)</a></p>' + docx_html(root / document)
                fragment = BeautifulSoup(markup, 'lxml')
                main.extend(list(fragment.body.contents))
                if not soup.select_one('link[href*="review-fixes.css"]'):
                    soup.head.append(soup.new_tag('link', rel='stylesheet', href='/Bagwan2.0/assets/review-fixes.css'))
        rendered = '<!DOCTYPE html>\n' + '\n'.join(line.rstrip() for line in str(soup.html).splitlines()) + '\n'
        if str(soup) != before:
            path.write_text(rendered)
            changed.append(path.relative_to(root).as_posix())
    return changed


if __name__ == '__main__':
    changed = apply()
    print('Applied local review repairs to', len(changed), 'pages.')
    for path in changed:
        print(path)
