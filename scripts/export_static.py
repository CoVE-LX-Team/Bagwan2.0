#!/usr/bin/env python3
"""Mirror the public Bagwan learning intranet into buildless GitHub Pages HTML.

Run from this repository with Python 3 + beautifulsoup4/lxml. Source cache is
outside Git; the exported site has no WordPress or Google Drive runtime dependency.
"""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.parse import urljoin, urlsplit, urlunsplit, unquote, quote, parse_qs
from bs4 import BeautifulSoup, Doctype
import argparse
import hashlib
import html
import json
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]
ORIGIN = 'https://emedia.rmit.edu.au'
SOURCE = ORIGIN + '/bagwanhealth/'
CACHE = Path('/tmp/bagwan-static-cache')
SITE = '/Bagwan2.0/'
PAGES = {}
ASSETS = {}
FAILURES = []
manifest = json.loads((ROOT / 'documents/manifest.json').read_text())
FILES = {f['id']: f for f in manifest['files']}
FOLDERS = {f['id']: f for f in manifest['folders']}


def node_text(node):
    # Reassigned script/style strings are NavigableString rather than Script/Stylesheet.
    # Tag.text silently omits those strings in BeautifulSoup 4.13.
    return str(node.string) if node.string is not None else node.get_text()


def write_html(path, text):
    path.write_text('\n'.join(line.rstrip() for line in text.splitlines()) + '\n')


def get(url):
    CACHE.mkdir(exist_ok=True)
    key = hashlib.sha256(url.encode()).hexdigest()
    path, meta = CACHE / key, CACHE / (key + '.json')
    if path.exists() and meta.exists():
        return path.read_bytes(), json.loads(meta.read_text())
    result = subprocess.run(['curl', '-L', '--retry', '2', '--max-time', '40', '-sS', '-o', str(path), '-w', '%{http_code}\n%{url_effective}\n%{content_type}', url], capture_output=True, text=True)
    fields = result.stdout.splitlines()
    info = {'status': int(fields[0]) if fields and fields[0].isdigit() else 0, 'url': fields[1] if len(fields) > 1 else url, 'type': fields[2] if len(fields) > 2 else '', 'error': result.stderr}
    meta.write_text(json.dumps(info))
    return path.read_bytes() if path.exists() else b'', info


def youtube(url):
    return any(d in url.lower() for d in ('youtube.com', 'youtu.be', 'youtube-nocookie.com', 'ytimg.com', 'elfsight.com'))


def canonical(url, base=SOURCE):
    absolute = urljoin(base, html.unescape(url))
    parsed = urlsplit(absolute)
    if parsed.netloc.lower() != 'emedia.rmit.edu.au':
        return None
    path = unquote(parsed.path).replace('/bagwanhealth/index.php/', '/bagwanhealth/')
    if path == '/bagwanhealth': path += '/'
    if path.startswith('/BagwanDev/') or path.startswith('/bagwanhealth/BagwanDev/'):
        path = '/bagwanhealth/scorm/quick-link-pages/incident-reporting/'
    if not path.startswith('/bagwanhealth/'):
        return None
    if path == '/bagwanhealth/' or path == '/bagwanhealth/index.php':
        query = parse_qs(parsed.query)
        if query.get('p') == ['321']:
            path = '/bagwanhealth/aboriginal-and-torres-strait-islander-liaison-office/'
        else:
            path = '/bagwanhealth/scorm/intranet/'
    if path.split('/').count('scorm') > 1 or path.split('/').count('intranet') > 1:
        path = '/bagwanhealth/scorm/intranet/news-feed/' if path.endswith('/news-feed/') else '/bagwanhealth/scorm/intranet/'
    return ORIGIN + quote(path, safe='/@()+,-._~')


def page_path(url):
    path = unquote(urlsplit(url).path).removeprefix('/bagwanhealth/').strip('/')
    return path + '/index.html' if path else 'index.html'


def public(path):
    return SITE + quote(path, safe='/@()+,-._~')


def asset_path(url):
    p = urlsplit(url)
    if p.netloc == 'emedia.rmit.edu.au' and p.path.startswith('/bagwanhealth/'):
        path = unquote(p.path[len('/bagwanhealth/'):])
    else:
        path = 'assets/vendor/' + p.netloc + unquote(p.path)
    path = str(Path(path))
    if '..' in Path(path).parts:
        raise ValueError('Unsafe asset path: ' + path)
    return path


def queue_asset(value, base):
    if not value or value.startswith(('data:', '#', 'about:', 'blob:', 'javascript:')):
        return value
    absolute = urljoin(base, html.unescape(value))
    p = urlsplit(absolute)
    if p.scheme not in ('http', 'https') or youtube(absolute):
        return value
    absolute = urlunsplit((p.scheme, p.netloc, quote(unquote(p.path), safe='/@()+,-._~'), p.query, ''))
    if any(d in p.netloc for d in ('googletagmanager', 'google-analytics', 'fonts.googleapis', 'fonts.gstatic')):
        return ''
    if absolute not in ASSETS:
        ASSETS[absolute] = {'path': asset_path(absolute), 'done': False}
    return public(ASSETS[absolute]['path']) + ('#' + p.fragment if p.fragment else '')


def is_page(url):
    p = urlsplit(url)
    return not re.search(r'\.[a-zA-Z0-9]{1,7}$', p.path.rstrip('/')) and not any(x in p.path for x in ('/wp-', '/feed/', '/author/', '/category/'))


def crawl():
    pending = {SOURCE + 'scorm/intranet/'}
    for _ in range(20):
        batch = sorted(pending - PAGES.keys())
        if not batch:
            break
        pending = set()
        for url, result in zip(batch, ThreadPoolExecutor(max_workers=8).map(get, batch)):
            body, info = result
            soup = BeautifulSoup(body, 'lxml')
            PAGES[url] = {'soup': soup, 'status': info['status'], 'path': page_path(url)}
            for node in soup.select('a[href],iframe[src]'):
                raw = node.get('href') or node.get('src', '')
                if raw.startswith(('#', 'mailto:', 'tel:', 'javascript:')):
                    continue
                target = canonical(raw, url)
                if target and is_page(target) and target not in PAGES:
                    pending.add(target)
        print('Inventoried', len(PAGES), 'pages;', len(pending), 'new links', flush=True)
    if pending - PAGES.keys():
        raise RuntimeError('Crawl did not converge')


def file_id(url):
    p = urlsplit(url)
    if p.netloc not in ('drive.google.com', 'docs.google.com'):
        return None
    q = parse_qs(p.query)
    if q.get('id'):
        return q['id'][0]
    match = re.search(r'/(?:d|folders)/([^/]+)', p.path)
    return match.group(1) if match else None


def local_link(raw, base):
    if not raw or raw.startswith(('#', 'mailto:', 'tel:', 'javascript:')):
        return raw
    absolute = urljoin(base, html.unescape(raw))
    gid = file_id(absolute)
    if gid in FILES:
        return public(FILES[gid]['local_path'])
    if gid in FOLDERS:
        return public('library/' + gid + '/index.html')
    target = canonical(absolute)
    if target in PAGES:
        return public(PAGES[target]['path']) + ('#' + urlsplit(absolute).fragment if urlsplit(absolute).fragment else '')
    if target and re.search(r'\.[a-zA-Z0-9]{1,7}$', urlsplit(target).path):
        return queue_asset(absolute, base)
    return absolute


def document_list(folder_id, include_heading=False):
    folder = FOLDERS[folder_id]
    rows = []
    for fid in folder['folder_ids']:
        child = FOLDERS[fid]
        rows.append('<li class="folder"><a href="' + public('library/' + fid + '/index.html') + '">📁 ' + html.escape(child['name']) + '</a></li>')
    for fid in folder['file_ids']:
        f = FILES[fid]
        if f['archived']:
            continue
        suffix = Path(f['local_path']).suffix[1:].upper()
        rows.append('<li><a href="' + public(f['local_path']) + '">' + html.escape(Path(f['local_path']).name) + '</a><span>' + suffix + ' · ' + str(round(f['size_bytes'] / 1024)) + ' KB</span></li>')
    heading = '<h3>' + html.escape(folder['name']) + '</h3>' if include_heading else ''
    return heading + '<ul class="document-list">' + ''.join(rows) + '</ul>'


def rewrite_css(text, base):
    def replace(match):
        value = match.group(1).strip().strip('\"\'')
        return 'url("' + queue_asset(value, base) + '")'
    text = re.sub(r'url\(\s*([^)]*?)\s*\)', replace, text, flags=re.I)
    return re.sub(r'/\*# sourceMappingURL=.*?\*/', '', text)


def integration(soup, base):
    for script in soup.find_all('script'):
        if 'H5PIntegration =' not in node_text(script):
            continue
        data = json.loads(node_text(script).split('H5PIntegration =', 1)[1].strip().rstrip(';'))
        data.update(baseUrl=SITE.rstrip('/'), siteUrl=SITE.rstrip('/'), url=SITE + 'wp-content/uploads/h5p', ajax={}, postUserStatistics=False, saveFreq=False, hubIsEnabled=False, reportingIsEnabled=False)
        def assets(values):
            return [queue_asset(u, base) for u in values]
        data['libraryUrl'] = queue_asset(data['libraryUrl'] + '/h5p.js', base).rsplit('/', 1)[0]
        for key in ('styles', 'scripts'):
            data['core'][key] = assets(data['core'].get(key, []))
        for cid, content in data.get('contents', {}).items():
            for key in ('scripts', 'styles'):
                content[key] = assets(content.get(key, []))
            content['exportUrl'] = queue_asset(content.get('exportUrl', ''), base)
            content['displayOptions'].update(embed=False, copy=False)
            content.update(url=public(PAGES[base]['path']), embedCode='', resizeCode='', contentUserData=[{'state': '{}'}])
            content_data = json.loads(content['jsonContent'])
            content_id = cid.removeprefix('cid-')
            def scan(obj):
                if isinstance(obj, dict):
                    for key, value in obj.items():
                        if key == 'path' and isinstance(value, str):
                            queue_asset(SOURCE + 'wp-content/uploads/h5p/content/' + content_id + '/' + value, base)
                        else:
                            scan(value)
                elif isinstance(obj, list):
                    for child in obj: scan(child)
            scan(content_data)
        script.string = 'window.H5PIntegration = ' + json.dumps(data) + ';'


def rewrite_page(url, page):
    soup = page['soup']
    # The original theme nests a second document in #content. Emit one valid document.
    if not soup.html:
        soup = BeautifulSoup('<html><head></head><body>' + str(soup) + '</body></html>', 'lxml')
    if not soup.head:
        soup.html.insert(0, soup.new_tag('head'))
    if not soup.body:
        soup.html.append(soup.new_tag('body'))
    for extra in list(soup.find_all('html'))[1:]:
        if extra.head:
            for child in list(extra.head.contents): soup.head.append(child.extract())
        if extra.body:
            for child in list(extra.body.contents): soup.body.append(child.extract())
        elif not extra.head:
            for child in list(extra.contents): soup.body.append(child.extract())
        extra.decompose()
    for node in list(soup.find_all(string=lambda x: isinstance(x, Doctype))):
        node.extract()
    for tag in list(soup.select('title,meta,link[rel=stylesheet],style')):
        if tag.parent is not soup.head:
            soup.head.append(tag.extract())
    for tag in soup.select('link[rel=alternate],link[rel=shortlink],link[rel=canonical],link[rel="https://api.w.org/"],base'):
        tag.decompose()
    for tag in list(soup.select('script')):
        src = tag.get('src', '')
        if tag.get('type') == 'speculationrules' or youtube(src) or ('H5PIntegration' not in node_text(tag) and youtube(node_text(tag))) or any(x in src + node_text(tag) for x in ('googletagmanager', "gtag('config'", "gtag('js'")):
            tag.decompose()
        elif src.endswith('/messageboard.js') and '/messageboard/' not in url:
            tag.decompose()
    for tag in list(soup.select('iframe')):
        src = tag.get('src', '')
        if youtube(src):
            tag.decompose()
        elif file_id(src) in FOLDERS:
            replacement = BeautifulSoup('<section class="local-documents">' + document_list(file_id(src)) + '</section>', 'lxml').section
            tag.replace_with(replacement)
        else:
            tag['title'] = tag.get('title') or (soup.h1.get_text(' ', strip=True) if soup.h1 else 'Embedded activity')
            if tag.get('width') == '1000':
                tag['width'] = '100%'
    for tag in list(soup.select('a[href]')):
        if youtube(tag.get('href', '')):
            tag.decompose()
            continue
        tag['href'] = local_link(tag['href'], url)
        if tag['href'].startswith(SITE):
            tag.attrs.pop('target', None)
        if tag.get('href') == '#':
            tag['role'] = 'button'
    integration(soup, url)
    for tag in soup.find_all(True):
        if not tag.name:
            continue
        for attr in ('src', 'poster', 'data-src'):
            value = tag.get(attr)
            if value and not value.startswith(('data:', 'about:', '#')):
                target = canonical(value, url)
                tag[attr] = local_link(value, url) if tag.name == 'iframe' and target in PAGES else queue_asset(value, url)
        if tag.name == 'link' and tag.get('href') and 'stylesheet' in tag.get('rel', []):
            tag['href'] = queue_asset(tag['href'], url)
            if not tag['href']:
                tag.decompose()
                continue
        if tag.get('srcset'):
            tag['srcset'] = ', '.join(queue_asset(p.strip().split()[0], url) + (' ' + ' '.join(p.strip().split()[1:]) if len(p.strip().split()) > 1 else '') for p in tag['srcset'].split(','))
        if tag.get('style') and 'url(' in tag['style']:
            tag['style'] = rewrite_css(tag['style'], url)
        if tag.get('action'):
            tag['action'] = '#'
            tag['data-static-form'] = 'true'
    for style in soup.select('style'):
        if 'url(' in node_text(style):
            style.string = rewrite_css(node_text(style), url)
    # Route inline navigation and disable backend/tracking-only integrations.
    for script in soup.select('script:not([src])'):
        if 'H5PIntegration' not in node_text(script):
            text = node_text(script).replace(SOURCE + 'index.php/', SITE).replace(SOURCE, SITE).replace('/bagwanhealth/', SITE)
            script.string = text
            if '$(' in text:
                soup.body.append(script.extract())
    for text in list(soup.find_all(string=re.compile(r'\[elfsight_youtube_gallery[^\]]*\]'))):
        text.replace_with(re.sub(r'\[elfsight_youtube_gallery[^\]]*\]', '', text))
    for text in list(soup.find_all(string=re.compile(r'\[contact-form-7'))):
        form = '''<form class="static-incident"><p class="simulation-note">Educational simulation. This report is saved in your browser and is not sent to a hospital.</p>
<label for="reporter">Reported by</label><input id="reporter" name="reporter" required>
<label for="incident-date">Date and time</label><input id="incident-date" name="incident-date" type="datetime-local" required>
<label for="department">Department / location</label><input id="department" name="department" required>
<label for="incident-details">What happened?</label><textarea id="incident-details" name="incident-details" required></textarea>
<label for="immediate-action">Immediate action taken</label><textarea id="immediate-action" name="immediate-action"></textarea>
<button type="submit">Save incident report draft</button></form>'''
        text.parent.replace_with(BeautifulSoup(form, 'lxml').form)
    main = soup
    if main:
        title = main.find('h1')
        if title and 'quick-link-pages/forms/' in url:
            title.insert_after(BeautifulSoup('<div class="static-empty-links"><p>Complete a patient form or download a staff template.</p><ul><li><a href="' + public('patient-management-system/index.html') + '">Patient management forms</a></li><li><a href="' + public('documents/index.html') + '">Staff forms and document library</a></li></ul></div>', 'lxml').div)
        elif title and 'quick-link-pages/human-resources/' in url:
            title.insert_after(BeautifulSoup('<div class="static-empty-links"><a href="' + public('library/1Iu77MDTdnNf6SVZ9NwVvytlePAhfyuTm/index.html') + '">Human resources forms and templates</a></div>', 'lxml').div)
    # A downloadable pathology request exists in Drive although its source tile has no anchor.
    for paragraph in soup.find_all('p', string=re.compile(r'^\s*Pathology(?: lab request)?\s*$')):
        card = paragraph.parent
        if not card.find('a'):
            anchor = soup.new_tag('a', href=public(FILES['1c38q_QyWYF18J0EFWWjOwZVG6aXtvx_fbzUfDCYVCPQ']['local_path']))
            paragraph.wrap(anchor)
    for text in list(soup.find_all(string=True)):
        if text.parent.name not in ('script', 'style'):
            updated = str(text).replace('Logisitics', 'Logistics').replace('educational purose', 'educational purpose')
            if 'Copyright 2020' in updated:
                updated = updated.replace('Copyright 2020', 'Copyright 2026')
            if updated != text: text.replace_with(updated)
    for meta in soup.select('meta[name=viewport]')[1:]: meta.decompose()
    if not soup.select_one('meta[name=viewport]'):
        soup.head.append(soup.new_tag('meta', attrs={'name': 'viewport', 'content': 'width=device-width, initial-scale=1'}))
    soup.head.append(soup.new_tag('link', rel='stylesheet', href=public('assets/static.css')))
    soup.body['data-site-root'] = SITE
    soup.html['lang'] = 'en'
    script = soup.new_tag('script', src=public('assets/static.js'), defer=True)
    soup.body.append(script)
    path = ROOT / page['path']
    path.parent.mkdir(parents=True, exist_ok=True)
    write_html(path, '<!DOCTYPE html>\n' + str(soup.html))
    page['soup'] = soup


def download_assets():
    for iteration in range(15):
        batch = [u for u, info in ASSETS.items() if not info['done']]
        if not batch:
            return
        for url, result in zip(batch, ThreadPoolExecutor(max_workers=10).map(get, batch)):
            data, response = result
            info = ASSETS[url]
            info['done'] = True
            if response['status'] != 200 or not data:
                FAILURES.append({'url': url, 'path': info['path'], 'status': response['status']})
                continue
            path = ROOT / info['path']
            path.parent.mkdir(parents=True, exist_ok=True)
            if path.suffix.lower() == '.css':
                data = rewrite_css(data.decode('utf-8', errors='replace'), url).encode()
            elif path.suffix.lower() == '.js':
                text = data.decode('utf-8', errors='replace')
                text = text.replace(SOURCE + 'index.php/', SITE).replace(SOURCE, SITE).replace('/bagwanhealth/', SITE)
                text = re.sub(r'\n?//# sourceMappingURL=.*', '', text)
                if path.name == 'messageboard.js': text = text.replace('t = setTimeout', 'var t = setTimeout')
                data = text.encode()
            path.write_bytes(data)
            info.update(size_bytes=len(data), sha256=hashlib.sha256(data).hexdigest())
        print('Assets:', sum(a['done'] for a in ASSETS.values()), '/', len(ASSETS), 'downloaded;', len(FAILURES), 'unavailable', flush=True)
    raise RuntimeError('Asset dependencies did not converge')


def libraries():
    logo = public('documents/marketing-and-communications/bagwan-branding/Bagawan logo_colour.png')
    def shell(title, content):
        return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + html.escape(title) + ' · Bagwan Health</title><link rel="stylesheet" href="' + public('assets/static.css') + '"></head><body class="library-page"><header><a href="' + public('index.html') + '"><img src="' + logo + '" width="260" alt="Bagwan Health"></a><a href="' + public('index.html') + '">Staff intranet</a></header><main><nav aria-label="Breadcrumb"><a href="' + public('index.html') + '">Home</a> / <a href="' + public('documents/index.html') + '">Documents</a></nav><h1>' + html.escape(title) + '</h1>' + content + '</main><footer>Bagwan Health · Educational simulation</footer><script src="' + public('assets/static.js') + '" defer></script></body></html>'
    for fid, folder in FOLDERS.items():
        path = ROOT / 'library' / fid / 'index.html'
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(shell(folder['name'], document_list(fid)))
    sections = ''.join('<section>' + document_list(fid, True) + '</section>' for fid in FOLDERS)
    standalone = [f for f in FILES.values() if not f['source_folder_ids'] and not f['archived']]
    sections += '<h2>Nursing and interpreting forms</h2><ul class="document-list">' + ''.join('<li><a href="' + public(f['local_path']) + '">' + html.escape(f['name']) + '</a></li>' for f in standalone) + '</ul>'
    (ROOT / 'documents/index.html').write_text(shell('Documents', '<label for="document-search">Find a document</label><input id="document-search" type="search" placeholder="Search policies, forms and templates"><p id="document-results" aria-live="polite"></p>' + sections))


def repair_dependencies():
    """Remove references to missing source decoration; preserve available WOFF2 fonts."""
    def valid(url):
        if not url.startswith(SITE): return True
        return (ROOT / unquote(urlsplit(url).path[len(SITE):])).is_file()
    def clean_css(text):
        def font(face):
            original = face.group(0)
            sources = re.findall(r'url\("([^"\n]+\.woff2)"\)', original)
            if sources:
                original = re.sub(r'src:[^;}]*(?:;|(?=\}))', '', original)
                original = original[:-1] + ';src:url("' + sources[0] + '") format("woff2");}'
            return original
        text = re.sub(r'@font-face\s*\{[^}]+\}', font, text)
        return re.sub(r'url\("([^"\n]*)"\)', lambda m: m.group(0) if valid(m.group(1)) else 'none', text)
    for path in ROOT.rglob('*.css'):
        path.write_text(clean_css(path.read_text(errors='replace')))
    for path in ROOT.rglob('*.html'):
        if '.git' in path.parts: continue
        soup = BeautifulSoup(path.read_text(), 'lxml')
        if soup.head and not soup.select_one('link[rel=icon]'):
            soup.head.append(soup.new_tag('link', rel='icon', type='image/svg+xml', href=public('assets/favicon.svg')))
        for style in soup.select('style'):
            style.string = clean_css(node_text(style))
        for tag in list(soup.select('img[src=""]')): tag.decompose()
        for script in soup.select('script'):
            if 'window.H5PIntegration = ' in node_text(script):
                data = json.loads(node_text(script).split('window.H5PIntegration = ', 1)[1].strip().rstrip(';'))
                for content in data.get('contents', {}).values():
                    content['styles'] = [u for u in content.get('styles', []) if valid(u)]
                script.string = 'window.H5PIntegration = ' + json.dumps(data) + ';'
        write_html(path, '<!DOCTYPE html>\n' + str(soup.html))
    for info in ASSETS.values():
        path = ROOT / info['path']
        if info.get('size_bytes') and path.is_file():
            data = path.read_bytes();info.update(size_bytes=len(data), sha256=hashlib.sha256(data).hexdigest())


def tour():
    config, response = get(SOURCE + 'VR/public/static_assets/hello-world.json')
    if response['status'] != 200: raise RuntimeError('Tour configuration is unavailable')
    data = json.loads(config)
    def scan(obj):
        if isinstance(obj, dict):
            for key, value in obj.items():
                if key in ('src', 'icon') and isinstance(value, str) and value and not youtube(value):
                    queue_asset(SOURCE + 'VR/public/static_assets/' + value.lstrip('/'), SOURCE)
                elif key == 'uri' and isinstance(value, str):
                    obj[key] = local_link(value, SOURCE)
                else: scan(value)
        elif isinstance(obj, list):
            for child in obj: scan(child)
    scan(data)
    path = ROOT / 'VR/public/static_assets/hello-world.json'
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2))
    queue_asset('https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js', SOURCE)
    queue_asset('https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css', SOURCE)
    # The maintained static viewer uses the original panoramas and hotspot text.
    # Its HTML/CSS/JS are maintained separately under VR/public.
    return len(data['scenes'])


def main():
    global SITE
    parser = argparse.ArgumentParser()
    parser.add_argument('--base-path', default='/Bagwan2.0/')
    args = parser.parse_args()
    SITE = '/' + args.base_path.strip('/') + '/' if args.base_path.strip('/') else '/'
    crawl()
    for url, page in PAGES.items():
        if page['path'] != 'VR/public/index.html': rewrite_page(url, page)
    libraries()
    scene_count = tour()
    download_assets()
    repair_dependencies()
    (ROOT / 'VR/public/static_assets/unavailable.json').write_text(json.dumps([unquote(urlsplit(f['url']).path.split('/VR/public/static_assets/', 1)[1]) for f in FAILURES if '/VR/public/static_assets/' in f['url']]))
    (ROOT / 'index.html').write_bytes((ROOT / 'scorm/intranet/index.html').read_bytes())
    (ROOT / '.nojekyll').touch()
    report = {'source': SOURCE, 'base_path': SITE, 'exported_on': '2026-11-18', 'pages': [{'url': u, 'path': p['path'], 'source_status': p['status']} for u, p in sorted(PAGES.items())], 'assets': [{'source_url': u, **a} for u, a in sorted(ASSETS.items()) if a.get('size_bytes')], 'unavailable_source_assets': FAILURES, 'tour_scenes': scene_count, 'youtube_videos_included': False}
    (ROOT / 'static-export.json').write_text(json.dumps(report, indent=2) + '\n')
    print('Exported', len(PAGES), 'pages,', len(report['assets']), 'assets and', scene_count, 'tour scenes.', flush=True)


if __name__ == '__main__':
    main()
