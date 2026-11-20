"""Render the role-based decisions in the Bagwan reviewer register."""
from html import escape
from urllib.parse import quote


def link(href, label):
    return f'<a href="{escape(href, quote=True)}">{escape(label)}</a>'


def disclosure(key, title, body, *, open_by_default=False):
    opened = ' open' if open_by_default else ''
    return f'<details class="review-entry" id="{key}"{opened}><summary>{escape(title)}</summary><div class="decision-body">{body}</div></details>'


DRAFT_QUESTIONS = {
    'D01': 'Would staff know what to check in the medication record and when to ask a clinician or pharmacist for help?',
    'D02': 'Does the handover make the outstanding action and the person taking responsibility clear?',
    'D03': 'Do the booking steps reflect how staff record a request, confirm it and follow up?',
    'D04': 'Can you confirm the named unit managers and the gaps in Emergency nursing supervision?',
    'D05': 'Is the invitation to use liaison support culturally appropriate, and does the handover respect the person’s preferences?',
    'D06': 'Does the PPE reference direct staff to the right task-specific checks?',
    'D07': 'Is the advice clear when the material or its waste stream is uncertain?',
    'D08': 'Do the PPE questions and feedback support a safe, task-specific choice?',
    'D09': 'Do the five examples use the right waste terms and distinguish a known cytotoxic residue from an unidentified medicine?',
    'D10': 'Does the directory task ask for the right credentials and a useful explanation of the learner’s choice?',
}


def register_body(drafts, current, outcomes, editions):
    items = {}
    for draft in drafts:
        code, path = draft['id'], draft['path']
        href = './#page/' + quote(path, safe='') if path in current else path
        items[code] = disclosure(code, f'{code} · {draft["title"]}', f'<p>{DRAFT_QUESTIONS[code]}</p>{link(href, "Open " + draft["title"])}')

    def related(codes):
        return ('<details class="supporting"><summary>Individual drafts (' + str(len(codes)) + ')</summary>' +
                ''.join(items[code] for code in codes) + '</details>')

    def actions(*links):
        return '<div class="review-links">' + ''.join(link(href, title) for href, title in links) + '</div>'

    def files():
        groups = {
            'People and workplace safety': ['bullying-and-harassment', 'equal-opportunity', 'personal-leave', 'occupational-health-and-safety', 'office-health-and-safety', 'workstation-self-assessment'],
            'Privacy, records and language services': ['privacy', 'freedom-of-information', 'disposal-of-records', 'recordkeeping-reference-guide', 'language-services'],
            'Risk and incident management': ['risk-management', 'incident-management'],
        }
        names = {'occupational-health-and-safety':'Occupational health and safety', 'office-health-and-safety':'WorkSafe office handbook'}
        urls = {record['local_href'].split('/')[-1].rsplit('.', 1)[0]: record['local_href'].removeprefix('3.0/') for record in editions}
        contents = ''
        for title, keys in groups.items():
            downloads = ''.join(f'<li>{link(urls[key], names.get(key, key.replace("-", " ").capitalize()))}</li>' for key in keys)
            contents += f'<details><summary>{escape(title)}</summary><ul>{downloads}</ul></details>'
        return '<details class="supporting"><summary>Revised documents (' + str(len(urls)) + ')</summary>' + contents + '</details>'

    pending = sum(row['status'] == 'Review needed' for row in outcomes)
    interpreter_scenario = './#page/' + quote('scorm/department-pages/interpreting-office/new-interpreting-pd/index.html', safe='')
    orientation = './#page/' + quote('scorm/intranet/news-feed/womin-djeka/index.html', safe='')
    register = (
        '<div class="register" id="team-review"><header class="register-intro"><h1>Review Bagwan 3.0</h1>'
        '<p>Andrew reviews the learning task and the evidence it gives him. Subject-matter reviewers can open their area below.</p></header>'
        + disclosure('learning-review', 'Andrew · Reception handover',
                     '<p>Alex is waiting for an answer about an interpreter. The learner’s handover should give the next receptionist enough information to follow up.</p>'
                     '<p><a class="handoff-action" href="learning-guide.html#visit">Try the handover <span aria-hidden="true">→</span></a></p>'
                     '<p><strong>Your decision</strong> · Would this handover show the communication skills your unit expects? There’s a sample note in the facilitator debrief.</p>',
                     open_by_default=True)
        + '<section id="register-index" class="review-roles"><h2>Subject-matter review</h2>'
    )
    register += disclosure('clinical-review', 'Clinical and laboratory practice',
        '<p>Would staff take the right next action from the handover, PPE and waste guidance? Flag the exact step or answer you would change.</p>'
        + actions(('#D02', 'Review the handover'), ('#D09', 'Check the waste examples'))
        + related(['D01','D02','D06','D07','D08','D09'])
        + '<details class="supporting"><summary>Patient records and tour</summary><p>Check Alex’s message and the missing-belongings correspondence.</p><p>Do the nursing and laboratory hotspot labels fit local practice? Should Main reception’s emergency information link to the defibrillator guidance?</p>'
        + actions(('./#patient-case','Alex’s record'),('./#page/patient-management-system%2Fmessageboard%2Findex.html','Staff messages'),('./#tour?stop=NurseStation','Nurses’ station')) + '</details>')
    register += disclosure('cultural-review', 'Liaison and interpreting',
        '<p>Does the wording respect the person’s choice of support? Check the liaison conversation starter, the reception handover example and how the interpreter responds to a family member.</p>'
        + actions(('./#documents?category=Aboriginal+and+Torres+Strait+Islander+liaison','Read the liaison guide'),('learning-guide.html#debrief','Reception handover example'),(interpreter_scenario,'Try the interpreter scenario'))
        + related(['D03','D05','D10'])
        + '<details class="supporting"><summary>Training and references</summary><p>Does the reference library describe the role of family interpreters accurately? The cultural reviewer checks how the RMIT modules are introduced.</p>'
        + actions(('./#page/resources-and-tools%2Finterpreting-services%2Findex.html','Interpreting reference library'),(orientation, 'Womin Djeka orientation'),('https://www.vic.gov.au/guidelines-using-interpreting-services/working-interpreters','Victorian interpreting guidance'),('https://ausit.org/wp-content/uploads/2024/09/AUSIT-Code-of-Ethics-and-Code-of-Conduct.pdf','AUSIT Code of Ethics')) + '</details>')
    register += disclosure('service-review', 'Allied health and team structure',
        '<p>Does the meal-preparation example reflect how the team works? Check the roles it names. Reporting lines with conflicting records are left blank.</p>'
        + actions(('./#documents?category=Allied+health','Read the Allied health guide'),('./#people','Open the people directory'))
        + related(['D04'])
        + disclosure('reporting-lines', 'Unconfirmed reporting lines', '<p>Start with Emergency nursing supervision and liaison contacts. Confirm a name or manager where you have a reliable record.</p>'
                     + link('../data/staff-hierarchy-review.md', 'Department notes and source charts')))
    register += disclosure('policy-identifiers', 'Policy ownership and records',
        '<p>Five policies record version 001 and give no policy number. Can we keep that version and leave the identifier blank until an authorised record is available?</p>'
        + actions(('./#policies','Open policies and procedures'),('#document-identity','Check the incident policy'))
        + disclosure('document-identity', 'Greendale incident policy', '<p>The file names Greendale Community in its header and body. Our recommendation is to keep it out of the staff library unless an authorised Bagwan edition is available.</p>')
        + '<details class="supporting"><summary>Privacy, records and workplace safety</summary><p>Confirm the local owner for offboarding, breach reporting and incident escalation. Check the references in the records guide and the WorkSafe handbook. The workstation checklist omits a disputed break interval.</p></details>'
        + '<details class="supporting"><summary>Possible teaching catalogue codes</summary><p>Complaints (BH-CFH), information access (BH-FOI), digital use (BH-DIG), language services (BH-LNG) and mandatory reporting (BH-MRP). These are proposals for teaching use.</p></details>'
        + files())
    register += ('</section><section class="review-reply"><h2>Give your decision</h2>'
        '<p>In the shared workbook, record <strong>approve, revise or withdraw</strong> beside the row or draft ID. Add your name, the date and any wording or source you want changed.</p>'
        f'<p>{pending} workbook findings need a content decision.</p>'
        + actions(('team-review-outcomes.html','Look up a workbook row'),('what-changed.pdf','One-page brief (PDF)')) + '</section>'
        + disclosure('release-checks', 'Before teaching use', '<p>The project team handles device and accessibility testing, link checks and enrolment access. '
                     'Department leads confirm local contacts. Policy owners confirm which edition is current.</p>'
                     + actions(('team-review-outcomes.html#row-4','Project team’s phone check'),('content-drafts.json','Download the draft register (JSON)')))
        + '</div>')
    return register
