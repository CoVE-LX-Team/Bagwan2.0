// Use playwright-cli run-code --filename with the site served as in 3.0/README.md.
async page => {
  const base = 'http://127.0.0.1:4173/Bagwan2.0/3.0/';
  const directory = 'scorm/quick-link-pages/policy-and-procedures/';
  const pageRoute = path => 'page/' + encodeURIComponent(path);
  const checks = [];
  const errors = [];
  const check = (ok, description) => {
    if (!ok) throw new Error(description);
    checks.push(description);
  };
  const go = async route => {
    await page.goto(base + '#' + route);
    await page.locator('main h1').waitFor();
  };
  const preview = (within, title) => within.getByRole('button', {name:'Preview ' + title, exact:true});
  const download = (within, title) => within.getByRole('link', {name:'Download Word – ' + title, exact:true})
    .or(within.getByRole('link', {name:'Download PDF – ' + title, exact:true}));
  const dialog = page.locator('#document-preview[open]');
  page.on('pageerror', error => errors.push(error.message));

  const catalogue = await page.request.get(base + 'content.json').then(response => response.json());
  const policies = catalogue.pages.filter(record => record.category === 'Policy');
  await page.setViewportSize({width:1440, height:900});
  await go('policies');
  const results = page.locator('#results');
  const table = results.getByRole('table', {name:'Policies and procedures'});
  const rows = table.locator('tbody tr');
  check(await rows.count() === policies.length && await table.getByRole('columnheader').count() === 4,
    'The table includes each published policy once with name, category, date and actions.');
  for (const record of policies) {
    check(await preview(results, record.title).count() === 1, record.title + ' has one named preview in the policy list.');
    const href = await download(results, record.title).evaluate(link => link.href);
    const slug = record.path.split('/').at(-2);
    const edition = catalogue.documents.find(doc => doc.local_path === record.policy_document);
    const row=rows.filter({has:page.getByRole('link',{name:record.title,exact:true})});
    const date=row.locator('time');
    check(edition?.source_modified_at ? await date.getAttribute('datetime')===edition.source_modified_at :
      await date.count()===0 && (await row.locator('.doc-updated').innerText()).includes('Date unavailable'),
      record.title+' uses its edition date or shows that no date is available.');
    const expected = edition ? new URL(edition.local_href, new URL('../', base)).href : 'policy-copies/' + slug + '.pdf';
    const actualPath = decodeURIComponent(new URL(href).pathname);
    const expectedPath = decodeURIComponent(new URL(expected, base).pathname);
    const response = await page.request.get(href);
    const bytes = await response.body();
    const signature = bytes.subarray(0, 5).toString();
    const valid = href.endsWith('.docx') ? bytes[0] === 80 && bytes[1] === 75 : href.endsWith('.pdf') && signature === '%PDF-';
    check(actualPath === expectedPath && response.ok() && valid, record.title + ' downloads its matching local Word or PDF file.');
  }

  const privacy = 'Privacy';
  const original = await download(results, privacy).evaluate(link => link.href);
  check(original.endsWith('.docx'), 'Privacy offers its Word file.');
  const privacyButton = preview(results, privacy);
  await privacyButton.focus();
  await page.keyboard.press('Enter');
  await dialog.waitFor();
  const previewURL = await dialog.getByRole('link', {name:/open full PDF/i}).evaluate(link => link.href);
  const pdf = await page.request.get(previewURL);
  check(pdf.ok() && (await pdf.body()).subarray(0, 5).toString() === '%PDF-', 'Privacy previews a valid PDF rendition.');
  check(await dialog.locator('a[download]').evaluate(link => link.href) === original, 'Privacy preview offers the same current file.');
  await page.keyboard.press('Escape');
  await dialog.waitFor({state:'hidden'});
  check(await privacyButton.evaluate(button => button === document.activeElement), 'Escape returns focus to the initiating policy.');
  await results.getByRole('link', {name:privacy, exact:true}).click();
  const toolbar = page.locator('.page-tools');
  check(await download(toolbar, privacy).evaluate(link => link.href) === original, 'The Privacy article offers the same file as the list.');
  const started = page.waitForEvent('download');
  await download(toolbar, privacy).click();
  const transfer = await started;
  check(transfer.suggestedFilename().endsWith('.docx') && !await transfer.failure(), 'A real article download completes with the Word extension.');

  const draft = 'Medication safety';
  await go('policies');
  await page.locator('#category-filter').selectOption({label:'Departmental'});
  check(await results.getByRole('link', {name:privacy, exact:true}).count() === 0 &&
    await preview(results, draft).count() === 1, 'The departmental filter includes medication safety and excludes hospital-wide Privacy.');
  const draftURL = await download(results, draft).evaluate(link => link.href);
  check(draftURL.endsWith('policy-copies/medication-safety.pdf'), 'Medication safety offers its generated policy PDF.');
  await results.getByRole('link', {name:draft, exact:true}).click();
  await preview(toolbar, draft).click();
  await dialog.waitFor();
  const draftText = await dialog.innerText();
  check(!/SME|pending review|draft for/i.test(draftText) && /purpose and scope/i.test(draftText),
    'The preview displays the policy text without reviewer instructions.');
  check(await dialog.locator('a[download]').evaluate(link => link.href) === draftURL, 'The draft preview downloads the same PDF.');
  await page.keyboard.press('Escape');
  await dialog.waitFor({state:'hidden'});

  const bookmark = toolbar.locator('[data-save]');
  const added = await bookmark.getAttribute('aria-pressed') !== 'true';
  if (added) await bookmark.click();
  try {
    for (const route of ['saved', 'search?query=Medication%20safety']) {
      await go(route);
      const main = page.locator('main');
      check(await preview(main, draft).count() === 1 && await download(main, draft).evaluate(link => link.href) === draftURL,
        route.split('?')[0] + ' offers both policy actions.');
    }
  } finally {
    if (added) {
      await go(pageRoute(directory + 'medication-safety/index.html'));
      await toolbar.locator('[data-save]').click();
    }
  }
  await go(pageRoute(directory + 'index.html')+'?from=nursing');
  await table.waitFor();
  check(page.url().includes('#policies?from=nursing') && await rows.count()===policies.length &&
    await page.locator('.breadcrumbs').getByRole('link',{name:'Nursing',exact:true}).count()===1,
    'The former index opens the same complete table and retains the originating department.');
  await page.locator('#policy-framework summary').click();
  check((await page.locator('#policy-framework').innerText()).includes('principles-based') &&
    (await page.locator('#policy-framework').innerText()).includes('Escalation and patient deterioration'), 'The governance text and its nursing topic remain readable.');
  await go(pageRoute(directory+'index.html')+'#collapseDepartmental');
  await table.waitFor();
  check(await rows.count()===5 && await page.locator('#category-filter').inputValue()==='Departmental',
    'The historical departmental anchor opens the five departmental entries.');
  await page.locator('#type-filter').selectOption('PDF');
  check(await rows.count()===3 && page.url().includes('type=PDF'), 'File type and policy scope combine and can be shared.');
  await page.reload();await table.waitFor();
  check(await rows.count()===3, 'Reload keeps the catalogue filters.');
  await go('policies?from=nursing');
  const dateHeader=table.getByRole('columnheader',{name:'Last updated'});
  await dateHeader.getByRole('button').click();
  check(await dateHeader.getAttribute('aria-sort')==='descending' && await page.locator('#document-order').inputValue()==='updated-desc',
    'Clicking Last updated selects newest first in both sort controls.');
  const dates=await rows.locator('time').evaluateAll(nodes=>nodes.map(n=>Date.parse(n.dateTime)));
  check(dates.every((d,i)=>i===0||dates[i-1]>=d) && !(await rows.last().locator('time').count()),
    'Dated editions sort first in date order, with the undated PDFs last.');
  await page.locator('#document-order').selectOption('updated-asc');
  check(await dateHeader.getAttribute('aria-sort')==='ascending' && !(await rows.last().locator('time').count()) && page.url().includes('from=nursing'),
    'Oldest first also leaves missing dates last and retains the department context.');
  await page.locator('#list-search').fill('unmatched-policy-xyz');
  check(await page.getByRole('heading',{name:'No matching policies'}).count()===1,'Empty policy searches offer clear feedback.');
  await page.getByRole('button',{name:'Clear filters'}).click();
  check(await rows.count()===policies.length && await page.locator('#list-search').evaluate(input=>input===document.activeElement),
    'Clearing a search restores the table and returns focus to the search box.');
  const rowSave=rows.filter({has:page.getByRole('link',{name:privacy,exact:true})}).locator('[data-save]');
  await rowSave.click();
  await go('saved');
  check(await preview(page.locator('main'),privacy).count()===1,'Saving from the table stores the policy page and its actions.');
  await page.locator('main [data-save$="/privacy/index.html"]').click();
  await page.setViewportSize({width:320, height:760});
  await go('policies');
  await preview(results, privacy).click();
  await dialog.waitFor();
  check(await dialog.locator('img').evaluate(async img => {await img.decode(); return img.naturalWidth > 100;}),
    'The mobile original preview shows a readable first page.');
  const fits = () => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
  check(await fits(), 'The mobile preview fits a 320px viewport.');
  await dialog.getByRole('button', {name:/close preview/i}).click();
  check(await fits(), 'The policy controls and list fit a 320px viewport.');
  check(!errors.length, 'The policy journeys complete without browser errors.');
  return {passed:checks.length, policies:policies.length, checks, errors};
}
