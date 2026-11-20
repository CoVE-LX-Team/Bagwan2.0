'use strict';

function renderHRDepartment() {
  const department = departmentData.find(item => item.id === 'hr');
  const videos = data.videos.filter(video => video.source_page === department.source);
  const chart = 'scorm/static-org-chart-test/people-and-culture-hr-organisation-chart/index.html';
  const people = data.hierarchy.filter(person => person.source_page === chart);
  const news = 'scorm/intranet/news-feed/new-look-people-culture/index.html';
  const services = [
    ['forms', 'Forms & records', '#forms', 'Open a patient form or find a staff template.'],
    ['incident', 'Report an incident', pageLink('scorm/quick-link-pages/incident-reporting/index.html'), 'Start an incident report in this browser.'],
    ['policies', 'Workplace policies', '#policies', 'Find hospital policies and procedures.'],
    ['resources', 'Tools & resources', '#resources', 'Browse hospital reference material.'],
  ];

  main.innerHTML = `
    <div class="hr-service">
      <nav aria-label="Breadcrumb" class="breadcrumbs"><a href="#departments">Departments</a> / People &amp; Culture</nav>
      <header class="hr-mast">
        <div class="hr-mast-copy">
          <p class="eyebrow">People &amp; Culture</p>
          <h1>HR services</h1>
          <p>Find staff documents, workplace support and the people who can help.</p>
          <div class="hr-mast-actions">
            <a class="hr-primary" href="#documents?category=Human%20resources">${icon('resources')} HR documents &amp; templates</a>
            ${saveButton('page:' + department.source, 'HR services')}
          </div>
        </div>
        <img src="${absolute(department.image)}" alt="" width="1000" height="576">
      </header>

      <div class="hr-columns">
        <section class="hr-staff-services" aria-labelledby="hr-services-title">
          <h2 id="hr-services-title">Staff services</h2>
          <ul class="hr-service-list">${services.map(([symbol, title, href, description]) => `
            <li><a href="${esc(href)}">${icon(symbol)}
              <span><strong>${esc(title)}</strong><small>${esc(description)}</small></span>
              <span class="hr-chevron" aria-hidden="true">›</span>
            </a></li>`).join('')}
          </ul>
        </section>
        <section class="hr-team" aria-labelledby="hr-team-title">
          <h2 id="hr-team-title">People &amp; Culture team</h2>
          <ul>${people.map(person => `<li>
            <a href="${esc(personLink(person))}">${esc(person.name)}</a>
            <span>${esc(person.role)}</span>
          </li>`).join('')}</ul>
          <div class="hr-team-links">
            <a href="${pageLink(chart)}">HR organisation chart</a>
            <a href="#people?department=${encodeURIComponent(department.group)}">People directory</a>
          </div>
        </section>
      </div>

      <section class="hr-meetings" aria-labelledby="hr-meetings-title">
        <h2 id="hr-meetings-title">Meeting videos</h2>
        <p>Resources for planning meetings, taking minutes and working with a chair.</p>
        <details class="hr-playlist">
          <summary>Browse ${videos.length} meeting videos</summary>
          <ol>${videos.map((video, index) => `
            <li>
              <div class="hr-video-controls">
                <button type="button" data-hr-video="${esc(video.youtube_id)}" aria-expanded="false" aria-controls="hr-player-${index}">
                  <span class="hr-play-symbol" aria-hidden="true">▷</span>
                  <span>${esc(video.title)}</span>
                </button>
                <a href="https://www.youtube.com/watch?v=${esc(video.youtube_id)}" target="_blank" rel="noopener"
                   aria-label="Watch ${esc(video.title)} on YouTube">YouTube</a>
              </div>
              <div class="hr-player" id="hr-player-${index}" hidden></div>
            </li>`).join('')}
          </ol>
        </details>
      </section>

      <section class="hr-archive" aria-labelledby="hr-archive-title">
        <div class="hr-archive-heading">
          <h2 id="hr-archive-title">Past staff notices</h2>
          <a href="#news">All staff news</a>
        </div>
        <ul>
          <li><h3>Great training coming up!</h3><p>There is important training in organising and running meetings coming up for some staff. Stay tuned.</p></li>
          <li><h3>Get your creativity flowing!</h3><p>Learn how to foster a safe, creative environment for brainstorming ideas.</p></li>
          <li><h3><a href="${pageLink(news)}">New look for People and Culture!</a></h3><p>People and Culture have a new strategy and vision, and it’s focused on supporting you.</p></li>
        </ul>
      </section>
    </div>`;

  const playlist = main.querySelector('.hr-playlist');
  let currentButton;
  function closePlayer() {
    if (!currentButton) return;
    const panel = document.getElementById(currentButton.getAttribute('aria-controls'));
    panel.replaceChildren();
    panel.hidden = true;
    currentButton.setAttribute('aria-expanded', 'false');
    currentButton = undefined;
  }
  playlist.addEventListener('toggle', () => { if (!playlist.open) closePlayer(); });
  playlist.addEventListener('click', event => {
    const button = event.target.closest('[data-hr-video]');
    if (!button) return;
    const collapse = button === currentButton;
    closePlayer();
    if (collapse) return;
    const panel = document.getElementById(button.getAttribute('aria-controls'));
    const player = document.createElement('iframe');
    player.title = button.querySelector('span:last-child').textContent;
    player.src = 'https://www.youtube.com/embed/' + button.dataset.hrVideo + '?rel=0';
    player.allow = 'encrypted-media; picture-in-picture; web-share';
    player.allowFullscreen = true;
    player.referrerPolicy = 'strict-origin-when-cross-origin';
    panel.append(player);
    panel.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    currentButton = button;
  });
}
