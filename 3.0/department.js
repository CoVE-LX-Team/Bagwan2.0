'use strict';

// Each service has two incoming addresses. Both resolve to this authored view.
const serviceDesks = {
  interpreting: {
    summary: 'Arrange an interpreter, find language services guidance or contact the interpreting team.',
    primary: ['Interpreter booking request form', '#forms?category=Interpreting+services', 'forms'],
    room: ['InterpretingReception', 'interpreting-reception', 'Visit interpreting reception'],
    contact: 'cho-seung-hyun',
    resources: [
      ['Booking an interpreter', 'scorm/quick-link-pages/policy-and-procedures/booking-an-interpreter/index.html', 'What to record and how to follow up a request.'],
      ['Language services rights and responsibilities', 'scorm/quick-link-pages/policy-and-procedures/interpretinglanguage-services-rights-and-responsibilities/index.html', 'Hospital policy on access to language support.'],
      ['Interpreting reference library', 'resources-and-tools/interpreting-services/index.html', 'Professional guidance, staff forms and interpreting references.'],
      ['Aboriginal and Torres Strait Islander liaison services', '#department/liaison', 'Find the liaison team and their staff guide.']
    ],
    linksTitle: 'Professional development',
    related: [
      ['Interpreting a cardiology appointment', 'scorm/department-pages/interpreting-office/new-interpreting-pd/index.html', 'Video scenario'],
      ['Interpreting at Bagwan Health', 'scorm/intranet/news-feed/interpreting-at-bagwan-health/index.html', 'Professional practice'],
      ['Cultural awareness resources for staff', 'scorm/intranet/news-feed/free-cultural-awareness-training/index.html', 'Staff learning']
    ]
  },
  laboratory: {
    summary: 'Find pathology request forms, laboratory safety procedures and the laboratory team.',
    primary: ['Pathology request form', '#forms?query=Pathology+request+form', 'forms'],
    room: ['Laboratory', 'laboratory', 'Visit the laboratory'],
    contact: 'joel-stevens',
    resources: [
      ['Laboratory PPE reference', 'scorm/department-pages/lab-technologies/ppe-safety-activity/index.html', 'Check protective equipment for a task.'],
      ['Laboratory waste reference', 'scorm/department-pages/lab-technologies/waste-management/index.html', 'Look up waste classification and disposal guidance.'],
      ['Laboratory reference library', 'resources-and-tools/lab-technologies/index.html', 'Safety guidance, posters, forms and practice activities.'],
      ['Laboratory documents', '#documents?category=Laboratory+technologies', 'Browse and download departmental files.']
    ],
    linksTitle: 'Updates and policies',
    related: [
      ['Influenza outbreak', 'scorm/intranet/news-feed/influenza-outbreak/index.html', 'Staff news'],
      ['Bagwan’s staff intranet', 'scorm/intranet/news-feed/bagwan-health-has-a-new-look-and-staff-intranet/index.html', 'Staff news'],
      ['Complaints and feedback handling', 'scorm/quick-link-pages/policy-and-procedures/complaints-and-feedback-handling/index.html', 'Policy']
    ]
  },
  logistics: {
    summary: 'Access the induction form, emergency procedures and the logistics and emergency preparedness team.',
    primary: ['Logistics induction form', '#forms?category=Logistics', 'forms'],
    room: ['Logistics', 'logistics', 'Visit the logistics store'],
    contact: 'ayla-hood',
    resources: [
      ['Emergency response', 'scorm/quick-link-pages/policy-and-procedures/emergency-repsonse/index.html', 'Find the hospital emergency response procedure.'],
      ['Logistics reference library', 'resources-and-tools/logisitics/index.html', 'Induction, administration templates and risk management.'],
      ['Logistics documents', '#documents?category=Logistics', 'Preview and download departmental files.']
    ],
    linksTitle: 'Updates and policies',
    related: [
      ['Infection control', 'scorm/quick-link-pages/policy-and-procedures/infection-control/index.html', 'Policy'],
      ['Update from the CEO', 'scorm/intranet/news-feed/update-from-the-ceo/index.html', 'Staff news'],
      ['Complaints and feedback handling', 'scorm/quick-link-pages/policy-and-procedures/complaints-and-feedback-handling/index.html', 'Policy']
    ]
  }
};

function renderServiceDesk(department) {
  const desk = serviceDesks[department.id];
  const contact = data.hierarchy.find(person => person.id === desk.contact);
  const [primaryTitle, primaryUrl, symbol] = desk.primary;
  const [roomId, imageName, visitLabel] = desk.room;
  const route = destination => destination.startsWith('#') ? destination : pageLink(destination);
  const arrow = '<span class="desk-arrow" aria-hidden="true">→</span>';
  const resourceRows = desk.resources.map(([title, url, summary]) => `
    <li><a href="${esc(route(url))}"><span><strong>${esc(title)}</strong><small>${esc(summary)}</small></span>${arrow}</a></li>`).join('');
  const relatedRows = desk.related.map(([title, url, type]) => `
    <li><a href="${esc(route(url))}"><small>${esc(type)}</small><strong>${esc(title)}</strong></a></li>`).join('');
  const shared = [
    ['Forms & records', '#forms'], ['Policies & procedures', '#policies'], ['All documents', '#documents'],
    ['Human resources documents', '#documents?category=Human+resources'],
    ['Report an incident', pageLink('scorm/quick-link-pages/incident-reporting/index.html')], ['All staff news', '#news']
  ];
  main.innerHTML = `
    <div class="service-desk">
      <header class="desk-intro">
        <h1>${esc(department.name)}</h1><p>${esc(desk.summary)}</p>
        <div class="desk-actions">
          <a class="desk-primary" href="${esc(primaryUrl)}">${icon(symbol)} ${esc(primaryTitle)}</a>
          ${saveButton('page:' + department.source, department.name)}
        </div>
      </header>
      <section class="desk-services" aria-labelledby="desk-service-title">
        <h2 id="desk-service-title">Services and resources</h2>
        <ul class="desk-list">${resourceRows}</ul>
      </section>
      <a class="desk-room" href="#tour?stop=${encodeURIComponent(roomId)}">
        <img src="assets/tour-${imageName}.webp" width="864" height="486" alt="">
        <span>${icon('tour')} ${esc(visitLabel)} ${arrow}</span>
      </a>
      <section class="desk-people" aria-labelledby="desk-team-title">
        <h2 id="desk-team-title">Department team</h2>
        ${contact ? `<div class="desk-contact"><a href="${esc(personLink(contact))}">${esc(contact.name)}</a><p>${esc(contact.role)}</p></div>` : ''}
        <ul>
          <li><a href="#people?department=${encodeURIComponent(department.group)}">${icon('people')} View team directory</a></li>
          ${contact?.source_page ? `<li><a href="${esc(pageLink(contact.source_page))}">${icon('departments')} Department organisation chart</a></li>` : ''}
        </ul>
      </section>
      <section class="desk-related" aria-labelledby="desk-related-title"><h2 id="desk-related-title">${esc(desk.linksTitle)}</h2>
        <ul>${relatedRows}</ul>
      </section>
      <nav class="desk-hospital" aria-label="Hospital-wide resources"><h2>Across the hospital</h2>
        <ul>${shared.map(([title, url]) => `<li><a href="${esc(url)}">${esc(title)}</a></li>`).join('')}</ul>
      </nav>
    </div>`;
}
