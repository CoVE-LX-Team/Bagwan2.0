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
  main.innerHTML = `
    <div class="board-head"><h1>Staff messageboard</h1>${saveButton('page:' + staffMessagesPath, 'Staff messageboard')}</div>
    <nav class="board-nav" aria-label="Patient system"><a href="${pageLink(patientDirectoryPath)}">Patient list</a>
      <a href="#forms?view=online">Online forms &amp; records</a></nav>
    <section class="board-inbox" aria-labelledby="board-inbox-title">
      <header><h2 id="board-inbox-title">Inbox</h2><p role="status" class="board-count"></p></header>
      <ul>${boardMessages.map(message => `<li data-message="${message.id}">
        <h3><button type="button" class="board-subject" aria-expanded="false" aria-controls="body-${message.id}">
          <span class="board-sender">${esc(message.sender)}</span>
          <span class="board-title">${esc(message.subject)}</span><span class="board-state"></span><span class="board-chevron" aria-hidden="true"></span>
        </button></h3>
        <div class="board-body" id="body-${message.id}" hidden><p>${esc(message.body)}</p>
          <div class="board-actions">
            ${message.record ? `<a href="${message.record[0]}">${esc(message.record[1])}</a>` : ''}
            <button type="button" data-unread>Mark as unread</button>
          </div>
        </div></li>`).join('')}</ul>
    </section>
    <details class="board-options"><summary>Message options</summary><button type="button" data-export>Download read status</button>
      <button type="button" data-print>Print messages</button></details>`;

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
  function display(openId) {
    for (const message of boardMessages) {
      const item = main.querySelector('[data-message="' + message.id + '"]');
      const open = message.id === openId;
      item.querySelector('.board-subject').setAttribute('aria-expanded', String(open));
      item.querySelector('.board-body').hidden = !open;
      item.querySelector('.board-state').textContent = read.has(message.key) ? 'Read' : 'Unread';
      item.classList.toggle('is-unread', !read.has(message.key));
    }
    const unread = boardMessages.filter(message => !read.has(message.key)).length;
    main.querySelector('.board-count').textContent = unread ? unread + ' unread' : 'All messages read';
  }
  const requested = new URLSearchParams(location.hash.split('?')[1]).get('message');
  const initial = boardMessages.find(message => message.id === (history.state?.boardOpen ?? requested));
  if (initial) setReceipt(initial, true);
  display(initial?.id);
  main.querySelector('.board-inbox').addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    const item = button.closest('[data-message]');
    const message = boardMessages.find(entry => entry.id === item.dataset.message);
    const markUnread = button.hasAttribute('data-unread');
    const open = !markUnread && button.getAttribute('aria-expanded') === 'false';
    if (open || markUnread) setReceipt(message, open);
    const id = open ? message.id : '';
    history.replaceState({...history.state, boardOpen:id}, '');
    display(id);
    if (markUnread) item.querySelector('.board-subject').focus();
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
