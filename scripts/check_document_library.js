// Run with the local server described in 3.0/README.md and playwright-cli run-code --filename.
async (page) => {
  const base = 'http://127.0.0.1:4173/Bagwan2.0/3.0/';
  const checks = [];
  const errors = [];
  const check = (condition, message) => {
    if (!condition) throw new Error(message);
    checks.push(message);
  };
  const choose = async (select, label) => {
    const option = select.locator('option').filter({hasText: label});
    await select.selectOption(await option.first().getAttribute('value'));
  };
  const go = async (route) => {
    await page.goto(base + '#' + route);
    await page.locator('main h1').waitFor();
  };
  page.on('pageerror', error => errors.push(error.message));
  const library = 'documents?query=human%20resources';
  const search = page.locator('#list-search');
  const category = page.locator('#category-filter');
  const type = page.locator('#type-filter');
  const order = page.locator('#document-order');
  const rows = page.locator('#results tbody tr');
  const dialog = page.locator('dialog[open]');
  const heights = () => page.locator('#list-search, #category-filter, #type-filter, #document-order')
    .evaluateAll(controls => controls.map(control => control.getBoundingClientRect().height));
  const fits = () => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
  await page.setViewportSize({width: 1440, height: 960});
  await go(library);
  await rows.first().waitFor();
  check(await search.inputValue() === 'human resources' && await rows.count() === 20,
    'The shared Human Resources URL opens its 20 documents.');
  const desktopHeights = await heights();
  check(desktopHeights.length === 4 && Math.max(...desktopHeights) - Math.min(...desktopHeights) <= 1,
    'Desktop search and all three select controls have equal height.');

  await choose(category, /^Human resources$/i);
  await choose(type, /^PDF$/i);
  check(await rows.count() === 4, 'Combining search, category and file type retains the four HR PDF records.');
  await choose(order, /oldest/i);
  const filters = [await search.inputValue(), await category.inputValue(), await type.inputValue(), await order.inputValue()];
  const params = new URLSearchParams(page.url().split('#documents?')[1]);
  check(['query', 'category', 'type', 'sort'].every((key, index) => params.get(key) === filters[index]),
    'The applied search, category, file type and sort are shareable in the URL.');
  await page.reload();
  await rows.first().waitFor();
  check(JSON.stringify(filters) === JSON.stringify(await Promise.all([search, category, type, order].map(field => field.inputValue()))),
    'Reloading restores every control.');

  const pdfRow = rows.first();
  const preview = pdfRow.getByRole('button', {name: /^Preview /i}).first();
  const download = pdfRow.getByRole('link', {name: /^Download /i});
  const pdfUrl = await download.evaluate(a => a.href);
  await preview.focus();
  await page.keyboard.press('Enter');
  await dialog.waitFor();
  check(await dialog.getByRole('heading').count() > 0, 'The PDF preview has a visible document title.');
  check(await dialog.locator('iframe').getAttribute('src') === pdfUrl + '#view=FitH',
    'The desktop PDF viewer embeds the original document.');
  check(await dialog.locator('a[download]').evaluate(a => a.href) === pdfUrl, 'Preview and row download the same original.');
  await page.keyboard.press('Escape');
  await dialog.waitFor({state:'hidden'});
  check(await preview.evaluate(b => b === document.activeElement), 'Escape returns keyboard focus to the preview trigger.');
  const downloadEvent = page.waitForEvent('download');
  await download.click();
  const pdf = await downloadEvent;
  check(pdf.suggestedFilename() === decodeURIComponent(new URL(pdfUrl).pathname.split('/').pop()) && !await pdf.failure(),
    'Download delivers the original PDF with its filename.');

  await go('documents');
  await rows.first().waitFor();
  const rowNames = () => rows.locator('a[download]').evaluateAll(links =>
    links.map(a => decodeURIComponent(new URL(a.href).pathname.split('/').pop()).toLocaleLowerCase()));
  await choose(order, /name.*a.*z/i);
  const ascending = await rowNames();
  await choose(order, /name.*z.*a/i);
  const descending = await rowNames();
  check(ascending.length === 78 && ascending[0] === descending.at(-1) && ascending.at(-1) === descending[0],
    'Changing the name order reverses the library endpoints across all 78 records.');
  const dateColumn = page.getByRole('columnheader', {name:/last updated/i});
  await dateColumn.getByRole('button').click();
  const firstDirection = await dateColumn.getAttribute('aria-sort');
  await dateColumn.getByRole('button').click();
  const secondDirection = await dateColumn.getAttribute('aria-sort');
  check([firstDirection, secondDirection].sort().join() === 'ascending,descending', 'The date column toggles and announces both sort directions.');
  await choose(order, /newest/i);
  const dates = await rows.locator('time[datetime]').evaluateAll(nodes => nodes.map(node => Date.parse(node.dateTime)));
  check(dates.length > 1 && dates.every((date, i) => Number.isFinite(date) && (!i || dates[i - 1] >= date)),
    'Known modification dates run from newest to oldest.');
  await search.fill('xyz-no-such-document');
  check(await rows.count() === 0 && await page.locator('#results').innerText() !== '', 'A search with no results displays recovery text.');

  await search.fill('Employee Review Sheet');
  const wordRow = rows.first();
  const wordPreview = wordRow.getByRole('button', {name: /^Preview /i}).first();
  await wordPreview.click();
  await dialog.waitFor();
  const rendition = await dialog.getByRole('link', {name:/open full pdf/i}).evaluate(link => link.href);
  const response = await page.request.get(rendition);
  check(response.ok() && (await response.body()).subarray(0, 5).toString() === '%PDF-',
    'Word previews open a working local PDF rendition.');
  check(await dialog.locator('a[download]').evaluate(a => new URL(a.href).pathname.endsWith('.docx')),
    'The Word preview offers the original DOCX.');
  await dialog.getByRole('button', {name: /close preview/i}).click();
  const save = wordRow.locator('[data-save]');
  if (await save.getAttribute('aria-pressed') !== 'true') await save.click();
  await go('saved');
  const savedPreview = page.getByRole('button', {name:/^Preview .*Employee Review Sheet/i});
  await savedPreview.first().click();
  await dialog.waitFor();
  await page.keyboard.press('Escape');
  await page.locator('main [data-save$="Employee Review Sheet.docx"]').click();
  await go('search?query=Employee%20Review%20Sheet');
  await page.getByRole('button', {name:/^Preview .*Employee Review Sheet/i}).first().waitFor();
  check(await page.getByRole('link', {name: /^Download .*Employee Review Sheet/i}).count() > 0,
    'Saved documents and global search expose document actions.');

  await page.setViewportSize({width: 375, height: 830});
  await go(library);
  await rows.first().waitFor();
  const phoneHeights = await heights();
  check(await fits() && Math.max(...phoneHeights) - Math.min(...phoneHeights) <= 1,
    'The mobile layout fits and keeps search and selectors at equal height.');
  await rows.first().getByRole('button', {name: /^Preview /i}).first().click();
  await dialog.waitFor();
  const bounds = await dialog.boundingBox();
  check(bounds.x >= 0 && bounds.x + bounds.width <= 376 && await fits(), 'The mobile preview fits the viewport.');
  check(await dialog.locator('figure img').evaluate(async image => {await image.decode(); return image.naturalWidth > 100;}),
    'The mobile preview decodes a readable first-page image.');
  await dialog.getByRole('button', {name:/close preview/i}).click();
  await go('page/' + encodeURIComponent('scorm/intranet/static-org-chart-test/index.html'));
  check(await page.getByRole('link', {name:/open in bagwan 2\.0/i}).count() === 0,
    'The organisation chart stays inside Bagwan 3.0.');
  check(errors.length === 0, 'The library journeys complete without JavaScript errors.');
  return {passed:checks.length, checks, errors};
}
