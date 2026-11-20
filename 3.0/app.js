'use strict';
const ROOT = new URL('../', document.baseURI);
const main = document.querySelector('#main');
let data, pageMap, documentMap, documentByHref, saveTimer, renderToken = 0;
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const absolute = path => new URL(path, ROOT).href;
const pageLink = path => '#page/' + encodeURIComponent(publicPagePath(path));
const savedKey = 'bagwan3-saved-items';
let saved;
try { saved = new Set(JSON.parse(localStorage.getItem(savedKey) || '[]')); } catch { saved = new Set(); }
const iconPaths = {
  preview:'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
  download:'M12 3v12m-5-5 5 5 5-5M4 16v4h16v-4', bookmark:'M6 3h12v18l-6-4-6 4z',
  close:'M6 6l12 12M18 6 6 18', arrowUp:'M12 19V5m-6 6 6-6 6 6', arrowDown:'M12 5v14m-6-6 6 6 6-6',
  external:'M14 3h7v7m0-7L10 14m0-9H4v15h15v-6',
  home:'M3 10 12 3l9 7M5 9v12h5v-7h4v7h5V9', departments:'M3 21V5h11v16M14 10h7v11M7 9h3M7 13h3M7 17h3M17 14h1M17 18h1',
  people:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M15 3a4 4 0 0 1 0 8M22 21v-2a4 4 0 0 0-3-4M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  policies:'M6 3h9l4 4v14H6zM14 3v5h5M9 12h7M9 16h7', forms:'M8 4H4v17h16V4h-4M8 2h8v5H8zM8 12h8M8 16h5',
  resources:'M3 4h7l2 3h9v14H3zM8 11h8M8 15h5', tour:'M3 5l6-2 6 2 6-2v16l-6 2-6-2-6 2zM9 3v16M15 5v16',
  news:'M4 3h16v18H4zM8 7h8M8 11h8M8 15h4M8 18h8', incident:'M12 3 2 21h20zM12 9v5M12 17v1', search:'M15 15l6 6M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0'
};
const icon = name => '<span class="nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="' + (iconPaths[name] || iconPaths.resources) + '"></path></svg></span>';
const nav = [['home','Staff home'],['departments','Departments'],['people','People directory'],['policies','Policies & procedures'],['forms','Forms & records'],['resources','Resources'],['tour','Hospital tour'],['news','News & updates']];
document.querySelector('#main-nav').innerHTML = nav.map(([id,label]) => '<a href="#' + id + '" data-nav="' + id + '">' + icon(id) + esc(label) + '</a>').join('');
const departmentData = [
  {id:'hr',name:'People & culture',source:'scorm/department-pages/hr-services/index.html',description:'Staff support, workplace policies and meeting resources.',group:'People and Culture',image:'wp-content/uploads/2019/12/happy-admin-staff.jpg'},
  {id:'nursing',name:'Nursing',source:'scorm/department-pages/nursing/index.html',description:'Patient records, care documentation and clinical communication.',group:'Nursing'},
  {id:'laboratory',name:'Laboratory technologies',source:'scorm/department-pages/lab-technologies/index.html',description:'Laboratory documents, safety references and services.',group:'Laboratory technologies'},
  {id:'interpreting',name:'Interpreting services',source:'scorm/department-pages/interpreting-office/index.html',description:'Language services, interpreter resources and communication support.',group:'Interpreting department'},
  {id:'logistics',name:'Logistics',source:'scorm/department-pages/logisitics/index.html',description:'Logistics, risk management and emergency preparedness.',group:'Logistics and emergency preparedness'},
  {id:'liaison',name:'Aboriginal & Torres Strait Islander liaison',source:'aboriginal-and-torres-strait-islander-liaison-office/index.html',description:'Liaison service overview and cultural safety resources.',group:'Aboriginal and Torres Strait Islander liaison office'}
];
function toast(message) { const node=document.querySelector('.toast');node.textContent=message;node.classList.add('visible');clearTimeout(saveTimer);saveTimer=setTimeout(()=>node.classList.remove('visible'),2600); }
function saveButton(id,title) { const active=saved.has(id);return '<button class="save-button" type="button" data-save="'+esc(id)+'" data-title="'+esc(title)+'" aria-label="'+(active?'Remove saved item: ':'Save item: ')+esc(title)+'" aria-pressed="'+active+'">'+(active?'★':'☆')+'</button>'; }
function intro(title,description,eyebrow='STAFF INTRANET') { return '<div class="page-intro"><div><p class="eyebrow">'+esc(eyebrow)+'</p><h1>'+esc(title)+'</h1><p>'+esc(description)+'</p></div></div>'; }
function footer() { return '<footer class="footer-note"><a href="learning-guide.html">Learning guide</a><br>We acknowledge the Wurundjeri people of the Kulin Nations and pay our respects to Elders past and present.</footer>'; }
function row(title,href,description,kind,id) { return '<li class="resource-row"><div><span class="kind">'+esc(kind)+'</span><h2><a href="'+esc(href)+'">'+esc(title)+'</a></h2><p>'+esc(description)+'</p></div>'+(id?saveButton(id,title):'')+'</li>'; }
function empty(message='No results match your search.') { return '<div class="empty-state"><h2>'+esc(message)+'</h2><p>Try a name, department or shorter phrase. You can also browse the sections in the navigation.</p></div>'; }
function matches(text,query) { return query.toLocaleLowerCase().trim().split(/\s+/).every(word=>text.toLocaleLowerCase().includes(word)); }
function wireFilter(items,render,filters='') {
  const params=new URLSearchParams(location.hash.split('?')[1] || '');
  main.insertAdjacentHTML('beforeend','<div class="toolbar"><label class="sr-only" for="list-search">Search this section</label><input class="field-search" type="search" id="list-search" placeholder="Search this section" value="'+esc(params.get('query')||'')+'">'+filters+'</div><p id="result-count" class="result-count" role="status"></p><div id="results"></div>');
  const update=()=>{const query=document.querySelector('#list-search').value;const filter=document.querySelector('#category-filter')?.value||'';const found=items.filter(item=>matches(item.search,query)&&(!filter||item.filter===filter));document.querySelector('#results').innerHTML=found.length?render(found):empty();document.querySelector('#result-count').textContent=found.length+' '+(found.length===1?'result':'results');};
  document.querySelector('#list-search').addEventListener('input',update);document.querySelector('#category-filter')?.addEventListener('change',update);update();
}
function home() {
  const ceo='scorm/intranet/news-feed/update-from-the-ceo/index.html';
  main.innerHTML=intro('Staff home','People, information and services across Bagwan Health.')+
    '<div class="action-links">'+[['policies','Policies & procedures','policies'],['forms','Forms & records','forms'],['people','Find a colleague','people'],['page/'+encodeURIComponent('scorm/quick-link-pages/incident-reporting/index.html'),'Report an incident','incident']].map(([route,label,i])=>'<a class="action-link" href="#'+route+'">'+icon(i)+'<span>'+label+'</span></a>').join('')+'</div>'+
    '<div class="home-columns"><section aria-labelledby="updates-title"><div class="section-heading"><h2 id="updates-title">Hospital updates</h2><a href="#news">All updates</a></div><article class="feature-news"><a href="'+pageLink(ceo)+'"><div class="feature-photo"><img src="'+absolute('wp-content/uploads/2019/12/happy-hospital-staff.jpg')+'" alt="Hospital colleagues working together" width="1000" height="576"></div><div class="feature-copy"><p class="eyebrow">CEO UPDATE</p><h3>An update from our CEO</h3><p>Hospital upgrades, our community and the work happening across Bagwan Health.</p><span class="text-link">Read the update</span></div></a></article></section>'+
    '<aside aria-labelledby="staff-resources-title"><div class="section-heading"><h2 id="staff-resources-title">Staff resources</h2></div><ul class="notice-list"><li><span class="list-label">PEOPLE & CULTURE</span><a href="#department/hr">Support for your working day</a><p>HR documents, workplace resources and meeting guides.</p></li><li><span class="list-label">LANGUAGE SERVICES</span><a href="'+pageLink('scorm/quick-link-pages/policy-and-procedures/booking-an-interpreter/index.html')+'">Arranging an interpreter</a><p>What to record when requesting an interpreter.</p></li><li><span class="list-label">PATIENT CARE</span><a href="#forms">Records and observation forms</a><p>Access the patient system and care documentation.</p></li></ul><div class="hospital-feature"><h3>Find your way around</h3><p>Explore departments and spaces in the virtual hospital.</p><a href="#tour">Open the hospital tour</a></div></aside></div>'+
    '<section class="home-bottom"><div class="section-heading"><h2>Across the hospital</h2><a href="#departments">All departments</a></div><div class="department-links">'+departmentData.map(d=>'<a href="#department/'+d.id+'">'+esc(d.name)+'<span>View</span></a>').join('')+'</div></section>';
}
function departments() { main.innerHTML=intro('Departments','Find a team, its services and the resources you need.');main.innerHTML+='<ul class="resource-list">'+departmentData.map(d=>row(d.name,'#department/'+d.id,d.description,'Department')).join('')+'</ul>'; }
function department(id) {
  if(id==='hr')return renderHRDepartment();
  const d=departmentData.find(d=>d.id===id);if(!d)return notFound();
  main.innerHTML='<p class="breadcrumbs"><a href="#departments">Departments</a> / '+esc(d.name)+'</p>'+intro(d.name,d.description,'DEPARTMENT');
  const relevant=data.hierarchy.filter(p=>p.name && p.department===d.group);
  const resources=[['Service information',pageLink(d.source),'Department contacts and resources.']];
  if(id==='laboratory')resources.push(['Laboratory PPE reference',pageLink('scorm/department-pages/lab-technologies/ppe-safety-activity/index.html'),'Check the protective equipment required for the task.'],['Laboratory waste reference',pageLink('scorm/department-pages/lab-technologies/waste-management/index.html'),'Identify the appropriate waste stream.'],['Laboratory documents','#documents?query=laboratory','Local documents and templates.']);
  if(id==='interpreting')resources.push(['Booking an interpreter',pageLink('scorm/quick-link-pages/policy-and-procedures/booking-an-interpreter/index.html'),'Prepare a request and follow up on the booking.'],['Interpreting resources','#search?query=interpreting','Policies, people and resources.']);
  if(id==='nursing')resources.push(['Forms and patient records','#forms','Patient system and observation forms.'],['Clinical handover',pageLink('scorm/quick-link-pages/policy-and-procedures/nursing-and-clinical-handover/index.html'),'Prepare the handover and agree the next action with the receiving colleague.']);
  if(id==='liaison')resources.push(['Closing the Gap','#videos?query=Closing%20the%20Gap','Melbourne Health video resource.']);
  main.innerHTML+='<div class="two-columns"><section><h2>Services and resources</h2><ul class="resource-list">'+resources.map(([title,href,description])=>row(title,href,description,'Resource')).join('')+'</ul></section><aside class="context-panel"><h2>Our people</h2>'+(relevant.length?'<ul>'+relevant.map(p=>'<li><strong><a href="'+esc(personLink(p))+'">'+esc(p.name)+'</a></strong><br>'+esc(p.role)+'</li>').join('')+'</ul><a class="small-link" href="#people?query='+encodeURIComponent(d.group)+'">View in the people directory</a>':'<p>No team members are listed for this service.</p>')+'</aside></div>';
}
const policyIndexPath='scorm/quick-link-pages/policy-and-procedures/index.html';
function policies() {
  main.innerHTML=intro('Policies & procedures','Browse hospital policies and departmental procedures.');
  const items=data.pages.filter(p=>p.category==='Policy').map(p=>({...p,search:p.title+' '+p.text,filter:policyScope(p)}));
  wireFilter(items,found=>'<ul class="resource-list">'+found.map(policyResult).join('')+'</ul>','<label class="sr-only" for="category-filter">Policy scope</label><select class="field-search" id="category-filter"><option value="">All policies</option><option>Hospital wide</option><option>Departmental</option></select>');
  main.insertAdjacentHTML('beforeend','<p class="policy-index-link"><a href="'+pageLink(policyIndexPath)+'">Policy governance framework</a></p>');
}
function forms() {
  main.innerHTML=intro('Forms & records','Access patient records, observation forms and staff templates.');
  const items=[['Patient records','patient-management-system/patient-database/index.html','Open the patient list and view individual records.'],['Pain observation — Abbey scale','patient-management-system/abbeyscale/index.html','Record observations and review the calculated total.'],['Food and fluids record','patient-management-system/foodrecord/index.html','Record observations in repeatable entries.'],['Personal care record','patient-management-system/personalcare/index.html','Record care observations and daily living information.'],['Continence record','patient-management-system/continence/index.html','Record observations by day and hour.'],['Incident report','scorm/quick-link-pages/incident-reporting/index.html','Create a local draft of an incident report.'],['Staff messageboard','patient-management-system/messageboard/index.html','Read the supplied scenario correspondence.']];
  main.innerHTML+='<ul class="resource-list">'+items.map(([title,path,description])=>row(title,pageLink(path),description,'Form or record','page:'+path)).join('')+row('Staff forms and templates','#documents','Download HR, administration and other workplace templates.','Document library')+'</ul>';
}
function resources() {
  main.innerHTML=intro('Resources','Reference material, documents and video across the hospital.');
  main.innerHTML+='<ul class="resource-list">'+row('Documents & templates','#documents','Browse local policy files, workplace forms and templates.','Library')+row('Video library','#videos','Staff meeting, liaison and other hospital videos.','Video')+row('Laboratory PPE reference',pageLink('scorm/department-pages/lab-technologies/ppe-safety-activity/index.html'),'PPE depends on the task and its risk assessment.','Safety reference')+row('Laboratory waste reference',pageLink('scorm/department-pages/lab-technologies/waste-management/index.html'),'Confirm classification using the local waste procedure.','Safety reference')+row('Interpreting services resources',pageLink('resources-and-tools/interpreting-services/index.html'),'Language service references and information.','Reference')+row('Hospital organisation chart',pageLink('scorm/intranet/static-org-chart-test/index.html'),'Explore departments and reporting relationships.','People')+'</ul>';
}
function videos() {
  main.innerHTML=intro('Video library','Watch the supplied hospital, meeting and liaison resources.');
  wireFilter(data.videos.map(v=>({...v,search:v.title})),found=>'<div class="video-grid">'+found.map(v=>'<article><h2>'+esc(v.title)+'</h2><iframe title="'+esc(v.title)+'" loading="lazy" src="https://www.youtube.com/embed/'+v.youtube_id+'?rel=0" allow="encrypted-media; picture-in-picture; web-share" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe><p><a href="https://www.youtube.com/watch?v='+v.youtube_id+'" target="_blank" rel="noopener">Watch on YouTube</a> · <a href="'+pageLink(v.source_page)+'">Related resource</a></p>'+saveButton('video:'+v.youtube_id,v.title)+'</article>').join('')+'</div>');
}
function search() {
  main.innerHTML=intro('Search the intranet','Search people, pages, policies, documents and video.');
  const items=[...data.pages.map(p=>({policy:p.category==='Policy'?p:null,title:p.title,href:pageLink(p.path),description:p.category,id:'page:'+p.path,filter:p.category,search:p.title+' '+p.text})),...data.hierarchy.filter(p=>p.name).map(p=>({title:p.name,href:personLink(p),description:p.role+' · '+p.department,id:'person:'+p.id,filter:'Person',search:p.name+' '+p.role+' '+p.department})),...data.documents.map(d=>({title:d.name,document:d,description:d.original_folder_path,id:'doc:'+d.local_path,filter:'Document',search:d.name+' '+d.original_folder_path})),...data.videos.map(v=>({title:v.title,href:'#videos?query='+encodeURIComponent(v.title),description:'YouTube video',id:'video:'+v.youtube_id,filter:'Video',search:v.title}))];
  const kinds=[...new Set(items.map(x=>x.filter))].sort();
  wireFilter(items,found=>'<ul class="resource-list">'+found.map(p=>p.document?documentResult(p.document):p.policy?policyResult(p.policy):row(p.title,p.href,p.description,p.filter,p.id)).join('')+'</ul>','<label class="sr-only" for="category-filter">Result type</label><select class="field-search" id="category-filter"><option value="">All result types</option>'+kinds.map(k=>'<option>'+esc(k)+'</option>').join('')+'</select>');
}
function savedItems() {
  main.innerHTML=intro('Saved items','Your shortcuts are stored in this browser.');
  const items=[];
  for(const key of saved){const [type,...parts]=key.split(':');const id=parts.join(':');if(type==='page'){const p=pageMap.get(id);if(p)items.push(p.category==='Policy'?policyResult(p):row(p.title,pageLink(id),p.category,'Saved page',key));}else if(type==='doc'){const d=documentMap.get(id);if(d)items.push(documentResult(d));}else if(type==='video'){const v=data.videos.find(v=>v.youtube_id===id);if(v)items.push(row(v.title,'#videos?query='+encodeURIComponent(v.title),'Video resource','Saved video',key));}else if(type==='person'){const p=data.hierarchy.find(p=>p.id===id||p.name===id);if(p)items.push(row(p.name||p.role,personLink(p),p.role,'Saved person',key));}}
  main.innerHTML+=items.length?'<ul class="resource-list">'+items.join('')+'</ul>':empty('No saved items yet.');
}
// Update the actual destination so keyboard, context-menu and tour links also open 3.0.
function routeFrameLinks(doc) {
  function rewrite(anchor) {
    const href=anchor.getAttribute('href');
    if(!href || href.startsWith('#') || anchor.hasAttribute('download') || anchor.hasAttribute('data-toggle'))return;
    const url=new URL(href,doc.baseURI);
    if(url.origin!==ROOT.origin || !url.pathname.startsWith(ROOT.pathname))return;
    const path=decodeURIComponent(url.pathname.slice(ROOT.pathname.length)).replace(/(^|\/)$/, '$1index.html');
    if(!pageMap.has(path))return;
    anchor.href=new URL(withDepartment(pageLink(path)),document.baseURI).href;
    anchor.target='_top';
  }
  doc.querySelectorAll('a[href]').forEach(rewrite);
  const changes=new MutationObserver(records=>{
    for(const record of records)for(const node of record.addedNodes){
      if(node.nodeType!==1)continue;
      if(node.matches('a[href]'))rewrite(node);
      node.querySelectorAll('a[href]').forEach(rewrite);
    }
  });
  changes.observe(doc.body,{childList:true,subtree:true});
  doc.defaultView.addEventListener('pagehide',()=>changes.disconnect(),{once:true});
}
function setupEmbeddedFrame(frame,record) {
  frame.addEventListener('load',()=>{
    try{
      const doc=frame.contentDocument;
      if(record.path.startsWith('VR/')){frame.style.height='clamp(360px,78dvh,660px)';return;}
      routeFrameLinks(doc);
      const style=doc.createElement('style');style.textContent='html,body{background:#fff!important;overflow-x:hidden!important}body{margin:0!important;padding:0!important;min-width:0!important}#sidebar,#showRightPush,#banner,#breadcrumbs,.patient-navigation,.clinical-header-wrap,.patient-header,body>header,body>footer,.footer,.back-to-top,#content>header,#content>.wrapper,main>h1:first-child{display:none!important}#content{margin:0!important;padding:0!important;left:0!important;width:100%!important}#content>.container,main,.page,.container{max-width:100%!important;width:100%!important;margin-inline:auto!important}main{padding:24px!important}body.patient-system .page{padding:20px!important}.wrapper{padding:0!important}';doc.head.append(style);
      if(record.path.startsWith('patient-management-system/'))enhancePatientFrame(frame,record);
      const toolbar=doc.querySelector('.static-form-tools,.clinical-form-tools');
      doc.querySelectorAll('p.simulation-note').forEach(note=>note.remove());
      const status=toolbar?.querySelector('[role="status"]');
      if(status?.textContent.startsWith('Training simulation.'))status.textContent='';
      if(toolbar&&doc.querySelector('input,select,textarea')){
        const clear=doc.createElement('button');clear.type='button';clear.textContent='Clear local draft';
        clear.addEventListener('click',()=>{if(frame.contentWindow.confirm('Clear the draft for this form in this browser? Download a copy first if you need to keep it.')){try{frame.contentWindow.localStorage.removeItem('bagwan-draft:'+frame.contentWindow.location.pathname);frame.contentWindow.location.reload();}catch{toast('The browser could not clear this draft.');}}});toolbar.append(clear);
      }
      const resize=()=>{if(!frame.isConnected)return;const height=Math.max(600,doc.body.scrollHeight+30);if(Math.abs(frame.getBoundingClientRect().height-height)>5)frame.style.height=height+'px';};
      const observer=new ResizeObserver(()=>requestAnimationFrame(resize));observer.observe(doc.body);resize();
    }catch{frame.style.height='800px';}
  });
}
function article(path) {
  const record=pageMap.get(path);if(!record)return notFound();
  if(path==='scorm/department-pages/hr-services/index.html')return renderHRDepartment();
  if(path==='scorm/intranet/news-feed/index.html')return renderNews();
  if(path==='scorm/intranet/our-community/index.html')return renderCommunity(record);
  if(path==='index.html'||path==='scorm/intranet/index.html')return home();
  if(path.includes('staff-directory-2/'))return renderPeopleDirectory();
  if(renderTeamChart(path))return;
  if(path==='documents/index.html'||path==='scorm/intranet/staff-repository/index.html'||data.document_folders?.[path]){
    const folder=data.document_folders?.[path];
    const first=data.documents.find(doc=>doc.original_folder_path===folder);
    const params=new URLSearchParams();
    if(first)params.set('category',documentCategory(first));
    replaceSectionHash('#documents'+(params.size?'?'+params:''));
    return documents();
  }
  main.innerHTML='<p class="breadcrumbs"><a href="#home">Staff home</a> / '+esc(record.category)+'</p>'+intro(record.title,'',record.category.toUpperCase());
  main.innerHTML+='<div class="page-tools">'+(record.category==='Policy'?policyActions(record):'')+
    (path===policyIndexPath?'<a class="small-link" href="#policies">Browse all policies</a>':'')+saveButton('page:'+path,record.title)+'</div>';
  if(record.mode==='embed'){
    const frame=document.createElement('iframe');frame.className='embedded-page';frame.title=record.title;frame.allowFullscreen=true;setupEmbeddedFrame(frame,record);frame.src=path.startsWith('VR/')?tourFrameUrl(absolute(path)):absolute(path);main.append(frame);
  }else{
    const article=document.createElement('article');article.className='content-document';article.innerHTML=record.html;main.append(article);adaptContent(article,path);
    if(record.category==='Policy'){
      const original=documentMap.get(record.policy_document);
      const sourceLink=article.querySelector(':scope > p:first-child > a[download]');
      if(original && sourceLink?.href===absolute(original.local_href))sourceLink.parentElement.remove();
      const headings=[...article.querySelectorAll('h2,h3')].filter(h=>h.textContent.trim());
      if(headings.length>=3){const contents=document.createElement('details');contents.className='contents-nav';contents.innerHTML='<summary>On this page</summary><ul>'+headings.map((h,i)=>{h.id=h.id||'policy-section-'+i;return '<li><a href="#'+esc(h.id)+'">'+esc(h.textContent.trim())+'</a></li>';}).join('')+'</ul>';article.prepend(contents);}
    }
  }

}
function adaptContent(container,sourcePath) {
  for(const a of container.querySelectorAll('a[href]')){
    const raw=a.getAttribute('href');if(raw.startsWith('#'))continue;
    const url=new URL(raw,ROOT);
    if(url.origin===ROOT.origin&&url.pathname.startsWith(ROOT.pathname)){
      const path=decodeURIComponent(url.pathname.slice(ROOT.pathname.length));const target=path.endsWith('/')?path+'index.html':path;
      a.href=pageMap.has(target)?pageLink(target):url.href;
      if(sourcePath===policyIndexPath && pageMap.get(target)?.category==='Policy'){
        a.parentElement.classList.add('policy-index-entry');
        a.insertAdjacentHTML('afterend',policyActions(pageMap.get(target)));
      }
      const file=documentByHref.get(target);
      if(file){
        a.href=absolute(file.local_href);
        a.download='';
        if(a.closest('.document-list'))a.insertAdjacentHTML('afterend',documentPreviewButton(file));
      }
      if(pageMap.has(target))a.removeAttribute('target');
    }else if(['http:','https:'].includes(url.protocol)){a.href=url.href;a.target='_blank';a.rel='noopener';}
  }
  for(const img of container.querySelectorAll('img[src]'))img.src=new URL(img.getAttribute('src'),ROOT).href;
  for(const frame of container.querySelectorAll('iframe[src]')){
    const url=new URL(frame.getAttribute('src'),ROOT);
    const path=decodeURIComponent(url.pathname.slice(ROOT.pathname.length));
    if(url.origin===ROOT.origin&&path.startsWith('resources-and-tools/')&&pageMap.has(path)){
      const link=document.createElement('a');link.className='button secondary';link.href=pageLink(path);link.textContent='Open '+pageMap.get(path).title+' resources';frame.replaceWith(link);
    }else if(url.origin===ROOT.origin && path.startsWith('VR/') && pageMap.has(path)){
      frame.title=pageMap.get(sourcePath)?.title || 'Hospital tour';
      setupEmbeddedFrame(frame,pageMap.get(path));frame.src=tourFrameUrl(url);
    }else{frame.src=url.href;}
  }
  const panels=container.querySelectorAll('[role=tabpanel]');panels.forEach((panel,i)=>{panel.hidden=i!==0;});
  for(const toggle of container.querySelectorAll('[data-toggle=collapse]')){const id=(toggle.getAttribute('data-target')||toggle.getAttribute('href')||'').replace(/^#/,'');const panel=container.querySelector('[id="'+CSS.escape(id)+'"]');if(panel){panel.hidden=true;toggle.setAttribute('aria-expanded','false');}}
  const documentSearch=container.querySelector('input[type=search]');
  if(documentSearch)documentSearch.addEventListener('input',()=>{const rows=[...container.querySelectorAll('.document-list li')];rows.forEach(row=>{row.hidden=!matches(row.textContent,documentSearch.value);});const status=container.querySelector('#document-results');if(status)status.textContent=rows.filter(row=>!row.hidden).length+' documents';});
}
function notFound() { main.innerHTML=intro('Page not found','This address does not match an intranet page.')+'<a class="button" href="#home">Return to staff home</a>'; }
function setDrawer(open) {document.body.classList.toggle('nav-open',open);document.querySelector('.menu-toggle').setAttribute('aria-expanded',String(open));document.querySelector('.menu-toggle').setAttribute('aria-label',open?'Close navigation':'Open navigation');document.querySelector('.nav-backdrop').hidden=!open;main.inert=open;if(open)document.querySelector('#main-nav a').focus();}
document.querySelector('.menu-toggle').addEventListener('click',()=>setDrawer(!document.body.classList.contains('nav-open')));
document.querySelector('.nav-backdrop').addEventListener('click',()=>{setDrawer(false);document.querySelector('.menu-toggle').focus();});
document.addEventListener('keydown',event=>{if(!document.body.classList.contains('nav-open'))return;if(event.key==='Escape'){setDrawer(false);document.querySelector('.menu-toggle').focus();}if(event.key==='Tab'){const nodes=[document.querySelector('.menu-toggle'),...document.querySelectorAll('#sidebar a')];const index=nodes.indexOf(document.activeElement);if(event.shiftKey&&index<=0){event.preventDefault();nodes.at(-1).focus();}else if(!event.shiftKey&&index===nodes.length-1){event.preventDefault();nodes[0].focus();}}});
window.matchMedia('(min-width:851px)').addEventListener('change',event=>{if(event.matches)setDrawer(false);});
document.addEventListener('pointerdown',event=>{const target=event.target.closest('.button,.action-link,#main-nav a');if(!target||matchMedia('(prefers-reduced-motion:reduce)').matches)return;target.classList.add('ripple-host');const ripple=document.createElement('span');ripple.className='material-ripple';ripple.setAttribute('aria-hidden','true');const rect=target.getBoundingClientRect();ripple.style.left=(event.clientX-rect.left)+'px';ripple.style.top=(event.clientY-rect.top)+'px';target.append(ripple);setTimeout(()=>ripple.remove(),600);});
document.querySelector('.skip-link').addEventListener('click',event=>{event.preventDefault();main.dataset.skipFocus='';main.focus();main.scrollIntoView({block:'start'});});
document.querySelector('#global-search').addEventListener('submit',event=>{event.preventDefault();location.hash='search?query='+encodeURIComponent(document.querySelector('#search').value.trim());});
main.addEventListener('click',event=>{
  const policyPreview=event.target.closest('[data-policy-preview]');
  if(policyPreview){openPolicyPreview(pageMap.get(policyPreview.dataset.policyPreview));return;}
  const preview=event.target.closest('[data-preview]');
  if(preview){openDocumentPreview(documentMap.get(preview.dataset.preview));return;}
  const button=event.target.closest('[data-save]');
  if(button){const id=button.dataset.save;if(saved.has(id))saved.delete(id);else saved.add(id);try{localStorage.setItem(savedKey,JSON.stringify([...saved]));toast(saved.has(id)?'Added to saved items':'Removed from saved items');}catch{toast('Browser storage is unavailable. This shortcut will last for this visit.');}const active=saved.has(id);button.setAttribute('aria-pressed',String(active));button.setAttribute('aria-label',(active?'Remove saved item: ':'Save item: ')+button.dataset.title);if(button.classList.contains('doc-action'))button.innerHTML=icon('bookmark');else button.textContent=active?'★':'☆';if(button.hasAttribute('title'))button.title=button.getAttribute('aria-label');if(location.hash.startsWith('#saved'))savedItems();return;}
  const tab=event.target.closest('[data-toggle=tab]');if(tab){event.preventDefault();const container=tab.closest('.content-document');const target=tab.getAttribute('data-target')||tab.getAttribute('href');container.querySelectorAll('[role=tabpanel]').forEach(panel=>{panel.hidden='#'+panel.id!==target;});container.querySelectorAll('[role=tab]').forEach(control=>{control.setAttribute('aria-selected',String(control===tab));control.tabIndex=control===tab?0:-1;});return;}
  const toggle=event.target.closest('[data-toggle=collapse]');if(toggle){event.preventDefault();const id=(toggle.getAttribute('data-target')||toggle.getAttribute('href')||'').replace(/^#/,'');const panel=main.querySelector('[id="'+CSS.escape(id)+'"]');if(panel){panel.hidden=!panel.hidden;toggle.setAttribute('aria-expanded',String(!panel.hidden));}return;}
  const a=event.target.closest('.content-document a[href^="#"]');if(a&&!a.getAttribute('href').startsWith('#page/')){const target=main.querySelector('[id="'+CSS.escape(a.hash.slice(1))+'"]');if(target){event.preventDefault();target.scrollIntoView({behavior:'smooth'});}}
});
main.addEventListener('keydown',event=>{const tab=event.target.closest('[role=tab]');if(!tab||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;const tabs=[...tab.closest('[role=tablist]').querySelectorAll('[role=tab]')];const index=tabs.indexOf(tab);const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;event.preventDefault();tabs[next].click();tabs[next].focus();});
function render(focus=false) {
  if(!data)return;delete main.dataset.skipFocus;const dialog=document.querySelector('#document-preview');if(dialog.open)dialog.close();renderToken++;setDrawer(false);const route=(location.hash.slice(1)||'home');const [path]=route.split('?');
  let section=path.split('/')[0], identifier='';
  if(section==='page'||section==='person'){
    try{identifier=decodeURIComponent(path.slice(path.indexOf('/')+1));}catch{identifier='';}
  }
  if(section==='page'){
    const publicPath=publicPagePath(identifier);
    if(publicPath!==identifier)history.replaceState(history.state,'',pageLink(identifier)+(route.includes('?')?'?'+route.split('?')[1]:''));
    identifier=pageMap.has(identifier)?identifier:sourcePagePath(identifier);
    const sourcePath=identifier;
    if(sourcePath.includes('org-chart')||sourcePath.includes('organisation-chart')||sourcePath.includes('staff-directory'))section='people';
    else if(sourcePath.startsWith('scorm/department-pages/'))section='departments';
    else if(sourcePath.includes('/news-feed/'))section='news';
    else if(sourcePath.includes('/policy-and-procedures/'))section='policies';
    else if(sourcePath.includes('patient-management-system/')||sourcePath.includes('incident-reporting'))section='forms';
    else if(sourcePath.startsWith('library/')||sourcePath.includes('documents/')||sourcePath.includes('staff-repository'))section='resources';
    else if(sourcePath==='index.html'||sourcePath==='scorm/intranet/index.html')section='home';
    else section=sectionForCategory(pageMap.get(sourcePath)?.category) || section;
  }
  if(section==='person')section='people';
  if(section==='patient-case')section='forms';
  if(section==='department')section='departments';
  if(section==='documents'||section==='videos')section='resources';
  document.querySelectorAll('#main-nav a').forEach(a=>{
    if(a.dataset.nav===section)a.setAttribute('aria-current','page');
    else a.removeAttribute('aria-current');
  });
  const views={'patient-case':renderDraftPatientCase,home,departments,people:renderPeopleDirectory,policies,forms,resources,videos,documents,news:renderNews,search,saved:savedItems,tour:()=>article('VR/public/index.html')};
  if(path.startsWith('page/'))article(identifier);
  else if(path.startsWith('person/'))renderPerson(identifier);
  else if(path.startsWith('department/'))department(path.split('/')[1]);
  else (views[path]||notFound)();
  enhanceResourceView(path,identifier);
  renderBreadcrumbs(path,identifier,section);
  main.insertAdjacentHTML('beforeend',footer());document.title=(main.querySelector('h1')?.textContent||'Staff home')+' · Bagwan Health 3.0';main.classList.remove('entrance');void main.offsetWidth;main.classList.add('entrance');if(focus){main.focus({preventScroll:true});window.scrollTo(0,0);}
}
window.addEventListener('hashchange',()=>render(true));
fetch('content.json').then(response=>{if(!response.ok)throw new Error('Content unavailable');return response.json();}).then(result=>{data=result;initializeResourceUpdates(data);documentByHref=new Map(data.documents.flatMap(d=>[[d.local_path,d],[decodeURIComponent(new URL(d.local_href,ROOT).pathname.slice(ROOT.pathname.length)),d]]));documentMap=new Map(data.documents.map(d=>[d.local_path,d]));pageMap=new Map(data.pages.map(p=>[p.path,p]));render();}).catch(()=>{main.innerHTML=intro('The intranet could not load','Reload the page to try again.')+'<button type="button" class="button" id="reload-intranet">Reload page</button>';document.getElementById('reload-intranet').onclick=()=>location.reload();});
