'use strict';

// Keep the original receipt keys so previously read messages stay read.
const boardMessages = [
  {id:'belongings', key:'customCheck1', sender:'Admin', subject:'Reported missing belongings',
    body:'Mr Huang has reported missing belongings. The circumstances have not been confirmed. Please check what has been recorded and who will follow up with him.'},
  {id:'staff-meeting', key:'customCheck2', sender:'Admin', subject:'Staff meeting',
    body:'There is a compulsory staff meeting at 14:00 in the staff room. All staff are required to attend.'},
  {id:'interpreter-request', key:'v3-read-request', sender:'Reception', subject:'Interpreter request',
    body:'Alex Morgan has asked whether an interpreter has been arranged. The preferred language and booking status still need confirmation.',
    record:['#patient-case','Open Alex Morgan’s patient record']}
];

function renderMessageboard() {
  const legacyKey = 'bagwan-draft:' + new URL(staffMessagesPath, ROOT).pathname;
  const storageKey = 'bagwan3-message-receipts';
  function savedFields() {
    try {
      const fields = JSON.parse(localStorage.getItem(storageKey) ?? localStorage.getItem(legacyKey) ?? '[]');
      return Array.isArray(fields) ? fields : [];
    } catch { return []; }
  }
  const read = new Set(savedFields().filter(field => field?.value === true).map(field => field.key));
  const envelope = '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="m4 7 8 6 8-6"></path></svg>';
  main.innerHTML = `
    <div class="staff-board">
      <header class="board-head"><h1>Staff messageboard</h1>${saveButton('page:' + staffMessagesPath, 'Staff messageboard')}</header>
      <div class="board-inbox">
        <div class="board-toolbar">
          <div class="board-folder">${envelope}<h2 id="board-inbox-title">Inbox</h2><span class="board-count" role="status"></span></div>
          <details class="board-options"><summary>Message options</summary><div>
            <button type="button" data-export>Download read status</button>
            <button type="button" data-print>Print messages</button></div></details>
        </div>
        <div class="board-columns">
          <section class="board-list" aria-labelledby="board-inbox-title">
            <ul>${boardMessages.map(message => `<li data-message="${message.id}">
              <button type="button" class="board-subject" aria-controls="board-reader">
                <span class="board-status-dot" aria-hidden="true"></span>
                <span class="board-subject-text"><span class="board-sender">${esc(message.sender)}</span>
                  <strong class="board-title">${esc(message.subject)}</strong>
                  <span class="board-excerpt" aria-hidden="true">${esc(message.body)}</span></span>
                <span class="board-state"></span><span class="board-chevron" aria-hidden="true">›</span>
              </button></li>`).join('')}</ul>
          </section>
          <section class="board-reader" id="board-reader" aria-labelledby="board-reading-title" hidden></section>
        </div>
      </div>
      <nav class="board-nav" aria-label="Patient system"><a href="${pageLink(patientDirectoryPath)}">Patient list</a>
        <a href="#forms?view=online">Online forms &amp; records</a></nav>
      <div class="board-print" hidden>${boardMessages.map(message => `<section><h2>${esc(message.subject)}</h2><p>From ${esc(message.sender)}</p><p>${esc(message.body)}</p></section>`).join('')}</div>
    </div>`;
  const inbox = main.querySelector('.board-inbox');
  const reader = inbox.querySelector('.board-reader');
  const options = inbox.querySelector('.board-options');
  const optionsToggle = options.querySelector('summary');
  options.addEventListener('focusout', event => {
    if (!options.contains(event.relatedTarget)) options.open = false;
  });
  options.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      options.open = false;
      optionsToggle.focus();
    }
  });
  let selected;
  function setReceipt(message, value) {
    if (value === read.has(message.key)) return;
    if (value) read.add(message.key);
    else read.delete(message.key);
    const fields = savedFields();
    const field = fields.find(item => item?.key === message.key);
    if (field) field.value = value;
    else fields.push({key:message.key, value});
    try { localStorage.setItem(storageKey, JSON.stringify(fields)); } catch { /* The inbox still works for this visit. */ }
  }
  function display(message) {
    selected = message;
    inbox.classList.toggle('is-reading', Boolean(message));
    reader.hidden = !message;
    reader.innerHTML = message ? `
      <button type="button" class="board-back" data-inbox><span aria-hidden="true">←</span> Back to inbox</button>
      <h2 id="board-reading-title" tabindex="-1">${esc(message.subject)}</h2>
      <p class="board-byline">From <strong>${esc(message.sender)}</strong></p>
      <div class="board-body"><p>${esc(message.body)}</p>
        ${message.record ? `<a class="board-record" href="${esc(withDepartment(message.record[0]))}">${esc(message.record[1])}<span aria-hidden="true">→</span></a>` : ''}
      </div>
      <button type="button" class="board-unread" data-unread>Mark as unread</button>` : '';
    for (const entry of boardMessages) {
      const item = inbox.querySelector('[data-message="' + entry.id + '"]');
      const button = item.querySelector('.board-subject');
      if (message === entry) button.setAttribute('aria-current', 'true');
      else button.removeAttribute('aria-current');
      item.querySelector('.board-state').textContent = read.has(entry.key) ? 'Read' : 'Unread';
      item.classList.toggle('is-unread', !read.has(entry.key));
    }
    const unread = boardMessages.filter(entry => !read.has(entry.key)).length;
    inbox.querySelector('.board-count').textContent = unread ? unread + ' unread' : 'All messages read';
  }
  const requested = new URLSearchParams(location.hash.split('?')[1]).get('message');
  const initial = boardMessages.find(message => message.id === (history.state?.boardOpen ?? requested));
  if (initial) setReceipt(initial, true);
  display(initial);
  inbox.addEventListener('click', event => {
    const subject = event.target.closest('.board-subject');
    if (subject) {
      const message = boardMessages.find(entry => entry.id === subject.closest('li').dataset.message);
      setReceipt(message, true);
      history.replaceState({...history.state, boardOpen:message.id}, '');
      display(message);
      reader.querySelector('h2').focus();
    } else if (selected && event.target.closest('[data-inbox], [data-unread]')) {
      const lastSubject = inbox.querySelector('.board-subject[aria-current]');
      if (event.target.closest('[data-unread]')) setReceipt(selected, false);
      history.replaceState({...history.state, boardOpen:''}, '');
      display();
      lastSubject.focus();
    }
  });
  main.querySelector('[data-export]').addEventListener('click', () => {
    const fields = boardMessages.map(({key}) => ({key, value:read.has(key)}));
    const data = JSON.stringify({form:'Staff messageboard', savedAt:new Date().toISOString(), fields}, null, 2);
    const url = URL.createObjectURL(new Blob([data], {type:'application/json'}));
    const link = document.createElement('a');
    link.href = url; link.download = 'bagwan-form-draft.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  main.querySelector('[data-print]').addEventListener('click', () => window.print());
}
