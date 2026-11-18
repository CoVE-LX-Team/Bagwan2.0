/* Native responsive entry forms. Data stays in this browser until downloaded. */
(() => {
  'use strict';
  const form = document.querySelector('[data-clinical-form]');
  if (!form) return;
  const kind = form.dataset.clinicalForm;
  const status = document.getElementById('clinical-draft-status');
  const key = 'bagwan-draft:' + location.pathname;
  const entries = document.getElementById('clinical-entries');
  const fields = parent => [...parent.querySelectorAll('[data-form-field]')];
  const read = field => field.multiple ? [...field.selectedOptions].map(option=>option.value)
    : ['checkbox','radio'].includes(field.type) ? field.checked : field.value;
  const write = (field,value) => {
    if (field.multiple) [...field.options].forEach(option=>option.selected=(Array.isArray(value)?value:[value]).includes(option.value));
    else if (['checkbox','radio'].includes(field.type)) field.checked=!!value;
    else field.value=value ?? '';
  };
  const values = parent => fields(parent).map(field=>({key:field.dataset.fieldKey,value:read(field)}));
  const snapshot = () => ({version:2,kind,form:document.title,savedAt:new Date().toISOString(),
    fields:fields(form).map(field=>({key:field.id,value:read(field)})),
    ...(entries ? {entries:[...entries.children].map(entry=>({fields:values(entry)}))} : {})});
  const save = (announce=false) => {
    try {
      localStorage.setItem(key,JSON.stringify(snapshot()));
      if(announce) status.textContent='Draft saved in this browser.';
    } catch (_) {status.textContent='The browser could not save this draft. Download it to keep a copy.';}
  };
  const add = (focus=true) => {
    if(!entries || entries.children.length>=10) return;
    const number=entries.children.length+1;
    const fragment=document.getElementById('clinical-entry-template').content.cloneNode(true);
    const entry=fragment.querySelector('[data-entry]');
    entry.dataset.entry=number;
    entry.querySelector('legend').textContent='Entry '+number;
    fields(entry).forEach(field=>{
      const oldId=field.id;
      const newId=`${kind}-entry-${number}-${field.dataset.fieldKey}`;
      field.id=newId;
      entry.querySelectorAll('label').forEach(label=>{if(label.htmlFor===oldId) label.htmlFor=newId});
      field.setAttribute('aria-label',(field.getAttribute('aria-label')||'Entry')+' - entry '+number);
      if(!field.disabled && !field.readOnly) {
        if(field.tagName==='SELECT') [...field.options].forEach(option=>option.selected=false);
        else field.value='';
        if(field.tagName==='SELECT'&&!field.multiple) field.selectedIndex=0;
      }
    });
    entries.append(fragment);
    document.getElementById('clinical-entry-status').textContent=`${number} of 10 entries.`;
    document.querySelector('[data-add-entry]').disabled=number>=10;
    if(focus) fields(entry).find(field=>!field.disabled)?.focus();
    return entry;
  };
  try {
    const saved=JSON.parse(localStorage.getItem(key)||'null');
    if(saved?.version===2 && entries && Array.isArray(saved.entries)) {
      while(entries.children.length<Math.min(10,saved.entries.length)) add(false);
      [...entries.children].forEach((entry,index)=>{
        const data=saved.entries[index]?.fields||[];
        fields(entry).forEach(field=>{
          const value=data.find(item=>item.key===field.dataset.fieldKey);
          if(value) write(field,value.value);
        });
      });
    } else if(saved) {
      const data=Array.isArray(saved)?saved:saved.fields||[];
      fields(form).forEach((field,index)=>{
        const value=data.find(item=>item.key===field.id) || data[index];
        if(value && [field.id,field.name,`field-${index}`].includes(value.key)) write(field,value.value);
      });
    }
  } catch (_) {status.textContent='The saved draft could not be read. The form is ready for a new entry.';}
  const scores=[...form.querySelectorAll('select[name^="score["]')];
  const updateScore = () => {
    if(!scores.length)return;
    const completed=scores.filter(field=>field.value!=='').length;
    const total=scores.reduce((sum,field)=>sum+(Number(field.value)||0),0);
    document.getElementById('total').value=total;
    const message=`${completed} of ${scores.length} areas scored. ${completed===scores.length?'Assessment complete.':'Total is incomplete.'}`;
    const output=document.getElementById('clinical-score-status');
    if(output.textContent!==message)output.textContent=message;
    output.dataset.complete=String(completed===scores.length);
  };
  let day=1;
  const updateHours = () => form.querySelectorAll('[data-hour]').forEach(hour=>{
    const group=hour.querySelector(`[data-recording-day="${day}"]`);
    const select=group.querySelector('select'),initials=group.querySelector('textarea');
    const summary=hour.querySelector('[data-hour-status]');
    summary.textContent=select.value ? select.selectedOptions[0].textContent.trim() : initials.value.trim()?'Staff ID entered':'Not recorded';
    summary.dataset.recorded=String(!!select.value||!!initials.value.trim());
  });
  document.querySelectorAll('[data-day-choice]').forEach(button=>button.addEventListener('click',()=>{
    day=Number(button.dataset.dayChoice);
    form.querySelectorAll('[data-recording-day]').forEach(group=>group.hidden=Number(group.dataset.recordingDay)!==day);
    document.querySelectorAll('[data-day-choice]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));
    updateHours();
  }));
  form.addEventListener('input',()=>{updateScore();updateHours();save()});
  form.addEventListener('change',()=>{updateScore();updateHours();save()});
  form.addEventListener('submit',event=>{event.preventDefault();save(true)});
  document.querySelector('[data-add-entry]')?.addEventListener('click',()=>{add();save()});
  document.querySelector('[data-save-draft]').addEventListener('click',()=>save(true));
  document.querySelector('[data-download-draft]').addEventListener('click',()=>{
    const url=URL.createObjectURL(new Blob([JSON.stringify(snapshot(),null,2)],{type:'application/json'}));
    const link=document.createElement('a');link.href=url;link.download='bagwan-form-draft.json';link.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  const element=(tag,text,className)=>{
    const result=document.createElement(tag);
    if(text!==undefined)result.textContent=text;
    if(className)result.className=className;
    return result;
  };
  const display = field => {
    if(field.tagName==='SELECT') return [...field.selectedOptions].filter(option=>option.value!=='').map(option=>option.textContent.trim()).join(', ')||'Not recorded';
    return field.value.trim()||'Not recorded';
  };
  const definitionList = controls => {
    const list=element('dl',undefined,'clinical-print-fields');
    controls.forEach(field=>{
      const label=field.closest('.clinical-field')?.querySelector('label')?.textContent.trim();
      list.append(element('dt',label||field.getAttribute('aria-label')||field.dataset.fieldKey),element('dd',display(field)));
    });
    return list;
  };
  const preparePrint = () => {
    document.querySelector('.clinical-print-view')?.remove();
    const print=element('section',undefined,'clinical-print-view');
    if(kind==='abbeyscale') {
      const controls=fields(form);
      print.append(element('h2','Observation details'),definitionList(controls.slice(0,5)),element('h2','Assessment'));
      scores.forEach(field=>{
        const section=element('section',undefined,'clinical-print-criterion');
        section.append(element('h3',field.getAttribute('aria-label')),element('p',display(field)));
        const description=field.closest('.clinical-criterion').querySelector('.clinical-description');
        if(description)section.append(element('p',description.textContent.trim(),'clinical-print-note'));
        print.append(section);
      });
      print.append(element('h2','Total pain score: '+document.getElementById('total').value+' / 18'),element('p',document.getElementById('clinical-score-status').textContent));
    } else if(entries) {
      [...entries.children].forEach(entry=>{
        const section=element('section',undefined,'clinical-print-entry');
        section.append(element('h2',entry.querySelector('legend').textContent),definitionList(fields(entry)));
        print.append(section);
      });
    } else {
      const table=element('table',undefined,'clinical-print-table');
      const thead=element('thead'),row=element('tr');row.append(element('th','Time'));
      fields(form).slice(0,3).forEach((date,index)=>row.append(element('th',`Day ${index+1}: ${display(date)}`)));
      thead.append(row);table.append(thead);
      const tbody=element('tbody');
      form.querySelectorAll('[data-hour]').forEach(hour=>{
        const row=element('tr');row.append(element('th',hour.querySelector('.clinical-hour-time').textContent));
        hour.querySelectorAll('[data-recording-day]').forEach(group=>{
          const controls=fields(group),cell=element('td');
          cell.append(element('p',display(controls[0])),element('p','Staff ID: '+display(controls[1])));row.append(cell);
        });
        tbody.append(row);
      });
      table.append(tbody);print.append(table);
    }
    form.before(print);
  };
  window.addEventListener('beforeprint',preparePrint);
  document.querySelector('[data-clinical-print]').addEventListener('click',()=>window.print());
  updateScore();updateHours();
})();
