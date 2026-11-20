// Run with playwright-cli run-code --filename against the local Bagwan preview.
async page => {
  const base='http://127.0.0.1:4173/Bagwan2.0/3.0/';
  const route=path=>'#page/'+encodeURIComponent(path);
  const icon=':scope > .bagwan-external-icon';
  const checks=[], errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  function check(ok,label) {
    if(!ok)throw Error(label);
    checks.push(label);
  }
  async function external(link,label) {
    await link.waitFor();
    await link.locator(icon).waitFor({state:'attached'});
    check(await link.locator(icon).count()===1 && await link.locator(icon).getAttribute('aria-hidden')==='true',label+' has one decorative icon');
    const geometry=await link.evaluate(a=>{
      const mark=a.querySelector('.bagwan-external-icon');
      const walk=document.createTreeWalker(a,NodeFilter.SHOW_TEXT);
      let node,last,end;
      while((node=walk.nextNode())){
        if(mark.contains(node) || node.parentElement.closest('.tour-sr, .bagwan-external-note, .sr-only'))continue;
        const text=node.textContent.replace(/[\s\u2060\u200b]+$/u,'');
        if(text){last=node;end=text.length;}
      }
      const glyph=document.createRange();glyph.setStart(last,end-1);glyph.setEnd(last,end);
      const word=glyph.getBoundingClientRect(),picture=mark.getBoundingClientRect();
      return {visible:picture.width>=7&&picture.height>=7,gap:picture.left-word.right,
        sameLine:picture.bottom>=word.top&&picture.top<=word.bottom};
    });
    check(geometry.visible && geometry.sameLine && geometry.gap>=-2 && geometry.gap<=18,label+' has the icon beside the final word');
  }
  for(const width of [375,1440]){
    await page.setViewportSize({width,height:850});
    await page.goto(base+route('scorm/quick-link-pages/policy-and-procedures/ohswhs/index.html'));
    const policy=page.locator('main .content-document a[href*="working-safely-visiting-health-services-handbook"]');
    await external(policy,'WHS handbook link at '+width);
    await policy.focus();
    check(await policy.evaluate(a=>document.activeElement===a) && (await policy.ariaSnapshot()).includes('Working safely'),
      'The source link retains its keyboard focus and accessible name at '+width);
    await page.goto(base+'#documents?query=Office+health+and+safety');
    await page.locator('.doc-table tbody tr').filter({hasText:'WorkSafe Victoria'}).first().locator('[data-preview]').click();
    await external(page.getByRole('link',{name:'Publisher page',exact:true}),'Document publisher at '+width);
    check(await page.locator('.preview-footer a[download] .bagwan-external-icon, .preview-footer a[href*="document-editions"] .bagwan-external-icon').count()===0,
      'The local full PDF and original download have no external icon at '+width);
    await page.keyboard.press('Escape');
    await page.goto(base+'#department/hr');
    await page.locator('.hr-playlist summary').click();
    const video=page.locator('.hr-playlist a[href^="https://www.youtube.com"]').first();
    await external(video,'HR video link at '+width);
    check(await video.locator(':scope > svg').count()===0,'The HR video omits its legacy second icon at '+width);
    await page.goto(base+'practice.html?activity=interpreter');
    await external(page.getByRole('link',{name:'Open the NAATI directory',exact:true}),'NAATI practice link at '+width);
    await page.goto(base+'tour-patient.html#HandwashingStation');
    await page.getByRole('button',{name:'Room information',exact:true}).click();
    await external(page.locator('.tour-card-links a[href*="who.int"]').first(),'Tour poster at '+width);
    await page.goto(base+route('scorm/department-pages/interpreting-office/new-interpreting-pd/index.html'));
    const frame=page.frameLocator('main iframe.embedded-page');
    const watch=frame.locator('a[href*="youtube.com/watch"]').first();
    await watch.locator(icon).waitFor({state:'attached'});
    check(await watch.locator(icon).count()===1,'The embedded interpreting scenario annotates its YouTube source at '+width);
    await page.goto(base+'review-register.html');
    check(await page.locator('a[href^="https://www.vic.gov.au"] .bagwan-external-icon').count()>=1,
      'The standalone review page marks its source at '+width);
    check(await page.locator('a[href^="#"] .bagwan-external-icon').count()===0,'Review section links stay internal at '+width);
  }
  await page.goto(base+'practice.html?activity=interpreter');
  const directory=page.getByRole('link',{name:'Open the NAATI directory',exact:true});
  const changed=await directory.evaluate(async anchor=>{
    const href=anchor.href;
    const nextRender=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    const counts=[];
    for(const next of ['#local','/another-project/','https://cove-lx-team.github.io/Bagwan2.0/','mailto:staff@example.org',href]){
      anchor.href=next;
      await nextRender();
      counts.push(anchor.querySelectorAll('.bagwan-external-icon').length);
    }
    return counts;
  });
  check(changed.join(',')==='0,1,0,0,1','A changed destination is reclassified without duplicating icons or marking local and email links');
  check(!errors.length,errors.join(' / ') || 'All checks complete without browser errors');
  return {passed:checks.length,checks};
}
