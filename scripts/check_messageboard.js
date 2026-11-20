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
  const rows = tab.locator('[data-message]');
  const details = tab.locator('.board-body');
  const subjects = rows.locator('h3 button');
  const count = tab.locator('.board-count');
  try {
    await tab.goto(board);
    await inbox.waitFor();
    check(await rows.count() === 3 && await count.innerText() === '3 unread', 'A new inbox has three unread notices.');
    for (const [index, sender] of ['Admin','Admin','Reception'].entries()) {
      const row = rows.nth(index);
      const subject = subjects.nth(index);
      await subject.press('Enter');
      check(await details.nth(index).isVisible() && await subject.getAttribute('aria-expanded') === 'true'
        && await row.locator('.board-sender').innerText() === sender && tab.url() === board,
        'Notice ' + (index + 1) + ' opens in the inbox from the keyboard.');
      await subject.press('Space');
      check(await details.nth(index).isHidden() && await subject.getAttribute('aria-expanded') === 'false'
        && await row.locator('.board-state').innerText() === 'Read' && tab.url() === board,
        'Notice ' + (index + 1) + ' closes in place and keeps its read receipt.');
    }
    await subjects.nth(1).click();
    await rows.nth(1).getByRole('button', {name:'Mark as unread'}).click();
    check(await count.innerText() === '1 unread' && await subjects.nth(1).evaluate(el => el === document.activeElement),
      'Mark as unread closes the notice and returns keyboard focus to its subject.');
    await tab.reload();
    await inbox.waitFor();
    check(await count.innerText() === '1 unread' && await rows.nth(1).locator('.board-state').innerText() === 'Unread',
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
    check(await count.innerText() === '2 unread' && await rows.nth(1).locator('.board-state').innerText() === 'Read',
      'The original read receipts reopen under the same messages.');
    await subjects.nth(2).click();
    const patient = tab.getByRole('link', {name:'Open Alex Morgan’s patient record'});
    check(await patient.getAttribute('href') === '#patient-case', 'The reception message links to Alex’s record.');
    await patient.click();
    await tab.getByRole('heading', {name:'Alex Morgan', exact:true}).waitFor();
    await tab.goBack();
    await patient.waitFor();
    check(tab.url() === board && await subjects.nth(2).getAttribute('aria-expanded') === 'true',
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
    check(await tab.locator('.board-body:visible').count() === 1, 'The patient-record link can be bookmarked and opens only its reception notice.');
    await tab.getByRole('button', {name:'Save item: Staff messageboard'}).click();
    await tab.goto(base + '#saved');
    await tab.getByRole('link', {name:'Staff messageboard', exact:true}).click();
    await inbox.waitFor();
    check(tab.url() === board, 'The saved-intranet shortcut opens the messageboard.');

    await tab.getByText('Message options', {exact:true}).click();
    const downloadEvent = tab.waitForEvent('download');
    await tab.getByRole('button', {name:'Download read status'}).press('Enter');
    const download = await downloadEvent;
    check(download.suggestedFilename() === 'bagwan-form-draft.json' && !await download.failure(),
      'Read status downloads from the keyboard.');
    await tab.evaluate(() => {window.print = () => {window.boardPrintRequested = true;};});
    await tab.getByRole('button', {name:'Print messages'}).click();
    check(await tab.evaluate(() => window.boardPrintRequested === true), 'The print action opens the browser print flow.');
    for (const width of [320,375]) {
      await tab.setViewportSize({width,height:640});
      await subjects.nth(0).click();
      check(await tab.evaluate(() => document.documentElement.scrollWidth <= innerWidth)
        && await subjects.evaluateAll(nodes => nodes.every(el => el.getBoundingClientRect().height >= 44)),
        'The open inbox fits a ' + width + ' px screen with touch-sized subjects.');
      await subjects.nth(0).click();
    }
    check(errors.length === 0, 'The inbox completes these journeys without browser errors.');
    return checks;
  } finally { await context.close(); }
}
