// Run with playwright-cli run-code while serving the repository as described in 3.0/README.md.
async page => {
  const base = 'http://127.0.0.1:4173/Bagwan2.0/3.0/';
  const oldPath = 'patient-management-system/messageboard/index.html';
  const board = base + '#page/' + encodeURIComponent(oldPath);
  const receiptKey = 'bagwan-draft:' + new URL('../' + oldPath, base).pathname;
  const context = await page.context().browser().newContext({viewport:{width:1280,height:800}, acceptDownloads:true});
  const tab = await context.newPage();
  const errors = [], checks = [];
  tab.on('pageerror', error => errors.push(error.message));
  function check(result, message) {
    if (!result) throw new Error(message);
    checks.push(message);
  }
  const inbox = tab.getByRole('heading', {name:'Inbox', exact:true});
  const list = tab.locator('.board-list');
  const reader = tab.locator('.board-reader');
  const subjects = tab.locator('.board-subject');
  const back = reader.locator('[data-inbox]');
  const selected = tab.locator('.board-subject[aria-current="true"]');
  const count = tab.locator('.board-count');
  try {
    await tab.goto(board);
    await inbox.waitFor();
    check(await subjects.count() === 3 && await count.innerText() === '3 unread', 'A new inbox has three unread notices.');
    for (const [index, title] of ['Reported missing belongings','Staff meeting','Interpreter request'].entries()) {
      const subject = subjects.nth(index);
      await subject.press('Enter');
      const left = await list.boundingBox(), right = await reader.boundingBox();
      check(await reader.getByRole('heading', {name:title,exact:true}).isVisible()
        && await subject.getAttribute('aria-current') === 'true' && await selected.count() === 1
        && left.x + left.width <= right.x + 1 && tab.url() === board,
        title + ' opens beside the inbox from the keyboard.');
    }
    await back.press('Enter');
    check(await selected.count() === 0 && await subjects.nth(2).evaluate(el => el === document.activeElement),
      'Back to inbox restores keyboard focus to the message just read.');
    await subjects.nth(1).click();
    await reader.getByRole('button', {name:'Mark as unread'}).click();
    check(await count.innerText() === '1 unread' && await subjects.nth(1).evaluate(el => el === document.activeElement),
      'Mark as unread closes the notice and returns keyboard focus to its subject.');
    await tab.reload();
    await inbox.waitFor();
    check(await count.innerText() === '1 unread' && await subjects.nth(1).locator('.board-state').textContent() === 'Unread',
      'Read and unread receipts survive reload.');

    const legacy = [{key:'date-filter',value:'past'}, {key:'customCheck1',value:false},
      {key:'customCheck2',value:true}, {key:'v3-read-request',value:false}];
    // Recreate a returning 2.0 visitor before their first visit to this inbox.
    await tab.evaluate(([key, fields]) => {
      localStorage.clear();
      localStorage.setItem(key, JSON.stringify(fields));
    }, [receiptKey, legacy]);
    await tab.reload();
    await inbox.waitFor();
    check(await count.innerText() === '2 unread' && await subjects.nth(1).locator('.board-state').textContent() === 'Read',
      'The original read receipts reopen under the same messages.');
    await subjects.nth(2).click();
    const patient = tab.getByRole('link', {name:'Open Alex Morgan’s patient record'});
    check(await patient.getAttribute('href') === '#patient-case', 'The reception message links to Alex’s record.');
    await patient.click();
    await tab.getByRole('heading', {name:'Alex Morgan', exact:true}).waitFor();
    await tab.goBack();
    await patient.waitFor();
    check(tab.url() === board && await subjects.nth(2).getAttribute('aria-current') === 'true',
      'Browser Back restores the open reception notice.');
    const stored = await tab.evaluate(key => JSON.parse(localStorage.getItem(key)), receiptKey);
    check(stored[0].key === 'date-filter' && stored[0].value === 'past', 'Saving receipts retains the older form fields.');

    await tab.goto(base + '#patient-case');
    await tab.getByRole('link', {name:'Read the reception message'}).click();
    await patient.waitFor();
    const bookmark = tab.url();
    await tab.goto(base + '#home');
    await tab.goto(bookmark);
    await patient.waitFor();
    check(await selected.count() === 1 && await reader.getByRole('heading',{name:'Interpreter request'}).isVisible(),
      'The patient-record link can be bookmarked and opens only its reception notice.');
    await tab.getByRole('button', {name:'Save item: Staff messageboard'}).click();
    await tab.goto(base + '#saved');
    await tab.getByRole('link', {name:'Staff messageboard', exact:true}).click();
    await inbox.waitFor();
    check(tab.url() === board, 'The saved-intranet shortcut opens the messageboard.');

    await tab.getByText('Message options', {exact:true}).click();
    const downloadEvent = tab.waitForEvent('download');
    await tab.getByRole('button', {name:'Download read status'}).press('Enter');
    const download = await downloadEvent;
    const chunks = [];
    for await (const chunk of await download.createReadStream()) chunks.push(chunk);
    const exported = JSON.parse(chunks.join(''));
    check(download.suggestedFilename() === 'bagwan-form-draft.json' && exported.form === 'Staff messageboard'
      && JSON.stringify(exported.fields) === JSON.stringify(legacy.slice(1).map(field => (
        field.key === 'v3-read-request' ? {...field,value:true} : field))),
      'The keyboard download contains each original receipt key and its current read status.');
    await tab.evaluate(() => {window.print = () => {window.boardPrintRequested = true;};});
    await tab.getByRole('button', {name:'Print messages'}).click();
    check(await tab.evaluate(() => window.boardPrintRequested === true), 'The print action opens the browser print flow.');
    for (const width of [320,375]) {
      await tab.setViewportSize({width,height:640});
      check(await list.isVisible() && await subjects.evaluateAll(nodes => nodes.every(el => el.getBoundingClientRect().height >= 44)),
        'The ' + width + ' px inbox has touch-sized subjects.');
      await subjects.nth(0).press('Space');
      check(await list.isHidden() && await reader.getByRole('heading',{name:'Reported missing belongings'}).isVisible()
        && await back.isVisible() && await tab.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        'At ' + width + ' px the message gets a full-width reading view with a way back.');
      await back.press('Enter');
      check(await list.isVisible() && await subjects.nth(0).evaluate(el => el === document.activeElement),
        'Returning from the ' + width + ' px reading view restores the subject and keyboard focus.');
    }
    check(errors.length === 0, 'The inbox completes these journeys without browser errors.');
    return checks;
  } finally { await context.close(); }
}
