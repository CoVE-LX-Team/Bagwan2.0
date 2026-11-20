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
  for (const record of policies) {
    check(await preview(results, record.title).count() === 1, record.title + ' has one named preview in the policy list.');
    const href = await download(results, record.title).evaluate(link => link.href);
    const slug = record.path.split('/').at(-2);
    const edition = catalogue.documents.find(doc => doc.local_path === record.policy_document);
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
  await go(pageRoute(directory + 'index.html'));
  await page.getByRole('button', {name:'Hospital wide'}).click();
  check(await page.getByRole('link', {name:'Browse all policies'}).count() === 1 &&
    (await page.locator('main').innerText()).includes('Policy Governance Framework') &&
    await preview(page.locator('main'), privacy).count() === 1, 'The legacy policy hub retains the framework and offers policy actions.');
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
