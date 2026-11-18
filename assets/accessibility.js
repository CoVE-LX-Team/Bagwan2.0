/* Keyboard and assistive-technology support for the local learning site. */
(() => {
  'use strict';
  const visible = element => !!element.getClientRects().length && !element.closest('[hidden],[inert]');
  const skip = document.querySelector('.skip-to-content');
  skip?.addEventListener('click', event => {
    const main = document.getElementById(skip.hash.slice(1));
    if (!main) return;
    event.preventDefault();
    main.focus({preventScroll:true});
    main.scrollIntoView({block:'start',behavior:'instant'});
  });
  document.querySelectorAll('[data-nav-disclosure]').forEach(button => {
    const panel = document.getElementById(button.getAttribute('aria-controls'));
    const set = open => {
      panel.hidden = !open;
      button.setAttribute('aria-expanded', String(open));
      button.parentElement.classList.toggle('open', open);
    };
    button.addEventListener('click', () => set(button.getAttribute('aria-expanded') !== 'true'));
    button.parentElement.addEventListener('keydown', event => {
      if (event.key === 'Escape' && button.getAttribute('aria-expanded') === 'true') {
        event.preventDefault(); event.stopPropagation(); set(false); button.focus();
      }
      if (event.target === button && event.key === 'ArrowDown') {
        event.preventDefault(); set(true); panel.querySelector('a')?.focus();
      }
    });
    set(false);
  });
  const fullscreen = document.getElementById('fullscreen');
  if (fullscreen) {
    fullscreen.addEventListener('click', async () => {
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else await document.documentElement.requestFullscreen();
      } catch (_) { fullscreen.focus(); }
    });
    document.addEventListener('fullscreenchange', () => {
      const active = !!document.fullscreenElement;
      fullscreen.setAttribute('aria-pressed', String(active));
      fullscreen.setAttribute('aria-label', active ? 'Exit fullscreen' : 'Enter fullscreen');
      fullscreen.title = active ? 'Exit fullscreen' : 'Enter fullscreen';
    });
  }
  document.querySelectorAll('[role=tablist]').forEach(list => {
    const tabs = [...list.querySelectorAll('[role=tab]')];
    const activate = tab => {
      tabs.forEach(item => {
        const selected = item === tab;
        item.tabIndex = selected ? 0 : -1;
        item.setAttribute('aria-selected', String(selected));
        item.classList.toggle('active', selected);
        const panel = document.getElementById(item.getAttribute('aria-controls'));
        if (!panel) return;
        panel.hidden = !selected;
        panel.classList.remove('fade');
        panel.classList.toggle('active', selected);
        panel.classList.toggle('show', selected);
      });
    };
    tabs.forEach((tab,index) => {
      tab.addEventListener('click', event => {
        event.preventDefault(); event.stopPropagation(); activate(tab);
      });
      tab.addEventListener('keydown', event => {
        let next;
        if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
        if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
        if (event.key === 'Home') next = 0;
        if (event.key === 'End') next = tabs.length - 1;
        if (next !== undefined) {
          event.preventDefault(); activate(tabs[next]); tabs[next].focus();
        } else if (event.key === ' ' || event.key === 'Enter') {
          event.preventDefault(); activate(tab);
        }
      });
    });
    activate(tabs.find(tab=>tab.getAttribute('aria-selected')==='true') || tabs[0]);
  });
  document.querySelectorAll('[data-message-toggle]').forEach(button => {
    const panel = document.getElementById(button.dataset.messageToggle);
    if (!panel) return;
    const set = open => {
      panel.hidden = !open; panel.classList.toggle('show',open);
      button.setAttribute('aria-expanded',String(open));
    };
    set(false);
    button.addEventListener('click', () => set(button.getAttribute('aria-expanded')!=='true'));
  });
  const hints = document.querySelectorAll('[data-field-help]');
  if (hints.length) {
    const dialog = document.createElement('dialog');
    dialog.className = 'field-help-dialog';
    dialog.setAttribute('aria-labelledby','field-help-title');
    const heading = document.createElement('h2'); heading.id = 'field-help-title';
    const text = document.createElement('p');
    const close = document.createElement('button'); close.type = 'button'; close.textContent = 'Close help';
    close.className = 'btn btn-primary'; close.addEventListener('click',()=>dialog.close());
    dialog.append(heading,text,close); document.body.append(dialog);
    document.addEventListener('click',event=>{
      const button=event.target.closest('[data-field-help]');
      if(!button)return;
      heading.textContent = button.getAttribute('aria-label');
      text.textContent = button.dataset.fieldHelp;
      dialog.showModal();
    });
  }
  // Keep native selects: the legacy visual replacements lose labels and trap keys.
  const nativeSelects = () => {
    if (!document.body.classList.contains('patient-system')) return;
    document.querySelectorAll('select').forEach(select => {
      if (select.sumo) select.sumo.unload();
      select.classList.remove('SumoUnder');
      if (select.tabIndex < 0) select.removeAttribute('tabindex');
      if (select.multiple) {
        select.size = Math.min(6,Math.max(3,select.options.length));
        if (!select.getAttribute('aria-describedby')) {
          const hint = document.createElement('p'); hint.className = 'multi-select-hint';
          hint.id = select.id + '-hint';
          hint.textContent = 'Choose one or more options. Use Ctrl on Windows or Command on Mac to select separate options; Shift selects a range.';
          select.after(hint); select.setAttribute('aria-describedby',hint.id);
        }
      }
    });
  };
  nativeSelects();
  if (window.jQuery) window.jQuery(nativeSelects);
  if (document.body.classList.contains('patient-system')) {
    let queued = false;
    new MutationObserver(() => {
      if (queued) return;
      queued = true;
      queueMicrotask(()=>{queued=false;nativeSelects()});
    }).observe(document.body,{childList:true,subtree:true});
  }
  if (window.jQuery) {
    window.jQuery('.modal').on('show.bs.modal', function () {
      this._keyboardOpener = document.activeElement;
    }).on('shown.bs.modal', function () {
      this.setAttribute('aria-modal','true');
    }).on('hidden.bs.modal', function () {
      this.removeAttribute('aria-modal');
      if (this._keyboardOpener?.isConnected) this._keyboardOpener.focus();
    });
    document.querySelectorAll('#flipcards .card-grid').forEach(card => {
      const front = card.querySelector('.front'), back = card.querySelector('.back');
      const show = card.querySelector('.flip-btn'), hide = card.querySelector('.unflip-btn');
      let pending = false;
      const update = () => {
        const flipped = !!window.jQuery(card).data('flip-model')?.isFlipped;
        front.inert = flipped; back.inert = !flipped;
        front.setAttribute('aria-hidden',String(flipped));
        back.setAttribute('aria-hidden',String(!flipped));
        show.setAttribute('aria-expanded',String(flipped));
      };
      [show,hide].forEach(button=>button.addEventListener('click',()=>{
        pending=true;
        queueMicrotask(()=>{
          update(); (front.inert ? hide : show).focus({preventScroll:true}); pending=false;
        });
      }));
      window.jQuery(card).on('flip:change',update).on('flip:done',()=>{
        update();
        if (pending) {
          (front.inert ? hide : show).focus({preventScroll:true}); pending=false;
        }
      });
      update();
    });
  }
  // H5P already supports Space/Enter and arrow keys. Add instructions and name
  // its icon-only fullscreen control without changing the exercise or scoring.
  document.querySelectorAll('iframe.h5p-iframe').forEach(frame => {
    let observer;
    const enhance = () => {
      try {
        const doc = frame.contentDocument;
        if (!doc?.body) return;
        doc.documentElement.lang = 'en';
        doc.title = frame.title || 'Bagwan learning activity';
        const labelControls = () => {
          let main = doc.querySelector('main[data-activity-main]');
          if (!main) {
            main = doc.createElement('main'); main.dataset.activityMain = '';
            const heading = doc.createElement('h1'); heading.textContent = doc.title;
            heading.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0';
            main.append(heading); doc.body.prepend(main);
          }
          [...doc.body.children].filter(el=>el!==main&&!['SCRIPT','STYLE','LINK'].includes(el.tagName)).forEach(el=>main.append(el));
          doc.querySelectorAll('.h5p-enable-fullscreen,.h5p-disable-fullscreen').forEach(button=>{
            button.setAttribute('aria-label',button.classList.contains('h5p-disable-fullscreen')?'Exit activity fullscreen':'Enter activity fullscreen');
          });
        };
        observer?.disconnect();
        observer = new MutationObserver(labelControls);
        observer.observe(doc.body,{childList:true,subtree:true});
        labelControls();
      } catch (_) { /* Frames outside this origin retain their own controls. */ }
    };
    frame.addEventListener('load',enhance); enhance();
  });
})();
