/* Sunori — mini app JS (static, GitHub Pages friendly) */
const $ = (q, el=document) => el.querySelector(q);
const $$ = (q, el=document) => Array.from(el.querySelectorAll(q));

function formatNum(n){
  try { return new Intl.NumberFormat('fr-FR').format(n); } catch { return String(n); }
}
function byId(items, id){ return items.find(x => x.id === id); }
function chip(txt){ return `<span class="chip">${escapeHtml(txt)}</span>`; }
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

const README_BASE = "https://sunorioff.github.io/sunori-readmes/";

function normalizeArr(v){
  if(!v) return [];
  return Array.isArray(v) ? v : [v];
}
function ulFrom(arr){
  const a = normalizeArr(arr);
  if(!a.length) return '<li>—</li>';
  return a.map(x => `<li>${escapeHtml(x)}</li>`).join('');
}
function kvRow(label, value){
  if(value === undefined || value === null || String(value).trim() === '') return '';
  return `<div style="display:flex; gap:12px; justify-content:space-between; padding:8px 0; border-bottom:1px solid var(--border)">
    <span style="color:var(--muted); font-weight:650">${escapeHtml(label)}</span>
    <span style="font-weight:750; text-align:right">${escapeHtml(value)}</span>
  </div>`;
}


async function loadData(){
  const res = await fetch('data.json', {cache:'no-store'});
  if(!res.ok) throw new Error('Impossible de charger data.json');
  return res.json();
}

function renderGrid(items, mount){
  mount.innerHTML = items.map(it => `
    <a class="card item" href="${it.links?.page ?? `item.html?id=${encodeURIComponent(it.id)}`}" aria-label="${escapeHtml(it.title)}">
      <div class="thumb" style="${it.cover ? `background-image:url('${it.cover}'); background-size:cover; background-position:center;` : ''}"><span class="badge ${it.type}">${it.type === 'game' ? 'Jeu' : 'Logiciel'}</span>
      </div>
      <div class="meta">
        <h3>${escapeHtml(it.title)}</h3>
        <p>${escapeHtml(it.description ?? '').slice(0, 140)}${(it.description ?? '').length > 140 ? '…' : ''}</p>
        <div class="chips">
          ${(it.tags ?? []).slice(0, 4).map(chip).join('')}
        </div>
      </div>
    </a>
  `).join('');
}

function setActiveNav(){
  const path = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  $$('.navlinks .pill').forEach(a => {
    const href = (a.getAttribute('href') || '').toLowerCase();
    if(href.endsWith(path)) a.classList.add('active');
  });
}

function mountStats(data){
  const s = data.stats || {};
  const comm = $('#stat-community');
  const upd = $('#stat-update');
  const add = $('#stat-add');
  if(comm) comm.textContent = formatNum(s.community ?? 0);
  if(upd) upd.textContent = String(s.lastUpdate ?? '—');
  if(add) add.textContent = String(s.lastAdd ?? '—');
}

function filterItems(items, {type='all', q='', tag='all'}){
  const query = q.trim().toLowerCase();
  return items.filter(it => {
    if(type !== 'all' && it.type !== type) return false;
    if(tag !== 'all' && !(it.tags || []).map(t=>t.toLowerCase()).includes(tag.toLowerCase())) return false;
    if(!query) return true;
    const hay = `${it.title} ${(it.tags||[]).join(' ')} ${it.description||''}`.toLowerCase();
    return hay.includes(query);
  });
}

function fillTags(items, selectEl){
  if(!selectEl) return;
  const set = new Set();
  items.forEach(it => (it.tags||[]).forEach(t => set.add(t)));
  const tags = Array.from(set).sort((a,b)=>a.localeCompare(b,'fr'));
  selectEl.innerHTML = `<option value="all">Tous les tags</option>` + tags.map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('');
}

function getParam(name){
  const u = new URL(location.href);
  return u.searchParams.get(name);
}

async function pageIndex(){
  const data = await loadData();
  mountStats(data);

  const items = data.items || [];
  const featured = (data.featured || []).map(id => byId(items,id)).filter(Boolean);
  const mount = $('#latest-grid');
  if(mount) renderGrid(featured.length ? featured : items.slice(0,6), mount);

  const staff = (data.staffPicks || []).map(id => byId(items,id)).filter(Boolean);
  const mountStaff = $('#staff-picks');
  if(mountStaff){
    mountStaff.innerHTML = staff.slice(0,4).map(it => `<a class="chip" href="${it.links?.page ?? `item.html?id=${encodeURIComponent(it.id)}`}">${escapeHtml(it.title)}</a>`).join('');
  }

  const topLiked = (data.topLiked || []).map(id => byId(items,id)).filter(Boolean);
  const mountTop = $('#top-liked');
  if(mountTop){
    mountTop.innerHTML = topLiked.slice(0,4).map(it => `<a class="chip" href="${it.links?.page ?? `item.html?id=${encodeURIComponent(it.id)}`}">${escapeHtml(it.title)}</a>`).join('');
  }
}

async function pageListing(type){
  const data = await loadData();
  const items = (data.items || []).filter(it => it.type === type);
  const grid = $('#list-grid');
  const q = $('#q');
  const tag = $('#tag');

  fillTags(items, tag);

  const update = () => {
    const filtered = filterItems(items, {type, q: q?.value ?? '', tag: tag?.value ?? 'all'});
    $('#result-count').textContent = `${filtered.length} résultat(s)`;
    renderGrid(filtered, grid);
  };

  q?.addEventListener('input', update);
  tag?.addEventListener('change', update);

  update();
}
function slugify(text = "") {
  return text
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // enlève accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function pageItem(){
  const data = await loadData();
  const items = data.items || [];
  const id = getParam('id');
  const it = id ? byId(items, id) : null;

  if(!it){
    $('#item-root').innerHTML = `<div class="card detail"><h1>Introuvable</h1><p class="lead">Cet élément n’existe pas (ou l’URL est incorrecte).</p><a class="btn" href="index.html">Retour</a></div>`;
    return;
  }

  const d = it.details || {};
  const min = d.minimum || {};
  const genres = normalizeArr((d.genres && d.genres.length) ? d.genres : (it.tags || []));
  const tags = (it.tags || []).map(chip).join('');

  const cover = it.cover
    ? `<div style="height:240px; border-radius:16px; overflow:hidden; border:1px solid var(--border); background-image:url('${it.cover}'); background-size:cover; background-position:center; position:relative; margin-bottom:14px;">
         <div style="position:absolute; inset:0; background: linear-gradient(180deg, rgba(7,6,13,.05), rgba(7,6,13,.75));"></div>
       </div>`
    : '';

  const installBtn = it.installUrl
    ? `<a class="btn primary" href="${escapeHtml(it.installUrl)}" target="_blank" rel="noreferrer noopener">
         <span class="icon icon-download"></span> Télécharger / Installer
       </a>`
    : `<a class="btn primary" href="#" onclick="alert('Ajoute un lien légal dans data.json : installUrl'); return false;">
         <span class="icon icon-download"></span> Télécharger / Installer
       </a>`;

  const notes = (d.notes || it.notes) ? `<div class="notice" style="margin-top:14px">${escapeHtml(d.notes || it.notes)}</div>` : '';

    // ===== READ-ME : construction de l’URL =====
  const slug = it.readmeSlug || slugify(it.title);
  const readmeUrl = it.readmeUrl
    ? it.readmeUrl
    : `${README_BASE}readme-${slug}.html`;
  // ==========================================


  $('#item-root').innerHTML = `
    <div class="card detail">
      ${cover}
      <div class="kicker"><span class="dot"></span>${it.type === 'game' ? 'Jeu' : 'Logiciel'} • ${escapeHtml(it.version || '—')}</div>
      <h1>${escapeHtml(it.title)}</h1>

      <div class="sub">
        <span>Mis à jour : <b>${escapeHtml(it.updatedAt || '—')}</b></span>
        <span>•</span>
        <span>Téléchargements : <b>${formatNum(it.downloads || 0)}</b></span>
        <span>•</span>
        <span>Likes : <b>${formatNum(it.likes || 0)}</b></span>
        <span>•</span>
        <span>Commentaires : <b>${formatNum(it.comments || 0)}</b></span>
      </div>

      <hr class="sep" />

      <div class="two">
        <div class="panel">
          <h3>Infos</h3>
          ${kvRow('Version', it.version || '—')}
          ${kvRow('Développeur', d.developer)}
          ${kvRow('Éditeur', d.publisher)}
          ${kvRow('Genres', genres.length ? genres.join(', ') : '')}
          ${kvRow('Crédits', d.credits)}
          ${notes}

          <hr class="sep" />

          <h3>Description</h3>
          ${d.description
            ? `<ul class="list">${ulFrom(d.description)}</ul>`
            : `<p class="lead" style="margin:0">${escapeHtml(it.description || '—')}</p>`
          }

          <div style="margin-top:12px" class="chips">${tags}</div>

          <div class="cta-row" style="margin-top:16px">
            ${installBtn}
            <a class="btn readme-btn" href="#" data-action="readme">
  <span class="icon icon-arrow"></span> Read-me
</a>

          </div>
          
        </div>

        <div class="panel">
          <h3>Configuration minimale</h3>
          <ul class="list">
            ${min.os ? `<li><b>OS :</b> ${escapeHtml(min.os)}</li>` : ''}
            ${min.cpu ? `<li><b>Processeur :</b> ${escapeHtml(min.cpu)}</li>` : ''}
            ${min.ram ? `<li><b>Mémoire :</b> ${escapeHtml(min.ram)}</li>` : ''}
            ${min.gpu ? `<li><b>Carte graphique :</b> ${escapeHtml(min.gpu)}</li>` : ''}
            ${min.storage ? `<li><b>Stockage :</b> ${escapeHtml(min.storage)}</li>` : ''}
            ${min.extra ? `<li><b>Notes :</b> ${escapeHtml(min.extra)}</li>` : ''}
            ${(!min.os && !min.cpu && !min.ram && !min.gpu && !min.storage && !min.extra) ? '<li>—</li>' : ''}
          </ul>

          <hr class="sep" />

          <h3>Procédure d’installation</h3>
          <ul class="list">${ulFrom(d.installation)}</ul>

          <hr class="sep" />

          <h3>Navigation</h3>
          <div class="chips">
            <a class="chip" href="index.html">Accueil</a>
            <a class="chip" href="${it.type === 'game' ? 'games.html' : 'softwares.html'}">${it.type === 'game' ? 'Jeux' : 'Logiciels'}</a>
          </div>
        </div>
      </div>
    </div>
  `;
    // ===== READ-ME : activation du bouton =====
  const readmeBtn = document.querySelector(".readme-btn, [data-action='readme']");
  if (readmeBtn) {
    readmeBtn.setAttribute("href", readmeUrl);
    readmeBtn.setAttribute("target", "_blank");
    readmeBtn.setAttribute("rel", "noreferrer noopener");
  }
  // =========================================

}

function route(){
  setActiveNav();
  const page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  if(page === 'index.html' || page === '') return pageIndex();
  if(page === 'games.html') return pageListing('game');
  if(page === 'softwares.html') return pageListing('software');
  if(page === 'item.html') return pageItem();
}

route().catch(err => {
  console.error(err);
  const host = document.body;
  const div = document.createElement('div');
  div.className = 'container';
  div.innerHTML = `<div class="card detail" style="margin:18px 0"><h1>Erreur</h1><p class="lead">${escapeHtml(err.message || String(err))}</p></div>`;
  host.prepend(div);
});

function openFaqImage(){
  document.getElementById('faq-image-modal')?.classList.remove('hidden');
}

function closeFaqImage(e){
  if(e.target.id === 'faq-image-modal'){
    document.getElementById('faq-image-modal')?.classList.add('hidden');
  }
}
