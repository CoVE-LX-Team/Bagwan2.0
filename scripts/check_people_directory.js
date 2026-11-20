// Use playwright-cli run-code --filename with the preview server from 3.0/README.md.
async (page) => {
  const base = 'http://127.0.0.1:4173/Bagwan2.0/3.0/';
  const checks = [];
  const errors = [];
  const check = (result, label) => {
    if (!result) throw new Error(label);
    checks.push(label);
  };
  const heading = name => page.getByRole('heading', {level:1, name, exact:true});
  const fits = () => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
  const route = async hash => {await page.goto(base + hash);};
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({width:1440, height:950});
  await route('#people?query=George%20Dunn');
  await page.reload();
  await heading('People directory').waitFor();
  const rows = page.locator('.staff-directory .person');
  check(await rows.count() === 1, 'Existing staff search links resolve to the matching directory entry.');
  const row = rows.first();
  check((await row.innerText()).includes('Executive Director of People and Culture'), 'The directory identifies the person and position separately.');
  const george = row.getByRole('link', {name:'George Dunn', exact:true});
  const georgeUrl = await george.evaluate(a => a.href);
  await george.click();
  await heading('George Dunn').waitFor();
  const manager = page.getByRole('heading', {name:'Reports to', exact:true}).locator('..');
  const ceo = manager.getByRole('link', {name:/Christina Jones/});
  check(await ceo.count() === 1, 'George’s profile links to his manager, the CEO.');
  const reports = page.getByRole('heading', {name:/^Direct reports/}).locator('..');
  check(await reports.getByRole('link').count() === 4, 'George’s profile identifies all four direct reports.');
  await reports.getByRole('link', {name:'Rowland Stevens', exact:true}).click();
  await heading('Rowland Stevens').waitFor();
  check(await manager.getByRole('link', {name:'George Dunn'}).evaluate(a => a.href) === georgeUrl,
    'A direct report links back to the same manager.');
  check((await reports.innerText()).includes('No direct reports'), 'A person without recorded direct reports has a clear empty state.');
  await manager.getByRole('link', {name:'George Dunn'}).click();
  await heading('George Dunn').waitFor();
  await ceo.click();
  await heading(/Christina Jones/).waitFor();
  check(await reports.getByRole('link', {name:'George Dunn'}).count() === 1, 'The CEO’s profile links back to George.');

  await route('#people');
  await heading('People directory').waitFor();
  const search = page.locator('#list-search');
  const filter = page.getByRole('combobox', {name:'Department', exact:true});
  await filter.selectOption({label:'People and Culture'});
  await search.fill('brigida');
  check(await rows.count() === 1 && (await rows.first().innerText()).includes('Brígida Serra'),
    'Department filtering combines with accent-insensitive name search.');
  await page.reload();
  await rows.first().waitFor();
  check(await search.inputValue() === 'brigida' && await filter.inputValue() === 'People and Culture',
    'The filtered directory can be refreshed and shared.');
  await page.getByRole('navigation', {name:'People views'}).getByRole('link', {name:'Organisation chart'}).click();
  await heading('Hospital organisation chart').waitFor();
  const leaders = page.locator('.org-leaders > li');
  const wideChart = await leaders.evaluateAll(nodes => nodes.map(n => n.getBoundingClientRect().top));
  check(wideChart.length === 5 && new Set(wideChart).size === 1, 'Five executive branches align beneath the CEO on desktop.');
  check(await page.getByRole('link', {name:/Nursing department/}).count() > 0,
    'The hospital chart retains department navigation alongside executive leadership.');
  await page.getByRole('link', {name:'George Dunn'}).first().click();
  await heading('George Dunn').waitFor();
  await page.getByRole('link', {name:/View .* organisation chart/i}).click();
  await page.locator('.staff-tree').waitFor();
  check(await page.locator('.staff-tree > li').count() === 1 &&
    await page.locator('.staff-tree > li > ul > li').count() === 4, 'The HR chart nests four positions beneath the manager.');

  for (const width of [375, 320]) {
    await page.setViewportSize({width, height:840});
    check(await fits(), 'The team chart fits at ' + width + ' CSS pixels.');
    await page.goto(georgeUrl);
    await heading('George Dunn').waitFor();
    check(await fits(), 'The profile fits at ' + width + ' CSS pixels.');
    await route('#people');
    await rows.first().waitFor();
    check(await fits() && await rows.first().locator('.staff-field-label').first().isVisible(),
      'Mobile directory rows include visible field labels at ' + width + ' CSS pixels.');
    await page.goto(georgeUrl);
    await heading('George Dunn').waitFor();
    await page.getByRole('link', {name:/View .* organisation chart/i}).click();
    await page.locator('.staff-tree').waitFor();
  }
  await route('#page/' + encodeURIComponent('scorm/intranet/static-org-chart-test/index.html'));
  await heading('Hospital organisation chart').waitFor();
  const narrowChart = await leaders.evaluateAll(nodes => nodes.map(n => n.getBoundingClientRect().top));
  check(narrowChart.length === 5 && new Set(narrowChart).size === 5 && await fits(),
    'The hospital chart reflows its five branches vertically on a narrow phone.');
  await route('#person/romeo-knight');
  await heading('Romeo Knight').waitFor();
  check(await manager.getByRole('link').count() === 0 && await reports.getByRole('link').count() === 4,
    'The recovered nursing chart shows four confirmed reports and leaves the manager unassigned.');
  check(errors.length === 0, 'The directory, profiles and charts run without JavaScript errors.');
  return {passed:checks.length, checks, errors};
}
