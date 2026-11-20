'use strict';

const hospitalChartPath = 'scorm/intranet/static-org-chart-test/index.html';
const byStaffName = new Intl.Collator('en-AU', {sensitivity: 'base', numeric: true});
let peopleIndex;

function directoryIndex() {
  if (peopleIndex) return peopleIndex;
  const positions = data.hierarchy;
  const byId = new Map(positions.map(position => [position.id, position]));
  const reports = new Map();
  for (const position of positions) {
    if (!position.manager_id) continue;
    if (!reports.has(position.manager_id)) reports.set(position.manager_id, []);
    reports.get(position.manager_id).push(position);
  }
  peopleIndex = {positions, byId, reports};
  return peopleIndex;
}

function personLink(person) {
  const {positions} = directoryIndex();
  const match = person.id ? person : positions.find(p => p.name === person.name && p.department === person.department)
    || positions.find(p => p.name === person.name);
  return match ? '#person/' + encodeURIComponent(match.id) : '#people?query=' + encodeURIComponent(person.name);
}

function staffAvatar(person, large = false) {
  const className = 'staff-avatar' + (large ? ' large' : '');
  const initials = (person.name || '').replace(/^(dr|mr|ms|mrs)\.?\s+/i, '').trim().split(/\s+/);
  const letters = [initials[0]?.charAt(0), initials.length > 1 ? initials.at(-1).charAt(0) : ''].join('');
  return '<span class="' + className + '" aria-hidden="true">' + (person.image && person.name
    ? '<img alt="" ' + (large ? '' : 'loading="lazy" ') + 'src="' + esc(absolute(person.image)) + '">'
    : esc(letters || '–')) + '</span>';
}

function staffLink(person) {
  return '<a href="' + esc(personLink(person)) + '">' + esc(person.name || person.role) + '</a>';
}

function peopleNav(active) {
  return '<nav class="people-nav" aria-label="People views"><a href="#people"' +
    (active === 'directory' ? ' aria-current="page"' : '') + '>Staff directory</a><a href="' +
    pageLink(hospitalChartPath) + '"' + (active === 'chart' ? ' aria-current="page"' : '') + '>Organisation chart</a></nav>';
}

function renderPeopleDirectory() {
  const {positions, byId, reports} = directoryIndex();
  const people = positions.filter(p => p.name).sort((a, b) => byStaffName.compare(a.name, b.name) || byStaffName.compare(a.role, b.role));
  const departments = [...new Set(people.map(p => p.department))].sort(byStaffName.compare);
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const fold = text => text.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('en-AU');
  main.innerHTML = intro('People directory', 'Find staff by name, position or department. Open a profile to see their reporting line.') +
    peopleNav('directory') +
    '<div class="people-filters"><label for="list-search">Search staff<input class="field-search" type="search" id="list-search" placeholder="Name, position or department"></label>' +
    '<label for="people-department">Department<select class="field-search" id="people-department"><option value="">All departments</option>' +
    departments.map(d => '<option>' + esc(d) + '</option>').join('') + '</select></label></div>' +
    '<p class="people-count" role="status" id="result-count"></p><div id="results"></div>';
  const search = main.querySelector('#list-search');
  const filter = main.querySelector('#people-department');
  search.value = params.get('query') || '';
  if (departments.includes(params.get('department'))) filter.value = params.get('department');
  const update = () => {
    const words = fold(search.value.trim()).split(/\s+/);
    const found = people.filter(p => (!filter.value || p.department === filter.value) &&
      words.every(word => fold([p.name, p.role, p.department, p.unit].join(' ')).includes(word)));
    main.querySelector('#result-count').textContent = found.length + (found.length === 1 ? ' staff profile' : ' staff profiles');
    main.querySelector('#results').innerHTML = found.length
      ? '<table class="staff-directory"><caption class="sr-only">Staff profiles and reporting lines</caption>' +
        '<thead><tr><th scope="col">Name</th><th scope="col">Position</th><th scope="col">Department</th><th scope="col">Reports to</th></tr></thead><tbody>' +
        found.map(p => {
          const manager = byId.get(p.manager_id);
          const count = reports.get(p.id)?.length || 0;
          return '<tr class="person"><th scope="row"><div class="staff-identity">' + staffAvatar(p) +
            '<div>' + staffLink(p) + (count ? '<small>' + count + ' direct report' + (count === 1 ? '' : 's') + '</small>' : '') +
            '</div></div></th><td><span class="staff-field-label">Position</span>' + esc(p.role) +
            '</td><td><span class="staff-field-label">Department</span><span>' + esc(p.department) +
            (p.unit ? '<small class="staff-unit">' + esc(p.unit) + '</small>' : '') + '</span>' +
            '</td><td><span class="staff-field-label">Reports to</span>' + (manager ? staffLink(manager) : '<span class="staff-muted">Unlisted</span>') + '</td></tr>';
        }).join('') + '</tbody></table>'
      : empty();
    const next = new URLSearchParams();
    if (search.value) next.set('query', search.value);
    if (filter.value) next.set('department', filter.value);
    const hash = '#people' + (next.size ? '?' + next : '');
    if (hash !== location.hash) history.replaceState(null, '', hash);
  };
  search.addEventListener('input', update);
  filter.addEventListener('change', update);
  update();
}

function positionLine(p) {
  return '<div class="staff-identity">' + staffAvatar(p) + '<div>' + staffLink(p) +
    '<small>' + esc(p.name ? p.role : 'Staff name unlisted') + '</small></div></div>';
}

function renderPerson(id) {
  const {byId, reports} = directoryIndex();
  const p = byId.get(id);
  if (!p) return notFound();
  const manager = byId.get(p.manager_id);
  const team = reports.get(id) || [];
  const groupHref = '#people?department=' + encodeURIComponent(p.department);
  main.innerHTML = '<nav class="breadcrumbs" aria-label="Breadcrumb"><a href="#people">People directory</a> / <a href="' +
    groupHref + '">' + esc(p.department) + '</a></nav><header class="staff-profile">' + staffAvatar(p, true) + '<div><h1>' +
    esc(p.name || p.role) + '</h1><p>' + esc(p.name ? p.role : 'Staff name unlisted') + '</p><a href="' + groupHref + '">' +
    esc(p.department) + '</a>' + (p.unit ? ' · ' + esc(p.unit) : '') + '</div>' + saveButton('person:' + p.id, p.name || p.role) + '</header>' +
    '<div class="staff-relations"><section><h2>Reports to</h2>' + (manager ? positionLine(manager) :
    '<p class="staff-muted">A manager is not listed in the source chart.</p>') + '</section><section><h2>Direct reports' +
    (team.length ? ' <span>(' + team.length + ')</span>' : '') + '</h2>' + (team.length
      ? '<ul class="staff-branches">' + team.map(child => '<li>' + positionLine(child) + '</li>').join('') + '</ul>'
      : '<p class="staff-muted">No direct reports are listed in the source chart.</p>') + '</section></div>' +
    (p.note ? '<p class="staff-source-note">' + esc(p.note) + '</p>' : '') +
    (p.source_page && pageMap.has(p.source_page) ? '<p class="staff-chart-link"><a href="' +
      pageLink(p.source_page) + '">View ' + esc(p.department) + ' organisation chart</a></p>' :
      p.source_label ? '<dl class="staff-source"><dt>Reporting source</dt><dd>' + esc(p.source_label) + '</dd></dl>' : '');
}

function chartPath(path) {
  return path.replace('scorm/intranet/static-org-chart-test/', 'scorm/static-org-chart-test/');
}

function renderTeamChart(path) {
  const {positions, reports} = directoryIndex();
  const canonical = chartPath(path);
  if (canonical === chartPath(hospitalChartPath)) {
    const ceo = positions.find(p => /^chief executive officer$/i.test(p.role));
    if (!ceo) return false;
    const record = pageMap.get(path);
    const document = new DOMParser().parseFromString(record.html, 'text/html');
    const services = [...document.querySelectorAll('#first > li')];
    const serviceLinks = services.map(item => {
      const href = item.querySelector('a[href]')?.getAttribute('href');
      const originalLabel = item.textContent.trim();
      const label = originalLabel === 'ATSI liaison office' ? 'Aboriginal and Torres Strait Islander liaison office' : originalLabel;
      if (!href) return '<li><span>' + esc(label) + '<small>Team chart unavailable</small></span></li>';
      const original = new URL(href, absolute(path));
      const target = decodeURIComponent(original.pathname.slice(ROOT.pathname.length));
      return '<li><a href="' + pageLink(target) + '">' + esc(label) + '</a></li>';
    });
    const team = reports.get(ceo.id) || [];
    main.innerHTML = intro('Hospital organisation chart', 'Explore the hospital leadership team and departmental reporting lines.') +
      peopleNav('chart') + '<section class="hospital-org" aria-label="Hospital executive reporting lines"><div class="org-chief"><div>' +
      staffAvatar(ceo, true) + '<div><h2>' + staffLink(ceo) + '</h2><p>' + esc(ceo.role) + '</p></div></div></div>' +
      '<div class="org-level"><h3>Direct reports to the CEO</h3></div><ul class="org-leaders" style="--org-count:' + team.length + '">' +
      team.map(p => '<li><div class="org-leader">' + staffAvatar(p) + '<div class="org-person"><h4>' + staffLink(p) +
        '</h4><p>' + esc(p.role) + '</p></div>' + (p.source_page && chartPath(p.source_page) !== canonical ?
        '<a class="org-team" href="' + pageLink(p.source_page) + '" aria-label="View ' + esc(p.department) +
        ' team chart">View team <span aria-hidden="true">→</span></a>' : '') + '</div></li>').join('') + '</ul></section>' +
      (services.length ? '<section class="staff-services"><h2>Departments</h2><ul>' + serviceLinks.join('') + '</ul></section>' : '');
    return true;
  }
  if (!/organisation-chart|department-chart/.test(canonical)) return false;
  const members = positions.filter(p => p.source_page && chartPath(p.source_page) === canonical);
  if (!members.length) return false;
  const ids = new Set(members.map(p => p.id));
  function tree(p) {
    const children = (reports.get(p.id) || []).filter(child => ids.has(child.id));
    return '<li>' + positionLine(p) + (children.length ? '<ul class="staff-branches" aria-label="Reports to ' +
      esc(p.name || p.role) + '">' + children.map(tree).join('') + '</ul>' : '') + '</li>';
  }
  const roots = members.filter(p => !ids.has(p.manager_id));
  main.innerHTML = '<nav class="breadcrumbs" aria-label="Breadcrumb"><a href="#people">People directory</a> / <a href="' +
    pageLink(hospitalChartPath) + '">Organisation chart</a></nav>' + intro(pageMap.get(path).title,
    'Follow each branch from the manager to the roles that report to them.', 'TEAM STRUCTURE') +
    '<ul class="staff-tree">' + roots.map(tree).join('') + '</ul>';
  return true;
}
