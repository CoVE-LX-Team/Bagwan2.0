'use strict';

const patientDirectoryPath = 'patient-management-system/patient-database/index.html';
const staffMessagesPath = 'patient-management-system/messageboard/index.html';
const clinicalRecords = [
  ['Pain observation — Abbey scale','abbeyscale','pain assessment observational nursing'],
  ['Food and fluids record','foodrecord','food drink intake hydration nutrition nursing'],
  ['Personal care record','personalcare','daily living hygiene personal care nursing'],
  ['Continence record','continence','bladder bowel toileting continence nursing']
];

function tourFrameUrl(originalURL) {
  const source = new URL(originalURL,document.baseURI);
  const destination = new URL('tour-patient.html',document.baseURI);
  const parameters = new URLSearchParams(location.hash.split('?')[1]);
  if (parameters.get('guide') === 'orientation') destination.searchParams.set('guide','orientation');
  if (parameters.has('from')) destination.searchParams.set('from',parameters.get('from'));
  destination.hash = parameters.get('stop') || source.hash;
  return destination.href;
}

function showClinicalFormLinks(query, unfiltered) {
  let section = main.querySelector('#clinical-form-links');
  if (!section) {
    section = document.createElement('section');
    section.id = 'clinical-form-links';
    section.className = 'clinical-form-links';
    section.setAttribute('aria-labelledby','clinical-form-title');
    main.querySelector('#results').before(section);
  }
  const found = unfiltered ? clinicalRecords.filter(([name,,terms]) => matches(name+' '+terms+' clinical patient forms records', query)) : [];
  section.hidden = !found.length;
  if (found.length) section.innerHTML = '<h2 id="clinical-form-title">Clinical forms</h2><p>Open a form to enter observations.</p><ul>'+
    found.map(([name,slug]) => '<li><a href="'+pageLink('patient-management-system/'+slug+'/index.html')+'">'+esc(name)+'</a></li>').join('')+'</ul>';
  return found.length;
}

function renderDraftPatientCase() {
  main.innerHTML = '<p class="breadcrumbs"><a href="'+pageLink(patientDirectoryPath)+'">Patient list</a> / Alex Morgan</p>'+
    intro('Alex Morgan','Communication and appointment coordination','PATIENT RECORD')+
    '<div class="case-columns"><section><h2>Appointment request</h2><dl class="case-summary">'+
    '<dt>Patient</dt><dd>Alex Morgan</dd><dt>Requested support</dt><dd>An interpreter for an upcoming appointment</dd>'+
    '<dt>Preferred language and dialect</dt><dd>Awaiting confirmation from Alex</dd><dt>Booking status</dt><dd>No confirmation recorded</dd>'+
    '</dl></section><section><h2>Reception note</h2><blockquote>“I would like an interpreter at my next appointment. Could someone tell me whether that has been arranged?”</blockquote>'+
    '<p>Reception recorded the request. The appointment time, preferred language and interpreter booking reference are still unrecorded.</p>'+
    '<a href="'+pageLink(staffMessagesPath)+'">Open staff messageboard</a></section></div>'+
    '<p><a href="#department/interpreting">Interpreting services</a></p>';
}

function enhancePatientFrame(frame,record) {
  if (!record.path.startsWith('patient-management-system/')) return;
  const doc = frame.contentDocument;
  const content = doc.querySelector('main');
  if (!content || content.querySelector('.v3-patient-nav')) return;
  doc.body.classList.add('v3-patient');
  const stylesheet = doc.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = new URL('tour-patient.css',document.baseURI).href;
  doc.head.append(stylesheet);
  const nav = doc.createElement('nav');
  nav.className = 'v3-patient-nav';
  nav.setAttribute('aria-label','Patient system');
  const links = [['Patient list',patientDirectoryPath],['Staff messageboard',staffMessagesPath],['Forms & records','#forms?view=online']];
  const hrefFor = route => new URL(withDepartment(route.startsWith('#') ? route : pageLink(route)),document.baseURI).href;
  for (const [text,path] of links) {
    const link = doc.createElement('a');
    link.textContent = text; link.href = hrefFor(path); link.target = '_top';
    if (record.path === path) link.setAttribute('aria-current','page');
    nav.append(link);
  }
  content.prepend(nav);
  if (record.path === patientDirectoryPath) {
    const deck = content.querySelector('.card-deck');
    if (deck) {
      for (const title of deck.querySelectorAll('h3.card-title')) {
        const heading = doc.createElement('h2'); heading.className = title.className; heading.textContent = title.textContent; title.replaceWith(heading);
      }
      const card = doc.createElement('div');
      card.className = 'card';
      card.innerHTML = '<a class="card-body patient-card-link" target="_top" href="'+esc(hrefFor('#patient-case'))+'"><h2 class="card-title">Alex Morgan</h2><span class="patient-card-action">Open patient record</span></a>';
      deck.append(card);
    }
  }
  if (record.path === staffMessagesPath) {
    const messageTable = content.querySelector('#tablePreview');
    const proceed = content.querySelector('[data-message-proceed]');
    if (!messageTable || !proceed) return;
    // The archived date controls are disabled and have no underlying filter.
    content.querySelector('form.form-inline:has(input:disabled)')?.remove();
    const buttons = messageTable.querySelectorAll('[data-message-toggle]');
    if (buttons.length >= 2) {
      buttons[0].textContent = 'Reported missing belongings';
      buttons[1].textContent = 'Staff meeting';
    }
    const first = content.querySelector('#demo1');
    if (first) first.textContent = 'Mr Huang has reported missing belongings. The circumstances have not been confirmed. Please check what has been recorded and who will follow up with him.';
    const row = doc.createElement('tr');
    row.innerHTML = '<td><input id="v3-read-request" type="checkbox" aria-label="Mark interpreter request as read"></td><td>Reception</td><td><details><summary>Interpreter request</summary><p>Alex Morgan has asked whether an interpreter has been arranged. The preferred language and booking status still need confirmation.</p><a href="'+esc(hrefFor('#patient-case'))+'" target="_top">Open Alex Morgan’s record</a></details></td><td>Undated</td><td>—</td>';
    messageTable.tBodies[0].append(row);
    const notice = doc.createElement('p'); notice.className = 'message-progress'; notice.setAttribute('role','status');
    messageTable.closest('.table-responsive').before(notice);
    const checks = [...messageTable.querySelectorAll('input[type=checkbox]')];
    const progress = () => {notice.textContent = checks.filter(c => c.checked).length+' of '+checks.length+' messages marked as read.';};
    const draftKey = 'bagwan-draft:'+doc.location.pathname;
    const third = row.querySelector('input');
    const savedFields = () => {
      try {
        const fields = JSON.parse(frame.contentWindow.localStorage.getItem(draftKey) || '[]');
        return Array.isArray(fields) ? fields : [];
      } catch {return [];}
    };
    third.checked = savedFields().find(field => field.key === third.id)?.value === true;
    // Keep archived read receipts in their original positions for pre-3.0 drafts.
    const persistThird = () => {
      const fields = savedFields().filter(field => field.key !== third.id);
      fields.push({key:third.id,value:third.checked});
      try {frame.contentWindow.localStorage.setItem(draftKey, JSON.stringify(fields));} catch { /* Browsing and export still work. */ }
    };
    checks.forEach(check => {
      check.addEventListener('input',persistThird);
      check.addEventListener('change',() => {persistThird(); progress();});
    });
    for (const button of content.querySelectorAll('.static-form-tools button')) {
      if (button.textContent.trim() === 'Save draft') button.addEventListener('click',persistThird);
      if (button.textContent.trim() === 'Download draft') button.addEventListener('click',event => {
        event.stopImmediatePropagation();
        const payload = {form:'Staff messageboard',savedAt:new Date().toISOString(),fields:checks.map(c => ({key:c.id,value:c.checked}))};
        const url = URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));
        const link = doc.createElement('a'); link.href = url; link.download = 'bagwan-form-draft.json'; link.click();
        setTimeout(() => URL.revokeObjectURL(url),1000);
      },true);
    }
    progress();
    proceed.textContent = 'Proceed to patient list';
    proceed.addEventListener('click',event => {
      event.preventDefault(); event.stopImmediatePropagation();
      const unread = checks.find(check => !check.checked);
      if (unread) {notice.textContent = 'Mark each message as read before proceeding.'; unread.focus();}
      else location.hash = withDepartment(pageLink(patientDirectoryPath));
    },true);
  }
  if (record.path.includes('/patient-database/') && record.path !== patientDirectoryPath) {
    const tables = content.querySelectorAll('#nav-pathology table');
    for (const table of tables) {
      const rows = [...table.rows];
      if (rows[0]?.cells[1]?.textContent.trim() !== 'Result') continue;
      for (const row of rows.slice(1)) {
        const result = row.cells[1];
        if (result && !result.textContent.trim() && row.cells[0]?.textContent.trim()) result.textContent = 'Not supplied';
      }
    }
  }
}
