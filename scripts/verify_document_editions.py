"""Check the actual 3.0 downloads and their previews after rebuilding the site."""
from hashlib import sha256
from pathlib import Path
from subprocess import check_output
from zipfile import ZipFile
from urllib.parse import unquote
import json
import re

from lxml import etree as ET
from build_document_editions import ROOT, OUT, NS, WITHHELD, GAPS, OFFICE_DIGEST


def verify():
    content = json.loads((ROOT / '3.0/content.json').read_text())
    assert 'drafts' not in content, 'Editorial register leaked into staff snapshot'
    staff_only = re.compile(r'3\.0 review copy|draft for review|review register|content.owner review|under governance review|\bSME\b|\bSLD\b|Approval requirements|Unrecorded in the supplied file|the source policy', re.I)
    records = content['documents']
    assert not any(Path(r['local_path']).name in WITHHELD for r in records)
    editions = {r['edition_sha256']: r for r in records if r.get('edition_label')}
    catalogue = json.loads((OUT / 'catalogue.json').read_text())['editions']
    assert set(editions) == {r['edition_sha256'] for r in catalogue.values()}
    # Editable Word files can contain author comments absent from their PDF text.
    for path in {ROOT / unquote(r['local_href']) for r in records if r['file_type'] == 'DOCX'}:
        with ZipFile(path) as archive:
            assert not any(n.startswith('word/comments') for n in archive.namelist()), f'Author comments remain in {path.name}'
            body = ET.fromstring(archive.read('word/document.xml'))
            assert not body.xpath('.//w:ins|.//w:del|.//w:moveFrom|.//w:moveTo|.//w:commentReference', namespaces=NS), f'Editing marks remain in {path.name}'
    normalized_links = set()
    numbered = 0
    for digest, record in editions.items():
        source, preview, thumbnail = (ROOT / record[key] for key in ('local_href', 'preview_href', 'preview_image_href'))
        assert sha256(source.read_bytes()).hexdigest() == digest and source.stat().st_size == record['size_bytes']
        assert preview.read_bytes().startswith(b'%PDF-') and thumbnail.read_bytes().startswith(b'\xff\xd8')
        info = check_output(['pdfinfo', str(preview)], text=True)
        pages = int(re.search(r'^Pages:\s+(\d+)$', info, re.M).group(1))
        assert pages == record['preview_pages']
        assert not staff_only.search(record['edition_label'])
        if source.suffix == '.pdf':
            assert digest == OFFICE_DIGEST and pages == 136
            continue
        rendered = check_output(['pdftotext', '-layout', str(preview), '-'], text=True)
        assert not staff_only.search(rendered), f'Editorial text remains in {preview.name}'
        with ZipFile(source) as archive:
            assert archive.testzip() is None
            body = ET.fromstring(archive.read('word/document.xml'))
            text = ''.join(body.xpath('.//w:t/text()', namespaces=NS))
            assert 'Greendale' not in text and '**Or**' not in text
            for needle, replacement in GAPS.get(source.stem, {}).items():
                assert needle not in text and (replacement is None or replacement in text)
            if source.stem == 'bullying-and-harassment':
                assert not any('comments' in name.lower() for name in archive.namelist())
                assert not body.xpath('.//w:commentReference|.//w:commentRangeStart|.//w:commentRangeEnd', namespaces=NS)
            relationships = ET.fromstring(archive.read('word/_rels/document.xml.rels'))
            targets = {r.get('Id'): r.get('Target') for r in relationships if r.get('TargetMode') == 'External'}
            urls = {targets[id_] for id_ in body.xpath('.//w:hyperlink/@r:id', namespaces=NS) if targets.get(id_, '').startswith('https://')}
            pdf_urls = check_output(['pdfinfo', '-url', str(preview)], text=True)
            assert all(url in pdf_urls for url in urls), f'Missing PDF link for {source.name}'
            normalized_links.update(urls)
            footers = [ET.fromstring(archive.read(n)) for n in archive.namelist() if re.fullmatch(r'word/footer\d+\.xml', n)]
            for footer in footers:
                assert 'MERGEFORMAT' not in ''.join(footer.xpath('.//w:t/text()', namespaces=NS))
            if any(footer.xpath('.//w:fldSimple[@w:instr="NUMPAGES"]', namespaces=NS) for footer in footers):
                numbered += 1
                pdf_text = check_output(['pdftotext', '-layout', str(preview), '-'], text=True).rstrip('\f').split('\f')
                assert len(pdf_text) == pages
                for i, page in enumerate(pdf_text, start=1):
                    assert f'Page {i} of {pages}' in page, f'Unexpected page footer in {source.name}, page {i}'
    assert numbered == 6
    for page in content['pages']:
        if page['category'] == 'Policy':
            assert not staff_only.search(page['text']), f'Editorial text remains in {page["path"]}'
            if not page.get('policy_document'):
                pdf = ROOT / '3.0/policy-copies' / (Path(page['path']).parent.name + '.pdf')
                published = check_output(['pdftotext', '-layout', str(pdf), '-'], text=True)
                assert not staff_only.search(published)
                assert 'review-register.html' not in check_output(['pdfinfo', '-url', str(pdf)], text=True)
        for marker in ('Emergency%20Incident%20Response', 'Language%20Services%20V1.0%20%28Google'):
            assert marker not in page['html'], f'Withdrawn file link remains in {page["path"]}'
    print(f'Verified {len(editions)} editions, {numbered} numbered policies and {len(normalized_links)} distinct visible publisher links in Word and PDF.')


if __name__ == '__main__':
    verify()
