'use strict';

for (const lookup of document.querySelectorAll('[data-lookup]')) {
  const input = lookup.querySelector('input[type="search"]');
  const status = lookup.querySelector('[data-count]');
  const groups = [...lookup.querySelectorAll('.evidence-group')].map(element => ({
    element,
    items: [...element.querySelectorAll('.evidence-item')],
    page: 0,
    matches: []
  }));
  const unit = lookup.dataset.unit;
  const pageSize = 5;
  const label = count => count === 1 ? unit : unit + 's';
  const searchText = text => text.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  function showPage(group) {
    const start = group.page * pageSize;
    const visible = group.matches.slice(start, start + pageSize);
    for (const item of group.items) item.hidden = !visible.includes(item);
    const pager = group.element.querySelector('.evidence-pager');
    pager.hidden = group.matches.length <= pageSize;
    pager.querySelector('[data-back]').disabled = group.page === 0;
    pager.querySelector('[data-next]').disabled = start + pageSize >= group.matches.length;
    pager.querySelector('[data-position]').textContent =
      (start + 1) + '–' + (start + visible.length) + ' of ' + group.matches.length;
  }

  function filter() {
    const query = searchText(input.value.trim());
    const words = query.split(/\s+/).filter(Boolean);
    const row = unit === 'row' && query.match(/^(?:#|row[-\s]*)?(\d+)$/);
    let total = 0;
    for (const group of groups) {
      group.matches = group.items.filter(item => row ? item.dataset.number === row[1] :
        words.every(word => searchText(item.textContent).includes(word)));
      total += group.matches.length;
      group.page = 0;
      group.element.hidden = !group.matches.length;
      group.element.querySelector('.group-count').textContent = group.matches.length;
      group.element.open = Boolean(query && group.matches.length);
      for (const item of group.items) item.querySelector('details').open = false;
      if (row && group.matches.length) group.matches[0].querySelector('details').open = true;
      showPage(group);
    }
    status.textContent = query ? (total ? total + ' matching ' + label(total) : 'No matches. Try a different word or number.') : '';
  }

  function showLinkedItem() {
    const target = document.getElementById(location.hash.slice(1));
    if (!target) return;
    const item = target.closest('.evidence-item');
    const group = groups.find(group => group.element.contains(target));
    if (group) {
      input.value = '';
      filter();
      group.element.open = true;
      if (item) {
        group.page = Math.floor(group.items.indexOf(item) / pageSize);
        showPage(group);
        item.querySelector('details').open = true;
      }
    }
    if (target instanceof HTMLDetailsElement) target.open = true;
    if (group || target instanceof HTMLDetailsElement) target.scrollIntoView();
  }

  for (const group of groups) {
    group.element.querySelector('.evidence-pager').addEventListener('click', event => {
      const button = event.target.closest('button');
      if (!button || button.disabled) return;
      group.page += button.hasAttribute('data-next') ? 1 : -1;
      showPage(group);
      group.matches[group.page * pageSize].querySelector('summary').focus();
    });
  }
  input.addEventListener('input', filter);
  lookup.querySelector('.lookup-tools').hidden = false;
  filter();
  showLinkedItem();
  window.addEventListener('hashchange', showLinkedItem);
}
