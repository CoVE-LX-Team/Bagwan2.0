"""Render the supporting evidence in the 3.0 reviewer pack."""
from html import escape
from urllib.parse import quote


def lookup_tools(key, label, hint):
    return (f'<div class="lookup-tools" hidden><label for="{key}-filter">{label}</label>'
            f'<input type="search" id="{key}-filter" class="field-search" placeholder="{hint}">'
            f'<p id="{key}-count" data-count role="status"></p></div>')


def group(key, label, items):
    return (f'<details class="evidence-group" id="{key}"><summary><span>{escape(label)}</span>'
            f'<span class="group-count">{len(items)}</span></summary>'
            '<ol class="evidence-list">' + ''.join(items) + '</ol>'
            '<div class="evidence-pager" hidden><button type="button" data-back>Previous</button>'
            '<span data-position></span><button type="button" data-next>Next</button></div></details>')


def outcome_lookup(outcomes):
    fixed = sum(row['status'] == 'Fixed' for row in outcomes)
    review_count = sum(row['status'] == 'Review needed' for row in outcomes)
    project_count = sum(row['status'] == 'Project follow-up' for row in outcomes)
    body = ('<header class="evidence-intro"><h1>Team workbook outcomes</h1>'
            f'<p>Of {len(outcomes)} findings, {fixed} are fixed and {review_count} need a content decision. '
            f'The project team owns the follow-up on {project_count} {"finding" if project_count == 1 else "findings"}.</p>'
            '<a href="review-register.html#team-review">Open the reviewer decisions</a></header>'
            '<section class="evidence-lookup" data-lookup data-unit="row" aria-labelledby="row-title">'
            '<h2 id="row-title">Find a workbook item</h2>' +
            lookup_tools('outcome', 'Workbook row, topic or owner', 'For example, 30 or handover'))
    for status, key in [('Review needed', 'decisions'), ('Project follow-up', 'project-follow-up'), ('Fixed', 'fixed')]:
        items = []
        for row in outcomes:
            if row['status'] != status:
                continue
            number = row['row']
            owner = f'<p class="row-owner"><strong>Owner</strong> · {escape(row["reviewer"])}</p>' if row.get('reviewer') else ''
            items.append(f'<li class="evidence-item" data-number="{number}"><details id="row-{number}">'
                         f'<summary><span class="row-number">Row {number}</span><span>{escape(row["topic"])}</span></summary>'
                         f'<div class="evidence-text"><p>{escape(row["finding"])}</p>{owner}</div></details></li>')
        body += group(key, status, items)
    return body + '</section>'


def page_finding(result, record, affected):
    path = result['path']
    before, now = [], []
    if result.get('mobile', {}).get('horizontalOverflow'):
        before.append('The chart extended beyond the phone screen.')
        now.append('The chart fits a phone viewport.')
    if path in affected:
        before.append('One or more external links were broken.')
        now.append('The links use verified replacement destinations.')
    if record.get('draft_id'):
        before.append('The original content was missing, incomplete or unsuitable for the task.')
        draft = escape(record['draft_id'])
        now.append(f'<a href="review-register.html#{draft}">Draft {draft}</a> is ready for review.')
    if path.endswith(('privacy/index.html', 'code-of-conduct/index.html')):
        before.append('The web policy was an empty template.')
        now.append('The page uses the text from the supplied Word document.')
    category = record['category']
    if category == 'Policy' and not record.get('draft_id'):
        before.append('The owner, approval and currency need confirmation.')
        now.append('The register records these decisions. Longer policies have section links.')
    if category == 'News':
        before.append('Past staff notices could be mistaken for current alerts.')
        now.append('Readers can browse past notices in News &amp; updates.')
    if path == 'patient-management-system/messageboard/index.html':
        before.append('Readers had to mark every message as read to proceed, which sent them to the patient list.')
        now.append('Each message opens in the inbox and keeps its read status. Opening a patient record is a separate, labelled action.')
    elif category == 'Form or record':
        before.append('It was unclear where a form saved its contents.')
        now.append('Records and forms retain their save, print and download controls as applicable. Drafts save on the device.')
    if category == 'Hospital tour':
        before.append('The tour needed keyboard access and some original photographs were missing.')
        now.append('Room information groups topics by room, with the close control kept in view while reading. The register tracks missing images.')
    if path in {'scorm/department-pages/interpreting-office/index.html', 'scorm/department-pages/lab-technologies/index.html', 'scorm/department-pages/logisitics/index.html'}:
        before.append('Large news images pushed everyday staff tasks several screens down on a phone.')
        now.append('The department opens with its most useful form. Service guidance, team contacts and a link to the room in the tour are grouped together.')
    if path.startswith('resources-and-tools/'):
        before.append('Form downloads and references were buried inside the old section layout.')
        now.append('Staff can expand a labelled section and preview or download its files there.')
    if path == 'scorm/quick-link-pages/forms/index.html':
        before.append('Finding a downloadable form meant browsing separate department folders.')
        now.append('Downloadable forms share one searchable, sortable list with previews and downloads. The adjacent online view opens clinical forms and patient records.')
    if category == 'Document library':
        before.append('Documents were difficult to find by folder alone.')
        now.append('Staff can filter and sort the library, preview a file and download the same edition.')
    if path == 'scorm/intranet/our-community/index.html':
        before.append('The hospital values were hidden behind flip cards.')
        now.append('All five values are visible on the page.')
    if not before:
        before.append('The page worked, but finding it depended on knowing its location in the menus.')
        now.append('Staff can find the content through shared navigation and search.')
    title = escape(record['title'])
    return ('<li class="evidence-item"><details><summary>'
            f'<span>{title}</span><span class="page-category">{escape(category)}</span></summary>'
            f'<div class="evidence-text"><p><strong>Original issue</strong> · {" ".join(before)}</p>'
            f'<p><strong>In 3.0</strong> · {" ".join(now)}</p>'
            f'<p><a href="index.html#page/{quote(path, safe="")}">Open {title}</a></p>'
            f'<code>{escape(path)}</code></div></details></li>')


def critical_review(baseline, current, affected, links, broken, repairs):
    items = [page_finding(result, current[result['path']], affected) for result in baseline]
    missing = [r for r in links['results'] if r['kind'] == 'wordpress' and r['status'] == 404]
    originals = ''.join(f'<li><code>{escape(r["url"])}</code></li>' for r in missing)
    replacements = []
    for r in broken:
        repair = repairs[r['url']]
        replacements.append(f'<li><a href="{escape(repair["url"])}">{escape(repair["label"])}</a>'
                            f'<small>Original link · <code>{escape(r["url"])}</code></small></li>')
    return (
        '<header class="evidence-intro"><h1>Critical review of Bagwan</h1>'
        '<p>The staff intranet now brings the hospital’s people, policies, forms and tour into one place. '
        'Andrew reviews the learning task and its evidence. Subject-matter reviewers check the clinical and cultural content.</p>'
        '<a href="review-register.html#team-review">Open the reviewer decisions</a></header>'
        '<section class="evidence-lookup" data-lookup data-unit="page" aria-labelledby="lookup-title">'
        '<h2 id="lookup-title">Find a page finding</h2>' +
        lookup_tools('page', 'Page, department or issue', 'For example, privacy or nursing') +
        group('page-review', 'Page findings', items) + '</section>'
        '<section class="evidence-background" aria-labelledby="background-title"><h2 id="background-title">Supporting evidence</h2>'
        '<details><summary>Learning and staff workflows</summary><div class="evidence-text">'
        '<h3>Clinical content</h3><p>Medication safety, clinical handover and booking an interpreter now have working copies. '
        'The code of conduct and privacy policies were restored from their Word files. Clinical and policy owners review their currency in the register.</p>'
        '<h3>Practice and feedback</h3><p>The old waste exercise treated any expired medicine as cytotoxic. '
        'The new exercise distinguishes a known cytotoxic medicine from a case with too little information. '
        '<a href="review-register.html#D09">Review the waste examples</a>.</p>'
        '<p>Staff can read values, PPE and waste guidance directly. Learners practise the decisions in the separate guide. '
        'Learners leave a handover for the next receptionist. A sample note is available in the facilitator debrief. <a href="learning-guide.html#visit">Try the handover</a>.</p>'
        '<h3>Finding and using resources</h3><p>Search covers staff, policies, files and videos. Ten charts now fit phone screens. '
        'Twelve original policies exceeded 1,400 words. Longer policies now link between sections, and departments link directly to their resources.</p>'
        '<p>News distinguishes past notices. Forms can save or clear working drafts on the device, and learners can download their reflections.</p>'
        '</div></details>'
        '<details><summary>Broken links and recovered material</summary><div class="evidence-text">'
        '<h3>WordPress comparison</h3><p>All 103 published GitHub routes loaded. Of 90 WordPress addresses, 87 loaded and three returned a missing-page response. '
        'Their migrated pages are available in 3.0. The original site also displayed three gallery codes and nine staff-list codes. '
        'The April 2025 backup supplied the galleries. The library contains 24 unique videos.</p>'
        '<details class="source-detail"><summary>Three unavailable WordPress addresses</summary><ul>' + originals + '</ul></details>'
        '<h3>External references</h3><p>Nine of 60 external links returned a missing-page response on the original site. '
        'Their replacements opened on 20 November 2026.</p>'
        '<details class="source-detail"><summary>Original and replacement addresses</summary><ul class="replacement-list">' + ''.join(replacements) + '</ul></details>'
        '<p>The project team will check access to AustLII, Cole-Parmer, the NAATI directory and the Fair Work Commission page, '
        'and playback of <em>Example of a Poorly-Managed Meeting</em>. OAIC guidance opened in WebKit. Both linked RMIT course listings display their enrolment options. '
        'Access through a learner account is a project check.</p>'
        '</div></details>'
        '<details id="verification-summary"><summary>Coverage and remaining checks</summary><div class="evidence-text">'
        '<h3>Coverage</h3><p>All 103 migrated pages were checked in Chromium at desktop and phone sizes. '
        'The original review included 42 keyboard and 51 clinical-form checks. The first 3.0 review included 55 task checks. '
        'The reception task, from Alex’s record to the end of the three-stop tour, was also checked in WebKit at 320 and 375 pixels.</p>'
        '<h3>Project team follow-up</h3><p>The project team owns checks on physical devices and across browsers, including assistive technology, '
        'document accessibility and video playback. <a href="team-review-outcomes.html#row-4">See the phone layout finding</a>.</p>'
        '<p>The counselling panorama is missing. Nursing and X-ray share a photograph in the archive. Both Main reception hotspots now open the recovered evacuation diagram. '
        'The Emergency nursing reporting line, liaison contacts and policy authority also need content-owner confirmation. '
        '<a href="review-register.html#reporting-lines">Check the staffing questions</a>.</p>'
        '</div></details></section>'
    )
