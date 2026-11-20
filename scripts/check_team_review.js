// Run with playwright-cli run-code while serving the repository as described in 3.0/README.md.
async page => {
  const base = 'http://127.0.0.1:4173/Bagwan2.0/3.0/';
  const errors = [], checks = [];
  page.on('pageerror', error => errors.push(error.message));
  const check = (condition, message) => {
    if (!condition) throw new Error(message);
    checks.push(message);
  };
  const go = async hash => {
    await page.goto(base + hash, {waitUntil:'domcontentloaded'});
    await page.locator('main h1').first().waitFor();
  };
  const policy = slug => '#page/' + encodeURIComponent('scorm/quick-link-pages/policy-and-procedures/' + slug + '/index.html');
  await go('#department/hr');
  await page.getByRole('link', {name:'All staff news', exact:true}).click();
  const crumbs = page.getByRole('navigation', {name:'Breadcrumb', exact:true});
  await crumbs.getByRole('link', {name:'People & culture', exact:true}).waitFor();
  await page.locator('#list-search, #news-search').fill('CEO');
  check(page.url().includes('from=hr'), 'Filtering the news retains the HR return route.');
  await page.reload();
  await crumbs.getByRole('link', {name:'People & culture', exact:true}).click();
  await page.getByRole('link', {name:'HR documents & templates'}).click();
  await page.locator('#category-filter').waitFor();
  await page.locator('#list-search').fill('meeting');
  check(page.url().includes('from=hr'), 'A document search retains its department through reload and another journey.');
  for (const [legacy, spelling] of [[policy('emergency-repsonse'),'emergency-response'],
    ['#page/' + encodeURIComponent('scorm/department-pages/logisitics/index.html'),'logistics']]) {
    await go(legacy + '?from=nursing');
    check(page.url().includes(spelling) && page.url().includes('from=nursing') &&
      await page.locator('main h1').innerText() !== 'Page not found', 'Old bookmarks reach the corrected ' + spelling + ' address.');
    await page.reload();
    await page.locator('.breadcrumbs').waitFor();
    check(await crumbs.getByRole('link',{name:'Nursing',exact:true}).count() === 1, 'The corrected bookmark restores Nursing context.');
  }
  for (const slug of ['complaints-and-feedback-handling','freedom-of-information','internet-email-and-social-media',
    'interpretinglanguage-services-rights-and-responsibilities','mandatory-reporting']) {
    await go(policy(slug));
    check((await page.locator('.policy-metadata').innerText()).includes('001'), 'Source version 001 appears on ' + slug + '.');
  }
  for (const width of [320,375,768,1440]) {
    await page.setViewportSize({width,height:900});
    for (const hash of ['#documents?query=human+resources','#department/hr','#news','#forms','#people','#patient-case','#policies']) {
      await go(hash);
      check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth+1), hash + ' fits at ' + width + ' px.');
    }
    await page.goto(base + 'review-register.html#clinical-review');
    check(await page.locator('#clinical-review').evaluate(el => el.open) &&
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth+1), 'The linked clinical review opens and fits at ' + width + ' px.');
  }
  check(!errors.length, errors.join(' / ') || 'No uncaught browser errors.');
  return checks;
}
