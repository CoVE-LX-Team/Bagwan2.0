"""Build corrected 3.0 downloads without changing the archived 2.0 files.

Run before build_v3.py after editing the rules below. Requires python-docx,
lxml, LibreOffice and Poppler. The only external input is the committed WorkSafe
handbook, downloaded from PUBLISHER_PDF and verified by its SHA-256.
"""
from hashlib import sha256
from io import BytesIO
from pathlib import Path
from tempfile import TemporaryDirectory
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED
import json
import re
import subprocess

from docx import Document
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.opc.constants import RELATIONSHIP_TYPE
from docx.shared import Cm, Pt
from lxml import etree as ET

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / '3.0/document-editions'
W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
NS = {'w': W, 'r': R}
DATE = '2026-11-20T00:00:00.000Z'
PUBLISHER = 'https://www.worksafe.vic.gov.au/resources/office-health-and-safety-pdf-version'
PUBLISHER_PDF = 'https://content-v2.api.worksafe.vic.gov.au/sites/default/files/2024-12/Office-health-and-safety-guide-for-employers-2024-12.pdf'
OFFICE_DIGEST = '161cd6aca7ae55bd2f04dc467e2fb0a7686ae0934b5088f246f395dd8f27f0e7'
ACT = 'https://www.legislation.vic.gov.au/in-force/acts/freedom-information-act-1982'
ARCHIVE_NAP = 'https://www.naa.gov.au/information-management/disposing-information/normal-administrative-practice-nap'
HUMAN_RIGHTS = 'https://www.humanrights.vic.gov.au/get-help/contact-us/'
WORKSAFE = 'https://www.worksafe.vic.gov.au/contact-worksafe'
FAIR_WORK = 'https://www.fwc.gov.au/about-us/contact-us/if-you-still-need-help'
CONTACT_TEXT = 'For advice or assistance, speak with a team leader, coordinator, program manager or senior manager. An occupational health and safety committee member or union representative can also assist.'
EXTERNAL_CONTACTS = [('Victorian Equal Opportunity and Human Rights Commission', HUMAN_RIGHTS), ('WorkSafe Victoria', WORKSAFE), ('Fair Work Commission', FAIR_WORK)]
LINKS = {
    'http://www.austlii.edu.au/au/legis/vic/consol_act/': (ACT, 'Freedom of Information Act 1982 (Victoria)'),
    'http://www.naa.gov.au/information-management/managing-information-and-records/disposal/compliant/NAP/guidelines-developing-NAP.aspx': (ARCHIVE_NAP, 'National Archives guidance on normal administrative practice (NAP).'),
    'https://dhhs.vic.gov.au/publications/privacy-policy': ('https://www.health.vic.gov.au/department-of-health-privacy-policy', 'Victorian Department of Health privacy policy'),
    'https://www.oaic.gov.au/privacy-law/privacy-act/notifiable-data-breaches-scheme': ('https://www.oaic.gov.au/privacy/notifiable-data-breaches/about-the-notifiable-data-breaches-scheme', 'About the Notifiable Data Breaches scheme (OAIC)'),
    'http://ausit.org/AUSIT/About/Ethics___Conduct/Code_of_Ethics/AUSIT/About/Code_of_Ethics.aspx': ('https://ausit.org/code-of-ethics-and-code-of-conduct/', 'AUSIT Code of Ethics and Code of Conduct'),
    'https://www.worksafe.vic.gov.au/healthcare-and-hospitals': ('https://www.worksafe.vic.gov.au/healthcare-and-hospitals-safety-basics', 'Healthcare and hospitals safety basics (WorkSafe Victoria)'),
    'http://www.humanrightscommission.vic.gov.au/index.php/about-us/': (HUMAN_RIGHTS, 'Victorian Equal Opportunity and Human Rights Commission'),
}
WITHHELD = {
    'Bagwan Health - Emergency Incident Response, Management & Reporting, V1.0.docx',
    'Bagwan Health - Language Services V1.0 (Google Doc export).docx',
}
SLUGS = {
    'Bagwan Health - Risk Management V1.0.docx': 'risk-management',
    'Bagwan Health - Privacy - v1.0.docx': 'privacy',
    'Bagwan Health - OHS Workstation Self-Assessment Checklist - 20191217.docx': 'workstation-self-assessment',
    'Bagwan Health - OHS V1.0.docx': 'occupational-health-and-safety',
    'Bagwan Health - Incident Management - V1.0.docx': 'incident-management',
    'Bagwan Health - Equal Opportunity - V1.0.docx': 'equal-opportunity',
    'Bagwan Health - Personal Leave - V1.0.docx': 'personal-leave',
    'Bagwan Health - Freedom of Information V1.0.docx': 'freedom-of-information',
    'Bagwan Health - Bullying and Harassment, V1.0.docx': 'bullying-and-harassment',
    'Bagwan Health - Language Services V1.0.docx': 'language-services',
    'Bagwan Health disposal of records NAP.docx': 'disposal-of-records',
    'Bagwan Health recordkeeping related legislative summaries.docx': 'recordkeeping-reference-guide',
}
REFERENCE = 'Recordkeeping reference guide'
INCIDENT_SECTIONS = [
    ('Respond to the incident', 'Address immediate risks to the people involved. Let the team leader or manager know what happened and what support is needed.'),
    ('Make an internal report', 'The staff member who witnessed the incident completes the report. If nobody witnessed it, the staff member who received the account completes it. Describe what happened in sequence. Distinguish what you observed from what someone told you. Record the action already taken.'),
    ('Manager follow-up', 'Check the report for accuracy and arrange support for the people involved. Assess the incident, coordinate any investigation, record the findings and assign follow-up actions.'),
    ('Use the findings', 'Review how the incident was managed and what contributed to it. Monitor recurring incidents and use the findings to reduce the risk of future harm.'),
]
DISPOSAL = 'Records disposal reference'
GAPS = {
    'workstation-self-assessment': {
        'Frequent short pauses (microbreaks)': 'Vary tasks and postures throughout the working day. Take regular movement breaks from sustained computer work.',
    },
    'occupational-health-and-safety': {
        'Bagwan Health follows legislated best practice standards': 'Use these WorkSafe Victoria resources to look up guidance on healthcare and manual handling.',
    },
    'privacy': {
        'Employees leaving Greendale Community': None,
        'DHHS and NDIS privacy breaches/incidents': None,
        'Privacy breaches are reported to the relevant funding body': None,
    },
}
OFFICE = 'ISBN-Officewise-guide-to-health-and-safety-in-the-office-2006-01.pdf'


def child(parent, name, **attrs):
    return ET.SubElement(parent, f'{{{W}}}{name}', {f'{{{W}}}{k}': v for k, v in attrs.items()})


def add_text(parent, value, bold=False, points=None):
    run = child(parent, 'r')
    if bold or points:
        props = child(run, 'rPr')
        if bold:
            child(props, 'b')
        if points:
            child(props, 'sz', val=str(points * 2))
    text = child(run, 't')
    text.set('{http://www.w3.org/XML/1998/namespace}space', 'preserve')
    text.text = value
    return run


def stable_zip(parts):
    stream = BytesIO()
    with ZipFile(stream, 'w') as archive:
        for name in sorted(parts):
            info = ZipInfo(name, (2026, 11, 20, 0, 0, 0))
            info.compress_type = ZIP_DEFLATED
            archive.writestr(info, parts[name])
    return stream.getvalue()


def repair_footer(data, label=None):
    source = ET.fromstring(data)
    old = ''.join(source.xpath('.//w:t/text()', namespaces=NS))
    if 'MERGEFORMAT' not in old:
        return data
    identity = re.split(r'\s+Page\s+PAGE\b', ' '.join(old.split()), maxsplit=1)[0]
    if 'MERGEFORMAT' in identity or 'Version' not in identity:
        raise ValueError(f'Unexpected footer: {identity}')
    source.clear()
    p = child(source, 'p')
    child(child(p, 'pPr'), 'spacing', before='0', after='0')
    add_text(p, (label or identity) + '  |  Page ')
    for field in ['PAGE', 'NUMPAGES']:
        if field == 'NUMPAGES':
            add_text(p, ' of ')
        add_text(child(p, 'fldSimple', instr=field), '1')
    for run in p.xpath('.//w:r', namespaces=NS):
        props = ET.Element(f'{{{W}}}rPr')
        child(props, 'sz', val='16')
        run.insert(0, props)
    return ET.tostring(source, xml_declaration=True, encoding='UTF-8', standalone=True)


def contacts(document, relationships):
    paragraphs = document.xpath('.//w:body/w:p', namespaces=NS)
    start = next(i for i, p in enumerate(paragraphs) if 'following contacts' in ''.join(p.itertext()))
    end = next(i for i, p in enumerate(paragraphs[start:], start) if '1300 799 675' in ''.join(p.itertext()))
    first = paragraphs[start]
    body = first.getparent()
    position = body.index(first)
    for p in paragraphs[start:end + 1]:
        body.remove(p)
    def insert(text, bold=False):
        nonlocal position
        p = ET.Element(f'{{{W}}}p')
        props = child(p, 'pPr')
        if bold:
            child(props, 'keepNext')
        child(props, 'spacing', before='120' if bold else '0', after='45')
        child(props, 'ind', left='851')
        add_text(p, text, bold, points=12)
        body.insert(position, p)
        position += 1
        return p
    insert('Workplace contacts', True)
    insert(CONTACT_TEXT)
    insert('External contacts', True)
    for i, (label, url) in enumerate(EXTERNAL_CONTACTS):
        rel_id = f'rIdReviewContact{i}'
        ET.SubElement(relationships, relationships[0].tag, Id=rel_id, Target=url, TargetMode='External', Type=R + '/hyperlink')
        p = insert('')
        link = child(p, 'hyperlink')
        link.set(f'{{{R}}}id', rel_id)
        run = add_text(link, label)
        props = ET.Element(f'{{{W}}}rPr')
        child(props, 'color', val='184A74')
        child(props, 'sz', val='24')
        child(props, 'u', val='single')
        run.insert(0, props)


def reference_doc(slug):
    doc = Document()
    section = doc.sections[0]
    section.page_width, section.page_height = Cm(21), Cm(29.7)
    section.left_margin = section.right_margin = Cm(2.2)
    section.top_margin = section.bottom_margin = Cm(1.8)
    doc.styles['Normal'].font.size = Pt(11)
    is_disposal = slug == 'disposal-of-records'
    title = DISPOSAL if is_disposal else REFERENCE
    doc.core_properties.title = title
    doc.core_properties.author = 'Bagwan Health project'
    doc.add_heading(title, 0)
    introduction = ('Check the jurisdiction and the relevant authority when identifying a disposal rule for a record.' if is_disposal else 'Use this directory to locate the publisher and jurisdiction of a recordkeeping source. Check the version shown by the publisher before citing it.')
    doc.add_paragraph(introduction)
    groups = [
        ('Victorian records and information access', [
            ('Public Record Office Victoria', 'Recordkeeping standards, policies and authorities', 'https://prov.vic.gov.au/recordkeeping-government/standards-policies-rdas'),
            ('Public Record Office Victoria', 'Storage Standard (PROS 20/02)', 'https://prov.vic.gov.au/recordkeeping-government/document-library/pros-2002-storage-standard'),
            ('Victorian legislation', 'Public Records Act 1973', 'https://www.legislation.vic.gov.au/in-force/acts/public-records-act-1973'),
            ('Victorian legislation', 'Freedom of Information Act 1982', ACT),
        ]),
        ('Commonwealth records and privacy', [
            ('National Archives of Australia', 'Information management legislation', 'https://www.naa.gov.au/information-management/information-management-legislation'),
            ('National Archives of Australia', 'Developing an information management policy', 'https://www.naa.gov.au/information-management/information-governance/establishing-information-governance-framework/developing-information-management-policy'),
            ('National Archives of Australia', 'Normal administrative practice', ARCHIVE_NAP),
            ('Office of the Australian Information Commissioner', 'Notifiable Data Breaches scheme', LINKS['https://www.oaic.gov.au/privacy-law/privacy-act/notifiable-data-breaches-scheme'][0]),
        ]),
    ]
    if is_disposal:
        groups = [
            ('Victorian public records', [
                ('Public Record Office Victoria', 'Recordkeeping standards, policies and retention and disposal authorities', 'https://prov.vic.gov.au/recordkeeping-government/standards-policies-rdas'),
                ('Victorian legislation', 'Public Records Act 1973', 'https://www.legislation.vic.gov.au/in-force/acts/public-records-act-1973'),
            ]),
            ('Commonwealth records', [
                ('National Archives of Australia', 'Normal administrative practice', ARCHIVE_NAP),
            ]),
        ]
    for heading, entries in groups:
        doc.add_heading(heading, 2)
        for publisher, label, url in entries:
            p = doc.add_paragraph()
            p.paragraph_format.space_after = Pt(6)
            p.add_run(publisher + ' — ')
            element = OxmlElement('w:hyperlink')
            element.set(qn('r:id'), p.part.relate_to(url, RELATIONSHIP_TYPE.HYPERLINK, is_external=True))
            run = add_text(element, label)
            props = ET.Element(f'{{{W}}}rPr')
            child(props, 'color', val='184A74')
            child(props, 'u', val='single')
            run.insert(0, props)
            p._p.append(element)
    section.footer.paragraphs[0].text = 'Bagwan Health   |   Records management'
    data = BytesIO()
    doc.save(data)
    with ZipFile(data) as archive:
        return stable_zip({n:archive.read(n) for n in archive.namelist()})


def corrected_word(source, slug):
    if slug in ('disposal-of-records', 'recordkeeping-reference-guide'):
        return reference_doc(slug)
    with ZipFile(source) as archive:
        parts = {name: archive.read(name) for name in archive.namelist()}
    body = ET.fromstring(parts['word/document.xml'])
    rels = ET.fromstring(parts['word/_rels/document.xml.rels'])
    for relationship in rels:
        old = relationship.get('Target')
        if old not in LINKS:
            continue
        url, label = LINKS[old]
        relationship.set('Target', url)
        for link in body.xpath('.//w:hyperlink[@r:id=$id]', namespaces=NS, id=relationship.get('Id')):
            texts = link.xpath('.//w:t', namespaces=NS)
            texts[0].text = label
            for text in texts[1:]:
                text.text = ''
    for p in body.xpath('.//w:p', namespaces=NS):
        text = ''.join(p.xpath('.//w:t/text()', namespaces=NS))
        for marker, replacement in GAPS.get(slug, {}).items():
            if marker in text:
                if replacement is None:
                    p.getparent().remove(p)
                    break
                for node in list(p):
                    if node.tag != f'{{{W}}}pPr':
                        p.remove(node)
                add_text(p, replacement, points=11)
    if slug == 'incident-management':
        # Keep the internal report workflow and remove unverified external deadlines
        # and attributed legal obligations from both the download and staff page.
        document_body = body.find('w:body', NS)
        section = document_body.find('w:sectPr', NS)
        for block in list(document_body):
            if block is not section:
                document_body.remove(block)
        def paragraph(text, style, points):
            p = ET.Element(f'{{{W}}}p')
            props = child(p, 'pPr')
            child(props, 'pStyle', val=style)
            child(props, 'spacing', before='220' if style == 'Heading2' else '100', after='80')
            child(props, 'ind', left='360', right='360')
            child(props, 'jc', val='left')
            add_text(p, text, bold=style != 'Normal', points=points)
            section.addprevious(p)
        paragraph('Incident management', 'Title', 21)
        for heading, text in INCIDENT_SECTIONS:
            paragraph(heading, 'Heading2', 14)
            paragraph(text, 'Normal', 11)
    if slug == 'occupational-health-and-safety':
        for p in body.xpath('w:body/w:p', namespaces=NS):
            t = ''.join(p.xpath('.//w:t/text()', namespaces=NS)).strip()
            if t == '**Or**' or t.startswith('Detailed Occupational Workplace Health and Safety procedures can be referred'):
                p.getparent().remove(p)
        for highlight in body.xpath('.//w:highlight[@w:val="yellow"]', namespaces=NS):
            highlight.getparent().remove(highlight)
        # The last empty paragraph after the appendix table otherwise spills onto a separate page.
        final = body.xpath('w:body/*', namespaces=NS)[-2]
        if final.tag == f'{{{W}}}p' and not ''.join(final.xpath('.//w:t/text()', namespaces=NS)).strip():
            final.clear()
            props = child(final, 'pPr')
            child(props, 'spacing', before='0', after='0', line='20', lineRule='exact')
            child(child(props, 'rPr'), 'sz', val='2')
    if slug == 'bullying-and-harassment':
        # A hard break after a short paragraph stranded it on its own page.
        for p in body.xpath('w:body/w:p', namespaces=NS):
            if ''.join(p.xpath('.//w:t/text()', namespaces=NS)).startswith('Bullying may also be discrimination'):
                after = p.getnext()
                if after is not None and after.xpath('.//w:br[@w:type="page"]', namespaces=NS) and not after.xpath('.//w:t/text()', namespaces=NS):
                    after.getparent().remove(after)
        contacts(body, rels)
    if 'word/comments.xml' in parts:
        for n in list(parts):
            if n.startswith('word/comments'):
                del parts[n]
        types = ET.fromstring(parts['[Content_Types].xml'])
        for item in list(types):
            if '/word/comments' in item.get('PartName', ''):
                types.remove(item)
        parts['[Content_Types].xml'] = ET.tostring(types, encoding='UTF-8', xml_declaration=True)
        for rel in list(rels):
            if '/comments' in rel.get('Type', ''):
                rels.remove(rel)
        for tag in ['commentReference', 'commentRangeStart', 'commentRangeEnd']:
            for node in body.xpath(f'.//w:{tag}', namespaces=NS):
                node.getparent().remove(node)
    parts['word/document.xml'] = ET.tostring(body, xml_declaration=True, encoding='UTF-8', standalone=True)
    parts['word/_rels/document.xml.rels'] = ET.tostring(rels, xml_declaration=True, encoding='UTF-8')
    for name in parts:
        if re.fullmatch(r'word/footer\d+\.xml', name):
            parts[name] = repair_footer(parts[name], 'Bagwan Health — Incident management' if slug == 'incident-management' else None)
    return stable_zip(parts)


def build():
    OUT.mkdir(exist_ok=True)
    manifest = json.loads((ROOT / 'documents/manifest.json').read_text())
    records = {}
    for record in manifest['files']:
        if record['name'] in SLUGS or record['name'] == OFFICE:
            records.setdefault(record['sha256'], record)
    previous = json.loads((OUT / 'catalogue.json').read_text()) if (OUT / 'catalogue.json').exists() else {}
    result = {}
    changed = []
    for digest, record in records.items():
        source = ROOT / record['local_path']
        if sha256(source.read_bytes()).hexdigest() != digest:
            raise ValueError(f'Archive content differs from manifest: {source}')
        name = record['name']
        if name == OFFICE:
            target = OUT / 'office-health-and-safety.pdf'
            if sha256(target.read_bytes()).hexdigest() != OFFICE_DIGEST:
                raise ValueError(f'Restore the verified WorkSafe PDF from {PUBLISHER_PDF}')
            fields = dict(name='Office health and safety — WorkSafe Victoria.pdf', edition_label='WorkSafe Victoria publication', edition_source_url=PUBLISHER, source_modified_at='2024-12-17T00:00:00.000Z')
        else:
            slug = SLUGS[name]
            target = OUT / f'{slug}.docx'
            data = corrected_word(source, slug)
            if not target.exists() or target.read_bytes() != data:
                target.write_bytes(data)
            fields = dict(name={'recordkeeping-reference-guide': REFERENCE + '.docx', 'disposal-of-records': DISPOSAL + '.docx'}.get(slug, name), edition_label='Bagwan Health', source_modified_at=DATE)
        href = target.relative_to(ROOT).as_posix()
        fields.update(local_href=href, size_bytes=target.stat().st_size, edition_sha256=sha256(target.read_bytes()).hexdigest(), preview_href=target.with_suffix('.pdf').relative_to(ROOT).as_posix(), preview_image_href=target.with_suffix('.jpg').relative_to(ROOT).as_posix())
        result[digest] = fields
        if previous.get('editions', {}).get(digest, {}).get('edition_sha256') != fields['edition_sha256'] or any(not (ROOT / fields[k]).is_file() for k in ['preview_href', 'preview_image_href']):
            changed.append(target)
    with TemporaryDirectory() as temp:
        words = [p for p in changed if p.suffix == '.docx']
        if words:
            subprocess.run(['soffice', f'-env:UserInstallation={(Path(temp) / "profile").as_uri()}', '--headless', '--convert-to', 'pdf:writer_pdf_Export', '--outdir', str(OUT), *map(str, words)], check=True, timeout=480)
        for target in changed:
            pdf = target.with_suffix('.pdf')
            subprocess.run(['pdftoppm', '-f', '1', '-l', '1', '-singlefile', '-scale-to', '1100', '-jpeg', str(pdf), str(target.with_suffix(''))], check=True, capture_output=True)
    for fields in result.values():
        info = subprocess.check_output(['pdfinfo', str(ROOT / fields['preview_href'])], text=True)
        fields['preview_pages'] = int(re.search(r'^Pages:\s+(\d+)$', info, re.MULTILINE).group(1))
    (OUT / 'catalogue.json').write_text(json.dumps({'editions': result, 'withheld': sorted(WITHHELD), 'link_replacements': LINKS, 'clause_replacements': GAPS, 'incident_sections': INCIDENT_SECTIONS, 'workplace_contacts': CONTACT_TEXT, 'external_contacts': EXTERNAL_CONTACTS}, ensure_ascii=False, indent=2, sort_keys=True) + '\n')
    print(f'{len(result)} editions available, {len(changed)} previews refreshed.')


if __name__ == '__main__':
    build()
