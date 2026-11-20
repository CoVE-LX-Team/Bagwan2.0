'use strict';

const entries = [...document.querySelectorAll('details.review-entry')];
const jump = document.querySelector('.register-jump details');
function showLinkedEntry() {
  const target = document.getElementById(location.hash.slice(1));
  if (!target) return;
  if (target === jump) {
    jump.open = true;
    jump.querySelector('summary').focus({preventScroll:true});
    jump.scrollIntoView({block:'start'});
  }
  if (entries.includes(target)) target.open = true;
  if (entries.includes(target) || target.id === 'release-checks') target.scrollIntoView({block:'start'});
}

jump.addEventListener('click', event => {
  const link = event.target.closest('a[href^="#"]');
  if (!link) return;
  jump.open = false;
  const target = document.getElementById(link.hash.slice(1));
  if (target?.matches('.review-entry')) {
    target.open = true;
    target.querySelector('summary').focus({preventScroll:true});
  }
});
window.addEventListener('hashchange', showLinkedEntry);
showLinkedEntry();

let beforePrint;
window.addEventListener('beforeprint', () => {
  if (beforePrint) return;
  beforePrint = entries.map(entry => entry.open);
  for (const entry of entries) entry.open = true;
});
window.addEventListener('afterprint', () => {
  if (!beforePrint) return;
  entries.forEach((entry, index) => { entry.open = beforePrint[index]; });
  beforePrint = null;
});
