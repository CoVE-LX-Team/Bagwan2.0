/* Browser-only support for the static learning simulation. No server submissions. */
(() => {
  'use strict';
  const root = document.body.dataset.siteRoot || '/Bagwan2.0/';
  const search = document.getElementById('document-search');
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
    try {
      frame.addEventListener('load', () => {
        const doc = frame.contentDocument;
        if (doc && !frame.src.includes('/VR/')) frame.style.height = Math.max(240, doc.documentElement.scrollHeight + 24) + 'px';
      });
    } catch (_) { /* Same-origin frames resize when their content is available. */ }
  });
  const fields = [...document.querySelectorAll('input:not([type=hidden]):not([type=button]):not([type=submit]),textarea,select')].filter(field => field !== search);
  if (fields.length && (location.pathname.includes('/patient-management-system/') || document.querySelector('.static-incident'))) {
    const draftKey = 'bagwan-draft:' + location.pathname;
    const status = document.createElement('p');
    status.setAttribute('role', 'status');
    status.textContent = 'Training simulation. Drafts are saved in this browser.';
    const toolbar = document.createElement('div');
    toolbar.className = 'static-form-tools';
    toolbar.append(status);
    const read = () => fields.map((field, index) => ({key:field.id || field.name || `field-${index}`, value:field.type === 'checkbox' || field.type === 'radio' ? field.checked : field.value}));
    const save = () => {
      try { localStorage.setItem(draftKey, JSON.stringify(read())); status.textContent = 'Draft saved in this browser.'; }
      catch (_) { status.textContent = 'This browser cannot save a draft. You can still print or download it.'; }
    };
    try {
      const saved = JSON.parse(localStorage.getItem(draftKey) || '[]');
      saved.forEach((item,index) => {
        const field = fields[index];
        if (field && item.key === (field.id || field.name || `field-${index}`)) {
          if (field.type === 'checkbox' || field.type === 'radio') field.checked = item.value;
          else field.value = item.value;
        }
      });
    } catch (_) { /* A fresh form is usable when browser storage is unavailable. */ }
    fields.forEach((field,index) => {
      if (!field.getAttribute('aria-label') && !document.querySelector(`label[for="${CSS.escape(field.id || 'missing-id')}"]`)) {
        field.setAttribute('aria-label', field.placeholder || field.name || field.closest('tr')?.querySelector('th,td')?.textContent.trim().slice(0,100) || `Form field ${index+1}`);
      }
      field.addEventListener('input', save);
      field.addEventListener('change', save);
    });
    const button = (label, action) => {
      const el = document.createElement('button'); el.type = 'button'; el.textContent = label; el.addEventListener('click', action); toolbar.append(el);
    };
    button('Save draft', save);
    button('Print / save PDF', () => window.print());
    button('Download draft', () => {
      const data = {form:document.title,savedAt:new Date().toISOString(),fields:read()};
      const url = URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
      const link = document.createElement('a'); link.href=url; link.download='bagwan-form-draft.json'; link.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
    });
    const container = document.querySelector('.static-incident') || document.querySelector('form') || fields[0].closest('.container') || fields[0].parentElement;
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
