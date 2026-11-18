"""Accessible semantics for the exported HTML, without changing learning content."""
from pathlib import Path
import hashlib

ROOT = Path(__file__).resolve().parents[1]


def plain(tag):
    return ' '.join(tag.stripped_strings).replace('\xa0', ' ').strip()


def repair_accessibility_markup(soup):
    before = str(soup)
    body = soup.body
    if not body:
        return False
    soup.html['lang'] = soup.html.get('lang') or 'en'
    patient = 'patient-system' in body.get('class', [])
    content = soup.select_one('#content')
    main = soup.find('main')
    if not main:
        candidate = soup.select_one('.patient-system .page') if patient else None
        if not candidate and content:
            heading = content.find('h1')
            candidate = heading.parent if heading else content
        if candidate:
            candidate.name = 'main'
            main = candidate
    if main:
        main['id'] = main.get('id') or 'main-content'
        main['tabindex'] = '-1'
    banner = soup.select_one('#banner')
    if banner:
        banner.name = 'header'
        for link in banner.select('a[href]'):
            if not plain(link):
                link['aria-label'] = 'Bagwan Health staff intranet'
    toggle = soup.select_one('#showRightPush')
    if toggle:
        fullscreen = soup.select_one('#fullscreen-control')
        if fullscreen and banner:
            banner.append(fullscreen.extract())
        for empty in toggle.select('.fscreen'):
            empty.decompose()
        toggle.name = 'button'
        toggle['type'] = 'button'
        toggle.attrs.pop('role', None)
        toggle.attrs.pop('tabindex', None)
    fullscreen = soup.select_one('#fullscreen')
    if fullscreen:
        fullscreen.name = 'button'
        fullscreen['type'] = 'button'
        fullscreen['aria-pressed'] = 'false'
        for attr in ['href', 'onclick', 'role']:
            fullscreen.attrs.pop(attr, None)
    for i, group in enumerate(soup.select('#cssmenu li.has-sub'), 1):
        control = group.find(['a', 'button'], recursive=False)
        submenu = group.find('ul', recursive=False)
        if not control or not submenu:
            continue
        submenu['id'] = submenu.get('id') or f'navigation-section-{i}'
        submenu['hidden'] = ''
        control.name = 'button'
        control['type'] = 'button'
        control['class'] = ['nav-disclosure']
        control['data-nav-disclosure'] = ''
        control['aria-controls'] = submenu['id']
        control['aria-expanded'] = 'false'
        control['aria-label'] = plain(control)
        for attr in ['href', 'role', 'tabindex']:
            control.attrs.pop(attr, None)
    if patient:
        # Repair orphan cells in the original continence grid before labelling
        # them. Browsers otherwise infer different rows from the invalid HTML.
        for group in list(soup.select('tbody.continence > div.highlight')):
            rows, current = [], None
            for child in list(group.children):
                if getattr(child, 'name', None) == 'tr':
                    current = child.extract()
                    current['class'] = list(current.get('class', [])) + ['highlight']
                    rows.append(current)
                elif getattr(child, 'name', None) in ['td', 'th'] and current:
                    current.append(child.extract())
            if rows:
                group.replace_with(*rows)
        for link in soup.select('a.btn[title^="Back to"]'):
            if not link.find_parent(['main', 'nav', 'footer']):
                link.wrap(soup.new_tag('nav', attrs={'aria-label': 'Return navigation', 'class': 'patient-return-navigation'}))
        logo = soup.select_one('img.logo')
        if logo and not logo.find_parent('header'):
            title = logo.find_next_sibling(['span', 'h1', 'p'])
            header = soup.new_tag('header', attrs={'class': 'patient-header'})
            logo.insert_before(header)
            header.append(logo.extract())
            if title and 'Patient Management System' in plain(title):
                title.name = 'p'
                title['class'] = ['patient-system-title']
                title.attrs.pop('style', None)
                header.append(title.extract())
        if main and not main.find('h1'):
            heading = main.find(['legend', 'h2', 'h3'])
            if heading:
                heading.name = 'h1'
            else:
                heading = soup.new_tag('h1', attrs={'class': 'visually-hidden'})
                heading.string = plain(soup.title).split('–')[0].strip()
                main.insert(0, heading)
    if main and not main.find('h1'):
        heading = soup.new_tag('h1', attrs={'class': 'visually-hidden'})
        heading.string = plain(soup.title).split('–')[0].strip()
        main.insert(0, heading)
    if main:
        if not soup.select_one('.skip-to-content'):
            skip = soup.new_tag('a', href='#' + main['id'], attrs={'class': 'skip-to-content'})
            skip.string = 'Skip to content'
            body.insert(0, skip)
        else:
            soup.select_one('.skip-to-content')['href'] = '#' + main['id']
    # Card headings should express the surrounding content hierarchy.
    for heading in soup.select('#intranet .card-title'):
        heading.name = 'h3'
    for button in soup.select('[data-profile-dialog]'):
        dialog = soup.find(id=button['data-profile-dialog'])
        title = dialog.find('h2') if dialog else None
        if not title:
            continue
        button['aria-label'] = 'View profile for ' + plain(title)
        card = button.find_parent(class_='card-body')
        if card:
            name = next((paragraph for paragraph in card.find_all('p', recursive=False)
                         if plain(paragraph) == plain(title)), None)
            if name:
                name.name = 'h2'
                name['class'] = ['doctor-card-name']
            for heading in card.select('.card-title'):
                heading.name = 'p'
                heading['class'] = ['doctor-field-label']
    for heading in soup.select('.quick_link_title h3'):
        heading.name = 'h2'
    for heading in soup.select('.library-page main > section > h3'):
        heading.name = 'h2'
        heading['class'] = list(heading.get('class', [])) + ([] if 'document-section-heading' in heading.get('class', []) else ['document-section-heading'])
    for heading in list(soup.select('h1,h2,h3,h4,h5,h6')):
        if not plain(heading) and not heading.get('id'):
            heading.decompose()
    if main:
        if patient:
            for identifier in main.select('.entry-content > .text-muted'):
                if plain(identifier).startswith('#'):
                    identifier.name = 'p'
                    identifier['class'] = ['text-muted', 'patient-record-id']
        last = 1
        for heading in main.select('h1,h2,h3,h4,h5,h6'):
            if heading.find_parent(class_='modal'):
                continue
            level = int(heading.name[1])
            if level > last + 1:
                heading.name = 'h' + str(last + 1)
                level = last + 1
            last = level
        # Each hidden tab panel is its own section below the page heading;
        # headings in an inactive sibling cannot provide its missing context.
        for panel in main.select('[role=tabpanel]'):
            last = 1
            for heading in panel.select('h2,h3,h4,h5,h6'):
                level = int(heading.name[1])
                if level > last + 1:
                    heading.name = 'h' + str(last + 1)
                    level = last + 1
                last = level
    # Link every patient tab to its own panel; the original reused three IDs.
    for tablist in soup.select('[role=tablist]'):
        tablist['aria-label'] = 'Patient record sections' if patient else 'Resource departments'
        for item in tablist.find_all('li', recursive=False):
            item['role'] = 'presentation'
        tabs = tablist.select('[role=tab]')
        selected = next((tab for tab in tabs if 'active' in tab.get('class', [])), tabs[0] if tabs else None)
        for tab in tabs:
            target = (tab.get('href') or tab.get('data-target') or tab.get('aria-controls', '')).strip().lstrip('#')
            panel = soup.find(id=target)
            if not target or not panel:
                continue
            tab['id'] = target + '-tab'
            tab['aria-label'] = plain(tab)
            tab['aria-controls'] = target
            tab['tabindex'] = '0' if tab is selected else '-1'
            tab['aria-selected'] = 'true' if tab is selected else 'false'
            if tab.name == 'a' and not tab.get('href'):
                tab.name = 'button'
                tab['type'] = 'button'
            for icon in tab.select('i'):
                icon['aria-hidden'] = 'true'
            panel['aria-labelledby'] = tab['id']
            panel['tabindex'] = '0'
            if target == 'ATSIliaisonservices' and not plain(panel):
                paragraph = soup.new_tag('p')
                base = body.get('data-site-root', '/Bagwan2.0/')
                link = soup.new_tag('a', href=base + 'aboriginal-and-torres-strait-islander-liaison-office/index.html')
                link.string = 'Open ATSI liaison office resources'
                paragraph.append(link)
                panel.append(paragraph)
    # Move message expansion onto the named button rather than the whole row.
    for button in soup.select('.message-open'):
        row = button.find_parent('tr')
        if row:
            target = button.get('aria-controls')
            button['data-message-toggle'] = target
            button['aria-expanded'] = 'false'
            for attr in ['onclick', 'data-toggle', 'data-target', 'aria-expanded']:
                row.attrs.pop(attr, None)
    # Bootstrap notices need names as well as focus management.
    for i, modal in enumerate(soup.select('.modal'), 1):
        heading = modal.find(['h2', 'h3', 'h4', 'h5'])
        if heading:
            heading.name = 'h2'
            heading['id'] = heading.get('id') or f'notice-title-{i}'
            modal['aria-labelledby'] = heading['id']
        modal['role'] = 'dialog'
        modal['tabindex'] = '-1'
    for table in soup.select('table'):
        for cell in table.select('td[style]'):
            if '#964b00' in cell['style'].lower() and 'color:#fff' not in cell['style'].replace(' ', '').lower():
                cell['style'] = cell['style'].rstrip(';') + ';color:#fff;'
        for cell in table.select('td[scope],tr[scope]'):
            cell.attrs.pop('scope', None)
        for row in table.select('tr[role=row]'):
            row.attrs.pop('role', None)
    # Hover-only clinical hints become keyboard-operable help buttons.
    for i, icon in enumerate(list(soup.select('[data-toggle=popover][data-content]')), 1):
        text = icon['data-content']
        parent = icon.parent
        icon.extract()
        label = plain(parent).split('\n')[0][:80] or 'this field'
        button = soup.new_tag('button', attrs={'type': 'button', 'class': 'field-help',
            'aria-label': 'Help: ' + label, 'data-field-help': text})
        button.string = '?'
        icon.replace_with(button) if icon.parent else parent.append(button)
    # Labels use the visible field/column purpose, plus row context for grids.
    used = set()
    for i, field in enumerate(soup.select('input,select,textarea'), 1):
        if field.find_parent('template'):
            continue
        field_id = field.get('id')
        if not field_id or field_id in used:
            field_id = f'bagwan-field-{i}'
            while soup.find(id=field_id):
                field_id += '-field'
            field['id'] = field_id
        used.add(field_id)
        if field.get('type') in ['hidden', 'button', 'submit']:
            continue
        if field.get('pattern') == 'd{1,2}:d{1,2}':
            field['pattern'] = r'(?:[01]\d|2[0-3]):[0-5]\d'
            field['title'] = 'Enter a 24-hour time as HH:MM, for example 09:30.'
        cell = field.find_parent(['td', 'th'])
        label = next((label for label in cell.find_all('label')
                      if 'visually-hidden' not in label.get('class', [])
                      and label.get('for', field_id) == field_id), None) if cell else None
        if label and not label.find(['input', 'select', 'textarea']):
            label['for'] = field_id
        existing = soup.find('label', attrs={'for': field_id})
        if existing and plain(existing):
            field['aria-label'] = plain(existing)
            continue
        if field.get('aria-label'):
            continue
        purpose = ''
        if cell:
            row = cell.parent
            cells = row.find_all(['td', 'th'], recursive=False)
            column = cells.index(cell) if cell in cells else 0
            table = cell.find_parent('table')
            headers = table.select('thead tr') if table else []
            if headers:
                header_cells = headers[-1].find_all(['th', 'td'], recursive=False)
                if column < len(header_cells):
                    texts = [s for s in header_cells[column].stripped_strings if s != '?']
                    purpose = ' '.join(texts)
            if not purpose:
                purpose = plain(label) if label else ''
            if not purpose:
                purpose = ' '.join(t for t in cell.stripped_strings if t != '?')[:80]
            if table and len(table.select('tbody tr')) > 1:
                rows = table.select('tbody tr')
                if row in rows:
                    context = ' '.join(cells[0].stripped_strings) if cells else ''
                    if context and not cells[0].find(['input', 'select', 'textarea']):
                        purpose += ' - ' + context
                    else:
                        purpose += f' - row {rows.index(row) + 1}'
        purpose = purpose.strip(' -') or field.get('placeholder') or field.get('name') or 'Simulation entry'
        field['aria-label'] = purpose[:180]
        label = soup.new_tag('label', attrs={'for': field_id, 'class': 'visually-hidden'})
        label.string = purpose[:180]
        field.insert_before(label)
    for table in soup.select('table:has(tbody.continence)'):
        for row in table.select('tbody.continence > tr'):
            cells = row.find_all(['td', 'th'], recursive=False)
            if not cells:
                continue
            clock = cells[0].find('input')
            time = clock.get('value', '') if clock else ''
            for day, cell in enumerate(cells[1:], 1):
                for field in cell.select('input,select,textarea'):
                    if field.get('type') == 'date':
                        purpose = f'Date for day {day}'
                    elif field.name == 'select':
                        purpose = f'Continence record - day {day}, {time}'
                    else:
                        purpose = f'Staff ID - day {day}, {time}'
                    field['aria-label'] = purpose
                    labels = soup.find_all('label', attrs={'for': field['id']})
                    if labels:
                        labels[0].string = purpose
            if clock:
                clock['aria-label'] = 'Recorded time ' + time
    for result in soup.select('#staff-results,#document-results'):
        result['role'] = 'status'
        result['aria-atomic'] = 'true'
    if 'H5P.DragQuestion' in str(soup) and not soup.select_one('.activity-keyboard-instructions'):
        frame = soup.select_one('iframe.h5p-iframe')
        if frame:
            instruction = soup.new_tag('p', attrs={'class': 'activity-keyboard-instructions'})
            instruction.string = 'Keyboard: Tab to an item. Press Space or Enter to select it, use arrow keys to choose a drop zone, then press Space or Enter to place it. Tab moves to the next control.'
            frame.parent.insert_before(instruction)
    # Visual flip effects do not hide the reverse face from assistive technology.
    for i, card in enumerate(soup.select('#flipcards .card-grid'), 1):
        title = plain(card.select_one('.front h2')) if card.select_one('.front h2') else f'value {i}'
        front, back = card.select_one('.front'), card.select_one('.back')
        if not front or not back:
            continue
        front['id'] = f'value-front-{i}'
        back['id'] = f'value-back-{i}'
        back['inert'] = ''
        back['aria-hidden'] = 'true'
        show, hide = card.select_one('.flip-btn'), card.select_one('.unflip-btn')
        show.string = 'Show details'
        show['aria-label'] = 'Show details about ' + title
        show['aria-controls'] = back['id']
        show['aria-expanded'] = 'false'
        hide.string = 'Back to ' + title
    if soup.select_one('script[src*="/assets/static.js"]'):
        version = hashlib.sha256((ROOT / 'assets/accessibility.js').read_bytes()).hexdigest()[:12]
        source = soup.select_one('script[src*="/assets/static.js"]')['src'].split('/assets/')[0]
        script = soup.select_one('script[data-accessibility]')
        if not script:
            script = soup.new_tag('script', attrs={'defer': '', 'data-accessibility': ''})
            body.append(script)
        script['src'] = source + '/assets/accessibility.js?v=' + version
    return str(soup) != before
