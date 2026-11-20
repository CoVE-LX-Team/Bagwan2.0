"""Create the public review pack from the audit evidence and content register."""
from pathlib import Path
import html
import json
from reviewer_handoff import register_body
from review_brief import brief_body
from review_evidence import critical_review, outcome_lookup

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / '3.0'
EVIDENCE = ROOT.parent / 'deliverables'
esc = html.escape


def document(title, body, stylesheet=None, script='review.js'):
    extra_styles = f'<link rel="stylesheet" href="{esc(stylesheet)}">' if stylesheet else ''
    tabs = [('what-changed.html', 'What changed'), ('review-register.html', 'Review decisions'),
            ('team-review-outcomes.html', 'Workbook findings'), ('critical-review.html', 'Site review')]
    title_paths = {'Team review outcomes': tabs[2][0], 'Critical review of Bagwan': tabs[3][0],
                   'Review Bagwan 3.0': tabs[1][0], 'What changed in Bagwan 3.0': tabs[0][0]}
    active = title_paths.get(title)
    navigation = ''.join(f'<a href="{href}"' + (' aria-current="page"' if href == active else '') + f'>{label}</a>' for href, label in tabs)
    return (
        '<!doctype html><html lang="en-AU"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
        f'<title>{esc(title)} · Bagwan 3.0</title><link rel="icon" href="../assets/favicon.svg">'
        '<link rel="stylesheet" href="styles.css"><link rel="stylesheet" href="material.css">'
        '<link rel="stylesheet" href="handoff.css">' + (extra_styles if stylesheet != 'handoff.css' else '') +
        f'<script src="{esc(script)}" defer></script></head><body class="review-workspace"><a class="skip-link" href="#report">Skip to content</a>'
        '<header class="review-mast"><div><a class="review-brand" href="./"><img src="../documents/marketing-and-communications/bagwan-branding/Bagawan%20logo_colour.png" width="190" height="46" alt="Bagwan Health"></a>'
        '<a href="./">Staff intranet</a></div></header><nav class="review-tabs" aria-label="Reviewer pages"><div>' + navigation +
        '</div></nav><main class="report-page" id="report" tabindex="-1">' + body + '</main></body></html>\n'
    )


def build_outcomes(outcomes):
    return document('Team review outcomes', outcome_lookup(outcomes), stylesheet='review-evidence.css')


def build_register(drafts, current, outcomes):
    editions = json.loads((OUT / 'document-editions/catalogue.json').read_text())['editions'].values()
    return document('Review Bagwan 3.0', register_body(drafts, current, outcomes, editions),
                    stylesheet='review-register.css', script='review-register.js')


def build():
    baseline = json.loads((EVIDENCE / 'bagwan-all-pages-review-data.json').read_text())
    links = json.loads((EVIDENCE / 'bagwan-link-audit-results.json').read_text())
    drafts = json.loads((OUT / 'content-drafts.json').read_text())['items']
    repairs = json.loads((OUT / 'link-repairs.json').read_text())
    content = json.loads((OUT / 'content.json').read_text())
    current = {p['path']: p for p in content['pages']}
    broken = [r for r in links['results'] if r['kind'] == 'external' and r['status'] == 404]
    affected = {ref['page'] for r in broken for ref in r['references']}
    review = critical_review(baseline, current, affected, links, broken, repairs)
    (OUT / 'critical-review.html').write_text(document('Critical review of Bagwan', review, stylesheet='review-evidence.css'))

    outcomes = json.loads((ROOT / 'data/v3-team-review-outcomes.json').read_text())
    (OUT / 'team-review-outcomes.html').write_text(build_outcomes(outcomes))
    (OUT / 'review-register.html').write_text(build_register(drafts, current, outcomes))

    (OUT / 'what-changed.html').write_text(document('What changed in Bagwan 3.0', brief_body()))
    for name in ('what-changed.html', 'critical-review.html', 'review-register.html', 'team-review-outcomes.html'):
        print(OUT / name)


if __name__ == '__main__':
    build()
