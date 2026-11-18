#!/usr/bin/env python3
"""Apply local responsive markup repairs and refresh shared asset versions."""
from pathlib import Path
import hashlib
import re
from bs4 import BeautifulSoup
from repair_accessibility import repair_accessibility_markup
from repair_clinical import repair_clinical_markup

ROOT = Path(__file__).resolve().parents[1]


def repair_responsive_markup(soup):
    changed = False
    # static.js now owns the drawer. The old menu script's custom scrollbar
    # intercepts touch scrolling and leaves lower links unreachable in landscape.
    if soup.select_one('#showRightPush'):
        for script in soup.select('script[src]'):
            if script['src'].split('?')[0].endswith('/themes/118/js/menu.js'):
                script.decompose()
                changed = True
    for icon in soup.select('button.card-header i'):
        if icon.get('aria-hidden') != 'true':
            icon['aria-hidden'] = 'true'
            changed = True
    for table in soup.select('#content table'):
        if table.find_parent('table') or table.find_parent(class_='table-responsive') or table.find_parent(id='flipcards'):
            continue
        wrapper = soup.new_tag('div', attrs={'class': 'table-responsive static-table-scroll',
                                           'tabindex': '0', 'aria-label': 'Scrollable table'})
        table.wrap(wrapper)
        changed = True
    # The first quick-link image was outside its link, unlike its siblings.
    for card in soup.select('#quicklinks .card'):
        link = card.find('a', recursive=False)
        image = card.find('img', recursive=False)
        if link and image:
            link.insert(0, image.extract())
            changed = True
    # Original patient cards linked an empty strip above an unlinked name.
    for card in soup.select('.patient-system .card-deck .card'):
        link = card.select_one('a.card-body[href]')
        title = card.find(['h3', 'h5'])
        if link and title and 'patient-card-link' not in link.get('class', []):
            destination = link['href']
            text = title.get_text(' ', strip=True)
            card.clear()
            link = soup.new_tag('a', href=destination, attrs={'class': 'card-body patient-card-link'})
            heading = soup.new_tag('h3', attrs={'class': 'card-title'})
            heading.string = text
            action = soup.new_tag('span', attrs={'class': 'patient-card-action'})
            action.string = 'Open patient record'
            link.extend([heading, action])
            card.append(link)
            changed = True
    return changed


def main():
    versions = {name: hashlib.sha256((ROOT / 'assets' / name).read_bytes()).hexdigest()[:12]
                for name in ('static.css', 'static.js')}
    updated = 0
    for path in ROOT.rglob('*.html'):
        if any(part in path.parts for part in ('.git', '.playwright-cli', 'output', 'node_modules')):
            continue
        original = text = path.read_text()
        soup = BeautifulSoup(text, 'lxml')
        responsive_changed = repair_responsive_markup(soup)
        accessible_changed = repair_accessibility_markup(soup)
        clinical_changed = repair_clinical_markup(soup)
        if responsive_changed or accessible_changed or clinical_changed:
            text = str(soup)
        for name, version in versions.items():
            text = re.sub(r'(/assets/' + re.escape(name) + r')(?:\?v=[a-f0-9]+)?(?=["\'])',
                          lambda m: m[1] + '?v=' + version, text)
        if path == ROOT / 'VR/public/index.html':
            for name in ('tour.css', 'tour.js'):
                version = hashlib.sha256((ROOT / 'VR/public' / name).read_bytes()).hexdigest()[:12]
                text = re.sub(r'(["\'])(' + re.escape(name) + r')(?:\?v=[a-f0-9]+)?(?=["\'])',
                              lambda m: m[1] + m[2] + '?v=' + version, text)
        if text != original:
            path.write_text(text)
            updated += 1
    print('Updated', updated, 'local HTML pages; no network or publishing operations.')


if __name__ == '__main__':
    main()
