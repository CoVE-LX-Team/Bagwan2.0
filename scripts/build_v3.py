"""Build the parallel 3.0 preview from the existing source content and draft register."""
from pathlib import Path
from urllib.parse import urlsplit, quote
from bs4 import BeautifulSoup
import json
import re
from apply_review_fixes import docx_html
from build_document_previews import preview_href, preview_image_href, preview_pages

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / '3.0'


def category(path):
    if 'policy-and-procedures/' in path and not path.endswith('policy-and-procedures/index.html'):
        return 'Policy'
    if path.startswith(('documents/', 'library/')):
        return 'Document library'
    if 'organisation-chart' in path or 'org-chart' in path or 'staff-directory' in path or 'doctors-on-call' in path:
        return 'People'
    if 'news-feed/' in path:
        return 'News'
    if 'patient-management-system/' in path or 'incident-reporting' in path or 'report-an-incident' in path:
        return 'Form or record'
    if path.startswith('VR/') or '/virtual-tour/' in path:
        return 'Hospital tour'
    if 'department-pages' in path:
        return 'Department'
    return 'Resource'


def document_records(entries):
    by_id = {entry['id']: entry for entry in entries}
    files = []
    for entry in entries:
        if entry.get('archived') or entry['kind'] == 'office-lock-file':
            continue
        folder = entry['original_folder_path'].split('/')
        if folder[0] == 'departmental' and len(folder) > 1:
            folder = folder[1:]
        labels = ['OHS' if part == 'ohs' else part.replace('-', ' ').capitalize() for part in folder]
        # A shortcut's own modification date describes the link. Use the target file's date.
        source = by_id.get(entry.get('shortcut_target_id') or entry['id'], {})
        record = {key: entry[key] for key in (
            'name', 'local_path', 'local_href', 'size_bytes', 'mime_type', 'original_folder_path',
        )}
        record.update(
            category=labels[0],
            subcategory=' / '.join(labels[1:]),
            file_type=Path(entry['local_path']).suffix[1:].upper(),
            source_modified_at=source.get('source_modified_at'),
            preview_href=preview_href(entry),
            preview_image_href=preview_image_href(entry),
            preview_pages=preview_pages(entry),
        )
        files.append(record)
    return files


def build():
    drafts = json.loads((OUT / 'content-drafts.json').read_text())['items']
    by_path = {d['path']: d for d in drafts}
    repairs = json.loads((OUT / 'link-repairs.json').read_text())
    pages = []
    for path in sorted(ROOT.rglob('*.html')):
        if any(p in path.relative_to(ROOT).parts for p in ('3.0', 'output', '.git', 'node_modules', '.playwright-cli')):
            continue
        relative = path.relative_to(ROOT).as_posix()
        soup = BeautifulSoup(path.read_text(), 'lxml')
        main = soup.find('main') or soup.find(attrs={'role': 'main'}) or soup.body
        heading = soup.find('h1')
        title = heading.get_text(' ', strip=True) if heading else 'Bagwan Health virtual tour'
        if title == 'Home page': title = 'Staff home'
        title = title.replace('harrassment', 'harassment')
        mode = 'embed' if (relative.startswith(('patient-management-system/', 'VR/')) or 'incident-reporting' in relative or 'report-an-incident' in relative or 'new-interpreting-pd/' in relative or 'doctors-on-call/' in relative) else 'article'
        # The original clinical forms and branching scenario retain their working scripts.
        for node in list(main.select('script,style,link,meta,header,footer,nav,.heading-underline')):
            node.decompose()
        first_heading = main.find('h1')
        if first_heading:
            first_heading.decompose()
        for extra_heading in main.find_all('h1'):
            extra_heading.name = 'h2'
        for element in main.find_all(True):
            for attr in list(element.attrs):
                if attr.lower().startswith('on') or attr == 'style':
                    del element[attr]
            if element.name == 'img': element['loading'] = 'lazy'
        for a in main.select('a[href]'):
            if a['href'] in repairs:
                repair = repairs[a['href']]
                a['href'] = repair['url']
                a.clear()
                a.string = repair['label']
        draft = by_path.get(relative)
        if not draft and 'nursing-department-organisation-chart/' in relative:
            draft = next(d for d in drafts if d['id'] == 'D04')
        content = draft['html'] if draft else ''.join(str(n) for n in main.contents)
        if draft:
            title = draft['title']; mode = 'article'
        # Flip cards become reference text; an intranet should not hide its values behind a game.
        if relative == 'scorm/intranet/our-community/index.html':
            for paragraph in main.find_all('p'):
                if 'Flip the cards' in paragraph.get_text():
                    paragraph.string = 'Our five core values guide how we work together.'
            flip = main.select_one('#flipcards')
            if flip:
                values = soup.new_tag('div', attrs={'class': 'values-reference'})
                for card in flip.select('.card-grid'):
                    section = soup.new_tag('section')
                    title_node = card.select_one('.front h2')
                    description = card.select_one('.back p')
                    if title_node and description:
                        title_node.name = 'h2'
                        section.extend([title_node.extract(), description.extract()])
                        values.append(section)
                flip.replace_with(values)
            content = ''.join(str(n) for n in main.contents)
        if not draft:
            for frame in main.select('iframe.h5p-iframe'):
                replacement = soup.new_tag('p')
                a = soup.new_tag('a', href='https://www.naati.com.au/online-directory/')
                a.string = 'Find a certified practitioner in the NAATI directory'
                replacement.append(a)
                frame.replace_with(replacement)
            content = ''.join(str(n) for n in main.contents)
        source_policies = {
            'scorm/quick-link-pages/policy-and-procedures/code-of-conduct/index.html': 'Bagwan Health - Code of conduct - V1.0.docx',
            'scorm/quick-link-pages/policy-and-procedures/privacy/index.html': 'Bagwan Health - Privacy - v1.0.docx',
        }
        if relative in source_policies:
            document = ROOT / 'documents/policies-and-procedures' / source_policies[relative]
            content = '<p><a href="/Bagwan2.0/' + quote(document.relative_to(ROOT).as_posix()) + '">Download the source policy (Word document)</a></p>' + docx_html(document)
        pages.append({'path': relative, 'title': title, 'category': category(relative), 'mode': mode, 'draft_id': draft['id'] if draft else None, 'html': content, 'text': BeautifulSoup(content, 'lxml').get_text(' ', strip=True)})
    manifest = json.loads((ROOT / 'documents/manifest.json').read_text())
    files = document_records(manifest['files'])
    document_folders = {
        f"library/{folder['id']}/index.html": Path(folder['local_path']).relative_to('documents').as_posix()
        for folder in manifest['folders']
    }
    hierarchy = json.loads((ROOT / 'data/staff-hierarchy.json').read_text())
    data = {'version': '3.0', 'built_on': '2026-11-20', 'pages': pages, 'people': json.loads((ROOT / 'data/staff-directory.json').read_text()), 'hierarchy': hierarchy, 'videos': json.loads((ROOT / 'data/videos.json').read_text()), 'documents': files, 'document_folders': document_folders, 'drafts': drafts}
    (OUT / 'content.json').write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '\n')
    print('Built 3.0:', len(pages), 'source routes,', len(files), 'document records,', len(drafts), 'review drafts.')


if __name__ == '__main__':
    build()
