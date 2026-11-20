async (page) => {
  const root='http://127.0.0.1:4173/Bagwan2.0/';
  const data=await page.request.get(root+'3.0/content.json').then(r=>r.json());
  const charts=await page.request.get(root+'output/review-overflow-paths.json').then(r=>r.json());
  const results=[],chartResults=[],documents=[];
  await page.route('https://www.youtube.com/**',route=>route.abort());
  await page.setViewportSize({width:375,height:900});
  for(const path of charts){
    await page.goto(root+path,{waitUntil:'domcontentloaded'});await page.waitForTimeout(250);
    chartResults.push({path,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)});
  }
  await page.goto(root+'3.0/');await page.reload();
  await page.locator('main h1').first().waitFor();
  for(const record of data.pages){
    await page.goto(root+'3.0/#page/'+encodeURIComponent(record.path));
    await page.waitForTimeout(220);
    const state=await page.evaluate(()=>({title:document.querySelector('main h1')?.textContent,overflow:document.documentElement.scrollWidth>innerWidth+1,headingCount:document.querySelectorAll('main h1').length,h5pFrames:document.querySelectorAll('iframe.h5p-iframe').length}));
    await page.addScriptTag({path:'/tmp/bagwan-axe.min.js'});
    const accessibility=await page.evaluate(async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return {violations:r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),incomplete:r.incomplete.map(v=>v.id)};});
    results.push({path:record.path,...state,accessibility});
  }
  for(const file of ['learning-guide.html','practice.html?activity=ppe','practice.html?activity=waste','practice.html?activity=interpreter','what-changed.html','critical-review.html','review-register.html']){
    await page.goto(root+'3.0/'+file);await page.waitForTimeout(200);await page.addScriptTag({path:'/tmp/bagwan-axe.min.js'});
    documents.push({path:file,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),violations:await page.evaluate(async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}));})});
  }
  return {charts:chartResults,pages:results,documents};
}
