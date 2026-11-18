async (page) => {
  const context=await page.context().browser().newContext({viewport:{width:375,height:900}});
  const p=await context.newPage(),checks=[],errors=[];
  const verify=(ok,message)=>{if(!ok)throw Error(message);checks.push(message)};
  p.on('pageerror',error=>errors.push(error.message));
  const root='http://127.0.0.1:4173/Bagwan2.0/';
  const go=path=>p.goto(root+path+'/index.html');
  try {
    await go('patient-management-system/abbeyscale');
    verify((await p.locator('#clinical-score-status').textContent()).includes('incomplete'),'An empty assessment is explicitly incomplete');
    const scores=p.locator('select[name^="score"]');
    for(const score of await scores.all())await score.selectOption('0');
    verify(await p.locator('#total').inputValue()==='0'&&(await p.locator('#clinical-score-status').textContent()).includes('Assessment complete'),'Six absent scores produce a complete zero assessment');
    for(const score of await scores.all())await score.selectOption('3');
    verify(await p.locator('#total').inputValue()==='18','All severe scores total eighteen');
    for(const [index,score]of(await scores.all()).entries())await score.selectOption(String(index%4));
    verify(await p.locator('#total').inputValue()==='7','Mixed scores calculate correctly');
    await scores.first().selectOption('');
    await p.getByLabel('Comments',{exact:true}).fill('Draft observation\nSecond line');
    await p.reload();
    verify(await p.locator('#total').inputValue()==='7'&&(await p.locator('#clinical-score-status').textContent()).includes('5 of 6'),'Partial scores restore without becoming a complete assessment');
    verify((await p.getByLabel('Comments',{exact:true}).inputValue()).includes('Second line'),'Comments autosave without clicking Save');
    await p.evaluate(()=>window.dispatchEvent(new Event('beforeprint')));
    verify((await p.locator('.clinical-print-view').textContent()).includes('Total pain score: 7 / 18'),'Print view includes the calculated score and completion status');

    for(const kind of ['foodrecord','personalcare']){
      await go('patient-management-system/'+kind);
      const first=p.locator('[data-entry="1"]');
      await first.getByLabel('Date',{exact:true}).fill('2027-07-12');
      if(kind==='foodrecord')await first.getByLabel('Food item',{exact:true}).fill('Toast and tea');
      else await first.getByLabel('ADL',{exact:true}).selectOption({label:'Oral care'});
      await p.getByRole('button',{name:'Add entry',exact:true}).focus();await p.keyboard.press('Enter');
      const second=p.locator('[data-entry="2"]');
      verify(await second.getByLabel('Date - entry 2',{exact:true}).evaluate(el=>el===document.activeElement),kind+': keyboard Add focuses the new entry');
      verify(await first.getByLabel('Date',{exact:true}).inputValue()==='2027-07-12',kind+': adding an entry preserves existing data');
      await second.getByLabel('Date - entry 2',{exact:true}).fill('2027-07-13');
      if(kind==='foodrecord')await second.getByLabel('Food item - entry 2',{exact:true}).fill('Soup and water');
      else {
        await second.getByLabel('ADL - entry 2',{exact:true}).selectOption([{label:'Oral care'},{label:'Wash'}]);
        await second.getByLabel('Comments - entry 2',{exact:true}).fill('Personal care observation');
      }
      await second.getByRole('button',{name:'Help: Date',exact:true}).click();
      verify(await p.getByRole('dialog',{name:'Help: Date',exact:true}).isVisible(),kind+': added entry help works');
      await p.keyboard.press('Escape');
      await p.reload();
      verify(await p.locator('[data-entry]').count()===2&&await second.getByLabel('Date - entry 2',{exact:true}).inputValue()==='2027-07-13',kind+': additional entries restore after reload');
      if(kind==='personalcare')verify(await second.getByLabel('ADL - entry 2',{exact:true}).evaluate(el=>el.selectedOptions.length)===2,'Personal care restores multiple selections in added entries');
      verify(await second.getByLabel('Role - entry 2',{exact:true}).inputValue()==='PCA',kind+': new entries retain the source role');
      await p.evaluate(()=>window.dispatchEvent(new Event('beforeprint')));
      verify((await p.locator('.clinical-print-view').textContent()).includes(kind==='foodrecord'?'Soup and water':'Oral care'),'Print output includes additional '+kind+' entries');
      const download=p.waitForEvent('download');await p.getByRole('button',{name:'Download draft',exact:true}).click();
      verify((await download).suggestedFilename()==='bagwan-form-draft.json',kind+': multi-entry draft can be downloaded');
      for(let i=2;i<10;i++)await p.getByRole('button',{name:'Add entry',exact:true}).click();
      verify(await p.locator('[data-entry]').count()===10&&await p.getByRole('button',{name:'Add entry',exact:true}).isDisabled(),kind+': ten-entry limit is visible and respected');
    }
    await go('patient-management-system/continence');
    await p.getByRole('button',{name:'Day 2',exact:true}).focus();await p.keyboard.press('Enter');
    await p.getByLabel('Date for day 2',{exact:true}).fill('2027-07-13');
    const hour=p.locator('[data-hour="9"]');await hour.locator('summary').focus();await p.keyboard.press('Enter');
    const record=hour.getByLabel('Continence record - day 2, 09:00',{exact:true});
    await record.selectOption({index:1});await hour.getByLabel('Staff ID - day 2, 09:00',{exact:true}).fill('STU02');
    const choice=await record.inputValue();
    await p.getByRole('button',{name:'Day 3',exact:true}).click();
    await p.getByLabel('Date for day 3',{exact:true}).fill('2027-07-14');
    await hour.getByLabel('Staff ID - day 3, 09:00',{exact:true}).fill('STU03');
    await p.reload();await p.getByRole('button',{name:'Day 2',exact:true}).click();await hour.locator('summary').click();
    verify(await record.inputValue()===choice&&await hour.getByLabel('Staff ID - day 2, 09:00',{exact:true}).inputValue()==='STU02','Continence records persist independently across days');
    await p.evaluate(()=>window.dispatchEvent(new Event('beforeprint')));
    verify((await p.locator('.clinical-print-view').textContent()).includes('STU03')&&await p.locator('.clinical-print-table tbody tr').count()===24,'Continence printout includes all days and all twenty-four hours');

    for(const width of [320,375,700,768,1024,1440]){
      await p.setViewportSize({width,height:900});
      await go('scorm/quick-link-pages/policy-and-procedures/infection-control');
      verify(await p.locator('.responsive-policy-table').count()===6,'All six infection tables present at '+width+'px');
      const layout=await p.locator('.responsive-policy-table').evaluateAll(tables=>tables.map(table=>({
        width:table.getBoundingClientRect().width,
        cells:[...table.querySelectorAll('tbody th,tbody td')].every(cell=>{
          const r=cell.getBoundingClientRect(),row=cell.closest('tr').getBoundingClientRect();
          return r.width>0&&r.left>=0&&r.right<=innerWidth+1&&r.bottom<=row.bottom+1&&cell.scrollHeight<=cell.clientHeight+1;
        }),
        stacked:getComputedStyle(table.querySelector('tbody td')).display==='block'
      })));
      verify(layout.every(t=>t.cells),'No clipped cells or horizontal overflow at '+width+'px');
      verify(layout.every(t=>t.stacked===(width<=700)),'Policy rows use the appropriate layout at '+width+'px');
      verify(await p.evaluate(()=>document.documentElement.scrollWidth===innerWidth),'Infection Control page fits '+width+'px');
    }
    verify(errors.length===0,'No browser JavaScript errors');
    return {passed:checks.length,checks,errors};
  } finally {await context.close()}
}
