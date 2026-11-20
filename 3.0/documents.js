'use strict';

const documentSorts = {
  'name-asc':'Name (A–Z)', 'name-desc':'Name (Z–A)',
  'updated-desc':'Last updated (newest)', 'updated-asc':'Last updated (oldest)',
  'category-asc':'Category (A–Z)', 'category-desc':'Category (Z–A)'
};
const documentCollator = new Intl.Collator('en-AU', {numeric:true, sensitivity:'base'});
const documentDates = new Intl.DateTimeFormat('en-AU', {day:'numeric',month:'short',year:'numeric',timeZone:'Australia/Melbourne'});

// These identifiers point to the existing catalogue entries. The downloadable originals keep their filenames.
const formTemplateTitles = new Map(Object.entries({
  'BagwanTemplate.docx':'Bagwan letterhead',
  'Fax Cover Sheet.docx':'Fax cover sheet',
  'meeting-agenda.docx':'Meeting agenda (Word)',
  'meeting-agenda.pdf':'Meeting agenda (PDF)',
  'Memo.docx':'Memo',
  'With Compliments.docx':'With compliments slip',
  'Bagwan Health Interpreter booking request form.docx':'Interpreter booking request form',
  'Pathology request form (Google Doc export).docx':'Pathology request form',
  'Logisitics Induction Quality Form.docx':'Logistics induction quality form',
  'Care plan.docx':'Care plan template',
  'Cash Receipts Journal.docx':'Cash receipts journal',
  'Cash Slip.docx':'Cash slip',
  'E-Trading Adjustment Note.docx':'E-trading adjustment note',
  'E-Trading Tax Invoice.docx':'E-trading tax invoice',
  'Manual Tax Invoice.docx':'Manual tax invoice',
  'Online Payment Authorisation.docx':'Online payment authorisation',
  'Petty Cash Voucher.docx':'Petty cash voucher',
  'Purchase Order Form - Manual Orders.docx':'Purchase order form for manual orders',
  'Receipt.docx':'Receipt',
  'Statement of Account.docx':'Statement of account',
  'Accident_form.doc':'Accident, incident or medication error form',
  'Bagwan Health Parental-leave-request-template.doc':'Parental leave request',
  'ComputerPeople Management Skills Assess.docx':'Computer and people management skills assessment',
  'DAILY SIGN IN REGISTER.docx':'Daily sign-in register',
  'Duty Statement and Rotation Record.docx':'Duty statement and rotation record',
  'Employee Job Card.docx':'Employee job card',
  'Employee Review Sheet.docx':'Employee review sheet',
  'Employee Skills Review.docx':'Employee skills review',
  'Employee Warning Notice.docx':'Employee warning notice',
  'Meeting Sign-in Sheet Template.docx':'Meeting sign-in sheet',
  'Bagwan Health - OHS - FORM-A-Initial Hazard Inspection.docx':'OHS Form A – Initial hazard inspection',
  'Bagwan Health - OHS - FORM-B-Risk-assessment.docx':'OHS Form B – Risk assessment',
  'Bagwan Health - OHS Workstation Self-Assessment Checklist - 20191217.docx':'OHS workstation self-assessment checklist',
  'Video Transcript Template.docx':'Video transcript template',
  'Bagwan Health recordkeeping-policy-template.docx':'Recordkeeping policy template'
}));

function formTemplateTitle(doc) {
  return formTemplateTitles.get(doc.local_path.split('/').at(-1));
}
function documentTitle(doc) {
  return formTemplateTitle(doc) || doc.name;
}
function documentCategory(doc) {
  return [doc.category, doc.subcategory].filter(Boolean).join(' / ');
}
function documentSize(doc) {
  return doc.size_bytes >= 1048576 ? (doc.size_bytes / 1048576).toFixed(1)+' MB' : Math.ceil(doc.size_bytes / 1024)+' KB';
}
function documentDate(doc) {
  return doc.source_modified_at ? documentDates.format(new Date(doc.source_modified_at)) : 'Date unavailable';
}
function documentPreviewButton(doc) {
  const label='Preview '+documentTitle(doc);
  return '<button type="button" class="doc-action" data-preview="'+esc(doc.local_path)+'" aria-label="'+esc(label)+'" title="'+esc(label)+'">'+icon('preview')+'</button>';
}
function documentActions(doc) {
  const download='Download '+documentTitle(doc);
  const id='doc:'+doc.local_path;
  const active=saved.has(id);
  const bookmark=(active?'Remove saved item: ':'Save item: ')+documentTitle(doc);
  return '<div class="doc-actions">'+documentPreviewButton(doc)+
    '<a class="doc-action" download href="'+esc(absolute(doc.local_href))+'" aria-label="'+esc(download)+'" title="'+esc(download)+'">'+icon('download')+'</a>'+
    '<button type="button" class="doc-action" data-save="'+esc(id)+'" data-title="'+esc(documentTitle(doc))+'" aria-label="'+esc(bookmark)+'" title="'+esc(bookmark)+'" aria-pressed="'+active+'">'+icon('bookmark')+'</button></div>';
}
function documentResult(doc) {
  return '<li class="resource-row document-result"><div><span class="kind">Document</span><h2>'+esc(documentTitle(doc))+'</h2><p>'+esc(documentCategory(doc))+' · '+esc([doc.file_type,documentSize(doc),doc.edition_source_url?'WorkSafe Victoria':null].filter(Boolean).join(' · '))+'</p></div>'+documentActions(doc)+'</li>';
}
function compareDocuments(left, right, sort) {
  const [field, direction]=sort.split('-');
  const names=documentCollator.compare(documentTitle(left),documentTitle(right));
  let order=names;
  if(field==='updated'){
    if(!left.source_modified_at || !right.source_modified_at)return Number(!left.source_modified_at)-Number(!right.source_modified_at)||names;
    order=left.source_modified_at.localeCompare(right.source_modified_at);
  }else if(field==='category'){
    order=documentCollator.compare(documentCategory(left),documentCategory(right));
  }
  return (direction==='desc'?-order:order)||names||documentCollator.compare(left.local_path,right.local_path);
}
function documentRow(doc) {
  const date=doc.source_modified_at?'<time datetime="'+esc(doc.source_modified_at)+'">'+documentDate(doc)+'</time>':'Date unavailable';
  return '<tr role="row"><th scope="row" role="rowheader"><span class="doc-name">'+esc(documentTitle(doc))+'</span><span class="doc-file-meta">'+esc([doc.file_type,documentSize(doc),doc.edition_source_url?'WorkSafe Victoria':null].filter(Boolean).join(' · '))+'</span></th>'+
    '<td role="cell" class="doc-category">'+esc(doc.category)+(doc.subcategory?'<small>'+esc(doc.subcategory)+'</small>':'')+'</td>'+
    '<td role="cell" class="doc-updated"><span class="doc-mobile-label">Updated </span>'+date+'</td><td role="cell">'+documentActions(doc)+'</td></tr>';
}
function sortedHeader(label, key, sort) {
  const [field,direction]=sort.split('-');
  const active=field===key;
  return '<th scope="col" role="columnheader"'+(active?' aria-sort="'+(direction==='asc'?'ascending':'descending')+'"':'')+'><button type="button" data-sort="'+key+'">'+label+
    (active?icon(direction==='asc'?'arrowUp':'arrowDown'):'')+'</button></th>';
}
function documents() {
  main.innerHTML=intro('Documents & templates','Find, preview and download hospital documents.')+'<section class="file-browser"></section>';
  mountFileBrowser(main.querySelector('.file-browser'),data.documents,{route:'#documents',label:'Documents and templates',clinical:true});
}

function mountFileBrowser(container, records, {route='', label='Department documents', forms=false, clinical=false}={}) {
  const params=new URLSearchParams(route ? location.hash.split('?')[1] : '');
  const noun=forms?'form':'document';
  const options=values=>values.map(v=>'<option value="'+esc(v)+'">'+esc(v)+'</option>').join('');
  const categories=[...new Set(records.flatMap(doc=>[doc.category,documentCategory(doc)]))].sort(documentCollator.compare);
  const types=[...new Set(records.map(doc=>doc.file_type))].sort();
  const id=value=>route?' id="'+value+'"':'';
  const field=(name,html,visible=true)=>'<label'+(visible?'':' hidden')+'>'+name+'<span class="doc-field">'+html+'</span></label>';
  container.innerHTML='<div class="doc-controls"><label>Search '+noun+'s<span class="doc-field doc-query">'+icon('search')+
    '<input'+id('list-search')+' data-field="query" type="search" placeholder="Name or keyword"></span></label>'+
    field('Category','<select'+id('category-filter')+' data-field="category"><option value="">All categories</option>'+options(categories)+'</select>',route||categories.length>1)+
    field('File type','<select'+id('type-filter')+' data-field="type"><option value="">All file types</option>'+options(types)+'</select>',route||types.length>1)+
    field('Order','<select'+id('document-order')+' data-field="sort">'+Object.entries(documentSorts).map(([k,v])=>'<option value="'+k+'">'+v+'</option>').join('')+'</select>')+'</div>'+
    '<div class="doc-result-bar"><p'+id('result-count')+' role="status"></p><button type="button"'+id('clear-document-filters')+' data-clear>Clear filters</button></div>'+
    '<div'+id('results')+' class="doc-results"></div>';
  const query=container.querySelector('[data-field=query]'),category=container.querySelector('[data-field=category]');
  const type=container.querySelector('[data-field=type]'),order=container.querySelector('[data-field=sort]');
  const clear=container.querySelector('[data-clear]'),results=container.querySelector('.doc-results'),count=container.querySelector('[role=status]');
  query.value=params.get('query')||'';
  category.value=categories.includes(params.get('category'))?params.get('category'):'';
  type.value=types.includes(params.get('type'))?params.get('type'):'';
  order.value=Object.hasOwn(documentSorts,params.get('sort'))?params.get('sort'):'name-asc';
  function update(writeUrl=true) {
    const found=records.filter(doc=>(!category.value||doc.category===category.value||documentCategory(doc)===category.value) &&
      (!type.value||doc.file_type===type.value) && matches([documentTitle(doc),doc.name,documentCategory(doc),doc.file_type,doc.original_folder_path].join(' '),query.value));
    found.sort((a,b)=>compareDocuments(a,b,order.value));
    const formCount=clinical?showClinicalFormLinks(query.value,!category.value&&!type.value):0;
    count.textContent=found.length+' '+noun+(found.length===1?'':'s')+
      (formCount?' · '+formCount+' clinical '+(formCount===1?'form':'forms'):'');
    clear.hidden=!(query.value||category.value||type.value);
    results.innerHTML=found.length?'<table class="doc-table" role="table" aria-label="'+esc(label)+'"><thead role="rowgroup"><tr role="row">'+
      sortedHeader('Name','name',order.value)+sortedHeader('Category','category',order.value)+sortedHeader('Last updated','updated',order.value)+
      '<th scope="col" role="columnheader" class="actions-heading">Actions</th></tr></thead><tbody role="rowgroup">'+found.map(documentRow).join('')+'</tbody></table>':
      formCount?'':'<div class="empty-state"><h2>No matching '+noun+'s</h2><p>Try another keyword or clear the filters.</p></div>';
    if(writeUrl && route){
      const next=new URLSearchParams();
      for(const [key,value] of [['query',query.value],['category',category.value],['type',type.value],['sort',order.value==='name-asc'?'':order.value]])if(value)next.set(key,value);
      replaceSectionHash(route+(next.size?'?'+next:''));
    }
  }
  query.addEventListener('input',()=>update());
  for(const field of [category,type,order])field.addEventListener('change',()=>update());
  clear.addEventListener('click',()=>{query.value='';category.value='';type.value='';update();query.focus();});
  results.addEventListener('click',event=>{
    const header=event.target.closest('[data-sort]');
    if(!header)return;
    const key=header.dataset.sort;
    const first=key==='updated'?'desc':'asc', second=first==='asc'?'desc':'asc';
    order.value=order.value===key+'-'+first?key+'-'+second:key+'-'+first;
    update();results.querySelector('[data-sort="'+key+'"]').focus();
  });
  update(false);
}

function documentForAnchor(anchor) {
  const href=anchor.getAttribute('href');
  if (!href || href.startsWith('#')) return;
  const url=new URL(href,ROOT);
  if(url.origin===ROOT.origin && url.pathname.startsWith(ROOT.pathname)){
    return documentByHref.get(decodeURIComponent(url.pathname.slice(ROOT.pathname.length)));
  }
}

function fileLibraryLink(doc) {
  const form=Boolean(formTemplateTitle(doc));
  const url=(form?'#forms?':'#documents?')+new URLSearchParams({query:documentTitle(doc)});
  return '<a class="file-library-link" href="'+esc(url)+'">'+(form?'View in forms library':'View in document library')+'</a>';
}

function compactFile(doc) {
  return '<div class="compact-file"><div><strong>'+esc(documentTitle(doc))+'</strong><small>'+
    esc([doc.file_type,documentSize(doc),documentDate(doc)].join(' · '))+'</small>'+fileLibraryLink(doc)+'</div>'+documentActions(doc)+'</div>';
}

function mountInlineFiles(files) {
  const group=document.createElement('div');
  group.className='embedded-file-list';
  if(files.length===1)group.innerHTML=compactFile(files[0]);
  else {
    const forms=files.every(formTemplateTitle);
    mountFileBrowser(group,files,{forms,label:forms?'Department forms':'Department documents'});
  }
  return group;
}

function enhanceFileListings(container) {
  for (const list of container.querySelectorAll('ul.document-list')) {
    const replacement=document.createDocumentFragment();
    let files=[],other;
    function flushFiles(){
      if(files.length){replacement.append(mountInlineFiles(files));files=[];}
    }
    for(const item of Array.from(list.children)){
      const anchors=[...item.querySelectorAll('a[href]')];
      const file=anchors.length===1 && documentForAnchor(anchors[0]);
      if(file){files.push(file);other=null;continue;}
      flushFiles();
      if(!other){
        other=list.cloneNode(false);
        other.classList.remove('document-list');
        other.removeAttribute('id');
        replacement.append(other);
      }
      other.append(item);
      for(const anchor of anchors){
        const individual=documentForAnchor(anchor);
        if(individual)anchor.insertAdjacentHTML('afterend',documentPreviewButton(individual)+fileLibraryLink(individual));
      }
    }
    flushFiles();
    list.replaceWith(replacement);
  }
}

function showFilePreview(title, metadata, content, actions) {
  const dialog=document.querySelector('#document-preview');
  const body=dialog.querySelector('#preview-body');
  const close=dialog.querySelector('[aria-label="Close preview"]');
  dialog.querySelector('#preview-title').textContent=title;
  dialog.querySelector('#preview-meta').textContent=metadata;
  body.innerHTML=content;
  dialog.querySelector('.preview-footer').innerHTML=actions;
  close.innerHTML=icon('close');
  close.onclick=()=>dialog.close();
  dialog.onclose=()=>{body.replaceChildren();};
  dialog.onclick=event=>{
    if(event.target!==dialog)return;
    const bounds=dialog.getBoundingClientRect();
    if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom)dialog.close();
  };
  dialog.showModal();
}

function openDocumentPreview(doc, policy) {
  if(!doc)return;
  const title=policy?.title||documentTitle(doc);
  const context=policy?'Policy document':documentCategory(doc);
  const metadata=[context,doc.file_type,documentSize(doc),'File updated '+documentDate(doc),doc.edition_source_url?'WorkSafe Victoria':null].filter(Boolean).join(' · ');
  const pdf=doc.preview_href?.toLowerCase().endsWith('.pdf');
  const showImage=doc.preview_image_href && (!pdf || matchMedia('(max-width:700px)').matches || navigator.pdfViewerEnabled===false);
  let content;
  if(showImage){
    content='<figure><img src="'+esc(absolute(doc.preview_image_href))+'" alt="'+esc(title+(pdf?', first page':''))+'">'+(pdf?'<figcaption>Page 1 of '+doc.preview_pages+'</figcaption>':'')+'</figure>';
  }else if(pdf){
    content='<iframe title="'+esc('Preview of '+title)+'" src="'+esc(absolute(doc.preview_href))+'#view=FitH"></iframe>';
  }else{
    content='<p>This file is available to download.</p>';
  }
  const publisher=doc.edition_source_url?'<a href="'+esc(doc.edition_source_url)+'" target="_blank" rel="noopener">Publisher page</a>':'';
  const label='Download '+(doc.file_type==='DOCX'?'Word':doc.file_type);
  const actions=publisher+(pdf?'<a href="'+esc(absolute(doc.preview_href))+'" target="_blank" rel="noopener">Open full PDF</a>':'')+
    '<a class="button" download href="'+esc(absolute(doc.local_href))+'">'+icon('download')+' '+esc(label)+'</a>';
  showFilePreview(title,metadata,content,actions);
}

function policyPdfUrl(policy) {
  const slug=policy.path.split('/').at(-2);
  return absolute('3.0/policy-copies/'+encodeURIComponent(slug)+'.pdf');
}

function policyActions(policy) {
  const original=documentMap.get(policy.policy_document);
  const format=original?'Word':'PDF';
  const href=original?absolute(original.local_href):policyPdfUrl(policy);
  return '<span class="policy-actions">'+
    '<button type="button" class="policy-action" data-policy-preview="'+esc(policy.path)+'" aria-label="'+esc('Preview '+policy.title)+'">'+icon('preview')+'Preview</button>'+
    '<a class="policy-action" download href="'+esc(href)+'" aria-label="'+esc('Download '+format+' – '+policy.title)+'">'+icon('download')+'Download '+format+'</a></span>';
}

let policyScopes;
function policyScope(policy) {
  if (!policyScopes) {
    policyScopes = new Map();
    const body = recordBody(pageMap.get(policyIndexPath));
    for (const control of body.querySelectorAll('[data-toggle="collapse"][aria-controls]')) {
      const panel = body.getElementById(control.getAttribute('aria-controls'));
      for (const link of panel?.querySelectorAll('a[href]') || []) {
        const path = decodeURIComponent(new URL(link.getAttribute('href'),ROOT).pathname.slice(ROOT.pathname.length));
        policyScopes.set(path,control.textContent.trim());
      }
    }
    policyScopes.set('scorm/quick-link-pages/policy-and-procedures/booking-an-interpreter/index.html','Departmental');
  }
  return policyScopes.get(policy.path) || '';
}
function policyResult(policy) {
  return '<li class="resource-row policy-row"><div><span class="kind">'+esc(policyScope(policy) || 'Policy')+
    '</span><h2><a href="'+esc(pageLink(policy.path))+'">'+esc(policy.title)+'</a></h2></div>'+
    policyActions(policy)+saveButton('page:'+policy.path,policy.title)+'</li>';
}

function openPolicyPreview(policy) {
  if(!policy)return;
  const original=documentMap.get(policy.policy_document);
  if(original){openDocumentPreview(original,policy);return;}
  const content='<article class="policy-text-preview">'+policy.html+'</article>';
  const actions='<a class="button" download href="'+esc(policyPdfUrl(policy))+'">'+icon('download')+' Download PDF</a>';
  showFilePreview(policy.title,policyScope(policy) || 'Policy',content,actions);
}
