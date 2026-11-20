'use strict';

function publicPagePath(path) {
  return path.replace('/emergency-repsonse/', '/emergency-response/').replace('/logisitics/', '/logistics/');
}

function sourcePagePath(path) {
  return path.replace('/emergency-response/', '/emergency-repsonse/').replace('/logistics/', '/logisitics/');
}

function departmentContext() {
  const [route, query] = location.hash.slice(1).split('?');
  const id = new URLSearchParams(query).get('from');
  const department = departmentData.find(item => route === 'department/' + item.id || route === pageLink(item.source).slice(1));
  return departmentData.find(item => item.id === id) || department;
}

function withDepartment(hash) {
  const department = departmentContext();
  if (!department) return hash;
  const [route, search] = hash.split('?');
  if (!/^#(page\/|person\/|people$|documents$|videos$|policies$|resources$|forms$|news$|search$|tour$|patient-case$)/.test(route)) return hash;
  const query = new URLSearchParams(search);
  query.set('from', department.id);
  return route + '?' + query;
}

function replaceSectionHash(hash) {
  history.replaceState(history.state, '', withDepartment(hash));
}

// Filters and search results can insert links after the view has rendered.
function markDepartmentLinks(node) {
  if (node.nodeType !== Node.ELEMENT_NODE || !departmentContext()) return;
  const links = node.matches('a[href^="#"]') ? [node] : node.querySelectorAll('a[href^="#"]');
  for (const anchor of links) {
    const href = anchor.getAttribute('href');
    const next = withDepartment(href);
    if (next !== href) anchor.setAttribute('href', next);
  }
}

function sectionForCategory(category) {
  return {Policy:'policies', News:'news', 'Form or record':'forms', Department:'departments',
    People:'people', 'Document library':'resources', Resource:'resources', 'Hospital tour':'tour'}[category];
}

function renderBreadcrumbs(route, identifier, section) {
  const title = main.querySelector('h1')?.textContent.trim();
  if (!title || title === 'Staff home' || title === 'Page not found') return;
  const context = departmentContext();
  const crumbs = [['#home', 'Staff home']];
  const existing = main.querySelector('.breadcrumbs');
  if (context || route.startsWith('department/')) crumbs.push(['#departments', 'Departments']);
  if (context && route !== 'department/' + context.id && identifier !== context.source) {
    crumbs.push(['#department/' + context.id, context.name]);
  }
  const sectionKey = nav.some(([key]) => key === section) ? section : sectionForCategory(pageMap.get(identifier)?.category);
  const label = nav.find(([key]) => key === sectionKey)?.[1];
  if (label && label !== title && route !== sectionKey && !crumbs.some(([href]) => href === '#' + sectionKey)) {
    crumbs.push(['#' + sectionKey, label]);
  }
  // Directory profiles and team charts already identify their immediate parents.
  if (existing) {
    for (const anchor of existing.querySelectorAll('a[href^="#"]')) {
      const href = anchor.getAttribute('href');
      if (!crumbs.some(([link]) => link === href)) crumbs.push([href, anchor.textContent.trim()]);
    }
  }
  const breadcrumb = document.createElement('nav');
  breadcrumb.className = 'breadcrumbs';
  breadcrumb.setAttribute('aria-label', 'Breadcrumb');
  breadcrumb.innerHTML = crumbs.map(([href, name]) => '<a href="' + esc(href) + '">' + esc(name) + '</a>').join(' / ') +
    ' / <span aria-current="page">' + esc(title) + '</span>';
  if (existing) existing.replaceWith(breadcrumb);
  else main.prepend(breadcrumb);
  markDepartmentLinks(main);
}

new MutationObserver(records => {
  for (const record of records) for (const node of record.addedNodes) markDepartmentLinks(node);
}).observe(document.getElementById('main'), {childList:true, subtree:true});
