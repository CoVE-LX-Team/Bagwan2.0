'use strict';

const staffResources = (() => {
  const news = slug => 'scorm/intranet/news-feed/' + slug + '/index.html';
  const policy = slug => 'scorm/quick-link-pages/policy-and-procedures/' + slug + '/index.html';
  const alliedPath = 'staff-resources/allied-health/index.html';
  const nursingPath = 'scorm/department-pages/nursing/index.html';
  const liaisonPath = 'aboriginal-and-torres-strait-islander-liaison-office/index.html';
  const laboratoryTools = 'resources-and-tools/lab-technologies/index.html';
  const referenceLibraries = {
    [laboratoryTools]: {
      title:'Laboratory reference library', sections:{
        collapseFormsandtemplates:['Forms and templates','Pathology requests, waste disposal and safety posters.','forms'],
        collapseTools:['Laboratory references','Protective equipment and waste management.','policies'],
        collapseResources:['Safety resources and practice','Chemical safety guidance and practice questions.','resources']
      }
    },
    'resources-and-tools/interpreting-services/index.html': {
      title:'Interpreting reference library', sections:{
        collapseFormsandtemplates:['Interpreter booking form','The request form for an upcoming appointment.','forms'],
        collapseResources:['Policies and guidance','Hospital procedures, government guidance and translated information.','policies'],
        collapseTools:['Consultation practice and interpreter cards','A cardiology scenario and the Victorian interpreter assistance card.','resources']
      }
    },
    'resources-and-tools/logisitics/index.html': {
      title:'Logistics reference library', sections:{
        collapseFormsandtemplates:['Forms and templates','Logistics induction, meeting agendas and correspondence.','forms'],
        collapseResources:['Risk management policy','The hospital’s risk management document.','policies']
      }
    },
    'resources-and-tools/nursing/index.html': {
      title:'Nursing reference library', sections:{
        collapseFormsandtemplates:['Forms and templates','Care plans, pathology requests, incident and workplace safety forms.','forms'],
        collapseTools:['Hand hygiene','Hand cleaning guidance from the World Health Organization.','resources'],
        collapseResources:['Professional guidance','Fact sheets from the Nursing and Midwifery Board of Australia.','policies']
      }
    }
  };
  const interpretingScenario = 'scorm/department-pages/interpreting-office/new-interpreting-pd/index.html';
  const liaisonCategory = 'Aboriginal and Torres Strait Islander liaison';
  const documentCategoryLink = label => '#documents?' + new URLSearchParams({category:label});
  const practiceLink = kind => absolute('3.0/practice.html?activity=' + kind);
  const catalogue = 'https://rmit-catalog.rmit.edu.au/browse/catalog/rmit-library/learning-resources/courses/';
  const orientation = catalogue + 'womin-djeka-indigenous-orientation';
  const truthTelling = catalogue + 'truth-telling-racism-and-reconciliation';
  const rmitPathway = 'https://www.rmit.edu.au/library/news/2026/sept/indigenous-learning-pathway';
  const alliedProfessions = 'https://www.health.vic.gov.au/allied-health-workforce/allied-health-professions';
  const migrantCare = 'https://www.safetyandquality.gov.au/resources/nsqhs-standards-user-guide-health-service-organisations-providing-care-patients-migrant-and-refugee-backgrounds';
  const interpreterGuidelines = 'https://www.vic.gov.au/guidelines-using-interpreting-services/';
  const culturalStory = news('free-cultural-awareness-training');
  const orientationStory = news('womin-djeka');
  const culturalTitle = 'Cultural awareness resources for staff';
  const culturalSummary = 'Find RMIT learning modules and guidance on working with people from migrant and refugee backgrounds.';
  const nursingLinks = [
    ['Pathology request form','#forms?query=Pathology+request+form','Preview or download the request template.'],
    ['Internet, email and social media',pageLinkFor('internet-email-and-social-media'),'Read the hospital’s policy on staff use of email, the internet and social media.'],
    ['Complaints and feedback handling',pageLinkFor('complaints-and-feedback-handling'),'Find the hospital’s process for responding to feedback.']
  ];
  // Editorial reading order. No publication dates are inferred from migrated WordPress paths.
  const stories = ['bagwan-health-has-a-new-look-and-staff-intranet','update-from-the-ceo','womin-djeka',
    'free-cultural-awareness-training','new-look-people-culture','new-interpreting-personal-development-available',
    'interpreting-at-bagwan-health','influenza-outbreak'].map(news);

  function pageLinkFor(policySlug) { return '#page/' + encodeURIComponent(policy(policySlug)); }
  function link(href, label) { return '<a href="'+esc(href)+'">'+esc(label)+'</a>'; }
  function write(record, body) {
    record.html = body.innerHTML;
    record.text = body.textContent.replace(/\s+/g,' ').trim();
  }
  function newPage(path, title, category, html) {
    const record = {path,title,category,mode:'article',draft_id:null};
    write(record,new DOMParser().parseFromString(html,'text/html').body);
    return record;
  }
  function updateContent(pages, path, update) {
    const record = pages.find(item => item.path === path);
    if (!record) return;
    const body = new DOMParser().parseFromString(record.html,'text/html').body;
    update(body,record);
    write(record,body);
  }
  function appendix(title, rows) {
    return '<section class="staff-resource-section"><h2>'+esc(title)+'</h2><ul>'+
      rows.map(([title,href,description])=>'<li>'+link(href,title)+(description?' <p>'+esc(description)+'</p>':'')+'</li>').join('')+'</ul></section>';
  }
  function guide(id, name, category, bytes) {
    const path = '3.0/staff-resources/'+id+'-guide';
    return {name,local_path:path+'.pdf',local_href:path+'.pdf',size_bytes:bytes,mime_type:'application/pdf',
      original_folder_path:'departmental/'+id,category,subcategory:'',file_type:'PDF',
      source_modified_at:'2026-11-20',preview_href:path+'.pdf',preview_image_href:path+'.jpg',preview_pages:1};
  }

  function initialize(catalog) {
    const pages = catalog.pages;
    const board = pages.find(page => page.path === staffMessagesPath);
    board.title = 'Staff messageboard';
    board.text = boardMessages.map(message => [message.sender, message.subject, message.body].join(' ')).join(' ');
    const alliedGuide = guide('allied-health','Working with allied health.pdf','Allied health',73936);
    const liaisonGuide = guide('liaison','Aboriginal and Torres Strait Islander liaison resources.pdf',liaisonCategory,76687);
    catalog.documents.push(alliedGuide,liaisonGuide);

    const alliedHtml = '<p>Allied health brings together several professions. When discussing a patient’s goals, use the profession directory to explore which discipline may contribute.</p>'+
      appendix('Staff resources',[
        ['Working with allied health',documentCategoryLink('Allied health'),'Preview or download the staff reference with prompts for preparing a team discussion.'],
        ['Allied health professions in Victoria',alliedProfessions,'Victorian Department of Health descriptions of individual professions.']
      ])+'<h2>Preparing for a team discussion</h2><p>Start with the person’s own description of what they want to do. Bring the relevant observations to the discussion and agree with the care team who will follow up.</p>';
    pages.push(newPage(alliedPath,'Allied health service overview','Department',alliedHtml));
    departmentData.push({id:'allied-health',name:'Allied health',source:alliedPath,group:'Allied health',
      description:'Explore allied health professions and prepare for a discussion about a patient’s goals.'});

    const wominHtml = '<p>Womin Djeka Indigenous Orientation is the first module in RMIT Library’s Aboriginal and Torres Strait Islander learning pathway.</p>'+
      '<h2>What the orientation covers</h2><p>Explore the eastern Kulin Nation and Victorian language groups, and learn who can give a Welcome to Country and how an Acknowledgement of Country is used.</p>'+
      appendix('At RMIT',[
        ['Womin Djeka Indigenous Orientation',orientation,'Open the RMIT course listing for enrolment and access options.'],
        ['About the learning pathway',rmitPathway,'RMIT Library describes the modules and the people who developed them.']
      ]);
    pages.push(newPage(orientationStory,'Womin Djeka Indigenous Orientation','News',wominHtml));
    updateContent(pages,culturalStory,(body,record)=>{
      record.title=culturalTitle;
      body.innerHTML='<p>'+esc(culturalSummary)+'</p>'+appendix('Choose a resource',[
        ['Womin Djeka Indigenous Orientation',orientation,'Begin RMIT’s pathway with local cultural context.'],
        ['Truth Telling: Racism and Reconciliation',truthTelling,'RMIT’s follow-on module explores racism, truth telling and reconciliation.'],
        ['Providing care for patients from migrant and refugee backgrounds',migrantCare,'Australian Commission on Safety and Quality in Health Care guidance for health service organisations.']
      ])+'<p>'+link(rmitPathway,'About RMIT’s Aboriginal and Torres Strait Islander learning pathway')+'</p>';
    });

    for (const path of ['scorm/intranet/news-feed/index.html','scorm/department-pages/interpreting-office/index.html']) {
      updateContent(pages,path,body=>{
        const card=[...body.querySelectorAll('a[href]')].find(a=>a.getAttribute('href').endsWith(culturalStory));
        const heading=card?.querySelector('h2,h3'), summary=card?.querySelector('.quick_link_content,.card-text');
        if(heading)heading.textContent=culturalTitle;
        if(summary)summary.textContent=culturalSummary;
        for(const label of body.querySelectorAll('.card p')){
          const value=label.textContent.trim();
          if(value==='ATSI resources'){
            const tile=label.closest('.card');
            const action=body.ownerDocument.createElement('a');
            action.setAttribute('href',documentCategoryLink(liaisonCategory));
            label.textContent='Aboriginal and Torres Strait Islander liaison resources';
            action.append(...tile.childNodes);
            tile.append(action);
          }
          if(value==='ATSI services')label.textContent='Aboriginal and Torres Strait Islander liaison services';
          if(value==='Policies and prodedures')label.textContent='Policies and procedures';
        }
      });
    }
    updateContent(pages,interpretingScenario,body=>rewriteInterpretingScenario(body.ownerDocument));
    updateContent(pages,news('influenza-outbreak'),body=>{
      for(const anchor of body.querySelectorAll('a')){
        if(anchor.textContent.includes('Infection Control Policy'))anchor.setAttribute('href',pageLinkFor('infection-control'));
        if(anchor.textContent.includes('Test your knowledge')){
          anchor.setAttribute('href',practiceLink('waste'));
          anchor.textContent='Practise classifying laboratory waste';
        }
      }
    });
    updateContent(pages,'scorm/department-pages/lab-technologies/index.html',body=>{
      const heading=body.querySelector('a[href*="/influenza-outbreak/"] h3');
      if(heading)heading.textContent='Influenza outbreak';
    });
    updateContent(pages,laboratoryTools,body=>{
      for(const anchor of body.querySelectorAll('a[href]')){
        const title=anchor.textContent.trim();
        if(title==='Lab safety/guidelines – Science Assist (external link)'){
          // The migrated label duplicates the adjacent WorkSafe link and misattributes it.
          anchor.parentElement.remove();
          continue;
        }
        if(title==='PPE Safety interactive activity')anchor.textContent='Laboratory PPE reference';
        if(title==='Waste management and infection control interactive activity')anchor.textContent='Laboratory waste reference';
        if(title==='PPE learning activity'||title==='Waste management learning activity'){
          const kind=title.startsWith('PPE')?'ppe':'waste';
          anchor.setAttribute('href',practiceLink(kind));
          anchor.textContent=kind==='ppe'?'PPE practice questions':'Waste classification practice';
        }
      }
    });
    updateContent(pages,'resources-and-tools/interpreting-services/index.html',body=>{
      const replacements = {
        'Victorian Department of Health and Human Services (DHHS) language services policy and guidelines':['Victorian Department of Health language services policy and accompanying guidelines','https://www.health.vic.gov.au/publications/language-services-policy'],
        'Working with interpreters':['Working with interpreters',interpreterGuidelines+'working-interpreters'],
        'Assessing the need for an interpreter':['Assessing the need for an interpreter',interpreterGuidelines+'arranging-interpreter#assessing-the-need-for-an-interpreter'],
        'NSW Health policy on working with interpreters':['NSW Health standard procedures for working with health care interpreters (PDF)','https://www1.health.nsw.gov.au/pds/ActivePDSDocuments/PD2017_044.pdf']
      };
      for(const anchor of body.querySelectorAll('a[href]')){
        const replacement=replacements[anchor.textContent.trim()];
        if(replacement){anchor.textContent=replacement[0];anchor.setAttribute('href',replacement[1]);}
      }
    });
    for (const [path, library] of Object.entries(referenceLibraries)) {
      updateContent(pages,path,(body, record)=>{
        const sections=[];
        for (const [id, [title, description, glyph]] of Object.entries(library.sections)) {
          const content=body.querySelector('#'+id+' .card-body');
          if (!content) continue;
          if (id==='collapseFormsandtemplates' && !content.querySelector('.document-list')) {
            const list=body.ownerDocument.createElement('ul');
            list.className='document-list';
            for (const paragraph of content.querySelectorAll(':scope > p')) {
              const anchor=paragraph.querySelector(':scope > a:only-child');
              if (!anchor || paragraph.textContent.trim()!==anchor.textContent.trim()) continue;
              if(!list.parentNode)paragraph.before(list);
              const item=body.ownerDocument.createElement('li');
              item.append(anchor);
              list.append(item);
              paragraph.remove();
            }
          }
          for (const heading of content.querySelectorAll('h2,h4')) {
            const subtitle=body.ownerDocument.createElement('h3');
            subtitle.textContent=heading.textContent.trim();
            heading.replaceWith(subtitle);
          }
          const labelId='heading'+id.slice('collapse'.length);
          sections.push('<section class="reference-group"><h2><button type="button" class="reference-toggle" id="'+labelId+'" data-toggle="collapse" data-target="#'+id+'" aria-expanded="false" aria-controls="'+id+'" aria-describedby="'+id+'-summary">'+
            icon(glyph)+'<span class="reference-label"><strong>'+esc(title)+'</strong><span id="'+id+'-summary" aria-hidden="true">'+esc(description)+'</span></span><span class="reference-chevron" aria-hidden="true"></span></button></h2>'+
            '<div class="reference-content" role="region" id="'+id+'" aria-labelledby="'+labelId+'" hidden>'+content.innerHTML+'</div></section>');
        }
        record.title=library.title;
        body.innerHTML='<div class="reference-library">'+sections.join('')+'</div>';
      });
    }
    updateContent(pages,nursingPath,body=>body.insertAdjacentHTML('beforeend',appendix('Nursing quick links',nursingLinks)));
    updateContent(pages,liaisonPath,body=>body.insertAdjacentHTML('beforeend',appendix('Resources for staff',[
      ['Aboriginal and Torres Strait Islander liaison resources',documentCategoryLink(liaisonCategory),'Preview or download the staff reference.']
    ])));
    updateContent(pages,'scorm/intranet/staff-repository/index.html',body=>{
      for(const anchor of body.querySelectorAll('a[href]')){
        const title=anchor.textContent.trim();
        const category=title==='ATSI liaison services'?liaisonCategory:title;
        if([liaisonCategory,'Allied health','Interpreting services','Laboratory technologies','Nursing'].includes(category)){
          anchor.textContent=category;
          anchor.setAttribute('href',documentCategoryLink(category));
        }
      }
    });
    for (const department of departmentData) {
      const desk = serviceDesks[department.id];
      if (!desk) continue;
      const record = pages.find(page => page.path === department.source);
      const previousTitle = record.title;
      record.title = department.name;
      const keywords = [...desk.resources, ...desk.related].map(([title,, detail]) => title + ' ' + detail);
      record.text = [previousTitle, department.source.split('/').at(-2).replaceAll('-', ' '), desk.summary,
        desk.primary[0], desk.room[2], ...keywords].join(' ');
    }
    // Both chart renderers resolve service destinations from the archived chart anchors.
    for(const record of pages.filter(p=>p.html.includes('org-department-unlinked')&&p.html.includes('Allied health'))){
      updateContent(pages,record.path,body=>{
        for(const label of body.querySelectorAll('.org-department-unlinked > div')){
          if(label.textContent.trim()==='Allied health')label.innerHTML=link(absolute(alliedPath),'Allied health');
        }
      });
    }
  }

  function restoreReferencePanels(identifier) {
    const toggles=[...main.querySelectorAll('.reference-toggle')];
    const state=history.state;
    const open=state?.referencePanels?.[identifier] || (identifier===laboratoryTools && state?.laboratoryPanels) || [];
    for(const button of toggles){
      const id=button.getAttribute('aria-controls');
      const panel=document.getElementById(id);
      if(!panel)continue;
      if(open.includes(id)) {
        button.setAttribute('aria-expanded','true');
        button.classList.remove('collapsed');
        panel.hidden=false;
      }
      button.addEventListener('click',()=>{
        // The delegated collapse handler toggles this button as the same click bubbles to main.
        const ids=toggles.filter(toggle=>toggle===button ? toggle.getAttribute('aria-expanded')!=='true' :
          toggle.getAttribute('aria-expanded')==='true').map(toggle=>toggle.getAttribute('aria-controls'));
        history.replaceState({...history.state,referencePanels:{...history.state?.referencePanels,[identifier]:ids}},'');
      });
    }
  }

  function renderDepartments() {
    const sorted=[...departmentData].sort((a,b)=>a.name.localeCompare(b.name,'en-AU'));
    main.innerHTML=intro('Departments','Find a team, its services and the resources you need.')+
      '<ul class="department-directory">'+sorted.map(department=>
        '<li><a href="#department/'+esc(department.id)+'"><span><strong>'+esc(department.name)+'</strong><span>'+esc(department.description)+'</span></span><span class="department-arrow" aria-hidden="true">→</span></a></li>'
      ).join('')+'</ul>';
  }

  function rewriteInterpretingScenario(doc) {
    const scenario=doc?.getElementById('BranchingScenario');
    if(!scenario)return;
    const panel=id=>scenario.querySelector('#collapse'+id+' .card-body');
    const label=(id,destination,title)=>{
      const choice=panel(id)?.querySelector('[data-target="#collapse'+destination+'"]');
      if(choice)choice.textContent=title;
    };
    // Keep the original video players, character table, branch controls and progress indicators.
    function narrative(id,title,paragraphs) {
      const card=panel(id);
      if(!card)return;
      for(const old of card.querySelectorAll(':scope > h2,:scope > h3,:scope > p:not(.video-fallback),:scope > ul:not(.button-list)'))old.remove();
      if(title){
        const heading=doc.createElement('h3');
        heading.textContent=title;
        card.prepend(heading);
      }
      const reference=card.querySelector('.table-responsive,.button-list');
      for(const line of paragraphs){
        const p=doc.createElement('p');
        p.textContent=line;
        card.insertBefore(p,reference);
      }
    }
    doc.querySelector('.instruction')?.remove();
    const introduction=doc.querySelector('article .MsoNormal')?.parentElement;
    if(introduction){
      const paragraph=doc.createElement('p');
      paragraph.textContent='Follow an interpreter through a cardiology appointment. Choose how to respond at three points in the consultation.';
      introduction.replaceChildren(paragraph);
    }
    narrative(1,'The appointment',['Mrs Trang is seeing a cardiologist to discuss her results. Her grandson, Parker, is with her. An interpreter has been booked.']);
    narrative(2,'Your role',['You are the interpreter. Consider how to prepare for the appointment and how Mrs Trang and the cardiologist can each be heard accurately.']);
    narrative(3,'How it works',['Watch each scene, then choose how you would respond. Explore another response by replaying the scene.']);
    narrative(4,'At the consultation room',['Parker tells the cardiologist he can interpret for his grandmother. The interpreter who was booked has not yet arrived.']);
    label(5,6,'A. Wait for the booked interpreter to arrive.');
    label(5,7,'B. Continue with Parker interpreting for his grandmother.');
    narrative(6,'Working with the booked interpreter',['The interpreter can convey the discussion between Mrs Trang and the cardiologist. Parker can take part as a family member in the way Mrs Trang chooses.']);
    narrative(7,'Relying on a family member',['Asking Parker to interpret a discussion of medical results introduces a risk that detail will be lost. Return to the scene and consider the support already arranged for Mrs Trang.']);
    narrative(8,'Before entering the room',['The interpreter meets the cardiologist outside the consultation room. The cardiologist wants to begin straight away.']);
    label(9,10,'A. Ask the cardiologist for a short briefing on the purpose of the consultation and any specialist terms before entering.');
    label(9,11,'B. Go straight into the consultation using the details on the booking form.');
    narrative(10,'Pre-consultation briefing',['A briefing lets you clarify the purpose of the consultation and any unfamiliar terms before you interpret for the patient.']);
    narrative(11,'Starting with the booking form alone',['The booking form gives you some background. Going straight in leaves no opportunity to clarify terms with the cardiologist beforehand. Replay the arrival, then choose again.']);
    narrative(13,'A request from the family',['The cardiologist discusses Mrs Trang’s blood pressure and a follow-up appointment. Parker asks you to make the information sound less serious because he is worried his grandmother will be upset.']);
    label(14,15,'A. Explain your role and interpret what the cardiologist says, preserving the meaning.');
    label(14,16,'B. Use softer wording that makes the cardiologist’s concern sound less serious.');
    narrative(15,'Preserving the speaker’s meaning',['Conveying the cardiologist’s concern accurately allows Mrs Trang to hear the same information and ask her own questions.']);
    narrative(16,'Changing the message',['Softening the concern changes what Mrs Trang hears. Revisit the scene and choose how to respond to Parker while preserving the meaning of the cardiologist’s message.']);
  }

  function enhance(path,identifier) {
    if(identifier===interpretingScenario){
      const frame=main.querySelector('.embedded-page');
      if(frame){
        const refresh=()=>rewriteInterpretingScenario(frame.contentDocument);
        frame.addEventListener('load',refresh);
        refresh();
      }
    }
    const index=stories.indexOf(identifier);
    if(index!==-1){
      const storyLink=(target,label)=>target?'<a href="'+pageLink(target)+'"><span>'+label+'</span><strong>'+esc(pageMap.get(target).title)+'</strong></a>':'';
      main.insertAdjacentHTML('beforeend','<nav class="staff-story-nav" aria-label="Browse news stories">'+
        storyLink(stories[index-1],'Previous story')+link('#news','All staff news')+storyLink(stories[index+1],'Next story')+'</nav>');
    }
    if(path==='department/nursing') {
      main.querySelector('.resource-list')?.insertAdjacentHTML('beforeend',nursingLinks.map(([title,href,description])=>row(title,href,description,'Resource')).join(''));
    }
    if(path==='department/liaison'||path==='department/allied-health'){
      const allied=path==='department/allied-health';
      const title=allied?'Working with allied health':'Aboriginal and Torres Strait Islander liaison resources';
      const href=documentCategoryLink(allied?'Allied health':liaisonCategory);
      main.querySelector('.resource-list')?.insertAdjacentHTML('beforeend',row(title,href,'Preview or download the staff reference.','Staff guide'));
    }
    if(referenceLibraries[identifier]){
      restoreReferencePanels(identifier);
      const tools=main.querySelector('.page-tools');
      if(tools)main.querySelector('.page-intro')?.append(tools);
    }
    if(path==='home'||identifier==='scorm/intranet/index.html'||identifier==='index.html'){
      main.querySelector('.notice-list')?.insertAdjacentHTML('beforeend','<li><span class="list-label">INFECTION CONTROL</span>'+
        link(pageLink(news('influenza-outbreak')),'Influenza outbreak')+'<p>Read the earlier staff update and find infection control resources.</p></li>');
    }
  }
  return {initialize,enhance,renderDepartments};
})();
function initializeResourceUpdates(catalog) { staffResources.initialize(catalog); }
function enhanceResourceView(path,identifier) { staffResources.enhance(path,identifier); }
