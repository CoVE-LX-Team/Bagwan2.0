'use strict';

function revealDecision(hash) {
  const target = document.getElementById(hash.slice(1));
  if (!target || !target.closest('.register')) return;
  for (let node = target; node; node = node.parentElement) {
    if (node instanceof HTMLDetailsElement) node.open = true;
  }
  target.scrollIntoView({block: 'start'});
  if (target instanceof HTMLDetailsElement) target.querySelector('summary')?.focus({preventScroll: true});
}

window.addEventListener('hashchange', () => revealDecision(location.hash));
document.addEventListener('click', event => {
  const link = event.target.closest('a[href^="#"]');
  if (link && link.hash === location.hash) revealDecision(link.hash);
});
if (location.hash) revealDecision(location.hash);
