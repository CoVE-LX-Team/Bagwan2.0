async (page) => {
  const root='http://127.0.0.1:4173/Bagwan2.0/';
  const checks=[],errors=[];
  const verify=(ok,label)=>{if(!ok)throw Error(label);checks.push(label)};
  page.on('pageerror',error=>errors.push(error.message));
  const go=path=>page.goto(root+path,{waitUntil:'load'});
  const focused=locator=>locator.evaluate(el=>el===el.ownerDocument.activeElement);
  const tabTo=async locator=>{
    for(let i=0;i<240;i++) {
      if(await focused(locator))return;
      await page.keyboard.press('Tab');
    }
    throw Error('Keyboard could not reach '+await locator.getAttribute('id'));
  };
  await page.setViewportSize({width:1280,height:900});
  await go('');
  await page.keyboard.press('Tab');
  verify(await focused(page.locator('.skip-to-content')),'Skip link is first in the tab order');
  await page.keyboard.press('Enter');
  verify(await focused(page.locator('main')),'Skip link moves focus into the main landmark');
  verify((await page.locator('h1').boundingBox()).y>=80,'Skip target remains clear of the fixed header');
  await page.setViewportSize({width:375,height:812});
  await go('');
  await tabTo(page.locator('#showRightPush'));
  await page.keyboard.press('Enter');
  await page.waitForFunction(()=>document.querySelector('#showRightPush').getAttribute('aria-expanded')==='true');
  const disclosure=page.getByRole('button',{name:'Departments',exact:true});
  await tabTo(disclosure);
  await page.keyboard.press('Space');
  verify(await disclosure.getAttribute('aria-expanded')==='true','Space opens the department disclosure');
  await page.keyboard.press('Tab');
  verify(await focused(page.getByRole('link',{name:'All departments',exact:true})),'Expanded links follow their disclosure in tab order');
  await page.keyboard.press('Escape');
  verify(await focused(disclosure),'Escape closes a submenu and returns focus to its button');
  verify(await page.locator('#showRightPush').getAttribute('aria-expanded')==='true','Closing a submenu preserves the open navigation drawer');
  await page.keyboard.press('Escape');
  verify(await focused(page.locator('#showRightPush')),'Second Escape closes the drawer and restores focus');
  await page.setViewportSize({width:1280,height:900});
  await go('scorm/intranet/doctors-on-call/index.html');
  const profile=page.locator('[data-profile-dialog]').first();
  await tabTo(profile); await page.keyboard.press('Enter');
  verify(await page.locator('dialog[open]').count()===1,'Keyboard opens a doctor profile');
  await page.keyboard.press('Escape');
  await page.locator('dialog[open]').waitFor({state:'hidden'});
  verify(await focused(profile),'Closing a profile restores focus to its opener');
  verify(await page.locator('#showRightPush').getAttribute('aria-expanded')==='true','Dialog Escape does not also close the desktop navigation');

  await go('scorm/intranet/our-community/index.html');
  const show=page.locator('.flip-btn').first();
  const back=page.locator('.unflip-btn').first();
  verify(await page.locator('.back').first().evaluate(el=>el.inert),'Hidden card faces start outside the tab order');
  await tabTo(show); await page.keyboard.press('Space');
  await page.waitForFunction(()=>document.activeElement?.matches('.unflip-btn'));
  verify(await focused(back),'Flipping a card moves focus to the reverse control');
  verify(await page.locator('.front').first().evaluate(el=>el.inert),'The hidden front face is not keyboard-focusable');
  await page.keyboard.press('Enter');
  await page.waitForFunction(()=>document.activeElement?.matches('.flip-btn'));
  verify(await focused(show),'Returning from a flipped card restores focus');
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.keyboard.press('Space');
  await page.waitForFunction(()=>document.activeElement?.matches('.unflip-btn'));
  verify(await focused(back),'Flip-card focus also works with reduced motion');
  await page.emulateMedia({reducedMotion:'no-preference'});

  await go('patient-management-system/patient-database/jane-doe/index.html');
  const first=page.getByRole('tab',{name:'Patient personal details',exact:true});
  await tabTo(first); await page.keyboard.press('ArrowRight');
  verify(await focused(page.getByRole('tab',{name:'Current presentation',exact:true})),'Right arrow moves to the next patient tab');
  verify(await page.locator('#nav-profile').isVisible(),'Arrow-key tab activation reveals the matching panel');
  await page.keyboard.press('End');
  verify(await page.locator('#nav-diagnostics-tab').getAttribute('aria-selected')==='true','End activates the last patient tab');
  await page.keyboard.press('Tab');
  verify(await focused(page.locator('#nav-diagnostics')),'Tab exits the tablist into the active panel');
  verify(await page.locator('#nav-home').evaluate(el=>el.hidden),'Inactive panels and their controls are hidden');
  verify(await page.locator('[role=tab][tabindex="0"]').count()===1,'Only one patient tab is in the page tab sequence');

  await go('scorm/intranet/resources/index.html');
  await tabTo(page.getByRole('tab',{name:'Human resources',exact:true}));
  await page.keyboard.press('ArrowRight');
  verify(await focused(page.getByRole('tab',{name:'ATSI liaison services',exact:true})),'Resource tabs also support arrow-key navigation');
  verify(await page.locator('#ATSIliaisonservices').isVisible(),'Resource tab focus and panel selection stay in sync');

  await go('patient-management-system/abbeyscale/index.html');
  const help=page.getByRole('button',{name:'Help: Date',exact:true});
  await tabTo(help); await page.keyboard.press('Enter');
  verify(await page.getByRole('dialog',{name:'Help: Date',exact:true}).isVisible(),'Field instructions are available without hovering');
  await page.keyboard.press('Escape');
  verify(await focused(help),'Closing field help restores keyboard focus');
  const location=page.getByLabel('Location',{exact:true});
  await tabTo(location);
  verify(await location.evaluate(el=>el.tagName==='SELECT'&&!el.sumo),'Clinical options use a native labelled dropdown');
  await page.keyboard.press('h'); await page.keyboard.press('Tab');
  verify((await location.inputValue())!=='','Native dropdown can be changed with the keyboard');
  const time=page.getByLabel('Time',{exact:true});
  await time.fill('09:30');
  verify(await time.evaluate(el=>el.checkValidity()),'A correctly formatted time passes native validation');
  for(const score of await page.locator('select[name^="score"]').all()){
    await tabTo(score); await page.keyboard.press('1'); await page.keyboard.press('Tab');
  }
  verify(await page.locator('#total').inputValue()==='6','Pain score calculation still works after keyboard selection');
  await page.getByLabel('Date',{exact:true}).fill('2027-07-12');
  await page.evaluate(()=>{
    const key='bagwan-draft:'+location.pathname;
    const fields=[...document.querySelectorAll('input:not([type=hidden]):not([type=button]):not([type=submit]),textarea,select')];
    const saved=JSON.parse(localStorage.getItem(key));
    const data=Array.isArray(saved)?saved:saved.fields;
    data.forEach((item,index)=>{if(fields[index].id.startsWith('bagwan-field-'))item.key=fields[index].name||`field-${index}`});
    localStorage.setItem(key,JSON.stringify(data));
  });
  await page.reload({waitUntil:'load'});
  verify(await page.getByLabel('Date',{exact:true}).inputValue()==='2027-07-12'&&await location.inputValue()!=='','Earlier browser drafts still restore after adding form labels');

  await go('patient-management-system/personalcare/index.html');
  const multiple=page.getByLabel('ADL',{exact:true});
  await tabTo(multiple); await page.keyboard.press('Home'); await page.keyboard.press('Shift+ArrowDown');
  const selected=await multiple.evaluate(el=>[...el.selectedOptions].map(o=>o.value));
  verify(selected.length===2,'Native multiple selection works with the keyboard');
  const save=page.getByRole('button',{name:'Save draft',exact:true});
  await tabTo(save); await page.keyboard.press('Enter');
  await page.reload({waitUntil:'load'});
  verify(JSON.stringify(await multiple.evaluate(el=>[...el.selectedOptions].map(o=>o.value)))===JSON.stringify(selected),'Draft restoration preserves all selected options');
  await go('patient-management-system/continence/index.html');
  verify(await page.getByLabel('Continence record - day 2, 09:00',{exact:true}).count()===1,'Continence controls identify their day and time');
  verify(await page.getByLabel('Staff ID - day 2, 09:00',{exact:true}).count()===1,'Staff ID controls have a distinct purpose and context');

  await go('patient-management-system/messageboard/index.html');
  const message=page.getByRole('button',{name:'Message#1',exact:true});
  await tabTo(message); await page.keyboard.press('Space');
  verify(await message.getAttribute('aria-expanded')==='true'&&await page.locator('#demo1').isVisible(),'Messages expand from a keyboard-operable button');
  await page.keyboard.press('Space');
  verify(await page.locator('#demo1').evaluate(el=>el.hidden),'Message controls also collapse their content');

  await go('scorm/department-pages/lab-technologies/ppe-safety-activity/index.html');
  const activity=page.frameLocator('iframe.h5p-iframe');
  const coat=activity.getByRole('button',{name:/Grabbable 1 of 13.*Lab coat/});
  await tabTo(coat); await page.keyboard.press('Space'); await page.keyboard.press('Enter');
  verify(await activity.getByRole('button',{name:/Grabbable 1 of 13.*Placed in dropzone 1/}).count()===1,'PPE items can be placed using only the keyboard');

  await go('scorm/department-pages/lab-technologies/waste-management/index.html');
  const waste=page.frameLocator('iframe.h5p-iframe');
  await tabTo(waste.getByRole('button',{name:/Grabbable 1 of 4/}));
  await page.keyboard.press('Space'); await page.keyboard.press('Enter');
  verify(await waste.getByRole('button',{name:/Grabbable 1 of 4.*Placed in dropzone 2/}).count()===1,'Waste sorting supports keyboard placement into its assigned zone');

  await go('VR/public/index.html');
  const info=page.getByRole('button',{name:'Room information',exact:true});
  await page.waitForFunction(()=>!document.getElementById('information-button').disabled);
  await tabTo(info); await page.keyboard.press('Enter');
  verify(await page.getByRole('dialog').isVisible(),'Tour information opens as a keyboard dialog');
  await page.keyboard.press('Escape');
  await page.waitForFunction(()=>!document.querySelector('dialog').open);
  verify(await focused(info),'Escape closes tour information and restores focus');
  verify(errors.length===0,'No JavaScript errors during keyboard checks');
  return {passed:checks.length,checks,errors};
}
