"""Reflow clinical entry forms and policy tables without rewriting their content."""
from pathlib import Path
from copy import deepcopy
import hashlib
import re
from bs4 import NavigableString

ROOT = Path(__file__).resolve().parents[1]


def text(tag):
    return ' '.join(tag.get_text(' ', strip=True).split())


def node(soup, name, content=None, **attrs):
    result = soup.new_tag(name, attrs=attrs)
    if content is not None:
        result.string = content
    return result


def field_block(soup, field, label, help_button=None, description=None):
    block = node(soup, 'div', **{'class': 'clinical-field'})
    label_row = node(soup, 'div', **{'class': 'clinical-label-row'})
    label_row.append(node(soup, 'label', label, **{'for': field['id']}))
    if help_button:
        help_button['aria-label'] = 'Help: ' + label
        label_row.append(help_button.extract())
    block.append(label_row)
    if description:
        description['id'] = field['id'] + '-description'
        description['class'] = ['clinical-description']
        block.append(description.extract())
        field['aria-describedby'] = description['id']
    field['class'] = [c for c in field.get('class', [])
                      if not re.match(r'^(col-|float-|w-|d-inline|form-control-sm)', c)]
    field['class'] += [] if 'clinical-control' in field['class'] else ['clinical-control']
    field['data-form-field'] = ''
    field['data-field-key'] = field['id']
    field['aria-label'] = label
    field.attrs.pop('style', None)
    block.append(field.extract())
    return block


def repair_clinical_markup(soup):
    before = str(soup)
    if not soup.body:
        return False
    # Remove only the placeholder contact block, retaining other footer content.
    for footer in soup.select('footer'):
        if footer.select_one('a[href="mailto:support@bagwanagecare.com.au"]'):
            for link in list(footer.select('a[href="mailto:support@bagwanagecare.com.au"],a[href="tel:+610000000"]')):
                link.decompose()
            for string in list(footer.find_all(string=True)):
                cleaned = str(string).replace('Email:', '').replace('. Tel:', '').replace('Tel:', '')
                cleaned = re.sub(r'\.\s*\.', '.', cleaned)
                if cleaned != str(string):
                    string.replace_with(cleaned)
    patient = 'patient-system' in soup.body.get('class', [])
    if patient and soup.select_one('.patient-dashboard'):
        classes = soup.body.get('class', [])
        if 'clinical-dashboard' not in classes:
            soup.body['class'] = classes + ['clinical-dashboard']
    if patient or 'infection' in (text(soup.title).lower() if soup.title else ''):
        version=hashlib.sha256((ROOT/'assets/clinical-forms.css').read_bytes()).hexdigest()[:12]
        stylesheet=soup.select_one('link[data-clinical-styles]')
        if not stylesheet:
            stylesheet=node(soup,'link',rel='stylesheet',**{'data-clinical-styles':''});soup.head.append(stylesheet)
        stylesheet['href']=soup.body.get('data-site-root','/Bagwan2.0/')+'assets/clinical-forms.css?v='+version
    main = soup.find('main')
    title = text(soup.title).lower() if soup.title else ''
    kind = next((name for name in ['abbeyscale', 'foodrecord', 'personalcare', 'continence']
                 if name in title.replace(' ', '')), None) if patient else None
    if main and patient and not kind:
        kind = main.get('data-clinical-kind')
    if kind and main and not main.get('data-clinical-kind'):
        fields = list(main.select('input,select,textarea'))
        titles = {'abbeyscale': 'Pain - Abbey scale', 'foodrecord': 'Food and Fluids record',
                  'personalcare': 'Personal care', 'continence': 'Urinary continence'}
        help_buttons = {button.get('aria-label', '').removeprefix('Help: '): button
                        for button in main.select('[data-field-help]')}
        # Capture descriptions before removing the nested legacy tables.
        descriptions = []
        score_titles = []
        if kind == 'abbeyscale':
            for score in fields[5:11]:
                label = score.get('aria-label', '')
                short = label.split('(')[0].strip()
                score_titles.append(short)
                header = next((h for h in main.select('th') if h.find(['h2','h3','h4'])
                               and text(h.find(['h2','h3','h4'])) == short), None)
                descriptions.append(deepcopy(header.find('p')) if header and header.find('p') else None)
        # Preserve the original field sequence and IDs for existing drafts.
        for field in fields:
            field.extract()
        for button in help_buttons.values():
            button.extract()
        main.clear()
        main['class'] = ['container', 'clinical-shell']
        main['data-clinical-kind'] = kind
        main.append(node(soup, 'h1', titles[kind], id='clinical-title'))
        intro = {'abbeyscale': 'Record observation details, then score each of the six assessment areas.',
                 'foodrecord': 'Record each food or fluid observation as a separate entry.',
                 'personalcare': 'Record each personal care observation as a separate entry.',
                 'continence': 'Choose a day, enter its date and expand an hour to record an observation.'}
        main.append(node(soup, 'p', intro[kind], **{'class': 'clinical-intro'}))
        tools = node(soup, 'div', **{'class': 'clinical-form-tools', 'role': 'group', 'aria-label': 'Form actions'})
        for label, attr in [('Save draft','data-save-draft'),('Print / save PDF','data-clinical-print'),('Download draft','data-download-draft')]:
            tools.append(node(soup, 'button', label, **{'type':'button',attr:''}))
        tools.append(node(soup, 'p', 'Training simulation. Drafts autosave in this browser.',
                          id='clinical-draft-status', role='status'))
        main.append(tools)
        form = node(soup, 'form', **{'data-clinical-form':kind, 'aria-labelledby':'clinical-title', 'novalidate':''})
        main.append(form)
        if kind == 'abbeyscale':
            layout = node(soup, 'div', **{'class':'clinical-layout'})
            form.append(layout)
            primary = node(soup, 'div', **{'class':'clinical-main'})
            layout.append(primary)
            details = node(soup, 'section', **{'class':'clinical-section','aria-labelledby':'observation-heading'})
            details.append(node(soup, 'h2', 'Observation details', id='observation-heading'))
            grid = node(soup, 'div', **{'class':'clinical-fields'})
            labels = ['Date','Time','Location','Verbal/Non verbal','Comments']
            for field,label in zip(fields[:5],labels):
                block = field_block(soup,field,label,help_buttons.get(label) or help_buttons.get(label.replace(' ','-')))
                if label == 'Comments': block['class'].append('clinical-field-wide')
                grid.append(block)
            details.append(grid); primary.append(details)
            assessment = node(soup, 'section', **{'class':'clinical-section','aria-labelledby':'assessment-heading'})
            assessment.append(node(soup, 'h2', 'Assessment', id='assessment-heading'))
            assessment.append(node(soup, 'p', 'Choose a score for every area. Unselected areas are marked as incomplete.', **{'class':'clinical-section-note'}))
            grid = node(soup, 'div', **{'class':'clinical-criteria'})
            for field,label,description in zip(fields[5:11],score_titles,descriptions):
                block = field_block(soup,field,label,description=description)
                block['class'].append('clinical-criterion')
                label_node = block.select_one('.clinical-label-row label')
                label_node.wrap(node(soup,'h3'))
                grid.append(block)
            assessment.append(grid); primary.append(assessment)
            summary = node(soup,'aside',**{'class':'clinical-summary','aria-labelledby':'score-heading'})
            summary.append(node(soup,'h2','Total pain score',id='score-heading'))
            total = fields[-1]
            total.attrs.pop('disabled',None); total['readonly']=''
            total['aria-label']='Total pain score'
            total['data-form-field']=''; total['data-field-key']=total['id']
            box=node(soup,'div',**{'class':'clinical-total'})
            box.append(total); box.append(node(soup,'span','/ 18'))
            summary.append(box)
            summary.append(node(soup,'p','0 of 6 areas scored. Total is incomplete.',id='clinical-score-status',role='status'))
            summary.append(node(soup,'p','The total updates as you select scores.',**{'class':'clinical-section-note'}))
            layout.append(summary)
        elif kind in ['foodrecord','personalcare']:
            entries=node(soup,'div',id='clinical-entries')
            form.append(entries)
            entry=node(soup,'fieldset',**{'class':'clinical-entry','data-entry':'1'})
            entry.append(node(soup,'legend','Entry 1'))
            grid=node(soup,'div',**{'class':'clinical-fields'})
            labels = ['Date','Time','Food item','Amount taken','Time taken','Role'] if kind=='foodrecord' else ['Date','Time','ADL','Comments','Role']
            for field,label in zip(fields,labels):
                block=field_block(soup,field,label,help_buttons.get(label))
                if label in ['Food item','Comments','ADL']:block['class'].append('clinical-field-wide')
                grid.append(block)
            entry.append(grid); entries.append(entry)
            template=node(soup,'template',id='clinical-entry-template')
            template.append(deepcopy(entry)); form.append(template)
            form.append(node(soup,'button','Add entry',**{'type':'button','data-add-entry':'','class':'clinical-add-entry'}))
            form.append(node(soup,'p','1 of 10 entries.',id='clinical-entry-status',role='status'))
        else:
            choices=node(soup,'div',**{'class':'clinical-day-choices','role':'group','aria-label':'Recording day'})
            for day in range(1,4):
                choices.append(node(soup,'button',f'Day {day}',**{'type':'button','data-day-choice':str(day),'aria-pressed':'true' if day==1 else 'false'}))
            form.append(choices)
            dates=node(soup,'section',**{'class':'clinical-section clinical-day-dates','aria-label':'Observation dates'})
            for day,field in enumerate(fields[:3],1):
                block=field_block(soup,field,f'Date for day {day}')
                block['data-recording-day']=str(day)
                if day!=1:block['hidden']=''
                dates.append(block)
            form.append(dates)
            form.append(node(soup,'h2','Hourly observations'))
            hours=node(soup,'div',**{'class':'clinical-hours'})
            for hour in range(24):
                group=fields[3+hour*7:3+(hour+1)*7]
                if not group:continue
                detail=node(soup,'details',**{'class':'clinical-hour','data-hour':str(hour)})
                if hour==0:detail['open']=''
                heading=node(soup,'summary')
                heading.append(node(soup,'span',group[0].get('value',f'{hour:02}:00'),**{'class':'clinical-hour-time'}))
                heading.append(node(soup,'span','Not recorded',**{'data-hour-status':''}))
                detail.append(heading)
                clock=group[0];clock['data-form-field']='';clock['data-field-key']=clock['id'];clock['class']=['visually-hidden'];detail.append(clock)
                for day in range(1,4):
                    block=node(soup,'div',**{'data-recording-day':str(day),'class':'clinical-fields'})
                    if day!=1:block['hidden']=''
                    for field,label in zip(group[1+(day-1)*2:3+(day-1)*2],['Continence record','Staff ID']):
                        fieldblock=field_block(soup,field,f'{label} - day {day}, {hour:02}:00')
                        block.append(fieldblock)
                    detail.append(block)
                hours.append(detail)
            form.append(hours)
        # Remove obsolete validation/row scripts; all interactions use native controls.
        scripts=[script.extract() for script in soup.body.select('script[src]')
                 if '/assets/static.js' in script['src'] or '/assets/accessibility.js' in script['src']]
        navigation=soup.select_one('.patient-navigation')
        header=soup.select_one('.patient-header')
        footer=soup.find('footer')
        if navigation:navigation.extract()
        if header:header.extract()
        if footer:footer.extract()
        main.extract();soup.body.clear()
        soup.body['class']=['patient-system','clinical-page']
        soup.body.append(node(soup,'a','Skip to content',href='#'+main['id'],**{'class':'skip-to-content'}))
        if navigation:soup.body.append(navigation)
        if header:
            wrap=node(soup,'div',**{'class':'container clinical-header-wrap'});wrap.append(header);soup.body.append(wrap)
        soup.body.append(main)
        back=node(soup,'nav',**{'class':'container clinical-return','aria-label':'Return navigation'})
        back.append(node(soup,'a','Back to all forms',href=soup.body.get('data-site-root','/Bagwan2.0/')+'patient-management-system/index.html'))
        soup.body.append(back)
        if footer:soup.body.append(footer)
        for script in scripts:soup.body.append(script)
        soup.title.string=titles[kind]+' · Bagwan Health'
        main['data-clinical-kind']=kind
    if main and main.get('data-clinical-kind'):
        main.select_one('.clinical-form-tools')['role'] = 'group'
        # An observation may be corrected back to an unrecorded state.
        for option in main.select('select option[value=""]'):
            option.attrs.pop('disabled',None)
        version=hashlib.sha256((ROOT/'assets/clinical-forms.js').read_bytes()).hexdigest()[:12]
        script=soup.select_one('script[data-clinical-controller]')
        if not script:
            script=node(soup,'script',**{'defer':'','data-clinical-controller':''});soup.body.append(script)
        script['src']=soup.body.get('data-site-root','/Bagwan2.0/')+'assets/clinical-forms.js?v='+version
    # These six Word tables have two columns and no spanning data cells. On
    # phones each component can be presented immediately before its actions.
    if 'infection' in title:
        for number,table in enumerate(soup.select('table'),1):
            if 'responsive-policy-table' in table.get('class',[]):continue
            rows=list(table.select('tr'))
            header=next((r for r in rows if [text(c).lower() for c in r.find_all(['td','th'],recursive=False)] in
                         [['component','actions required'],['component','action required']]),None)
            if not header:continue
            cells=header.find_all(['td','th'],recursive=False)
            previous=rows[:rows.index(header)]
            for row in previous:
                caption=node(soup,'caption')
                for cell in row.find_all(['td','th'],recursive=False):
                    for child in list(cell.contents):caption.append(child.extract())
                table.insert(0,caption);row.decompose()
            thead=node(soup,'thead');header.extract();thead.append(header);table.insert(1 if previous else 0,thead)
            for col,cell in enumerate(cells,1):
                cell.name='th';cell['scope']='col';cell['role']='columnheader';cell['id']=f'infection-table-{number}-column-{col}'
            for row_index,row in enumerate(table.select('tr'),1):
                row['role']='row'
                if row is header:continue
                data=row.find_all(['td','th'],recursive=False)
                if len(data)!=2:continue
                data[0].name='th';data[0]['scope']='row';data[0]['role']='rowheader'
                data[0]['id']=f'infection-table-{number}-row-{row_index}'
                data[1]['role']='cell'
                data[1]['headers']=cells[1]['id']+' '+data[0]['id']
            table['class']=list(table.get('class',[]))+['responsive-policy-table'];table['role']='table'
        for table in soup.select('.responsive-policy-table'):
            for element in [table,*table.select('tr,td,th')]:
                element.attrs.pop('width',None)
                element.attrs.pop('height',None)
                if element.get('style'):
                    declarations = element['style'].split(';')
                    element['style']='; '.join(part.strip() for part in declarations if part.strip()
                        and part.split(':',1)[0].strip().lower() not in ['width','height','margin-left'])
    return str(soup)!=before
