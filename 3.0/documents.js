'use strict';

const documentSorts = {
  'name-asc':'Name (A–Z)', 'name-desc':'Name (Z–A)',
  'updated-desc':'Last updated (newest)', 'updated-asc':'Last updated (oldest)',
  'category-asc':'Category (A–Z)', 'category-desc':'Category (Z–A)'
};
const documentCollator = new Intl.Collator('en-AU', {numeric:true, sensitivity:'base'});
const documentDates = new Intl.DateTimeFormat('en-AU', {day:'numeric',month:'short',year:'numeric',timeZone:'Australia/Melbourne'});

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
  const label='Preview '+doc.name;
  return '<button type="button" class="doc-action" data-preview="'+esc(doc.local_path)+'" aria-label="'+esc(label)+'" title="'+esc(label)+'">'+icon('preview')+'</button>';
}
function documentActions(doc) {
  const download='Download '+doc.name;
  const id='doc:'+doc.local_path;
  const active=saved.has(id);
  const bookmark=(active?'Remove saved item: ':'Save item: ')+doc.name;
  return '<div class="doc-actions">'+documentPreviewButton(doc)+
    '<a class="doc-action" download href="'+esc(absolute(doc.local_href))+'" aria-label="'+esc(download)+'" title="'+esc(download)+'">'+icon('download')+'</a>'+
    '<button type="button" class="doc-action" data-save="'+esc(id)+'" data-title="'+esc(doc.name)+'" aria-label="'+esc(bookmark)+'" title="'+esc(bookmark)+'" aria-pressed="'+active+'">'+icon('bookmark')+'</button></div>';
}
function documentResult(doc) {
  return '<li class="resource-row document-result"><div><span class="kind">Document</span><h2>'+esc(doc.name)+'</h2><p>'+esc(documentCategory(doc))+' · '+esc([doc.file_type,documentSize(doc),doc.edition_source_url?'WorkSafe Victoria':null].filter(Boolean).join(' · '))+'</p></div>'+documentActions(doc)+'</li>';
}
function compareDocuments(left, right, sort) {
  const [field, direction]=sort.split('-');
  const names=documentCollator.compare(left.name,right.name);
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
  return '<tr role="row"><th scope="row" role="rowheader"><span class="doc-name">'+esc(doc.name)+'</span><span class="doc-file-meta">'+esc([doc.file_type,documentSize(doc),doc.edition_source_url?'WorkSafe Victoria':null].filter(Boolean).join(' · '))+'</span></th>'+
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
  const params=new URLSearchParams(location.hash.split('?')[1]);
  const options=values=>values.map(v=>'<option value="'+esc(v)+'">'+esc(v)+'</option>').join('');
  const categories=[...new Set(data.documents.flatMap(doc=>[doc.category,documentCategory(doc)]))].sort(documentCollator.compare);
  const types=[...new Set(data.documents.map(doc=>doc.file_type))].sort();
  main.innerHTML=intro('Documents & templates','Find, preview and download hospital documents.')+
    '<div class="doc-controls"><label>Search documents<span class="doc-field doc-query">'+icon('search')+'<input id="list-search" type="search" placeholder="Name or keyword"></span></label>'+
    '<label>Category<span class="doc-field"><select id="category-filter"><option value="">All categories</option>'+options(categories)+'</select></span></label>'+
    '<label>File type<span class="doc-field"><select id="type-filter"><option value="">All file types</option>'+options(types)+'</select></span></label>'+
    '<label>Order<span class="doc-field"><select id="document-order">'+Object.entries(documentSorts).map(([k,v])=>'<option value="'+k+'">'+v+'</option>').join('')+'</select></span></label></div>'+
    '<div class="doc-result-bar"><p id="result-count" role="status"></p><button type="button" id="clear-document-filters">Clear filters</button></div><div id="results" class="doc-results"></div>';
  const query=main.querySelector('#list-search'), category=main.querySelector('#category-filter');
  const type=main.querySelector('#type-filter'), order=main.querySelector('#document-order');
  const clear=main.querySelector('#clear-document-filters'), results=main.querySelector('#results');
  query.value=params.get('query')||'';
  category.value=categories.includes(params.get('category'))?params.get('category'):'';
  type.value=types.includes(params.get('type'))?params.get('type'):'';
  order.value=Object.hasOwn(documentSorts,params.get('sort'))?params.get('sort'):'name-asc';
  function update(writeUrl=true) {
    const found=data.documents.filter(doc=>(!category.value||doc.category===category.value||documentCategory(doc)===category.value) &&
      (!type.value||doc.file_type===type.value) && matches([doc.name,documentCategory(doc),doc.file_type,doc.original_folder_path].join(' '),query.value));
    found.sort((a,b)=>compareDocuments(a,b,order.value));
    const formCount=showClinicalFormLinks(query.value,!category.value&&!type.value);
    main.querySelector('#result-count').textContent=found.length+' '+(found.length===1?'document':'documents')+
      (formCount?' · '+formCount+' clinical '+(formCount===1?'form':'forms'):'');
    clear.hidden=!(query.value||category.value||type.value);
    results.innerHTML=found.length?'<table class="doc-table" role="table" aria-label="Documents and templates"><thead role="rowgroup"><tr role="row">'+
      sortedHeader('Name','name',order.value)+sortedHeader('Category','category',order.value)+sortedHeader('Last updated','updated',order.value)+
      '<th scope="col" role="columnheader" class="actions-heading">Actions</th></tr></thead><tbody role="rowgroup">'+found.map(documentRow).join('')+'</tbody></table>':
      formCount?'':'<div class="empty-state"><h2>No matching documents</h2><p>Try another keyword or clear the filters.</p></div>';
    if(writeUrl){
      const next=new URLSearchParams();
      for(const [key,value] of [['query',query.value],['category',category.value],['type',type.value],['sort',order.value==='name-asc'?'':order.value]])if(value)next.set(key,value);
      replaceSectionHash('#documents'+(next.size?'?'+next:''));
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
  const title=policy?.title||doc.name;
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
  const publisher=doc.edition_source_url?'<a href="'+esc(doc.edition_source_url)+'" target="_blank" rel="noopener">Publisher page '+icon('external')+'</a>':'';
  const label='Download '+(doc.file_type==='DOCX'?'Word':doc.file_type);
  const actions=publisher+(pdf?'<a href="'+esc(absolute(doc.preview_href))+'" target="_blank" rel="noopener">Open full PDF '+icon('external')+'</a>':'')+
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
