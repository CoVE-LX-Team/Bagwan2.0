'use strict';

// Embedded legacy pages share this behaviour only while displayed inside Bagwan 3.0.
(() => {
  const scriptURL = document.currentScript.src;
  const project = new URL('../', scriptURL);
  const published = new URL('https://cove-lx-team.github.io/Bagwan2.0/');
  const stylesheet = new URL('external-links.css', scriptURL).href;
  const installed = Symbol.for('bagwan.externalLinks');

  function inProject(url, root) {
    return url.origin === root.origin &&
      (url.pathname === root.pathname.slice(0, -1) || url.pathname.startsWith(root.pathname));
  }

  function mark(anchor) {
    const raw = anchor.getAttribute('href');
    const url = raw && URL.canParse(raw, anchor.baseURI) ? new URL(raw, anchor.baseURI) : null;
    const external = url && ['http:', 'https:'].includes(url.protocol) &&
      !inProject(url, project) && !inProject(url, published);
    const existing = anchor.querySelector(':scope > .bagwan-external-icon');
    if (!external) {
      existing?.remove();
      return;
    }
    if (existing) return;

    const doc = anchor.ownerDocument;
    // Keep the old spoken suffix, but display only the symbol alongside the label.
    const last = anchor.lastChild;
    if (last?.nodeType === Node.TEXT_NODE) {
      const suffix = last.data.match(/\s*\(external link\)\s*$/i);
      if (suffix) {
        const note = doc.createElement('span');
        note.className = 'bagwan-external-note';
        note.append(last.splitText(suffix.index));
        anchor.append(note);
      }
    }
    const icon = doc.createElement('span');
    icon.className = 'bagwan-external-icon';
    icon.setAttribute('aria-hidden', 'true');
    anchor.append(icon);
  }

  function install(doc) {
    if (!doc?.head || !doc.body || doc.contentType !== 'text/html' || doc[installed]) return;
    doc[installed] = true;
    const css = doc.createElement('link');
    css.rel = 'stylesheet';
    css.href = stylesheet;
    doc.head.append(css);

    function visitFrame(frame) {
      // Remote players and the browser's native PDF viewer own their own interface.
      const child = frame.contentDocument;
      if (child && child.URL !== 'about:blank') install(child);
    }
    function scan(node) {
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      if (node.localName === 'a') mark(node);
      else if (node.localName === 'iframe') visitFrame(node);
      for (const anchor of node.querySelectorAll('a[href]')) mark(anchor);
      for (const frame of node.querySelectorAll('iframe')) visitFrame(frame);
    }
    scan(doc.body);
    doc.addEventListener('load', event => {
      const frame = event.target;
      if (frame?.localName === 'iframe') {
        // Allow the app's load handlers to rewrite migrated routes before reading the links.
        doc.defaultView.setTimeout(() => visitFrame(frame), 0);
      }
    }, true);
    new MutationObserver(records => {
      for (const record of records) {
        if (record.type === 'attributes') {
          if (record.target.localName === 'a') mark(record.target);
        } else {
          const anchor = record.target.closest('a');
          if (anchor) mark(anchor);
          record.addedNodes.forEach(scan);
        }
      }
    }).observe(doc.body, {subtree:true, childList:true, attributes:true, attributeFilter:['href']});
  }
  install(document);
})();
