"""Create the concise review document for the Senior Learning Designer."""
from pathlib import Path
import json
import sys

sys.path.insert(0, '/tmp/bagwan-report-deps')
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Image, Table, TableStyle, KeepTogether
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT.parent / 'deliverables/Bagwan 3.0 What changed for Andrew.pdf'
pdfmetrics.registerFont(TTFont('ReportArial', '/System/Library/Fonts/Supplemental/Arial.ttf'))
pdfmetrics.registerFont(TTFont('ReportArialBold', '/System/Library/Fonts/Supplemental/Arial Bold.ttf'))
pdfmetrics.registerFontFamily('ReportArial', normal='ReportArial', bold='ReportArialBold', italic='ReportArial', boldItalic='ReportArialBold')
styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name='ReportTitle', fontName='Helvetica', fontSize=27, leading=31, textColor=colors.black, spaceAfter=18))
styles.add(ParagraphStyle(name='LeadText', fontName='Helvetica', fontSize=13, leading=19, textColor=colors.HexColor('#34384b'), spaceAfter=14))
styles['Normal'].fontName='Helvetica';styles['Normal'].fontSize=10.5;styles['Normal'].leading=15;styles['Normal'].spaceAfter=10
for name in ['Heading1','Heading2']:
    styles[name].fontName='Helvetica-Bold';styles[name].textColor=colors.black;styles[name].spaceBefore=15;styles[name].spaceAfter=9
styles['Heading1'].fontSize=17;styles['Heading1'].leading=21
styles['Heading2'].fontSize=12;styles['Heading2'].leading=16
styles.add(ParagraphStyle(name='SmallText',parent=styles['Normal'],fontSize=8.5,leading=12,textColor=colors.HexColor('#4b4f62')))
for style in styles.byName.values():
    if getattr(style, 'fontName', None) == 'Helvetica': style.fontName = 'ReportArial'
    if getattr(style, 'fontName', None) == 'Helvetica-Bold': style.fontName = 'ReportArialBold'
story=[]
def p(text,style='Normal'):story.append(Paragraph(text,styles[style]))
def h(text):p(text,'Heading1')
def item(title,text):p('<b>'+title+'</b><br/>'+text)

p('Bagwan 3.0 What we changed','ReportTitle')
p('For Andrew, Senior Learning Designer<br/>20 November 2026','SmallText')
p('A clearer hospital staff intranet, with learning guidance kept separate and new content made visible for review.','LeadText')
p('Bagwan 3.0 is a parallel review version of the hospital simulation. It improves how people find and use workplace information, restores missing resources and separates learning support from the staff intranet.')
h('The main changes')
item('The hospital keeps its blue identity','The new visual direction uses Bagwan blue, Material-inspired surfaces and selection states, and clearer typography. Staff tasks have more prominence than decorative interface elements.')
item('Choose a document before downloading','Filter the library by category and file type. Preview and download the displayed edition. File changes are documented in the reviewer register. The policy from another organisation is withheld.')
item('Find the right colleague','A staff profile shows the manager and direct reports recorded for that role. The archive supplies 110 reporting lines across 142 positions, including five nursing unit teams.')
item('Reference information is directly available','All five values are readable without flipping cards. PPE and waste guidance sit in the intranet; optional practice sits in the learning guide.')
item('Missing content is visible for review','Two complete source policies were restored and ten new or adapted items are recorded as drafts. No draft is presented as an approved clinical procedure.')
h('Review both versions')
p('<link href="https://cove-lx-team.github.io/Bagwan2.0/3.0/" color="#000054">Bagwan 3.0 review preview</link><br/><link href="https://cove-lx-team.github.io/Bagwan2.0/" color="#000054">Bagwan 2.0 comparison site</link>')
p('<link href="https://cove-lx-team.github.io/Bagwan2.0/3.0/review-register.html#team-review" color="#000054">Open the team workbook decisions for Andrew and the SMEs</link>. Each entry links to the material and names the decision needed.','SmallText')
story.append(PageBreak())
p('The experience before and after','ReportTitle')
p('The familiar hospital identity is retained, with a clearer staff workspace.','Normal')
for name,label in [('before.png','Bagwan 2.0 - the migrated staff homepage'),('after.png','Bagwan 3.0 - the blue intranet review version')]:
    p(label,'Heading2')
    story.append(Image(str(ROOT/'3.0/review-assets'/name),width=400,height=278))
    story.append(Spacer(1,10))
story.append(PageBreak())
p('Why these changes support learning','ReportTitle')
item('The intranet behaves like a workplace','Learners should practise finding and using information as staff members. The staff homepage therefore leads with workplace tasks rather than a course pathway, a score or a series of compulsory reveals.')
item('Teaching guidance has its own place','The separate learning guide contains suggested tasks, reflection prompts and evidence expectations. Facilitators can set a role and workplace problem, then let learners decide where to look in the hospital resources.')
item('Interaction has a purpose','A values statement needs to be read, not guessed. The five values are now visible reference sections. Where practice is useful, native HTML controls provide keyboard access, clear instructions and explicit feedback.')
h('What happened to the three H5P activities')
item('PPE selection decisions','The optional exercise asks about task hazards, approved procedures and suitable protection. It does not imply that a single set of clothing is right for every laboratory task.')
item('Waste classification examples','The original answer key categorised unspecified expired medication as cytotoxic. The new draft explicitly identifies cytotoxic residue and adds an example where more information is required. The SME must review the categories and answer key.')
item('Finding an interpreter','The new task uses the current directory and asks learners to record how they checked suitability. The old activity\'s fixed historical name is not treated as a current provider recommendation.')
p('These exercises are discussion resources pending SME and SLD review. They are not approved assessment instruments or evidence of practical competence. Andrew should agree learner level, curriculum mapping, evidence criteria and debrief prompts before teaching use.','SmallText')
story.append(PageBreak())
p('Content that needs review','ReportTitle')
p('All ten items below have the status Pending. The register records why each was created, the sources available and the decisions to record. No approval has been assumed.')
drafts=json.loads((ROOT/'3.0/content-drafts.json').read_text())['items']
rows=[[Paragraph('<b>Item</b>',styles['Normal']),Paragraph('<b>Content</b>',styles['Normal']),Paragraph('<b>Review</b>',styles['Normal'])]]
for draft in drafts:
    rows.append([Paragraph(draft['id'],styles['Normal']),Paragraph(escape(draft['title']),styles['Normal']),Paragraph('SME and SLD<br/>Pending',styles['SmallText'])])
table=Table(rows,colWidths=[40,310,115],repeatRows=1,hAlign='LEFT')
table.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#e9ecf8')),('VALIGN',(0,0),(-1,-1),'TOP'),('BOTTOMPADDING',(0,0),(-1,-1),8),('TOPPADDING',(0,0),(-1,-1),8),('LINEBELOW',(0,0),(-1,-1),.35,colors.HexColor('#d6daea'))]))
story.append(table)
h('Recovered source content')
p('Complete code of conduct and privacy text was restored from the supplied Word documents. Eleven meeting videos and the Closing the Gap video were recovered from the April 2025 backup, bringing the public video index to 24 unique videos.')
p('The archive identifies the five nursing teams and four liaison staff. Andrew and the SMEs still need to confirm conflicting reporting lines, referral arrangements and contact details. The counselling panorama and evacuation-plan image also need source material.','SmallText')
p('The Greendale incident-response file has been withdrawn from the staff library pending an authorised Bagwan copy. Five archived policies show version 001 and need a policy owner to supply current identifiers.','SmallText')
story.append(PageBreak())
p('Checks and next steps','ReportTitle')
h('Review coverage')
p('All 103 existing pages were reviewed at desktop and phone sizes, with inventories and screenshots. All 103 published GitHub pages loaded. Of 90 WordPress source URLs, three returned 404. Nine external URLs were also broken in the WordPress content; verified replacements are included in 3.0 and the local repair set.')
p('Ten departmental charts overflowed on phones and have been repaired locally. Existing keyboard and clinical form journeys passed 93 checks. The first blue 3.0 review build passed 55 journey checks. All 103 blue content views received an automated accessibility and layout pass. Two nested resource-frame width issues found in that pass were corrected.')
h('What the team workbook changed')
p('Department breadcrumbs now lead back to the team that staff came from. News links lead to their named resources. Nursing staff can find forms from the document library. A guided hospital orientation, a fictional interpreter-request case, and liaison and Allied health guides are ready for review.')
p('Corrected Word editions and previews address broken references, review comments and page numbering. The WorkSafe office guide uses the publisher’s updated edition.')
h('Checks that still require people')
p('The automated checks do not establish clinical approval, full WCAG conformance or complete video playback. Screen-reader testing, Safari and Firefox, physical devices and downloaded-document accessibility require follow-up. Two reference sites, one archived video and the NAATI directory also require manual availability checks.')
h('Suggested review sequence')
item('1 Review the content','SME and SLD approve, revise or reject the ten drafts, including cultural appropriateness and the new activity answer keys. Confirm the source policies and local procedures before use.')
item('2 Agree the learning use','Review the proposed reception role, two-sentence handover, clarifying question and debrief against your intended cohort and unit.')
item('3 Observe realistic tasks','Ask representative learners to find a policy, colleague, form and record, then explain their reasoning. Use the results to refine the interface and guide.')
p('<link href="https://cove-lx-team.github.io/Bagwan2.0/3.0/critical-review.html" color="#000054">Full critical review and every-page register</link><br/><link href="https://cove-lx-team.github.io/Bagwan2.0/3.0/review-register.html" color="#000054">Content review register</link><br/><link href="https://cove-lx-team.github.io/Bagwan2.0/3.0/review-register.html#reporting-lines" color="#000054">Reporting lines and appointments for SME review</link>','SmallText')

def footer(canvas,doc):
    canvas.setFont('ReportArial',8);canvas.setFillColor(colors.HexColor('#626679'));canvas.drawString(54,27,'Bagwan 3.0 refresh review  |  20 November 2026');canvas.drawRightString(A4[0]-54,27,str(doc.page))
doc=SimpleDocTemplate(str(OUT),pagesize=A4,rightMargin=54,leftMargin=54,topMargin=45,bottomMargin=44,title='Bagwan 3.0 What we changed',author='Bagwan project review')
doc.build(story,onFirstPage=footer,onLaterPages=footer)
print(OUT)
