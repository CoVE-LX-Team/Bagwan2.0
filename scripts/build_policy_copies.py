"""Print tagged PDFs of the web policies without an archived source document.

Run after build_v3.py, using an installed Chromium or Google Chrome browser.
Set BAGWAN_CHROMIUM to the executable path if it is outside the usual locations.
"""
from html import escape
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
from tempfile import TemporaryDirectory
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]
SITE = 'https://cove-lx-team.github.io/Bagwan2.0/3.0/'
PRINT_CSS = """
@page {
  size: A4;
  margin: 19mm 22mm 17mm;
  @bottom-right { content: counter(page) " / " counter(pages); color: #52576b; font: 9pt Arial, sans-serif; }
}
* { box-sizing: border-box; }
body { color: #171b33; font: 10.75pt/1.43 Arial, sans-serif; margin: 0; }
header { border-top: 3pt solid #191970; padding-top: 11pt; }
header p { color: #424963; font-size: 10pt; margin: 0; }
h1, h2, h3 { color: #11154d; break-after: avoid; }
h1 { font-size: 24pt; line-height: 1.1; margin: 5pt 0 9pt; }
h2 { font-size: 14pt; line-height: 1.25; margin: 13pt 0 3pt; }
h3 { font-size: 12pt; margin: 10pt 0 3pt; }
p, ul, ol { margin: 0 0 6pt; }
li { margin-bottom: 3pt; }
ul, ol { padding-left: 17pt; }
a { color: #1c287f; text-decoration: underline; overflow-wrap: anywhere; }
footer { border-top: .6pt solid #a6adc3; margin-top: 14pt; padding-top: 6pt; font-size: 10pt; }
table { border-collapse: collapse; width: 100%; }
th, td { text-align: left; vertical-align: top; padding: 4pt; border: .5pt solid #9199af; }
thead { display: table-header-group; }
"""


def chrome_binary():
    binary = os.environ.get('BAGWAN_CHROMIUM')
    if binary:
        return binary
    for name in ('chromium', 'chromium-browser', 'google-chrome', 'google-chrome-stable'):
        if executable := shutil.which(name):
            return executable
    mac_binary = Path('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    if mac_binary.is_file():
        return str(mac_binary)
    raise SystemExit('Install Chromium or set BAGWAN_CHROMIUM to its executable.')


def printable_html(record):
    title = escape(record['title'])
    route = SITE + '#page/' + quote(record['path'], safe='')
    return (
        '<!doctype html><html lang="en-AU"><head><meta charset="utf-8">'
        f'<title>{title} · Bagwan Health</title><base href="{SITE}index.html"><style>{PRINT_CSS}</style></head>'
        f'<body><header><p>Bagwan Health · Policies &amp; procedures</p><h1>{title}</h1></header>'
        f'<main>{record["html"]}</main>'
        f'<footer><a href="{route}">Read {title} on the staff intranet</a></footer></body></html>'
    )


def build():
    snapshot = json.loads((ROOT / '3.0/content.json').read_text())
    records = [r for r in snapshot['pages'] if r['category'] == 'Policy' and r['policy_document'] is None]
    output = ROOT / '3.0/policy-copies'
    output.mkdir(exist_ok=True)
    chrome = chrome_binary()
    with TemporaryDirectory() as directory:
        work = Path(directory)
        for record in records:
            slug = Path(record['path']).parent.name
            page = work / f'{slug}.html'
            pdf = work / f'{slug}.pdf'
            page.write_text(printable_html(record), encoding='utf-8')
            subprocess.run([
                chrome, '--headless', '--disable-gpu', '--disable-background-networking',
                '--no-first-run', '--no-pdf-header-footer', '--export-tagged-pdf',
                '--generate-pdf-document-outline', f'--user-data-dir={work / "chrome-profile"}',
                f'--print-to-pdf={pdf}', page.as_uri()
            ], check=True, stdout=subprocess.DEVNULL)
            # Chromium stamps the build time into the PDF info dictionary. Blank those
            # optional entries at their original width to keep the cross-reference offsets.
            stable = re.sub(rb"/(?:CreationDate|ModDate) \(D:[^()\r\n]+\)",
                            lambda match: b' ' * len(match.group()), pdf.read_bytes())
            destination = output / pdf.name
            if not destination.exists() or destination.read_bytes() != stable:
                destination.write_bytes(stable)
            print(destination.relative_to(ROOT))


if __name__ == '__main__':
    build()
