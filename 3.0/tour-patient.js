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
    '<a href="'+pageLink(staffMessagesPath)+'?message=interpreter-request">Read the reception message</a></section></div>'+
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
