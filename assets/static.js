/* Browser-only support for the static learning simulation. No server submissions. */
(() => {
  'use strict';
  const root = document.body.dataset.siteRoot || '/Bagwan2.0/';
  const search = document.getElementById('document-search');
  const staffSearch = document.getElementById('staff-search');
  if (staffSearch) {
    const sections = [...document.querySelectorAll('.directory-jump ~ section')];
    const update = () => {
      const terms = staffSearch.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
      let count = 0;
      sections.forEach(section => {
        const department = section.querySelector('h2').textContent.toLowerCase();
        const rows = [...section.querySelectorAll('tbody tr')];
        rows.forEach(row => {
          row.hidden = !terms.every(term => (department + ' ' + row.textContent.toLowerCase()).includes(term));
          if (!row.hidden) count++;
        });
        section.hidden = terms.length > 0 && (rows.length ? rows.every(row => row.hidden) : !terms.every(term => section.textContent.toLowerCase().includes(term)));
      });
      document.getElementById('staff-results').textContent = `${count} matching staff entries`;
    };
    staffSearch.addEventListener('input', update);
    document.querySelectorAll('.directory-jump a').forEach(a => a.addEventListener('click', () => { staffSearch.value = ''; update(); }));
    update();
  }
  document.querySelectorAll('[data-profile-dialog]').forEach(button => {
    const dialog = document.getElementById(button.dataset.profileDialog);
    button.addEventListener('click', () => dialog.showModal());
    dialog.addEventListener('click', event => { if (event.target === dialog) { const box = dialog.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close(); } });
  });
  const menuToggle = document.getElementById('showRightPush');
  if (menuToggle) {
    const sidebar = document.getElementById('sidebar');
    const content = document.getElementById('content');
    const desktop = window.matchMedia('(min-width:1100px)');
    const footer = document.querySelector('footer,.footer');
    const fullscreenControl = document.getElementById('fullscreen-control');
    if (fullscreenControl) document.getElementById('banner')?.append(fullscreenControl);
    const backdrop = document.createElement('button');
    backdrop.type = 'button'; backdrop.className = 'navigation-backdrop';
    backdrop.setAttribute('aria-label', 'Close navigation'); backdrop.tabIndex = -1;
    document.body.append(backdrop);
    const skip = document.querySelector('.skip-to-content') || document.createElement('a');
    if (!skip.parentElement) {
      skip.href = '#content'; skip.className = 'skip-to-content'; skip.textContent = 'Skip to content';
      document.body.prepend(skip);
    }
    content.tabIndex = -1;
    const setOpen = (open, restoreFocus = false) => {
      document.body.classList.toggle('navigation-open', open);
      document.body.classList.toggle('navigation-modal', open && !desktop.matches);
      sidebar.classList.remove('cbp-spmenu-open');
      sidebar.inert = !open;
      sidebar.setAttribute('aria-label', 'Main navigation');
      sidebar.setAttribute('aria-hidden', String(!open));
      menuToggle.classList.toggle('open', open);
      menuToggle.setAttribute('aria-expanded', String(open));
      menuToggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
      backdrop.hidden = !open || desktop.matches;
      skip.inert = open && !desktop.matches;
      content.inert = open && !desktop.matches;
      if (footer) footer.inert = open && !desktop.matches;
      if (restoreFocus) menuToggle.focus();
    };
    menuToggle.onclick = null;
    menuToggle.addEventListener('click', event => {
      event.preventDefault(); event.stopImmediatePropagation();
      setOpen(!document.body.classList.contains('navigation-open'), true);
    }, true);
    menuToggle.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); menuToggle.click(); }
    });
    backdrop.addEventListener('click', () => setOpen(false, true));
    document.addEventListener('keydown', event => {
      if (document.querySelector('dialog[open],.modal.show')) return;
      if (!document.body.classList.contains('navigation-open')) return;
      if (event.key === 'Escape') { event.preventDefault(); setOpen(false, true); }
      if (event.key === 'Tab' && !desktop.matches) {
        const items = [menuToggle, ...sidebar.querySelectorAll('a[href],button,[tabindex="0"]')].filter(el => el.getClientRects().length && !el.closest('[hidden]'));
        const index = items.indexOf(document.activeElement);
        if (event.shiftKey && index <= 0) { event.preventDefault(); items.at(-1).focus(); }
        else if (!event.shiftKey && (index === -1 || index === items.length - 1)) { event.preventDefault(); items[0].focus(); }
      }
    });
    desktop.addEventListener('change', () => setOpen(desktop.matches));
    setOpen(desktop.matches);
  }
  document.querySelector('a.full-screen')?.addEventListener('click', event => { event.preventDefault(); event.stopPropagation(); });
  document.querySelectorAll('#cssmenu li.has-sub > a').forEach(button => {
    const update = () => button.setAttribute('aria-expanded', String(button.parentElement.classList.contains('open')));
    new MutationObserver(update).observe(button.parentElement, {attributes:true,attributeFilter:['class']});
    button.addEventListener('keydown', event => { if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); button.click(); } });
  });
  document.querySelectorAll('[data-print-form]').forEach(button => button.addEventListener('click', () => window.print()));
  document.querySelector('[data-message-proceed]')?.addEventListener('click', () => {
    if (document.getElementById('customCheck1').checked && document.getElementById('customCheck2').checked) location.href = root + 'patient-management-system/patient-database/index.html';
    else if (window.jQuery) window.jQuery('#messageModal').modal('show');
  });
  if (search) {
    const items = [...document.querySelectorAll('.document-list li')];
    const update = () => {
      const terms = search.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
      let count = 0;
      items.forEach(item => {
        item.hidden = !terms.every(term => item.textContent.toLowerCase().includes(term));
        if (!item.hidden) count++;
      });
      document.getElementById('document-results').textContent = `${count} matching documents and folders`;
    };
    search.addEventListener('input', update);
    update();
  }
  document.querySelectorAll('iframe').forEach(frame => {
    const url = new URL(frame.src, location.href);
    if (url.origin !== location.origin || !url.pathname.includes('/resources-and-tools/')) return;
    let observer;
    const fit = () => {
      try {
        const doc = frame.contentDocument;
        if (!doc?.body) return;
        observer?.disconnect();
        doc.documentElement.style.height = 'auto';
        doc.body.style.height = 'auto'; doc.body.style.minHeight = '0';
        frame.classList.add('static-auto-height');
        const resize = () => frame.style.setProperty('--frame-height', Math.ceil(doc.body.getBoundingClientRect().height + 24) + 'px');
        observer = new ResizeObserver(resize); observer.observe(doc.body); resize();
      } catch (_) { /* An embedded resource may have navigated to another origin. */ }
    };
    frame.addEventListener('load', fit);
    fit();
  });
  document.querySelectorAll('.static-table-scroll').forEach((wrapper,index) => {
    const hint = document.createElement('p');
    hint.className = 'static-table-hint'; hint.textContent = 'Scroll horizontally to see the full table.';
    hint.id = 'table-scroll-instruction-' + (index + 1);
    wrapper.before(hint);
    wrapper.setAttribute('role', 'region');
    wrapper.setAttribute('aria-label', 'Scrollable table ' + (index + 1));
    const update = () => {
      const wide = wrapper.scrollWidth > wrapper.clientWidth + 1;
      hint.hidden = !wide; wrapper.tabIndex = wide ? 0 : -1;
      if (wide) wrapper.setAttribute('aria-describedby',hint.id);
      else wrapper.removeAttribute('aria-describedby');
    };
    const observer = new ResizeObserver(update);
    observer.observe(wrapper);
    if (wrapper.querySelector('table')) observer.observe(wrapper.querySelector('table'));
    update();
  });
  const fields = [...document.querySelectorAll('input:not([type=hidden]):not([type=button]):not([type=submit]),textarea,select')].filter(field => field !== search);
  if (fields.length && !document.querySelector('[data-clinical-form]') && (location.pathname.includes('/patient-management-system/') || document.querySelector('.static-incident'))) {
    const draftKey = 'bagwan-draft:' + location.pathname;
    const status = document.createElement('p');
    status.setAttribute('role', 'status');
    status.textContent = 'Training simulation. Drafts are saved in this browser.';
    const toolbar = document.createElement('div');
    toolbar.className = 'static-form-tools';
    toolbar.append(status);
    const read = () => fields.map((field, index) => ({key:field.id || field.name || `field-${index}`, value:field.type === 'checkbox' || field.type === 'radio' ? field.checked : field.multiple ? [...field.selectedOptions].map(option=>option.value) : field.value}));
    const save = (announce = false) => {
      try { localStorage.setItem(draftKey, JSON.stringify(read())); if (announce) status.textContent = 'Draft saved in this browser.'; }
      catch (_) { status.textContent = 'This browser cannot save a draft. You can still print or download it.'; }
    };
    try {
      const saved = JSON.parse(localStorage.getItem(draftKey) || '[]');
      saved.forEach((item,index) => {
        const field = fields[index];
        // Labels add stable IDs to formerly unlabelled controls. Keep reading
        // drafts saved with their earlier name/index keys in the same field order.
        if (field && [field.id, field.name, `field-${index}`].includes(item.key)) {
          if (field.type === 'checkbox' || field.type === 'radio') field.checked = item.value;
          else if (field.multiple) [...field.options].forEach(option=>option.selected = (Array.isArray(item.value) ? item.value : [item.value]).includes(option.value));
          else field.value = item.value;
        }
      });
    } catch (_) { /* A fresh form is usable when browser storage is unavailable. */ }
    fields.forEach((field,index) => {
      if (!field.getAttribute('aria-label') && !document.querySelector(`label[for="${CSS.escape(field.id || 'missing-id')}"]`)) {
        field.setAttribute('aria-label', field.placeholder || field.name || field.closest('tr')?.querySelector('th,td')?.textContent.trim().slice(0,100) || `Form field ${index+1}`);
      }
      field.addEventListener('input', () => save());
      field.addEventListener('change', () => save());
    });
    const button = (label, action) => {
      const el = document.createElement('button'); el.type = 'button'; el.textContent = label; el.addEventListener('click', action); toolbar.append(el);
    };
    button('Save draft', () => save(true));
    button('Print / save PDF', () => window.print());
    button('Download draft', () => {
      const data = {form:document.title,savedAt:new Date().toISOString(),fields:read()};
      const url = URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
      const link = document.createElement('a'); link.href=url; link.download='bagwan-form-draft.json'; link.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
    });
    const container = document.querySelector('.static-incident') || document.querySelector('.page') || document.querySelector('form') || fields[0].closest('.container') || fields[0].parentElement;
    container.prepend(toolbar);
  }
  document.querySelectorAll('form[data-static-form],form.static-incident').forEach(form => form.addEventListener('submit', event => {
    event.preventDefault();
    if (form.reportValidity()) {
      const button = form.querySelector('.static-form-tools button');
      button?.click();
    }
  }));
  // Source links pointed into a separate development WordPress installation.
  document.querySelectorAll('a[href]').forEach(link => {
    if (link.getAttribute('href').includes('BagwanDev')) link.href = root + 'scorm/quick-link-pages/incident-reporting/index.html';
  });
})();
