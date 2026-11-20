"""Create the public review pack from the audit evidence and content register."""
from pathlib import Path
from urllib.parse import quote
import html
import json
import shutil

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / '3.0'
EVIDENCE = ROOT.parent / 'deliverables'
esc = html.escape


def document(title, body, stylesheet=None, script='review.js'):
    extra_styles = f'<link rel="stylesheet" href="{esc(stylesheet)}">' if stylesheet else ''
    return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + esc(title) + ' · Bagwan 3.0</title><link rel="stylesheet" href="styles.css"><link rel="stylesheet" href="material.css"><style>.report-page{max-width:1120px}.report-page h1{font-size:42px}.report-page h2{margin-top:34px}.report-page .lead{font-size:19px}.report-page .review-table td{font-size:13px}.report-page code{font-size:12px;overflow-wrap:anywhere}.report-page figure{margin:24px 0}.report-page figcaption{font-size:13px;margin-top:8px;color:#50536d}.report-nav{display:flex;flex-wrap:wrap;gap:20px;margin-bottom:32px;font-size:14px}.report-page .table-responsive{margin-block:24px}.report-page table{min-width:640px}@media print{.report-nav,.no-print{display:none}.report-page{max-width:none;padding:0}.report-page h1{font-size:28px;color:black}.report-page h2{font-size:19px;color:black}.report-page .table-responsive{overflow:visible}.report-page table{min-width:0}body{font-size:11px}.report-page section{break-inside:auto}}</style>' + extra_styles + '<script src="' + esc(script) + '" defer></script></head><body><a class="skip-link" href="#report">Skip to content</a><main class="report-page" id="report"><nav class="report-nav" aria-label="Review documents"><a href="./">Staff intranet 3.0</a><a href="../index.html">Compare 2.0</a><a href="what-changed.html">What we changed</a><a href="critical-review.html">Critical review</a><a href="review-register.html">Content review register</a></nav>' + body + '</main></body></html>\n'


def review_entry(item_id, title, status, body, code=''):
    identifier = f'<span class="entry-id">{esc(code)}</span>' if code else ''
    return (
        f'<details class="review-entry" id="{esc(item_id)}">'
        f'<summary><h3>{identifier}<span class="entry-title">{esc(title)}</span>'
        f'<span class="entry-status"><span class="sr-only">Review status: </span>{esc(status)}</span></h3></summary>'
        f'<div class="entry-body">{body}<p class="register-return"><a href="#register-index">Return to item index</a></p></div></details>'
    )


def build_outcomes(outcomes):
    groups = [('Review needed', 'decisions'), ('Fixed', 'fixed')]
    body = ('<p class="eyebrow">Team workbook · 20 November 2026</p><h1>What happened to each review item</h1>'
            '<p>Row numbers match the Bagwan worksheet in the 2026 team review. '
            'The same policy or learning decision can appear in several rows.</p>'
            '<p><a href="review-register.html#team-review">Open the review tasks for Andrew and the SMEs</a></p>')
    for status, key in groups:
        rows = [row for row in outcomes if row['status'] == status]
        body += f'<section class="outcome-group" id="{key}"><h2>{esc(status)} ({len(rows)})</h2><ol>'
        for row in rows:
            owner = f'<p><strong>Reviewer</strong> · {esc(row["reviewer"])}</p>' if row.get('reviewer') else ''
            body += (f'<li id="row-{row["row"]}"><h3>Workbook row {row["row"]}</h3>'
                     f'<p>{esc(row["finding"])}</p>{owner}</li>')
        body += '</ol></section>'
    return document('Team review outcomes', body, stylesheet='review-register.css')


def build_register(drafts, current, outcomes):
    review_count = sum(row['status'] == 'Review needed' for row in outcomes)
    team = [
        ('learning-review', 'Andrew · Learning design and learner testing',
         'Start in reception. Open Alex Morgan’s record, visit the three orientation stops, then write a two-sentence handover and one clarifying question. The proposed criteria are to distinguish a request from a confirmed booking, name the source and next service, and check the missing detail without assuming a language or dialect. The facilitator debrief asks peers to trace the booking status to the source and revise their handover when new information arrives. Approve these tasks and criteria for your cohort, or identify a correction and the unit or assessment it affects.',
         [('learning-guide.html', 'Learning guide'), ('./#tour?guide=orientation', 'Guided orientation'), ('./#patient-case', 'Alex Morgan’s record')],
         'Workbook rows 4, 30, 59, 62–63, 89–91 and 98–100. Please include a representative learner using a phone and the assistive technology used in the course.'),
        ('clinical-review', 'Clinical and laboratory SMEs · Cases, procedures and tour',
         'Check the medication, handover, PPE and waste drafts against the intended workplace procedures. Review the revised message about missing belongings, Alex’s interpreter request, the incomplete fields in the archived patient record and the room observation prompts. Identify any wording or answer that could teach the wrong action.',
         [('#D01', 'Medication safety'), ('#D02', 'Clinical handover'), ('#D06', 'PPE reference'), ('#D09', 'Waste examples'), ('./#page/patient-management-system%2Fmessageboard%2Findex.html', 'Staff messages'), ('./#tour', 'Tour')],
         'Workbook rows 21, 30, 38, 56 and 89–101. Supply an approved replacement if Nursing and X-ray should have different panoramas, and an authorised image for Counselling or the evacuation plan if available.'),
        ('cultural-review', 'Liaison and language services reviewers · Cultural content',
         'Try the conversation starter in the liaison guide, the handover note and the Womin Djeka orientation entry. Approve the proposed wording and the steps for recording the person’s preferences and following up. Flag any local referral contact or channel that needs to be added. Andrew should confirm which training is available to the intended cohort through their RMIT accounts.',
         [('./#documents?category=Aboriginal+and+Torres+Strait+Islander+liaison', 'Liaison guide'), ('./#page/scorm%2Fintranet%2Fnews-feed%2Fwomin-djeka%2Findex.html', 'Womin Djeka orientation'), ('#D03', 'Interpreter booking'), ('#D05', 'Liaison service overview')],
         'Workbook rows 43–47, 59 and 62–63. A local cultural reviewer should confirm suitability for teaching.'),
        ('service-review', 'Allied health and department leads · Services and reporting lines',
         'Review the Allied health guide’s meal-preparation example and the proposed steps for preparing a team discussion. Our proposal is to list confirmed services in the staff hub and leave unverified reporting lines unnamed. Approve this treatment or identify a verified chart or contact to include. The existing directory also records uncertainty about Emergency nursing supervision and liaison contact details.',
         [('./#department/allied-health', 'Allied health'), ('./#documents?category=Allied+health', 'Staff guide'), ('#reporting-lines', 'Unresolved reporting lines')],
         'Workbook rows 43 and 67–69. Return the approved changes or a source chart.'),
        ('policy-identifiers', 'Policy and records owners · Editions, identifiers and authority',
         'Check the revised Word downloads and their references. Five supplied policies say version 001 and have no policy number. Approve keeping version 001 and leaving the number out until a governance record identifies it. If a teaching-only catalogue code is wanted, the proposed references are BH-CFH (complaints), BH-FOI (information access), BH-DIG (digital use), BH-LNG (language services) and BH-MRP (mandatory reporting). These proposals appear only in the register. Confirm who owns privacy offboarding and breach reporting, where incidents are escalated, and which timelines apply. Two Bagwan-labelled source policies attributed duties to Greendale. Review the proposed records and WHS references and supply an authorised incident-response policy if available.',
         [('./#policies', 'Policies and procedures'), ('./#documents?category=Policies+and+procedures', 'Policy files'), ('#document-identity', 'Incident-response document')],
         'Workbook rows 27, 29 and 72–88. Record the intended jurisdiction or teaching context where this affects a decision.'),
    ]
    sections = [('reporting-lines', 'Staff records and reporting lines'),
                ('document-identity', 'Which organisation owns the incident response policy?'),
                ('release-checks', 'Additional release checks')]
    jump_links = [(item[0], item[1]) for item in team] + [(d['id'], f"{d['id']} · {d['title']}") for d in drafts] + sections
    register = (
        '<div class="register"><header class="register-intro">'
        '<p class="eyebrow">Content governance · 20 November 2026</p><h1>Content review register</h1>'
        '<p class="lead">Andrew, the fixes from the team workbook are ready to try in Bagwan 3.0. '
        'Start with the learning journey below, then send the relevant sections to your subject-matter reviewers.</p>'
        '<p><a href="what-changed.html">Read what changed</a> or <a href="what-changed.pdf">download the summary (PDF)</a>.</p></header>'
        '<nav class="register-jump" aria-label="Review item index"><details id="register-index"><summary>Jump to an item</summary><ul>'
        + ''.join(f'<li><a href="#{esc(key)}">{esc(label)}</a></li>' for key, label in jump_links)
        + '</ul></details></nav><section id="team-review" class="register-group" aria-labelledby="team-title">'
        '<h2 id="team-title">Team workbook decisions</h2>'
        f'<p>Of the {len(outcomes)} workbook findings, {len(outcomes) - review_count} are fixed and {review_count} '
        'have a change or draft ready for a reviewer decision. '
        '<a href="team-review-outcomes.html">See the outcome for each workbook row</a>.</p>'
        '<p>In the shared review workbook, '
        'record the row or draft ID, your decision (approve, revise or withdraw), any replacement wording or source, '
        'your name and the date. Andrew can nominate the relevant SME for each decision.</p><div class="review-items">'
    )
    for key, title, request, links, rows in team:
        actions = ' · '.join(f'<a href="{esc(href)}">{esc(label)}</a>' for href, label in links)
        detail = ''
        if key == 'policy-identifiers':
            editions = json.loads((OUT / 'document-editions/catalogue.json').read_text())['editions'].values()
            files = {entry['local_href']: entry['name'] for entry in editions}
            file_links = ''.join(f'<li><a href="{esc(href.removeprefix("3.0/"))}" download>{esc(name)}</a></li>' for href, name in sorted(files.items()))
            detail = ('<h4>Files prepared for review</h4><p>Each revised Word file and the selected publisher handbook is pending owner review. '
                      'The one-page records guide proposes eight public references. Check the removed Greendale attributions and the treatment of offboarding and escalation. '
                      'The two Officewise shortcuts use the same WorkSafe handbook. The workstation checklist now omits an editorial comment and its unverified break interval.</p>'
                      f'<ul>{file_links}</ul>')
        elif key == 'learning-review':
            detail = '<p>The guide also gives criteria for finding a policy, identifying a colleague and tracing observations to a clinical form. Review the three optional HTML activities, their answer feedback and the downloadable interpreter reflection in D08–D10 below.</p>'
        elif key == 'cultural-review':
            detail = '<p>Try both branches of the interpreter activity. Review the feedback on briefing before the consultation, and the proposed actions when a family member asks the interpreter to soften the clinician’s message. Confirm the wording and the existing continuation or retry outcome for each choice. <a href="./#page/scorm%2Fdepartment-pages%2Finterpreting-office%2Fnew-interpreting-pd%2Findex.html">Open the activity</a>.</p>'
        register += review_entry(key, title, 'Pending', f'<p>{esc(request)}</p><p>{actions}</p>{detail}<p>{esc(rows)}</p>')
    register += '</div></section><section class="register-group" aria-labelledby="drafts-title"><h2 id="drafts-title">Individual content drafts</h2><div class="review-items">'
    for draft in drafts:
        href = 'index.html#page/' + quote(draft['path'], safe='') if draft['path'] in current else draft['path']
        reviewers = ''.join(f'<li>{esc(reviewer)}</li>' for reviewer in draft['reviewers'])
        # Drafts use h2s on their own pages. Their sections sit below the item heading here.
        draft_text = draft['html'].replace('<h2>', '<h4>').replace('</h2>', '</h4>')
        body = (
            f'<dl class="review-context"><div><dt>Why this was created</dt><dd>{esc(draft["reason"])}</dd></div>'
            f'<div><dt>Reviewers</dt><dd><ul>{reviewers}</ul></dd></div></dl>'
            f'<div class="draft-text">{draft_text}</div><p><a class="draft-link" href="{esc(href)}">Open the draft</a></p>'
        )
        if draft['sources']:
            body += '<h4>Reference sources</h4><ul>' + ''.join(
                f'<li><a href="{esc(source)}">{esc("Recovered staff positions and source references (JSON)" if source == "../data/staff-hierarchy.json" else source)}</a></li>'
                for source in draft['sources']) + '</ul>'
        body += (
            '<div class="review-decision"><h4>Decision to record</h4>'
            '<p>Record the reviewer’s name and role, decision (approve, revise or reject), date, required corrections, '
            'approved scenario or scope, and next review trigger.</p>'
            f'<p>The current recorded decision is <strong>{esc(draft["review_status"])}</strong>.</p></div>'
        )
        register += review_entry(draft['id'], draft['title'], draft['review_status'], body, draft['id'])
    register += '</div></section><section class="register-group" aria-labelledby="questions-title"><h2 id="questions-title">Source questions</h2><div class="review-items">'
    questions = (
        '<p>The April 2025 backup contains the original hospital charts and staff directory. The reconstructed directory '
        'has 126 distinct names, ten roles whose holder is unknown and 110 documented reporting lines. Some people appear '
        'in more than one role. A missing manager or contact needs confirmation from the relevant SME.</p>'
    )
    notes = (ROOT / 'data/staff-hierarchy-review.md').read_text().split('## Questions for the SME and Andrew', 1)[1]
    for line in notes.splitlines():
        if line.startswith('| ') and not line.startswith(('| Area |', '| ---')):
            area, question = [part.strip() for part in line.strip('|').split('|')]
            questions += f'<h4>{esc(area)}</h4><p>{esc(question)}</p>'
    questions += '<p><a href="./#people">Open the People directory</a> · <a href="../data/staff-hierarchy-review.md" download>Download the source and review notes (Markdown)</a></p>'
    register += review_entry(*sections[0], 'Pending', questions)
    identity = (
        '<p>The archived Word file named Emergency Incident Response, Management &amp; Reporting identifies Greendale '
        'Community in its header and body. It has been withdrawn from the 3.0 staff library. The policy owner should '
        'supply the authorised Bagwan edition or confirm that this item should stay withdrawn. Staff can still '
        '<a href="./#page/scorm%2Fquick-link-pages%2Fincident-reporting%2Findex.html">open the incident report form</a>.</p>'
    )
    register += review_entry(*sections[1], 'Pending', identity)
    register += (
        '</div></section><section class="register-release" id="release-checks"><h2>Additional release checks</h2>'
        '<p>Review the original source policies for clinical and legal currency, document ownership, versioning and approval. '
        'Confirm missing contact details and source media. Review the learning guide, unit mapping, evidence expectations '
        'and learner testing. Record the release decisions separately.</p>'
        '<p><a href="content-drafts.json" download>Download the structured draft register (JSON)</a></p></section></div>'
    )
    return document('Content review register', register, stylesheet='review-register.css', script='review-register.js')


def build():
    baseline = json.loads((EVIDENCE / 'bagwan-all-pages-review-data.json').read_text())
    links = json.loads((EVIDENCE / 'bagwan-link-audit-results.json').read_text())
    drafts = json.loads((OUT / 'content-drafts.json').read_text())['items']
    repairs = json.loads((OUT / 'link-repairs.json').read_text())
    content = json.loads((OUT / 'content.json').read_text())
    current = {p['path']: p for p in content['pages']}
    wp = {p['path']: p['url'] for p in json.loads((ROOT / 'static-export.json').read_text())['pages']}
    broken = [r for r in links['results'] if r['kind'] == 'external' and r['status'] == 404]
    affected = {ref['page'] for r in broken for ref in r['references']}
    review = '<p class="eyebrow">BAGWAN REFRESH · 20 NOVEMBER 2026</p><h1>Critical review of Bagwan</h1><p class="lead">A review of every migrated page, the main functional journeys and the experience of using Bagwan as a hospital intranet.</p><p>The technical migration is broadly working. The larger risks are content quality, dated references, incomplete procedures and a mix of workplace information and learning interactions. The 3.0 preview addresses navigation and presentation while retaining working records and the tour.</p>'
    review += '<div class="metrics"><div><strong>103</strong><span>existing pages reviewed</span></div><div><strong>90</strong><span>WordPress URLs checked</span></div><div><strong>60</strong><span>external links checked</span></div><div><strong>10</strong><span>drafts requiring review</span></div></div>'
    review += '<h2>What was checked</h2><p>Every existing HTML route was loaded locally at desktop and phone sizes, with content inventories and screenshots. Local navigation, downloads, section links and runtime assets were checked. A fresh axe scan covered 102 existing pages; the standalone panorama was excluded from that scan. Keyboard journeys passed 42 checks and clinical form journeys passed 51 checks. The first blue 3.0 review build passed 55 journey checks; layout and accessibility results are recorded in the verification section below.</p><p>This is a critical product and learning-design review, not clinical approval or a claim of full WCAG conformance. The browser checks used Chromium. Screen readers, Safari, Firefox, physical devices, downloaded-document accessibility and full video playback require further review.</p>'
    findings = [
        ('Review before teaching', 'The archived waste answer key was ambiguous', 'The old activity put an unspecified expired medicine in cytotoxic waste. An expiry date does not establish that classification. The new draft uses an explicit cytotoxic example and a separate insufficient-information example. The SME must approve the categories and feedback.'),
        ('Review before teaching', 'Clinical policy content is incomplete or unverified', 'Medication safety and handover had no supplied policy; booking an interpreter was an empty template. Drafts now exist. Complete code of conduct and privacy text was restored from supplied Word documents. Existing source policies still require clinical, legal and approval review.'),
        ('High', 'Current and archived information were hard to distinguish', 'Old news could look like a current hospital alert. 3.0 labels news as archive material and labels newly authored policy content as draft. No current clinical approval or live hospital status has been invented.'),
        ('High', 'Nine external URLs returned 404', 'All nine were also linked from WordPress. Verified current resources replace these links in 3.0 and in the local repair set. A changed web address does not validate the clinical or legal content of the linked policy.'),
        ('Medium', 'Ten departmental charts overflowed on phones', 'The local charts now use responsive layouts. Their existing names, roles and reporting groups have been preserved. The blue 3.0 content views use responsive reference layouts.'),
        ('Medium', 'Finding information required knowing the site structure', 'Policies, forms, documents and resources were spread across nested menus and duplicate indexes. 3.0 provides task-based navigation and search across pages, people, policies, documents and video.'),
        ('Medium', 'Some interactions worked against the intranet context', 'Values were hidden behind flip controls and safety content used picture dragging. Values are now visible reference text. PPE and waste references are in the intranet; optional HTML practice is in the separate learning guide.'),
        ('Medium', 'Long policies and embedded pages increased effort', 'Twelve original policy pages exceeded 1400 words. 3.0 uses readable line lengths and section navigation where headings are available. Nested department resource frames become dedicated resource links.'),
        ('Medium', 'The draft and evidence lifecycle needed clearer boundaries', 'Forms save on the device rather than submitting to a hospital or LMS. The new interface explains this and adds a clear-local-draft action. The learning guide explains where reflection and evidence belong.'),
    ]
    for priority, title, detail in findings:
        review += '<section><p class="eyebrow">' + esc(priority) + '</p><h2>' + esc(title) + '</h2><p>' + esc(detail) + '</p></section>'
    review += '<h2>Comparison with WordPress</h2><p>All 103 published GitHub routes returned HTTP 200 in the baseline check. Of the 90 original WordPress URLs, 87 returned 200 and three returned 404. WordPress still exposed three gallery shortcodes and nine staff-list shortcodes as text. The gallery sources were recovered from the April 2025 backup; the public video index now contains 24 unique videos.</p><ul>'
    for result in links['results']:
        if result['kind'] == 'wordpress' and result['status'] == 404:
            review += '<li><code>' + esc(result['url']) + '</code></li>'
    review += '</ul><p>These are source-site failures. The corresponding migrated routes exist on GitHub. They should not be reported as three new GitHub broken links.</p><h2>External links and replacements</h2><div class="table-responsive" tabindex="0" role="region" aria-label="External link replacements"><table class="review-table"><thead><tr><th>Original URL and result</th><th>Verified replacement</th></tr></thead><tbody>'
    for result in broken:
        replacement = repairs[result['url']]
        review += '<tr><td><strong>404</strong><br><code>' + esc(result['url']) + '</code></td><td><a href="' + esc(replacement['url']) + '">' + esc(replacement['label']) + '</a><br>HTTP 200 verified on 20 November 2026</td></tr>'
    review += '</tbody></table></div><h2>Items that still need a person to check</h2><ul><li>AustLII and Cole-Parmer returned 403 to automated requests. They are not confirmed dead links.</li><li>The archived video Example of a Poorly-Managed Meeting did not provide public oEmbed metadata. Its watch link is retained for manual checking. The other 23 videos returned metadata; that does not prove embedding permission or complete playback.</li><li>The current NAATI directory is linked from NAATI but its separate directory service blocked the automated check. A human should verify the directory task.</li><li>The counselling panorama and evacuation-plan image were unavailable at the source. No hospital geography or evacuation route has been invented.</li><li>The recovered nursing charts and liaison roster supply staff names. The Emergency nursing reporting line, liaison contacts, clinical procedures and other source discrepancies need SME and SLD review. <a href="review-register.html#reporting-lines">Read the reporting-line questions</a>.</li><li>The files identified in the team workbook now have revised editions or a documented withdrawal. Policy authority, currency and document accessibility still need human review.</li></ul>'
    review += '<h2>Learning design recommendations</h2><p>Keep the staff intranet authentic and put instructions, reflection, evidence requirements and facilitator prompts in the separate guide. Start a session with a role and a workplace problem, then let learners find and use the relevant information. Avoid adding a score or reveal interaction when the actual task is to locate a reference.</p><p>Before teaching use, Andrew and the SME should agree the learner level, scenario brief, relevant units, evidence criteria and debrief questions. Test whether a learner can find the right policy, identify a colleague, locate a record and explain a decision without interface coaching. The proposed practice activities support discussion; they do not establish competence.</p>'
    review += '<h2>Build and review plan</h2><ol><li><strong>Restore and stabilise.</strong> Recover gallery sources, repair confirmed links, fix mobile chart layouts and restore source policy text.</li><li><strong>Build the parallel staff intranet.</strong> Keep Bagwan blue, introduce a Material-inspired visual language, improve search and navigation, and preserve working forms and the hospital tour.</li><li><strong>Separate learning support.</strong> Replace the three H5P packages with optional native HTML activities and make values readable in the intranet.</li><li><strong>Review new content.</strong> SME and SLD review all ten drafts, their answer keys, cultural appropriateness and scenario alignment. Record decisions and corrections in the register.</li><li><strong>Validate with representative learners.</strong> Observe realistic tasks, check screen readers and target devices, review document accessibility and third-party resources, then decide on a wider release.</li></ol>'
    review += '<h2>Visual and interaction direction</h2><p>The visual thesis is a recognisable blue hospital workspace with clear Material-inspired surfaces, strong typography and restrained depth. The content hierarchy is staff tasks first, then hospital updates, services and departmental detail. Drawer motion, selected navigation states and press feedback support orientation; reduced-motion preferences are respected.</p>'
    review += '<h2>Every page reviewed</h2><p>The register below includes all 103 original local routes. Shared observations apply to every row: the old shell needs consistent information hierarchy and the 3.0 preview supplies the common navigation and search. Page-specific observations are listed separately.</p><label for="page-filter">Find a page or finding</label><input class="field-search no-print" id="page-filter" type="search" placeholder="Search the page review"><p id="page-count" class="result-count" role="status">103 pages</p><div class="table-responsive" tabindex="0" role="region" aria-label="Every page review"><table class="review-table" id="page-review"><thead><tr><th>Page</th><th>Critical observation</th><th>Response</th></tr></thead><tbody>'
    for result in baseline:
        path = result['path']
        record = current[path]
        observations, responses = [], []
        if result.get('mobile', {}).get('horizontalOverflow'):
            observations.append('Department chart overflows on phones.')
            responses.append('Local responsive chart repair; responsive 3.0 layout.')
        if path in affected:
            observations.append('Contains inherited external 404 links.')
            responses.append('Verified destinations substituted in 3.0 and the local repair set.')
        if record.get('draft_id'):
            observations.append('Missing, incomplete or unsuitable source content.')
            responses.append('Draft ' + record['draft_id'] + ' added; SME and SLD review pending.')
        if path.endswith(('privacy/index.html', 'code-of-conduct/index.html')):
            observations.append('Web page was an unfilled policy template despite a complete supplied document.')
            responses.append('Full source text restored; source policy still needs currency review.')
        if record['category'] == 'Policy' and not record.get('draft_id'):
            observations.append('Policy ownership, approval and currency need review.')
            responses.append('Review status recorded in the register. Sections are linked on longer policy pages.')
        if record['category'] == 'News':
            observations.append('Archived news can appear current without context.')
            responses.append('News presented as scenario archive material.')
        if record['category'] == 'Form or record':
            observations.append('Scenario data and browser-local drafts need clear boundaries.')
            responses.append('Working record/form behaviour retained; save, print and download journeys checked.')
        if record['category'] == 'Hospital tour':
            observations.append('Spatial interaction needs keyboard support and source media availability.')
            responses.append('Existing tour retained; keyboard journey checked. Missing source media recorded separately.')
        if record['category'] == 'Document library':
            observations.append('Folder-based lists limit discovery and downloaded documents need their own review.')
            responses.append('Filters and sortable columns organise the library. The library pairs file previews with a download of the displayed edition.')
        if path == 'scorm/intranet/our-community/index.html':
            observations.append('Core values hidden behind flip controls.')
            responses.append('All five values are directly readable reference sections.')
        if not observations:
            observations.append('Functional baseline; navigation, hierarchy and discoverability can improve.')
            responses.append('Included in the new shell and cross-content search; original content remains available.')
        review += '<tr><td><a href="index.html#page/' + quote(path, safe='') + '">' + esc(record['title']) + '</a><br><code>' + esc(path) + '</code></td><td>' + esc(' '.join(observations)) + '</td><td>' + esc(' '.join(responses)) + '</td></tr>'
    review += '</tbody></table></div><h2>Verification and limits</h2><p id="verification-summary">The original 103 pages were reviewed. Ten chart repairs were rechecked with no remaining page overflow. The 103 blue 3.0 content views were scanned with no automated WCAG violations; two nested resource-frame width issues identified in that pass were subsequently repaired. Final verification details are included in the downloadable evidence and the final handover.</p><p>The current 2.0 URL remains the comparison baseline. The wider link and chart repairs also exist locally. The 3.0 content snapshot includes the corrections without requiring the comparison site to be replaced.</p><p>Evidence: source route manifest, live HTTP results, page inventories, screenshots, keyboard and clinical journey logs, the 3.0 browser results, the archived plugin settings and the supplied policy files. Raw backup files and database contents are not published.</p>'
    (OUT / 'critical-review.html').write_text(document('Critical review of Bagwan', review))

    outcomes = json.loads((ROOT / 'data/v3-team-review-outcomes.json').read_text())
    (OUT / 'team-review-outcomes.html').write_text(build_outcomes(outcomes))
    (OUT / 'review-register.html').write_text(build_register(drafts, current, outcomes))

    changed = '<p class="eyebrow">FOR ANDREW · SENIOR LEARNING DESIGNER · 20 NOVEMBER 2026</p><h1>Bagwan 3.0 What we changed</h1><p class="lead">A clearer hospital staff intranet, with learning support kept separate and new content made visible for review.</p><p>Bagwan 3.0 is a parallel review version. It brings the existing workplace resources into a more coherent intranet, restores missing material and removes interactions that made reference information harder to use. The original site remains available so you can compare both experiences.</p><div class="button-row"><a class="button" href="./">Review Bagwan 3.0</a><a class="button secondary" href="../index.html">Compare Bagwan 2.0</a></div>'
    changed += '<p><a class="button secondary" href="what-changed.pdf">Download the summary for Andrew (PDF)</a></p><h2>The main changes</h2><ul><li><strong>Bagwan stays blue.</strong> The redesign retains the hospital identity, using Material-inspired navigation, clear selection states, locally hosted Roboto and deliberate visual hierarchy.</li><li><strong>People can start with the task.</strong> Policies, forms, people, departments, resources and the hospital tour have direct entry points.</li><li><strong>Search covers the intranet.</strong> People can search source pages, names, roles, documents and videos, then filter within a section.</li><li><strong>Open the right document.</strong> Filter by category and file type, sort by title or last update, and preview a document before downloading the displayed edition. The register identifies the revised editions. The <a href="review-register.html#document-identity">incident response policy needs an ownership check</a>. <a href="./#documents">Open Documents &amp; templates</a>.</li><li><strong>Follow a reporting line.</strong> A staff profile shows the recorded manager and direct reports. The archive supplies five nursing unit charts and four liaison staff. <a href="review-register.html#reporting-lines">Review the unresolved reporting lines and appointments</a>.</li><li><strong>The recovered videos are back.</strong> Eleven meeting videos and the Closing the Gap video join the twelve original embeds.</li><li><strong>Reference information is visible.</strong> All five values can be read without flipping cards. PPE and waste references belong in the intranet.</li><li><strong>Learning guidance is separate.</strong> The guide contains suggested workplace tasks, reflection and optional practice, without turning the staff home into a course dashboard.</li></ul>'
    changed += '<h2>Changes from the team workbook</h2><ul><li>Shared resources lead back to the department where staff started. Nursing shortcuts, news links and the pathology form now open their intended destinations.</li><li>The library includes Allied health and liaison guides for review. Revised Word files and matching previews address broken references, review comments and page numbering. The current WorkSafe office guide replaces the 2006 edition. The Greendale incident-response file is withheld.</li><li>An optional three-stop tour, room prompts and a new fictional interpreter-request case give facilitators a workplace task to try. Learning prompts sit in the separate guide.</li></ul><p><a href="review-register.html#team-review">Open the decisions for Andrew and the SMEs</a>.</p>'
    changed += '<h2>Before and after</h2><figure><img src="review-assets/before.png" alt="Bagwan 2.0 staff homepage with dense navigation and small news and quick-link cards"><figcaption>Bagwan 2.0: the migrated staff homepage.</figcaption></figure><figure><img src="review-assets/after.png" alt="Bagwan 3.0 blue staff intranet with larger search, clear task navigation and a hospital noticeboard"><figcaption>Bagwan 3.0: retained blue identity with clearer workplace navigation and hierarchy.</figcaption></figure>'
    changed += '<h2>What happened to H5P</h2><p>The three packages are replaced in 3.0 by native HTML exercises in the learning guide. PPE practice now asks about decisions and risk assessment. Waste practice uses explicit examples and feedback. The interpreter task uses the current directory and asks learners to record their reasoning; it does not reveal a historical person’s name as the correct answer.</p><p>The waste answer key exposed a content problem: unspecified expired medication was treated as cytotoxic. The revised draft distinguishes a known cytotoxic residue from a medicine that needs more information. The SME must review the examples and answer key.</p>'
    changed += '<h2>What content was recovered or created</h2><p>Complete code of conduct and privacy text was restored from the supplied Word documents. Ten new or adapted drafts cover medication safety, handover, interpreter booking, nursing structure, liaison services, laboratory references and the three optional activities. Every draft has a reason, status and named reviewer role in the register.</p><p>No draft is presented as an approved clinical procedure. Policy ownership and currency are recorded in the reviewer register. Missing names, contact details, hospital geography and evacuation routes have not been invented.</p>'
    changed += '<h2>What the review found</h2><p>All 103 published GitHub pages loaded. Three of the 90 WordPress source URLs returned 404. Nine external URLs were broken on both versions of the source content; verified replacements are included in 3.0 and the local repair set. Ten departmental charts overflowed on phones and have been repaired locally.</p><p>The existing keyboard and clinical form journeys passed 93 checks. The first blue 3.0 review build passed 55 journey checks, and all 103 content views received a layout and automated accessibility pass. These checks support a working review build; they do not establish clinical approval, full accessibility conformance or complete video playback.</p>'
    changed += '<h2>What we deliberately kept</h2><p>The supplied patient records, working clinical calculations, draft saving, print/download behaviour, branching interpreting scenario and hospital tour remain available. The 3.0 interface integrates those working functions while the core intranet navigation and content views have been redesigned. Forms still create local training drafts rather than submitting to a hospital or LMS.</p>'
    changed += '<h2>What we need from you and the SME</h2><ol><li>Review the ten draft items and confirm the content, terminology, answer keys and cultural appropriateness.</li><li>Review the proposed reception scenario, evidence criteria and facilitator debrief against the intended cohort and unit.</li><li>Try realistic tasks with representative learners, including finding a policy, colleague, form and record.</li><li>Confirm clinical and legal currency, contact details, missing media, third-party resources and accessibility checks before teaching use.</li></ol><p><a href="review-register.html">Open the content review register</a> · <a href="critical-review.html">Read the full critical review and every-page findings</a></p>'
    (OUT / 'what-changed.html').write_text(document('Bagwan 3.0 What we changed', changed))
    assets = OUT / 'review-assets'
    assets.mkdir(exist_ok=True)
    shutil.copyfile(ROOT / 'output/playwright/all-pages/004-desktop.png', assets / 'before.png')
    shutil.copyfile(ROOT / 'output/playwright/v3-blue-home-desktop.png', assets / 'after.png')
    for name in ('what-changed.html', 'critical-review.html', 'review-register.html'):
        print(OUT / name)


if __name__ == '__main__':
    build()
