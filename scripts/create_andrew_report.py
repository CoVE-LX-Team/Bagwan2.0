"""Print the one-page reviewer brief and copy it to the project deliverables."""
from base64 import b64encode
from pathlib import Path
from tempfile import TemporaryDirectory
import re
import subprocess

from build_policy_copies import chrome_binary
from review_brief import brief_body

ROOT = Path(__file__).resolve().parents[1]
SITE = 'https://cove-lx-team.github.io/Bagwan2.0/3.0/'
PUBLIC = ROOT / '3.0/what-changed.pdf'
HANDOFF = ROOT.parent / 'deliverables/Bagwan 3.0 What changed for Andrew.pdf'
LOGO = ROOT / 'documents/marketing-and-communications/bagwan-branding/Bagawan logo_colour.png'

PRINT_CSS = """
@page { size: A4; margin: 17mm 19mm 16mm; }
* { box-sizing: border-box; }
body { margin: 0; color: #172747; font: 13pt/1.47 Arial, sans-serif; print-color-adjust: exact; }
.brand { display: flex; align-items: center; justify-content: space-between; gap: 16pt; padding-bottom: 15pt; border-bottom: .9pt solid #bdc9df; }
.brand img { display: block; width: 113pt; height: auto; }
.brand time { font-size: 10pt; color: #43536e; }
h1, h2, p, dl, dd { margin: 0; }
.brief-head { margin-block: 24pt 28pt; }
.eyebrow { font-size: 10pt; font-weight: bold; color: #284d8a; }
h1 { margin-block: 5pt 9pt; font-size: 30pt; line-height: 1.07; color: #101e4c; letter-spacing: -.8pt; }
.lead { font-size: 14pt; line-height: 1.45; }
h2 { margin-bottom: 11pt; font-size: 17pt; line-height: 1.14; letter-spacing: -.35pt; color: #101e4c; }
.brief-changes > div { border-top: .6pt solid #c6cfdf; display: grid; grid-template-columns: 116pt 1fr; column-gap: 16pt; padding-block: 12pt; }
.brief-changes dt { font-weight: bold; line-height: 1.38; }
.brief-decision { margin-top: 19pt; border-left: 3pt solid #294a96; background: #edf2fa; padding: 17pt 18pt; }
.brief-decision h2 { margin-bottom: 6pt; }
.brief-links { display: flex; flex-wrap: wrap; gap: 5pt 20pt; }
.brief-decision .brief-links { margin-top: 9pt; }
.brief-links a { color: #243f83; text-decoration: underline; text-underline-offset: 2pt; font-weight: bold; font-size: 10.8pt; }
footer.brief-links { margin-top: 18pt; padding-top: 11pt; border-top: .6pt solid #c6cfdf; }
"""


def build():
    logo = b64encode(LOGO.read_bytes()).decode('ascii')
    source = (
        '<!doctype html><html lang="en-AU"><head><meta charset="utf-8">'
        f'<title>What changed in Bagwan 3.0</title><base href="{SITE}"><style>{PRINT_CSS}</style></head><body>'
        f'<header class="brand"><img alt="Bagwan Health" src="data:image/png;base64,{logo}">'
        '<time datetime="2026-11-20">20 November 2026</time></header>'
        f'<main>{brief_body(printable=True)}</main></body></html>'
    )
    with TemporaryDirectory() as directory:
        work = Path(directory)
        html_file = work / 'brief.html'
        html_file.write_text(source, encoding='utf-8')
        pdf = work / 'brief.pdf'
        subprocess.run(
            [chrome_binary(), '--headless', '--disable-gpu', '--disable-extensions', '--no-pdf-header-footer',
             '--export-tagged-pdf', f'--user-data-dir={work / "profile"}', f'--print-to-pdf={pdf}', html_file.as_uri()],
            check=True, capture_output=True, timeout=60,
        )
        # Retain valid PDF offsets while making repeat builds independent of the clock.
        result = re.sub(rb'/(?:CreationDate|ModDate) \(D:[^)]*\)', lambda m: b' ' * len(m.group()), pdf.read_bytes())
    HANDOFF.parent.mkdir(exist_ok=True)
    for output in (PUBLIC, HANDOFF):
        if not output.exists() or output.read_bytes() != result:
            output.write_bytes(result)
        print(output)


if __name__ == '__main__':
    build()
