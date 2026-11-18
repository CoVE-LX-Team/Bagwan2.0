"""Repair recoverable content/navigation gaps without inventing clinical material."""
from urllib.parse import quote, urlsplit
from bs4 import BeautifulSoup, NavigableString
from repair_responsive import repair_responsive_markup
from repair_accessibility import repair_accessibility_markup
from repair_clinical import repair_clinical_markup
import html
import json
import re


def responsive_org_chart(soup):
    chart = soup.select_one('ol.static-org-chart')
    if chart is None:
        return
    # The source's fixed 250px cards and nowrap branches exceed the content column.
    for style in soup.find_all('style'):
        if 'ol.static-org-chart' in str(style.string or ''):
            style.decompose()
    chart['class'] = list(chart.get('class', [])) + ['responsive-org-chart']
    chart['role'] = 'list'
    chart['aria-label'] = 'Hospital reporting structure'
    root = chart.find('li', recursive=False)
    label = soup.new_tag('p', attrs={'class': 'org-reports-label'})
    label.string = 'Reporting to the Chief Executive Officer'
    root.select_one('#first').insert_before(label)
    for identifier, title in [('first', 'Departments'), ('second', 'Executive leadership')]:
        branch = root.find('ol', id=identifier)
        branch['role'] = 'list'
        heading_id = 'org-' + identifier + '-heading'
        section = soup.new_tag('section', attrs={'class': 'org-chart-group', 'aria-labelledby': heading_id})
        branch.wrap(section)
        heading = soup.new_tag('h2', id=heading_id)
        heading.string = title
        section.insert(0, heading)
    for item in root.select('#first > li'):
        card = item.select_one('.card')
        if card and not card.find('a'):
            card['class'] = list(card.get('class', [])) + ['org-department-unlinked']
    for item in root.select('#second > li'):
        for block in item.find_all('div', recursive=False)[1:]:
            block['class'] = list(block.get('class', [])) + ['org-team-link']


def repair_site(root, base, files, folders):
    report = {'reviewed_on': '2026-11-18', 'fixed': [], 'unresolved': []}
    esc = html.escape
    link = lambda path: base + quote(path, safe='/@()+,-._~#')
    def read(path): return BeautifulSoup((root / path).read_text(), 'lxml')
    def save(path, soup):
        (root / path).parent.mkdir(parents=True, exist_ok=True)
        (root / path).write_text('<!DOCTYPE html>\n' + '\n'.join(line.rstrip() for line in str(soup.html).splitlines()) + '\n')
    def fragment(markup): return BeautifulSoup('<div>' + markup + '</div>', 'lxml').div
    def set_content(soup, markup):
        heading = soup.find('h1')
        container = heading.parent
        for child in list(container.children):
            if getattr(child, 'name', None) not in ('h1',) and 'heading-underline' not in getattr(child, 'attrs', {}).get('class', []):
                child.extract()
        container.append(fragment(markup))
    def create(path, title, markup):
        soup = read('scorm/intranet/index.html')
        soup.title.string = title + ' · Bagwan Health'
        soup.h1.string = title
        set_content(soup, markup)
        save(path, soup)
    def anchor(path, label): return '<a href="' + link(path) + '">' + esc(label) + '</a>'
    def links(items): return '<ul class="resource-links">' + ''.join('<li>' + anchor(p, t) + '</li>' for p, t in items) + '</ul>'

    # Fill indexes with existing destinations, never with invented policy text.
    departments = [
        ('hr-services', 'Human resources', 'Staff services, policies and forms.'),
        ('lab-technologies', 'Laboratory technologies', 'Laboratory resources and activities.'),
        ('nursing', 'Nursing', 'Nursing resources and patient forms.'),
        ('interpreting-office', 'Interpreting services', 'Interpreter bookings and professional development.'),
        ('logisitics', 'Logistics', 'Logistics documents and resources.'),
    ]
    soup = read('scorm/department-pages/index.html')
    set_content(soup, '<p>Choose a department.</p><ul class="department-index">' + ''.join('<li>' + anchor('scorm/department-pages/' + slug + '/index.html', title) + '<p>' + text + '</p></li>' for slug, title, text in departments) + '</ul>')
    save('scorm/department-pages/index.html', soup)
    report['fixed'].append('Departments index now links to all five existing department pages.')

    # WordPress paragraph insertion left the dashboard's card links empty.
    soup = read('patient-management-system/index.html')
    dashboard = soup.select_one('.entry-content')
    dashboard['class'] = list(dashboard.get('class', [])) + ['patient-dashboard']
    for card in dashboard.select('.card-deck > .card'):
        destination, heading = card.find('a', href=True), card.select_one('.card-title')
        if destination is None or heading is None:
            continue
        href, title = destination['href'], heading.get_text(' ', strip=True)
        card.clear()
        destination = soup.new_tag('a', href=href, attrs={'class': 'card-body patient-card-link'})
        heading = soup.new_tag('h3', attrs={'class': 'card-title'})
        heading.string = title
        destination.append(heading)
        action = soup.new_tag('span', attrs={'class': 'patient-card-action'})
        action.string = 'Open messageboard' if '/messageboard/' in href else 'View patients' if '/patient-database/' in href else 'Open form'
        destination.append(action)
        card.append(destination)
    title = soup.select_one('body > .row > .container > span')
    if title:
        title.name = 'h1'
        title['class'] = ['patient-system-title']
        title.attrs.pop('style', None)
    save('patient-management-system/index.html', soup)
    report['fixed'].append('All seven patient-management dashboard cards have named, full-card links to their actual forms, messageboard and patient list.')

    aliases = {
        'scorm/report-an-incident/index.html': 'scorm/quick-link-pages/incident-reporting/index.html',
        'scorm/quick-link-pages/patient-records/index.html': 'patient-management-system/patient-database/index.html',
        'patient-management-system/personalcare/patientrecord/index.html': 'patient-management-system/patient-database/index.html',
        'scorm/quick-link-pages/9-2/index.html': 'scorm/intranet/static-org-chart-test/index.html',
    }
    for path, destination in aliases.items():
        soup = read(path)
        if soup.h1 is None:
            create(path, 'Patient database', '<p>' + anchor(destination, 'Open patient database') + '</p>')
            soup = read(path)
        set_content(soup, '<p>' + anchor(destination, 'Continue to ' + ('the organisation chart' if '9-2' in path else 'the incident report' if 'incident' in path else 'the patient database')) + '</p>')
        soup.head.append(soup.new_tag('meta', attrs={'http-equiv': 'refresh', 'content': '0;url=' + link(destination)}))
        save(path, soup)
    report['fixed'].append('Empty incident/patient-record pages and the placeholder organisation chart now lead to working pages.')

    # Recover staff names and roles from the published organisation charts.
    groups = [
        ('PeopleandCulture', 'People and Culture', 'scorm/static-org-chart-test/people-and-culture-hr-organisation-chart/index.html'),
        ('Administration', 'Administration', 'scorm/static-org-chart-test/administration-organisation-chart/index.html'),
        ('Laboratory', 'Laboratory technologies', 'scorm/static-org-chart-test/lab-technology-department-organisation-chart/index.html'),
        ('Interpretingdepartment', 'Interpreting department', 'scorm/static-org-chart-test/interpreting-department-organisation-chart/index.html'),
        ('ITservices', 'IT services', 'scorm/static-org-chart-test/it-services-organisation-chart/index.html'),
        ('Finance', 'Finance', 'scorm/static-org-chart-test/finance-organisation-chart/index.html'),
        ('Logistics', 'Logistics and emergency preparedness', 'scorm/static-org-chart-test/logistics-and-emergency-preparedness-organisation-chart/index.html'),
        ('Emergency', 'Emergency department', 'scorm/org-chart-updated/emergency-organisation-chart/index.html'),
    ]
    records = []
    directory = []
    for key, title, source in groups:
        source_soup = read(source)
        people = []
        head = source_soup.select_one('.level0')
        if head and head.find('h2'):
            name = ' '.join(str(x).strip() for x in head.contents if isinstance(x, NavigableString)).strip()
            if name: people.append((name, head.find('h2').get_text(' ', strip=True)))
        for card in source_soup.select('.ripple-card'):
            name, role = card.select_one('.org_name'), card.select_one('.org_title')
            if name and role and name.get_text(strip=True):
                people.append((name.get_text(' ', strip=True), role.get_text(' ', strip=True)))
        people = list(dict.fromkeys(people))
        for name, role in people: records.append({'name': name, 'role': role, 'department': title, 'source_page': source})
        rows = ''.join('<tr><td>' + esc(name) + '</td><td>' + esc(role) + '</td></tr>' for name, role in people)
        directory.append('<section id="' + key + '"><h2>' + esc(title) + '</h2><p>' + anchor(source, 'View organisation chart') + '</p><div class="table-responsive"><table class="table"><thead><tr><th>Name</th><th>Role</th></tr></thead><tbody>' + rows + '</tbody></table></div></section>')
    directory.extend([
        '<section id="NursingUnits"><h2>Nursing units</h2><p>No nursing staff list was supplied with the source site.</p>' + links([('scorm/department-pages/nursing/index.html', 'Nursing department'), ('patient-management-system/index.html', 'Patient management forms')]) + '</section>',
        '<section id="ATSI"><h2>Aboriginal and Torres Strait Islander liaison services</h2><p>A standalone liaison staff list was not included in the supplied materials.</p>' + links([('aboriginal-and-torres-strait-islander-liaison-office/index.html', 'Liaison services')]) + '</section>',
    ])
    nav = '<nav class="directory-jump" aria-label="Staff departments">' + ' '.join('<a href="#' + k + '">' + esc(t) + '</a>' for k, t, _ in groups) + ' <a href="#NursingUnits">Nursing units</a> <a href="#ATSI">ATSI liaison services</a></nav>'
    soup = read('scorm/intranet/staff-directory-2/index.html')
    set_content(soup, '<p>Staff names and roles from the Bagwan Health organisation charts.</p><label for="staff-search">Find a staff member or role</label><input id="staff-search" type="search" placeholder="Search names, roles and departments"><p id="staff-results" role="status"></p>' + nav + ''.join(directory))
    save('scorm/intranet/staff-directory-2/index.html', soup)
    (root / 'data').mkdir(exist_ok=True)
    (root / 'data/staff-directory.json').write_text(json.dumps(records, indent=2, ensure_ascii=False) + '\n')
    report['fixed'].append(f'Replaced broken staff-list plugin shortcodes with {len(records)} source-backed staff/role entries and department navigation.')
    report['unresolved'].append('The original nursing and standalone ATSI staff lists were not provided; no staff or contact details were invented.')

    create('aboriginal-and-torres-strait-islander-liaison-office/index.html', 'Aboriginal and Torres Strait Islander liaison services', '<p>Bagwan Health includes Aboriginal and Torres Strait Islander liaison services.</p><p>A dedicated staff list and departmental resource pack were not included in the supplied site.</p>' + links([('scorm/intranet/our-community/index.html', 'Our community and hospital values'), ('scorm/intranet/staff-directory-2/index.html#ATSI', 'Staff directory'), ('scorm/intranet/resources/index.html', 'Available learning resources')]))
    create('scorm/static-org-chart-test/nursing-department-organisation-chart/cardiac-department/index.html', 'Nursing department', '<p>The nursing organisation chart was unavailable in the source site.</p>' + links([('scorm/department-pages/nursing/index.html', 'Nursing department resources'), ('scorm/intranet/staff-directory-2/index.html#NursingUnits', 'Nursing staff information'), ('scorm/intranet/static-org-chart-test/index.html', 'Hospital organisation chart')]))

    # Keep only real document destinations in departmental document sections.
    soup = read('scorm/intranet/staff-repository/index.html')
    resource_map = {
        'Laboratory technologies': 'library/1Y80CJdcwtupHmBaDb4x-lB0POf6qOn4r/index.html',
        'Nursing': 'resources-and-tools/nursing/index.html',
        'Interpreting services': 'resources-and-tools/interpreting-services/index.html',
        'ATSI liaison services': 'aboriginal-and-torres-strait-islander-liaison-office/index.html',
        'Allied health': 'documents/index.html',
    }
    for heading in soup.select('h4'):
        label = heading.get_text(' ', strip=True)
        if label in resource_map:
            heading.clear(); heading.append(fragment(anchor(resource_map[label], label)).a.extract())
    save('scorm/intranet/staff-repository/index.html', soup)
    report['fixed'].append('Departmental document headings now lead to the available local documents and resources.')

    # Doctor profile dialogs use only the contact details already on their cards.
    soup = read('scorm/intranet/doctors-on-call/index.html')
    for index, button in enumerate(soup.find_all('a', string=lambda s: s and s.strip() == 'View profile')):
        card = button.find_parent(class_='card-body')
        values = [p.get_text(' ', strip=True) for p in card.find_all('p', recursive=False)]
        name, phone, email = values[:3]
        identifier = 'doctor-profile-' + str(index + 1)
        button.name = 'button';button.attrs.pop('href', None);button.attrs.pop('role', None)
        button['type'] = 'button';button['data-profile-dialog'] = identifier
        button['aria-haspopup'] = 'dialog';button['aria-controls'] = identifier
        for paragraph in card.find_all('p', recursive=False):
            value = paragraph.get_text(' ', strip=True)
            if value in (phone, email):
                paragraph.clear();paragraph.append(fragment('<a href="' + ('mailto:' + esc(email) if value == email else 'tel:' + re.sub(r'[^+0-9]', '', phone)) + '">' + esc(value) + '</a>').a.extract())
        image = card.parent.find('img')
        if image: image['alt'] = name
        dialog = fragment('<dialog class="doctor-profile" id="' + identifier + '" aria-labelledby="' + identifier + '-title"><h2 id="' + identifier + '-title">' + esc(name) + '</h2><p>On-call contact</p><dl><dt>Phone</dt><dd><a href="tel:' + re.sub(r'[^+0-9]', '', phone) + '">' + esc(phone) + '</a></dd><dt>Email</dt><dd><a href="mailto:' + esc(email) + '">' + esc(email) + '</a></dd></dl><form method="dialog"><button class="btn btn-primary">Close profile</button></form></dialog>').dialog
        soup.body.append(dialog.extract())
    save('scorm/intranet/doctors-on-call/index.html', soup)
    report['fixed'].append('All four doctor profile buttons now open accessible dialogs containing the supplied contact information.')

    soup = read('scorm/intranet/our-community/index.html')
    for a in soup.select('a[href="#"]'):
        label = a.get_text(' ', strip=True)
        if 'equal opportunity policy' in label.lower(): a['href'] = link('scorm/quick-link-pages/policy-and-procedures/equal-opportunity-and-anti-discrimination/index.html')
        elif 'cultural diversity' in label.lower(): a['href'] = link('scorm/intranet/news-feed/free-cultural-awareness-training/index.html')
        if a['href'] != '#': a.attrs.pop('role', None)
    for h in soup.find_all('h1')[1:]:
        h.name = 'h2';h['class'] = list(h.get('class', [])) + ['h1']
    save('scorm/intranet/our-community/index.html', soup)
    report['fixed'].append('Community policy/training buttons now link to actual local pages; extra H1 headings were corrected.')

    # Explicitly mark policy gaps instead of rendering blank policy screens.
    for slug, title in [('medication-safety', 'Medication safety'), ('nursing-and-clinical-handover', 'Nursing and clinical handover'), ('specimen-collection', 'Specimen collection and storage')]:
        path = 'scorm/quick-link-pages/policy-and-procedures/' + slug + '/index.html'
        soup = read(path)
        article = soup.h1.parent.select_one('article')
        if article:
            if slug == 'specimen-collection':
                article.append(fragment('<p>Download the supplied specimen storage and collection policy.</p>' + links([(files['1_3pKYY40SEplOSbYKPkpQFPR37XohpV8']['local_path'], 'Specimen storage and collection policy (Word document)')])))
            else:
                article.clear()
                article.append(fragment('<p class="static-site-notice">No policy document was included in the supplied materials for this page. Ask your course facilitator for the current policy.</p>' + links([('documents/index.html', 'Available documents'), ('scorm/department-pages/nursing/index.html', 'Nursing resources')])))
                report['unresolved'].append(title + ': no source policy text or document was supplied.')
        save(path, soup)

    # Preserve every supplied YouTube embed; playback remains on YouTube.
    videos = []
    for path in sorted(root.rglob('*.html')):
        if any(p in path.parts for p in ('.git', '.playwright-cli', 'output', 'node_modules')): continue
        relative = path.relative_to(root).as_posix()
        if relative == 'videos/index.html': continue
        soup = read(relative)
        for frame in soup.select('iframe.youtube-video'):
            match = re.search(r'/embed/([A-Za-z0-9_-]{11})', frame.get('src', ''))
            if not match: continue
            identifier = match.group(1)
            panel = frame.find_parent(id=re.compile(r'^collapse\d+$'))
            label = 'Interpreting scenario — step ' + panel['id'].removeprefix('collapse') if panel else 'Welcome to Bagwan Health' if 'our-community' in relative else 'Update from the CEO'
            frame['title'] = label;frame['referrerpolicy'] = 'strict-origin-when-cross-origin'
            fallback = fragment('<p class="video-fallback"><a href="https://www.youtube.com/watch?v=' + identifier + '" target="_blank" rel="noopener">Watch ' + esc(label) + ' on YouTube</a></p>').p.extract()
            wrapper = frame.parent
            if 'padding-bottom' in wrapper.get('style', '') or 'embed-responsive' in wrapper.get('class', []): wrapper.insert_after(fallback)
            else: frame.insert_after(fallback)
            videos.append({'youtube_id': identifier, 'title': label, 'source_page': relative})
        for a in soup.select('#BranchingScenario a[data-target]'):
            target = a['data-target'].strip();a['href'] = target;a['aria-controls'] = target.lstrip('#')
            for key in list(a.attrs):
                if not re.match(r'^[a-zA-Z_:][a-zA-Z0-9_.:-]*$', key):del a.attrs[key]
        save(relative, soup)
    (root / 'data/videos.json').write_text(json.dumps(videos, indent=2, ensure_ascii=False) + '\n')
    video_cards = ''.join('<li><h2>' + esc(v['title']) + '</h2><iframe class="youtube-video" loading="lazy" title="' + esc(v['title']) + '" src="https://www.youtube.com/embed/' + v['youtube_id'] + '?rel=0" allow="encrypted-media; picture-in-picture; web-share" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe><p>' + anchor(v['source_page'], 'Open the original learning page') + '</p><a target="_blank" rel="noopener" href="https://www.youtube.com/watch?v=' + v['youtube_id'] + '">Watch on YouTube</a></li>' for v in videos)
    create('videos/index.html', 'Video resources', '<p>Bagwan Health videos. Playback is provided by YouTube.</p><ul class="video-library">' + video_cards + '</ul>')
    report['fixed'].append(f'Restored all {len(videos)} original YouTube embeds, responsive players, watch-on-YouTube links and a video resource index.')
    report['unresolved'].append('HR and ATSI galleries are skipped for now: public live/development pages, the public WordPress API and Wayback lookups did not recover their intended video URLs.')
    for relative in ['scorm/department-pages/hr-services/index.html', 'scorm/intranet/resources/index.html']:
        soup = read(relative)
        headings = [x for x in soup.find_all(['h2','h3','h4']) if 'video' in x.get_text().lower()]
        note = fragment('<p class="static-site-notice">The original departmental video playlist is unavailable. Ask your course facilitator for its link. ' + anchor('videos/index.html', 'Browse available Bagwan videos') + '.</p>')
        if headings: headings[0].insert_after(note)
        elif soup.h1: soup.h1.insert_after(note)
        save(relative, soup)

    # Repair navigation labels and construct working breadcrumb links for each page.
    titles = {}
    paths = [p for p in root.rglob('*.html') if not any(x in p.parts for x in ('.git','.playwright-cli','output','node_modules'))]
    for path in paths:
        soup = read(path.relative_to(root).as_posix())
        if soup.h1: titles[path.relative_to(root).as_posix()] = soup.h1.get_text(' ', strip=True).replace('Emergency repsonse', 'Emergency response')
    for path in paths:
        relative = path.relative_to(root).as_posix();soup = read(relative)
        responsive_org_chart(soup)
        repair_responsive_markup(soup)
        repair_accessibility_markup(soup)
        repair_clinical_markup(soup)
        for navigation in soup.select('#bottom_navigation'):
            navigation.decompose()
        for navigation in soup.select('#next-prev'):
            navigation.decompose()
        page_titles = soup.find_all('title')
        if len(page_titles) > 1:
            page_titles[0].string = page_titles[-1].get_text()
            for duplicate in page_titles[1:]: duplicate.decompose()
        for image in soup.select('img[alt="..."]'):
            card = image.find_parent(class_='card')
            heading = card.find(['h2','h3','h4','h5']) if card else None
            image['alt'] = heading.get_text(' ',strip=True) if heading else ''
        if '/policy-and-procedures/' in relative or relative.startswith('patient-management-system/'):
            for table in soup.select('table'):
                if table.find_parent('table') or table.find_parent(class_='table-responsive'): continue
                wrapper=soup.new_tag('div',attrs={'class':'table-responsive static-table-scroll','tabindex':'0','aria-label':'Scrollable table'})
                table.wrap(wrapper)
        for text in list(soup.find_all(string=True)):
            if text.parent.name not in ('script','style'):
                changed = str(text).replace('Emergency repsonse','Emergency response').replace('ATSI lesion office','ATSI liaison office').replace('Dr. Chirstina Jones','Dr. Christina Jones').replace('Bagwan Aged Care Facility','Bagwan Health')
                if changed != text:text.replace_with(changed)
        for group in soup.select('#cssmenu li.has-sub'):
            parent = group.find('a', recursive=False);menu = group.find('ul', recursive=False)
            if parent and menu:
                label = parent.get_text(' ',strip=True)
                parent['aria-expanded']='false';parent['role']='button';parent['tabindex']='0'
                if label in ('Departments','Virtual tour'):
                    target = 'scorm/department-pages/index.html' if label=='Departments' else 'scorm/virtual-hospital/index.html'
                    item=soup.new_tag('li');a=soup.new_tag('a',href=link(target));a.string='All departments' if label=='Departments' else 'Tour overview';item.append(a);menu.insert(0,item)
        breadcrumb = soup.select_one('#breadcrumbs')
        if breadcrumb:
            if relative in ('index.html','scorm/intranet/index.html'):
                breadcrumb.decompose()
            else:
                parents=[]
                parts=relative.split('/')
                if relative.startswith('scorm/department-pages/') and len(parts)>3:parents.append(('scorm/department-pages/index.html','Departments'))
                if '/news-feed/' in relative and relative!='scorm/intranet/news-feed/index.html':parents.append(('scorm/intranet/news-feed/index.html','News feed'))
                if '/policy-and-procedures/' in relative and relative!='scorm/quick-link-pages/policy-and-procedures/index.html':parents.append(('scorm/quick-link-pages/policy-and-procedures/index.html','Policies and procedures'))
                if '/static-org-chart-test/' in relative and relative!='scorm/intranet/static-org-chart-test/index.html':parents.append(('scorm/intranet/static-org-chart-test/index.html','Organisation chart'))
                if '/virtual-hospital/' in relative and relative!='scorm/virtual-hospital/index.html':parents.append(('scorm/virtual-hospital/index.html','Virtual tour'))
                if relative.startswith('scorm/department-pages/') and len(parts)>4:
                    parent='/'.join(parts[:3])+'/index.html'
                    if parent in titles:parents.append((parent,titles[parent]))
                current=titles.get(relative,'Current page')
                breadcrumb.name='nav';breadcrumb['aria-label']='Breadcrumb';breadcrumb.attrs.pop('data-intro',None);breadcrumb.clear()
                ul=soup.new_tag('ul',attrs={'class':'thin-text'})
                for dest,label in [('index.html','Home'),*parents]:
                    li=soup.new_tag('li');a=soup.new_tag('a',href=link(dest));a.string=label;li.append(a);ul.append(li)
                li=soup.new_tag('li',attrs={'aria-current':'page'});li.string=current;ul.append(li);breadcrumb.append(ul)
        toggle=soup.select_one('#showRightPush')
        if toggle:toggle['aria-label']='Toggle navigation';toggle['title']='Toggle navigation';toggle['aria-controls']='sidebar';toggle['tabindex']='0';toggle['role']='button'
        fullscreen=soup.select_one('a.full-screen')
        if fullscreen:fullscreen['aria-label']='Enter fullscreen';fullscreen['title']='Enter fullscreen'
        duplicate_fullscreen=soup.select_one('div#fullscreen')
        if duplicate_fullscreen:duplicate_fullscreen['id']='fullscreen-control'
        for button in soup.select('a[onclick]'):
            action = button['onclick']
            if action == 'route()':
                button.name='button';button['type']='button';button.attrs.pop('onclick',None);button['data-message-proceed']=''
            elif re.fullmatch(r'checkInput\w*\(\)', action):
                button.name='button';button['type']='button';button.attrs.pop('onclick',None);button['data-print-form']='';button.string='Print / save PDF'
        if relative.startswith('patient-management-system/') and soup.body:
            soup.body['class'] = list(soup.body.get('class', [])) + ['patient-system']
            for text in list(soup.find_all(string=True)):
                if str(text).lstrip().startswith('<footer class='):
                    footer = BeautifulSoup(str(text).strip(), 'lxml').find('footer')
                    if footer:
                        for a in footer.select('a[href^="emailto:"]'): a['href'] = a['href'].replace('emailto:', 'mailto:', 1)
                        text.replace_with(footer.extract())
            for i in (1, 2):
                checkbox = soup.find(id='customCheck' + str(i))
                if checkbox: checkbox['aria-label'] = 'Mark message ' + str(i) + ' as read'
            modal = soup.find(id='messageModal')
            if modal: modal['aria-labelledby'] = 'messageModalLabel'
            for row in soup.select('tr.accordion-toggle'):
                cells = row.find_all('td',recursive=False)
                if len(cells) > 2:
                    label = cells[2].get_text(' ',strip=True)
                    cells[2].clear();button=soup.new_tag('button',attrs={'type':'button','class':'message-open','aria-controls':row['data-target'].lstrip('#')});button.string=label;cells[2].append(button)
            for image in soup.select('img[alt="Bagwan Aged Care Facility"]'): image['alt'] = 'Bagwan Health'
            back=fragment('<nav class="patient-navigation" aria-label="Patient system navigation">' + anchor('index.html','Staff intranet') + ' · ' + anchor('patient-management-system/index.html','Patient management system') + ' · ' + anchor('patient-management-system/patient-database/index.html','Patient database') + '</nav>')
            soup.body.insert(0,back)
        save(relative,soup)
    report['fixed'].append('Linked breadcrumbs, removed duplicate home breadcrumbs, corrected labels and added persistent patient-system navigation.')
    report['fixed'].append('Removed the Next page / Previous page footer navigation from news articles.')
    report['fixed'].append('Hospital organisation charts reflow into readable department and executive grids at phone, tablet and desktop widths, preserving all source names, roles and links.')
    report['fixed'].append('Interpreting scenario buttons now have real section targets for every step.')
    report['fixed'].append('Wide policy and patient-form tables scroll within the page; PDF controls support printing partially completed forms and the messageboard proceeds to the local patient database.')
    report['unresolved'].append('Clinical policy accuracy, outdated legal references and review comments inside the supplied documents require a content-owner review; original document bytes are preserved.')
    report['staff_entries'] = len(records)
    report['youtube_embeds'] = len(videos)
    return report
