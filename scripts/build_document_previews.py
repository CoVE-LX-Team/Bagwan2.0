"""Build Bagwan's static document previews with local LibreOffice and Poppler.

Run this before build_v3.py when the document manifest changes. The site build
only reads the committed assets, so it does not require either application.
"""

from collections import defaultdict
from functools import lru_cache
from pathlib import Path
from tempfile import TemporaryDirectory
import hashlib
import json
import os
import re
import shutil
import subprocess


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / '3.0' / 'document-previews'
PAGE_COUNTS = OUTPUT / 'pages.json'
WORD_FORMATS = {'.doc', '.docx'}


def rendition(record, extension):
    return OUTPUT / f"{record['sha256']}{extension}"


def existing_href(path):
    return path.relative_to(ROOT).as_posix() if path.is_file() else None


def preview_href(record):
    suffix = Path(record['local_path']).suffix.lower()
    if suffix in {'.pdf', '.png'}:
        return record['local_href']
    if suffix in WORD_FORMATS or suffix == '.ai':
        return existing_href(rendition(record, '.pdf'))
    return None


def preview_image_href(record):
    if Path(record['local_path']).suffix.lower() == '.png':
        return record['local_href']
    return existing_href(rendition(record, '.jpg'))


@lru_cache(maxsize=1)
def page_counts():
    return json.loads(PAGE_COUNTS.read_text()) if PAGE_COUNTS.is_file() else {}


def preview_pages(record):
    if Path(record['local_path']).suffix.lower() == '.png':
        return 1
    return page_counts().get(record['sha256'])


def convert_word(records, work):
    # Retain filenames during conversion for Word templates using filename fields.
    # Distinct output directories avoid collisions between source folders.
    by_folder = defaultdict(list)
    for record in records:
        source = ROOT / record['local_path']
        if source.suffix.lower() in WORD_FORMATS and not rendition(record, '.pdf').is_file():
            by_folder[source.parent].append((record, source))
    for index, batch in enumerate(by_folder.values()):
        converted = work / str(index)
        converted.mkdir()
        subprocess.run([
            'soffice', f'-env:UserInstallation={(work / "profile").as_uri()}',
            '--headless', '--convert-to', 'pdf:writer_pdf_Export',
            '--outdir', str(converted), *(str(source) for _, source in batch),
        ], check=True, timeout=360)
        for record, source in batch:
            pdf = converted / source.with_suffix('.pdf').name
            if not pdf.is_file() or not pdf.read_bytes().startswith(b'%PDF-'):
                raise ValueError(f'No PDF preview was produced for {source.name}')
            pdf.replace(rendition(record, '.pdf'))


def build():
    manifest = json.loads((ROOT / 'documents/manifest.json').read_text())
    unique = {}
    for record in manifest['files']:
        if not record.get('archived') and record['kind'] != 'office-lock-file':
            unique.setdefault(record['sha256'], record)
    for digest, record in unique.items():
        if hashlib.sha256((ROOT / record['local_path']).read_bytes()).hexdigest() != digest:
            raise ValueError(f"Source differs from the manifest: {record['local_path']}")
    OUTPUT.mkdir(exist_ok=True)
    counts = {}
    with TemporaryDirectory(dir=OUTPUT) as temporary:
        work = Path(temporary)
        convert_word(unique.values(), work)
        for digest, record in unique.items():
            source = ROOT / record['local_path']
            suffix = source.suffix.lower()
            pdf = source if suffix == '.pdf' else rendition(record, '.pdf')
            if suffix == '.ai' and source.read_bytes().startswith(b'%PDF-') and not pdf.exists():
                # Illustrator stores the native artwork in a PDF-compatible file.
                shutil.copyfile(source, work / 'illustrator.pdf')
                (work / 'illustrator.pdf').replace(pdf)
            if not pdf.is_file():
                continue
            info = subprocess.run(
                ['pdfinfo', str(pdf)], env={**os.environ, 'LC_ALL': 'C'},
                check=True, capture_output=True, text=True,
            ).stdout
            counts[digest] = int(re.search(r'^Pages:\s+(\d+)$', info, re.MULTILINE).group(1))
            image = rendition(record, '.jpg')
            if not image.exists():
                if suffix in {'.pdf', '.ai'} and shutil.which('sips'):
                    # Core Graphics resolves macOS fonts omitted by older source PDFs.
                    subprocess.run([
                        'sips', '-s', 'format', 'jpeg', '-s', 'formatOptions', '85',
                        '-Z', '1200', str(pdf), '--out', str(work / 'page.jpg'),
                    ], check=True)
                else:
                    subprocess.run([
                        'pdftoppm', '-f', '1', '-l', '1', '-singlefile', '-scale-to', '1200',
                        '-jpeg', '-jpegopt', 'quality=85', str(pdf), str(work / 'page'),
                    ], check=True)
                (work / 'page.jpg').replace(image)
        index = work / 'pages.json'
        index.write_text(json.dumps(counts, indent=2, sort_keys=True) + '\n')
        index.replace(PAGE_COUNTS)
    page_counts.cache_clear()
    print(f'Prepared {len(counts)} paginated previews and their first-page images.')


if __name__ == '__main__':
    build()
