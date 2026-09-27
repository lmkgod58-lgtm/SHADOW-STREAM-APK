const API = 'http://localhost:3000/api';

const state = {
  home: null,
  currentSection: 'home',
  watchLater: []
};

const content = document.querySelector('#content');
const searchInput = document.querySelector('#searchInput');
const modal = document.querySelector('#detailModal');
const detail = document.querySelector('#detail');

async function api(path, options = {}) {
  const token = localStorage.getItem('shadow_token');
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(API + path, { ...options, headers });
  if (!res.ok) throw new Error((await res.json()).error || 'API error');
  return res.json();
}

async function boot() {
  try {
    const login = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'Shadow' })
    });
    localStorage.setItem('shadow_token', login.token);

    state.home = await api('/catalog/home');
    state.watchLater = (await api('/watch-later')).results;
    renderHome();
  } catch (e) {
    content.innerHTML = `<div class="empty">Backend unavailable.<br><small>${e.message}</small></div>`;
  }
}

function card(item, progress = null) {
  return `
    <article class="card" data-id="${item.id}">
      <img class="poster" src="${item.poster}" alt="${escapeHtml(item.title)}">
      <h3>${escapeHtml(item.title)}</h3>
      <p><span class="rating">★ ${item.rating}</span> · ${item.year} · ${item.type}</p>
      ${progress !== null ? `<div class="progress"><i style="width:${Math.round(progress * 100)}%"></i></div>` : ''}
    </article>`;
}

function row(title, items, progress = false) {
  if (!items?.length) return '';
  return `
    <section class="section">
      <div class="section-head">
        <h2>${title}</h2>
        <small>${items.length} titles</small>
      </div>
      <div class="grid">
        ${items.map(x => card(x, progress ? x.progress : null)).join('')}
      </div>
    </section>`;
}

function renderHome() {
  const h = state.home;
  content.innerHTML = `
    <section class="hero" style="background-image:url('${h.hero.backdrop}')">
      <div class="hero-content">
        <div class="eyebrow">FEATURED // 001</div>
        <h1>${escapeHtml(h.hero.title)}</h1>
        <div class="meta">
          <span class="rating">★ ${h.hero.rating}</span>
          <span>${h.hero.year}</span>
          <span>${h.hero.runtime} min</span>
          <span>${h.hero.genres.join(' · ')}</span>
        </div>
        <p>${escapeHtml(h.hero.description)}</p>
        <div class="actions">
          <button class="btn" onclick="openTitle('${h.hero.id}')">▶ Watch</button>
          <button class="btn secondary" onclick="saveLater('${h.hero.id}')">＋ Watch Later</button>
        </div>
      </div>
    </section>
    ${row('Continue Watching', h.continueWatching, true)}
    ${row('Trending Now', h.trending)}
    ${row('Recommended For You', h.recommended)}
  `;
  bindCards();
}

function renderSearch(results, query) {
  content.innerHTML = `
    <section class="section">
      <div class="section-head"><h2>Results for "${escapeHtml(query)}"</h2><small>${results.length} found</small></div>
      ${results.length ? `<div class="grid">${results.map(x => card(x)).join('')}</div>` : '<div class="empty">Nothing found. Humanity survives another search.</div>'}
    </section>`;
  bindCards();
}

function bindCards() {
  document.querySelectorAll('.card').forEach(el => {
    el.addEventListener('click', () => openTitle(el.dataset.id));
  });
}

window.openTitle = async function(id) {
  const item = await api(`/titles/${id}`);
  const comments = await api(`/titles/${id}/comments`);

  detail.innerHTML = `
    <div class="detail-hero" style="background-image:url('${item.backdrop}')">
      <div class="detail-info">
        <div class="eyebrow">${item.type.toUpperCase()}</div>
        <h1>${escapeHtml(item.title)}</h1>
        <div class="meta">
          <span class="rating">★ ${item.rating}</span>
          <span>${item.year}</span>
          <span>${item.runtime} min</span>
          <span>${item.genres.join(' · ')}</span>
        </div>
      </div>
    </div>
    <div class="detail-body">
      <p>${escapeHtml(item.description)}</p>
      <div class="actions">
        <button class="btn" onclick="playTitle('${item.id}')">▶ Start Watching</button>
        <button class="btn secondary" onclick="saveLater('${item.id}')">＋ Watch Later</button>
        <button class="btn secondary" onclick="createParty('${item.id}')">◉ Watch Party</button>
      </div>

      <div class="comments">
        <div class="section-head"><h2>Comments</h2><small>${comments.comments.length}</small></div>
        ${comments.comments.map(c => `
          <div class="comment">
            <img src="${c.avatar}" alt="">
            <div>
              <b>${escapeHtml(c.user)}</b> <small> · ${timeAgo(c.createdAt)}</small>
              <p>${escapeHtml(c.text)}</p>
            </div>
          </div>`).join('')}
        <div class="actions">
          <input id="commentInput" placeholder="Write a comment..." style="flex:1;padding:12px;border-radius:12px;background:#151824;border:1px solid var(--line);color:white">
          <button class="btn" onclick="postComment('${item.id}')">Post</button>
        </div>
      </div>
    </div>`;
  modal.classList.remove('hidden');
};

window.playTitle = async function(id) {
  const result = await api(`/titles/${id}/stream`);
  if (!result.streamUrl) {
    alert('No authorized media provider is connected yet. The player shell is ready, but the actual stream still needs a licensed/public media source.');
    return;
  }
};

window.saveLater = async function(id) {
  await api(`/watch-later/${id}`, { method: 'POST' });
  state.watchLater = (await api('/watch-later')).results;
  alert('Added to Watch Later.');
};

window.postComment = async function(id) {
  const input = document.querySelector('#commentInput');
  const text = input.value.trim();
  if (!text) return;
  await api(`/titles/${id}/comments`, {
    method: 'POST',
    body: JSON.stringify({ text })
  });
  openTitle(id);
};

window.createParty = function(id) {
  const room = `room-${id}-${Math.random().toString(36).slice(2,7)}`;
  alert(`Watch party room created: ${room}`);
};

document.querySelector('#modalClose').addEventListener('click', () => {
  modal.classList.add('hidden');
});

modal.addEventListener('click', e => {
  if (e.target === modal) modal.classList.add('hidden');
});

searchInput.addEventListener('input', async e => {
  const q = e.target.value.trim();
  if (!q) {
    renderHome();
    return;
  }
  const data = await api(`/search?q=${encodeURIComponent(q)}`);
  renderSearch(data.results, q);
});

document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', async () => {
    document.querySelectorAll('.nav-item').forEach(x => x.classList.remove('active'));
    btn.classList.add('active');

    const section = btn.dataset.section;
    if (section === 'home') renderHome();
    if (section === 'watchlater') renderSearch(state.watchLater, 'Watch Later');
    if (section === 'discover') renderSearch(state.home.trending, 'Discover');
    if (section === 'social') {
      content.innerHTML = `
        <section class="section">
          <h2>Social Nexus</h2>
          <div class="empty">Friends, chat rooms, notifications and watch parties connect here.</div>
        </section>`;
    }
    if (section === 'settings') {
      content.innerHTML = `
        <section class="section">
          <h2>Settings</h2>
          <div class="empty">Playback, appearance, notifications, account and privacy controls.</div>
        </section>`;
    }
  });
});

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;'
  }[c]));
}

function timeAgo(t) {
  const sec = Math.max(1, Math.floor((Date.now() - t) / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  return `${hr}h ago`;
}

boot();
