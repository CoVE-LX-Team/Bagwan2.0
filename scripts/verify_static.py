#!/usr/bin/env python3
"""Check static pages and stylesheet dependencies before publishing to Pages."""
from pathlib import Path
from urllib.parse import urlsplit, unquote
from bs4 import BeautifulSoup
import json
import re

ROOT = Path(__file__).resolve().parents[1]
BASE = '/Bagwan2.0/'


def local_target(value, owner):
    if not value or value.startswith(('data:', '#', 'about:', 'blob:', 'mailto:', 'tel:', 'javascript:')):
        return None
    parsed = urlsplit(value)
    if parsed.scheme or parsed.netloc:
        return None
    path = unquote(parsed.path)
    if not path:
        return None
    if path.startswith(BASE):
        target = ROOT / path[len(BASE):]
    elif path.startswith('/'):
        return Path('/invalid-static-base') / path.lstrip('/')
    else:
        target = owner.parent / path
    if path.endswith('/') or target.is_dir():
        target = target / 'index.html'
    return target.resolve()


def inspect():
    errors = []
    pages = sorted(ROOT.rglob('*.html'))
    for path in pages:
        if any(p in path.parts for p in ('.git', '.playwright-cli', 'output', 'node_modules')):
            continue
        soup = BeautifulSoup(path.read_text(), 'lxml')
        if not path.read_text().lower().startswith('<!doctype html>'):
            errors.append((str(path.relative_to(ROOT)), 'Missing leading HTML doctype'))
        for tag in soup.find_all(True):
            for attr in ('src', 'href', 'poster'):
                raw = tag.get(attr)
                if not isinstance(raw, str): continue
                if any(d in raw.lower() for d in ('youtube.com', 'youtu.be', 'youtube-nocookie.com', 'drive.google.com', 'docs.google.com', 'emedia.rmit.edu.au/bagwanhealth')):
                    errors.append((str(path.relative_to(ROOT)), 'Unconverted URL: ' + raw))
                target = local_target(raw, path)
                if target and not target.is_file():
                    errors.append((str(path.relative_to(ROOT)), 'Missing ' + raw))
                if attr in ('src','poster') and raw.startswith(('http:','https:','//')):
                    errors.append((str(path.relative_to(ROOT)), 'External runtime asset: ' + raw))
    for path in ROOT.rglob('*.css'):
        if any(p in path.parts for p in ('.git', '.playwright-cli', 'output', 'node_modules')):
            continue
        for raw in re.findall(r'url\(\s*([^)]*?)\s*\)', path.read_text(errors='replace'), re.I):
            raw = raw.strip().strip('\"\'')
            target = local_target(raw, path)
            if target and not target.is_file(): errors.append((str(path.relative_to(ROOT)), 'Missing CSS asset: ' + raw))
            if raw.startswith(('http:', 'https:', '//')): errors.append((str(path.relative_to(ROOT)), 'External CSS asset: ' + raw))
    return pages, sorted(set(errors))


if __name__ == '__main__':
    pages, errors = inspect()
    for path, error in errors: print(path + ': ' + error)
    if errors: raise SystemExit(str(len(errors)) + ' static dependency errors')
    print('Verified', len(pages), 'HTML pages: local navigation, documents and runtime resources; no Drive or YouTube embeds.')
