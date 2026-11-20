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
    parsed_pages = {}
    def parse(path):
        if path not in parsed_pages: parsed_pages[path] = BeautifulSoup(path.read_text(), 'lxml')
        return parsed_pages[path]
    for path in pages:
        if any(p in path.parts for p in ('.git', '.playwright-cli', 'output', 'node_modules')):
            continue
        soup = parse(path)
        for text in soup.find_all(string=True):
            if text.parent.name not in ('script','style') and re.search(r'\[(?:abcf-staff-list|elfsight_youtube_gallery)\b', str(text)):
                errors.append((str(path.relative_to(ROOT)), 'Unrendered plugin shortcode'))
        for redirect in soup.select('meta[http-equiv="refresh"]'):
            destination = re.split(r'url=', redirect.get('content',''), flags=re.I)[-1]
            target = local_target(destination, path)
            if not target or not target.is_file(): errors.append((str(path.relative_to(ROOT)), 'Broken redirect: ' + destination))
        if not path.read_text().lower().startswith('<!doctype html>'):
            errors.append((str(path.relative_to(ROOT)), 'Missing leading HTML doctype'))
        for tag in soup.find_all(True):
            for attr in ('src', 'href', 'poster'):
                raw = tag.get(attr)
                if not isinstance(raw, str): continue
                parsed = urlsplit(raw)
                youtube_frame = tag.name == 'iframe' and attr == 'src' and parsed.scheme == 'https' and parsed.hostname == 'www.youtube.com' and bool(re.fullmatch(r'/embed/[A-Za-z0-9_-]{11}', parsed.path))
                if parsed.hostname in ('drive.google.com', 'docs.google.com', 'emedia.rmit.edu.au'):
                    errors.append((str(path.relative_to(ROOT)), 'Unconverted URL: ' + raw))
                target = local_target(raw, path)
                if target and not target.is_file():
                    errors.append((str(path.relative_to(ROOT)), 'Missing ' + raw))
                if attr == 'href' and parsed.fragment and not parsed.scheme and not parsed.netloc:
                    page_target = target if parsed.path else path.resolve()
                    route = unquote(parsed.fragment).split('?', 1)[0]
                    v3_route = False
                    if page_target == (ROOT / '3.0/index.html').resolve():
                        v3_route = route in ('home', 'departments', 'people', 'policies', 'forms', 'resources', 'videos', 'documents', 'news', 'search', 'saved', 'tour', 'patient-case')
                        if route.startswith('department/'):
                            v3_route = route.split('/', 1)[1] in ('hr', 'nursing', 'laboratory', 'interpreting', 'logistics', 'liaison', 'allied-health')
                        if route.startswith('page/') and (ROOT / '3.0/content.json').exists():
                            source = route[5:].replace('/emergency-response/', '/emergency-repsonse/').replace('/logistics/', '/logisitics/')
                            native_resources = {'staff-resources/allied-health/index.html', 'scorm/intranet/news-feed/womin-djeka/index.html'}
                            v3_route = route[5:] in native_resources or source in {p['path'] for p in json.loads((ROOT / '3.0/content.json').read_text())['pages']}
                    if page_target and page_target.is_file() and page_target.suffix == '.html' and not v3_route and not parse(page_target).find(id=unquote(parsed.fragment)):
                        errors.append((str(path.relative_to(ROOT)), 'Missing section: ' + raw))
                if attr in ('src','poster') and raw.startswith(('http:','https:','//')) and not youtube_frame:
                    errors.append((str(path.relative_to(ROOT)), 'External runtime asset: ' + raw))
    # Tour buttons are built from JSON, so they cannot be checked in HTML alone.
    tour_path = ROOT / 'VR/public/static_assets/hello-world.json'
    if tour_path.is_file():
        def inspect_tour_links(value):
            if isinstance(value, list):
                for item in value: inspect_tour_links(item)
            elif isinstance(value, dict):
                for key, item in value.items():
                    if key == 'uri' and isinstance(item, str):
                        if urlsplit(item).hostname in ('emedia.rmit.edu.au', 'drive.google.com', 'docs.google.com'):
                            errors.append((str(tour_path.relative_to(ROOT)), 'Unconverted URL: ' + item))
                        target = local_target(item, tour_path)
                        if target and not target.is_file():
                            errors.append((str(tour_path.relative_to(ROOT)), 'Missing ' + item))
                    else:
                        inspect_tour_links(item)
        inspect_tour_links(json.loads(tour_path.read_text()))
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
    print('Verified', len(pages), 'HTML pages: local navigation, documents and runtime resources; only YouTube players are external.')
