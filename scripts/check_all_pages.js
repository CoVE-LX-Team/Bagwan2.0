async (page) => {
  const inventory = await page.request.get('http://127.0.0.1:4173/Bagwan2.0/static-export.json').then(r => r.json());
  const generated = await page.request.get('http://127.0.0.1:4173/Bagwan2.0/output/review-pages.json').then(r => r.json());
  const paths = [...new Set([...inventory.pages.map(p => p.path), ...generated])].sort();
  const results = [];
  await page.route('https://www.youtube.com/**', route => route.abort());
  for (const [index, path] of paths.entries()) {
    const errors = [];
    const onError = error => errors.push(error.message);
    page.on('pageerror', onError);
    const result = {path, screenshots: {}};
    try {
      await page.setViewportSize({width:1440, height:1000});
      const response = await page.goto('http://127.0.0.1:4173/Bagwan2.0/' + path, {waitUntil:'domcontentloaded', timeout:20000});
      result.status = response.status();
      await page.waitForTimeout(100);
      result.desktop = await page.evaluate(() => {
        const main = document.querySelector('main') || document.body;
        const visible = e => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden';
        return {
          title: document.title, h1:[...main.querySelectorAll('h1')].map(e=>e.textContent.trim()),
          headings:[...main.querySelectorAll('h1,h2,h3,h4')].map(e=>e.textContent.trim()),
          text:main.innerText, words:main.innerText.split(/\s+/).length,
          horizontalOverflow:document.documentElement.scrollWidth > innerWidth + 1,
          brokenImages:[...document.images].filter(e=>visible(e)&&e.complete&&!e.naturalWidth).map(e=>e.getAttribute('src')),
          unnamedLinks:[...main.querySelectorAll('a')].filter(e=>visible(e)&&!e.textContent.trim()&&!e.getAttribute('aria-label')&&!e.querySelector('img[alt]')).map(e=>e.getAttribute('href')),
          emptyLinks:[...main.querySelectorAll('a[href="#"],a[href=""]')].filter(visible).map(e=>e.textContent.trim()),
          fields:main.querySelectorAll('input,select,textarea').length,
          controls:main.querySelectorAll('button,[role="button"]').length,
          frames:[...main.querySelectorAll('iframe')].map(e=>({src:e.getAttribute('src'),title:e.title})),
          missingContent:[...main.querySelectorAll('.static-site-notice')].map(e=>e.textContent.trim())
        };
      });
      if (!path.startsWith('VR/')) {
        await page.addScriptTag({path:'/tmp/bagwan-axe.min.js'});
        result.accessibility = await page.evaluate(async () => {
          const r = await axe.run(document, {runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa','best-practice']}});
          return {violations:r.violations.map(v=>({id:v.id,impact:v.impact,description:v.description,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),incomplete:r.incomplete.map(v=>({id:v.id,nodes:v.nodes.length}))};
        });
      }
      const stem = String(index+1).padStart(3,'0');
      result.screenshots.desktop = 'all-pages/' + stem + '-desktop.png';
      await page.screenshot({path:'Bagwan2.0/output/playwright/' + result.screenshots.desktop});
      await page.setViewportSize({width:375,height:900});
      await page.waitForTimeout(80);
      result.mobile = await page.evaluate(() => ({horizontalOverflow:document.documentElement.scrollWidth>innerWidth+1, pageWidth:document.documentElement.scrollWidth,viewport:innerWidth}));
      result.screenshots.mobile = 'all-pages/' + stem + '-mobile.png';
      await page.screenshot({path:'Bagwan2.0/output/playwright/' + result.screenshots.mobile});
    } catch(error) { result.error=error.message; }
    page.off('pageerror',onError);
    result.javascriptErrors=errors;
    results.push(result);
  }
  return results;
}
