"""Restore the two archived YouTube galleries without a WordPress plugin."""
from pathlib import Path
from urllib.parse import quote
import html
import json

from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
HR_PAGE = 'scorm/department-pages/hr-services/index.html'
RESOURCES_PAGE = 'scorm/intranet/resources/index.html'


def save(path, soup):
    path.write_text('<!DOCTYPE html>\n' + '\n'.join(line.rstrip() for line in str(soup.html).splitlines()) + '\n')


def video_list(videos, heading='h3'):
    cards = []
    for video in videos:
        title = html.escape(video['title'])
        identifier = video['youtube_id']
        cards.append(
            '<li><' + heading + '>' + title + '</' + heading + '>'
            '<iframe class="youtube-video" loading="lazy" title="' + title + '" '
            'src="https://www.youtube.com/embed/' + identifier + '?rel=0" '
            'allow="encrypted-media; picture-in-picture; web-share" allowfullscreen '
            'referrerpolicy="strict-origin-when-cross-origin"></iframe>'
            '<p class="video-fallback"><a href="https://www.youtube.com/watch?v=' + identifier + '" '
            'target="_blank" rel="noopener">Watch ' + title + ' on YouTube</a></p></li>'
        )
    return '<ul class="video-library">' + ''.join(cards) + '</ul>'


def restore_galleries(root, base):
    galleries = json.loads((root / 'data/recovered-galleries.json').read_text())['galleries']
    by_id = {gallery['id']: gallery for gallery in galleries}
    for relative in (HR_PAGE, RESOURCES_PAGE):
        path = root / relative
        soup = BeautifulSoup(path.read_text(), 'lxml')
        for note in soup.select('.static-site-notice'):
            if 'original departmental video playlist is unavailable' in note.get_text():
                wrapper = note.parent
                note.decompose()
                if wrapper.name == 'div' and not wrapper.get_text(strip=True) and not wrapper.find(True):
                    wrapper.decompose()
        if relative == HR_PAGE:
            heading = next(h for h in soup.main.find_all(['h1', 'h2']) if h.get_text(strip=True) == 'Video resources')
            heading.name = 'h2'
            targets = [(heading.parent, 1)]
        else:
            targets = [(soup.select_one('#Humanresources'), 1), (soup.select_one('#ATSIliaisonservices'), 2)]
        for container, identifier in targets:
            for old in container.select('[data-recovered-gallery]'):
                old.decompose()
            for empty in list(container.find_all('p', recursive=False)):
                if not empty.get_text(strip=True) and not empty.find(True):
                    empty.decompose()
            if identifier == 2 and not container.find('h2'):
                heading = soup.new_tag('h2')
                heading.string = 'Aboriginal and Torres Strait Islander health video resources'
                container.insert(0, heading)
            markup = '<div data-recovered-gallery="' + str(identifier) + '"><p>Playback is provided by YouTube.</p>' + video_list(by_id[identifier]['videos']) + '</div>'
            gallery = BeautifulSoup(markup, 'lxml').div.extract()
            container.find(['h1', 'h2']).insert_after(gallery)
        save(path, soup)
    return galleries


def refresh_video_index(root, base, galleries):
    recovered_ids = {v['youtube_id'] for g in galleries for v in g['videos']}
    videos = [v for v in json.loads((root / 'data/videos.json').read_text()) if v['youtube_id'] not in recovered_ids]
    for gallery in galleries:
        source = HR_PAGE if gallery['id'] == 1 else RESOURCES_PAGE
        videos.extend({'youtube_id': v['youtube_id'], 'title': v['title'], 'source_page': source} for v in gallery['videos'])
    (root / 'data/videos.json').write_text(json.dumps(videos, indent=2, ensure_ascii=False) + '\n')
    path = root / 'videos/index.html'
    soup = BeautifulSoup(path.read_text(), 'lxml')
    cards = BeautifulSoup(video_list(videos, heading='h2'), 'lxml').ul.extract()
    for card, video in zip(cards.find_all('li', recursive=False), videos):
        paragraph = soup.new_tag('p')
        link = soup.new_tag('a', href=base + quote(video['source_page'], safe='/'))
        link.string = 'Open the original learning page'
        paragraph.append(link)
        card.append(paragraph)
    soup.select_one('.video-library').replace_with(cards)
    save(path, soup)
    return videos


if __name__ == '__main__':
    galleries = restore_galleries(ROOT, '/Bagwan2.0/')
    videos = refresh_video_index(ROOT, '/Bagwan2.0/', galleries)
    path = ROOT / 'content-review.json'
    report = json.loads(path.read_text())
    report['reviewed_on'] = '2026-11-20'
    report['unresolved'] = [item for item in report['unresolved'] if not item.startswith('HR and ATSI galleries')]
    note = 'Restored 12 gallery videos from the 14 April 2025 backup: 11 meeting resources in HR Services and Resources, and Closing the Gap in ATSI Resources.'
    if note not in report['fixed']:
        report['fixed'].append(note)
    report['youtube_embeds'] = len(videos)
    path.write_text(json.dumps(report, indent=2, ensure_ascii=False) + '\n')
    print('Restored two galleries; video index contains', len(videos), 'unique videos.')
