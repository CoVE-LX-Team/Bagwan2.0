async (page) => {
  const base = 'http://127.0.0.1:4173/Bagwan2.0/';
  const checks = [];
  const errors = [];
  const verify = (condition, message) => {
    if (!condition) throw new Error(message);
    checks.push(message);
  };
  page.on('pageerror', error => errors.push(error.message));
  const go = path => page.goto(base + path, {waitUntil:'load'});
  const capture = async (name) => {
    await page.evaluate(()=>window.scrollTo({top:0,left:0,behavior:'instant'}));
    await page.waitForTimeout(250);
    await page.screenshot({path:`Bagwan2.0/output/playwright/${name}.png`,fullPage:true});
  };
  await page.setViewportSize({width:375,height:812});
  await go('');
  const toggle = page.getByRole('button', {name:'Open navigation', exact:true});
  verify(await toggle.getAttribute('aria-expanded') === 'false', 'Phone navigation starts closed');
  await toggle.click();
  verify(await page.locator('#sidebar').getAttribute('aria-hidden') === 'false', 'Phone navigation opens');
  verify(await page.locator('#content').evaluate(el=>el.inert), 'Open phone drawer prevents background interaction');
  await page.waitForFunction(()=>new DOMMatrixReadOnly(getComputedStyle(document.getElementById('sidebar')).transform).m41===0);
  await page.keyboard.press('Tab');
  verify(await page.locator('#sidebar').evaluate(el=>el.contains(document.activeElement)), 'Keyboard enters the open navigation');
  await page.keyboard.press('Shift+Tab');
  verify(await page.locator('#showRightPush').evaluate(el=>el===document.activeElement), 'Reverse tab returns to the drawer control');
  await page.keyboard.press('Escape');
  verify(await page.locator('#sidebar').evaluate(el=>el.inert), 'Escape closes the drawer and disables hidden links');
  verify(await page.locator('#showRightPush').evaluate(el=>el===document.activeElement), 'Closing drawer restores keyboard focus');
  await page.keyboard.press('Space');
  verify(await page.locator('#showRightPush').getAttribute('aria-expanded')==='true', 'Keyboard opens the navigation');
  await page.waitForFunction(()=>new DOMMatrixReadOnly(getComputedStyle(document.getElementById('sidebar')).transform).m41===0);
  await page.keyboard.press('Shift+Tab');
  verify(await page.locator('#sidebar a').last().evaluate(el=>el===document.activeElement), 'Reverse tab wraps within the phone drawer');
  await page.keyboard.press('Tab');
  verify(await page.locator('#showRightPush').evaluate(el=>el===document.activeElement), 'Tab wraps back to the drawer control');
  await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Open navigation',exact:true}).click();
  await page.getByRole('button',{name:'Close navigation',exact:true}).last().click({position:{x:330,y:400}});
  verify(await page.locator('#showRightPush').getAttribute('aria-expanded')==='false', 'Backdrop closes the phone drawer');
  await page.getByRole('button',{name:'Open navigation',exact:true}).click();
  await page.getByRole('button',{name:'Departments',exact:true}).click();
  await page.locator('#sidebar').getByRole('link',{name:'Nursing',exact:true}).click();
  verify(page.url().includes('/department-pages/nursing/'), 'Nested phone navigation reaches Nursing');
  const resource = page.frameLocator('iframe[src*="/resources-and-tools/"]');
  await resource.getByRole('button',{name:'Forms and templates',exact:true}).click();
  await page.waitForTimeout(400);
  const frameSize = await page.locator('iframe[src*="/resources-and-tools/"]').evaluate(frame=>({
    height:frame.getBoundingClientRect().height,
    content:frame.contentDocument.body.getBoundingClientRect().height
  }));
  verify(frameSize.height>=frameSize.content, 'Expanded embedded resources remain fully visible');
  await capture('responsive-nursing-expanded-375');

  await go('scorm/intranet/doctors-on-call/index.html');
  await page.locator('[data-profile-dialog]').first().click();
  verify(await page.locator('dialog[open]').isVisible(), 'Doctor profile opens on a phone');
  const dialogBox = await page.locator('dialog[open]').boundingBox();
  verify(dialogBox.x>=0 && dialogBox.x+dialogBox.width<=375, 'Doctor profile fits the phone viewport');
  await page.keyboard.press('Escape');
  verify(await page.locator('dialog[open]').count()===0, 'Doctor profile closes with Escape');

  await go('scorm/intranet/our-community/index.html');
  const flip = page.locator('.flip-btn').first();
  await flip.click();
  await page.waitForTimeout(550);
  verify(await page.locator('.card-grid').first().evaluate(el=>!!window.jQuery(el).data('flip-model')?.isFlipped), 'Values card flips on a phone');
  await page.locator('.unflip-btn').first().click();

  await go('scorm/intranet/staff-directory-2/index.html');
  await page.locator('#staff-search').fill('George Dunn');
  verify((await page.locator('#staff-results').textContent()).includes('1 matching'), 'Staff search filters to the matching person');
  await go('documents/index.html');
  await page.locator('#document-search').fill('Pathology request');
  verify((await page.locator('.document-list li:visible').count())>0, 'Document search remains usable on a phone');

  await go('patient-management-system/patient-database/index.html');
  await page.getByRole('link',{name:'Jane Doe Open patient record'}).click();
  verify(page.url().includes('/jane-doe/'), 'Full patient card opens the correct record');
  await page.getByRole('tab',{name:'Pathology results',exact:true}).click();
  await page.locator('#nav-pathology').waitFor({state:'visible'});
  verify(await page.locator('#nav-pathology').isVisible(), 'Patient record tabs reveal their content');

  await go('patient-management-system/abbeyscale/index.html');
  verify(await page.locator('.clinical-criterion').count()===6, 'All six clinical assessment areas are present on phones');
  verify(await page.locator('[data-form-field]').evaluateAll(fields=>fields.every(el=>{
    const r=el.getBoundingClientRect();return r.width>0&&r.left>=0&&r.right<=innerWidth;
  })), 'Every clinical control fits the phone screen');
  verify(await page.evaluate(()=>document.documentElement.scrollWidth===innerWidth), 'Clinical form needs no sideways scrolling');
  const date = page.locator('input[type=date]').first();
  await date.fill('2027-07-12');
  await page.getByRole('button',{name:'Save draft',exact:true}).click();
  await page.reload({waitUntil:'load'});
  verify(await date.inputValue()==='2027-07-12', 'Form draft survives reload at phone width');
  const download = page.waitForEvent('download');
  await page.getByRole('button',{name:'Download draft',exact:true}).click();
  verify((await download).suggestedFilename()==='bagwan-form-draft.json', 'Form draft can be downloaded');
  await capture('responsive-form-375');

  await go('scorm/intranet/news-feed/index.html');
  for (const width of [320,375,568,768,1024,1440,1920]) {
    await page.setViewportSize({width,height:900});
    await page.waitForTimeout(250);
    const bounds = await page.locator('.quick_link').evaluateAll(cards=>cards.map(el=>{
      const r=el.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width};
    }));
    verify(bounds.every(r=>r.left>=0&&r.right<=width+1), `News cards fit at ${width}px`);
    if ([375,768,1440].includes(width)) await capture(`responsive-news-${width}`);
  }
  await page.setViewportSize({width:1440,height:1000});
  await go('');
  verify(await page.locator('#showRightPush').getAttribute('aria-expanded')==='true', 'Desktop navigation starts open');
  await page.getByRole('button',{name:'Close navigation',exact:true}).first().click();
  verify(await page.locator('#content').evaluate(el=>el.getBoundingClientRect().left===0), 'Closing desktop navigation releases the content width');
  await page.getByRole('button',{name:'Open navigation',exact:true}).click();
  await capture('responsive-home-1440');
  verify((await page.locator('.footer p').first().boundingBox()).x>=280, 'Desktop footer stays clear of the sidebar');
  await page.setViewportSize({width:375,height:812});
  await page.waitForFunction(()=>document.getElementById('showRightPush').getAttribute('aria-expanded')==='false');
  verify(await page.locator('#showRightPush').getAttribute('aria-expanded')==='false', 'Rotating/resizing back to a phone closes the desktop sidebar');
  await capture('responsive-home-375');
  verify(errors.length===0,'No JavaScript errors during the interaction checks');
  return {passed:checks.length,checks,errors};
}
