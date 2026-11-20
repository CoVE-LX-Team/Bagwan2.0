'use strict';

const newsPath='scorm/intranet/news-feed/index.html';
const newsCover='wp-content/uploads/2019/12/happy-hospital-staff.jpg';
function recordBody(record) {
  const template=document.createElement('template');
  template.innerHTML=record.html;
  return template.content;
}
function renderNews() {
  const directory=recordBody(pageMap.get(newsPath));
  const summaries=new Map();
  for(const a of directory.querySelectorAll('a.material-card')){
    const path=decodeURIComponent(new URL(a.getAttribute('href'),ROOT).pathname.slice(ROOT.pathname.length));
    const p=pageMap.get(path);
    if(p)summaries.set(path,{path,title:a.querySelector('h2').textContent.trim(),summary:a.querySelector('.quick_link_content').textContent.trim()});
  }
  const lead=summaries.values().next().value;
  const stories=[...summaries.values()].slice(1);
  for(const p of data.pages.filter(p=>p.category==='News'&&p.path!==newsPath&&!summaries.has(p.path))){
    const paragraph=recordBody(p).querySelector('p');
    stories.push({path:p.path,title:p.title,summary:(paragraph?.textContent||'').trim().split(/(?<=[.!?])\s/)[0]});
  }
  const params=new URLSearchParams(location.hash.split('?')[1]);
  const leadStory=()=>'<section class="news-lead" aria-label="Featured staff update"><img src="'+absolute(newsCover)+'" alt=""><div><h2><a href="'+pageLink(lead.path)+'">'+esc(lead.title)+'</a></h2><p>'+esc(lead.summary)+'</p><div class="news-lead-actions"><a class="story-more" href="'+pageLink(lead.path)+'">Read the CEO update <span aria-hidden="true">→</span></a>'+saveButton('page:'+lead.path,lead.title)+'</div></div></section>';
  main.innerHTML=intro('News & updates','From the Bagwan staff news archive.')+
    '<div id="lead-news"></div><section class="news-stories"><div class="news-heading"><h2 id="news-list-title">More staff news</h2><label class="sr-only" for="list-search">Search staff news</label><input type="search" class="field-search" id="list-search" placeholder="Search staff news"></div><p class="sr-only" id="news-status" role="status"></p><div id="news-results"></div></section>';
  const search=main.querySelector('#list-search');
  search.value=params.get('query')||'';
  function update() {
    const query=search.value.trim();
    const found=(query?[lead,...stories]:stories).filter(p=>matches(p.title+' '+p.summary+' '+pageMap.get(p.path).text,query));
    main.querySelector('#lead-news').innerHTML=query?'':leadStory();
    main.querySelector('#news-list-title').textContent=query?'Search results':'More staff news';
    main.querySelector('#news-status').textContent=found.length+' '+(found.length===1?'story':'stories');
    main.querySelector('#news-results').innerHTML=found.length?'<ul>'+found.map(p=>'<li><div><a href="'+pageLink(p.path)+'">'+esc(p.title)+'</a><p>'+esc(p.summary)+'</p></div>'+saveButton('page:'+p.path,p.title)+'</li>').join('')+'</ul>':empty('No matching stories.');
  }
  search.addEventListener('input',()=>{
    const next=new URLSearchParams();
    if(search.value)next.set('query',search.value);
    history.replaceState(null,'','#news'+(next.size?'?'+next:''));
    update();
  });
  update();
}
function renderCommunity(record) {
  const body=recordBody(record), introText=body.querySelector('article p').textContent;
  const player=body.querySelector('iframe'), watch=body.querySelector('.video-fallback a');
  const vision=body.querySelector('article.mt-3>p').textContent.trim();
  const greeting=vision.split(' Our vision')[0];
  const visionText=vision.slice(greeting.length).trim();
  const values=[...body.querySelectorAll('.values-reference section')];
  const features=[...body.querySelectorAll('.card-deck .card')];
  main.innerHTML='<p class="breadcrumbs"><a href="#home">Staff home</a> / Our community</p>'+
    '<header class="community-intro"><div><h1>Our community</h1><p>'+esc(greeting)+'</p></div><img src="'+absolute('wp-content/uploads/2019/12/culturalDiversity-e1578957603198.jpg')+'" alt="Three clinicians standing together"></header>'+
    '<section class="community-values"><h2>Our values</h2><div class="values-reference">'+values.map(v=>'<section><h3>'+esc(v.querySelector('h2').textContent)+'</h3><p>'+esc(v.querySelector('p').textContent)+'</p></section>').join('')+'</div></section>'+
    '<div class="community-work"><section class="community-welcome"><h2>Welcome to Bagwan Health</h2><p>'+esc(introText)+'</p>'+
    '<iframe src="'+esc(player.getAttribute('src'))+'" title="Welcome to Bagwan Health" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="encrypted-media; picture-in-picture" allowfullscreen></iframe>'+
    '<a href="'+esc(watch.href)+'" target="_blank" rel="noopener">Watch the CEO welcome on YouTube</a></section>'+
    '<section class="community-resources"><h2>Our values at work</h2>'+features.map(f=>{
      const a=f.querySelector('a'), path=decodeURIComponent(new URL(a.getAttribute('href'),ROOT).pathname.slice(ROOT.pathname.length));
      return '<article><h3>'+esc(f.querySelector('.card-title').textContent)+'</h3>'+[...f.querySelectorAll('.card-text')].map(p=>'<p>'+esc(p.textContent.trim())+'</p>').join('')+'<a href="'+pageLink(path)+'">'+esc(a.textContent.trim())+' <span aria-hidden="true">→</span></a></article>';
    }).join('')+'</section></div><section class="community-vision"><h2>Our vision</h2><p>'+esc(visionText)+'</p></section>';
}
