/**
 * RNA-Seq Projects Dashboard
 * Anderson Diagnostics & Labs · Bioinformatics Division
 *
 * DATA SOURCE
 * -----------
 * Replace SHEET_API_URL with your deployed Google Apps Script Web App URL.
 * See Code.gs for the script to deploy.
 *
 * Steps to get the URL:
 *   1. Open your Google Sheet → Extensions → Apps Script
 *   2. Paste the contents of Code.gs and save
 *   3. Deploy → New Deployment → Web App
 *      · Execute as: Me
 *      · Who has access: Anyone
 *   4. Copy the deployment URL and paste it below
 */
const SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbxV7GlFeFhooSVKuwjf-iz9C2eMaAJ6be7MpM1xAYny0HoJS6wjqucVimQkzmLOh0L8cw/exec';

/* ─── Column names (must match row 1 of your Google Sheet exactly) ─── */
const COL = {
  sno:        'S No',
  project:    'Project Name',
  client:     'Client',
  institution:'Institution',
  sampleCount:'Sample Count',
  sampleType: 'Sample Type',
  startDate:  'Start Date',
  endDate:    'End Date',
  status:     'Status',
  resultUrl:  'Result URL',
  scriptsUrl: 'Scripts Repo URL',
  remark:     'Remark',
};

/* ─── Status → CSS badge class ─── */
const STATUS_CLASS = {
  'completed':          'badge-completed',
  'in progress':        'badge-inprogress',
  'qc':                 'badge-qc',
  'waiting for review': 'badge-waiting',
  'waiting for data':   'badge-waiting',
  'waiting':            'badge-waiting',
  'on hold':            'badge-onhold',
};

/* ─── Status buckets for the stats bar ─── */
function statusBucket(status) {
  const s = (status || '').toLowerCase();
  if (s === 'completed')                         return 'completed';
  if (s.startsWith('waiting'))                   return 'waiting';
  if (s === 'on hold')                           return 'onhold';
  return 'active'; // in progress, qc, etc.
}

/* ─── Filter tab matching ─── */
function matchesFilter(project, filter) {
  if (filter === 'All') return true;
  const s = (project[COL.status] || '').toLowerCase();
  if (filter === 'Waiting')    return s.startsWith('waiting');
  if (filter === 'In Progress')return s === 'in progress';
  if (filter === 'QC')         return s === 'qc';
  if (filter === 'Completed')  return s === 'completed';
  if (filter === 'On Hold')    return s === 'on hold';
  return true;
}

/* ─── Badge HTML ─── */
function badgeHtml(status) {
  const key   = (status || '').toLowerCase();
  const cls   = STATUS_CLASS[key] || 'badge-onhold';
  return `<span class="status-badge ${cls}">${escHtml(status || 'Unknown')}</span>`;
}

/* ─── Simple HTML escape ─── */
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ─── Format a date value from Sheets ─── */
function fmtDate(val) {
  if (!val) return null;
  // Sheets may return a Date object serialised as ISO string or DD-MM-YYYY
  const s = String(val).trim();
  if (!s || s === '0') return null;
  return s;
}

/* ─── Build one project card ─── */
function buildCard(p) {
  const title       = escHtml(p[COL.project]    || 'Untitled Project');
  const client      = escHtml(p[COL.client]     || '');
  const institution = escHtml(p[COL.institution]|| '');
  const status      = p[COL.status] || '';
  const sampleCount = p[COL.sampleCount];
  const sampleType  = escHtml(p[COL.sampleType] || '');
  const startDate   = fmtDate(p[COL.startDate]);
  const endDate     = fmtDate(p[COL.endDate]);
  const resultUrl   = (p[COL.resultUrl]  || '').trim();
  const scriptsUrl  = (p[COL.scriptsUrl] || '').trim();
  const remark      = escHtml(p[COL.remark]     || '');
  const sno         = p[COL.sno] !== undefined ? escHtml(String(p[COL.sno])) : '';

  // Client / institution line
  let clientLine = '';
  if (client && institution)   clientLine = `<strong>${client}</strong> · ${institution}`;
  else if (client)             clientLine = `<strong>${client}</strong>`;
  else if (institution)        clientLine = institution;

  // Sample pill
  let samplePill = '';
  if (sampleCount || sampleType) {
    const parts = [];
    if (sampleCount) parts.push(`<span>${escHtml(String(sampleCount))}</span> samples`);
    if (sampleType)  parts.push(sampleType);
    samplePill = `<span class="meta-pill">${parts.join(' · ')}</span>`;
  }

  // Date range
  let datesHtml = '';
  if (startDate || endDate) {
    const from = startDate ? `<span>${startDate}</span>` : '—';
    const to   = endDate   ? `<span>${endDate}</span>`   : 'ongoing';
    datesHtml = `<span class="card-dates">${from} → ${to}</span>`;
  }

  // Action buttons
  let actions = '';
  if (resultUrl)  actions += `<a class="btn btn-primary"   href="${escHtml(resultUrl)}"  target="_blank" rel="noopener">View Results</a>`;
  if (scriptsUrl) actions += `<a class="btn btn-secondary" href="${escHtml(scriptsUrl)}" target="_blank" rel="noopener">Scripts Repo</a>`;

  return `
    <div class="project-card">
      <div class="card-header">
        <h2 class="card-title">${title}</h2>
        <span class="card-sno">#${sno}</span>
      </div>
      ${badgeHtml(status)}
      ${clientLine ? `<p class="card-client">${clientLine}</p>` : ''}
      <div class="card-meta">
        ${samplePill}
        ${datesHtml}
      </div>
      ${remark ? `<p class="card-remark">${remark}</p>` : ''}
      ${actions ? `<div class="card-actions">${actions}</div>` : ''}
    </div>`;
}

/* ─── Render stats counters ─── */
function renderStats(projects) {
  const counts = { completed: 0, active: 0, waiting: 0 };
  projects.forEach(p => {
    const b = statusBucket(p[COL.status]);
    if (b === 'completed') counts.completed++;
    else if (b === 'waiting') counts.waiting++;
    else counts.active++;
  });
  document.getElementById('stat-total').textContent     = projects.length;
  document.getElementById('stat-completed').textContent = counts.completed;
  document.getElementById('stat-active').textContent    = counts.active;
  document.getElementById('stat-waiting').textContent   = counts.waiting;
}

/* ─── Render cards grid ─── */
let allProjects = [];
let activeFilter = 'All';

function renderCards() {
  const query = (document.getElementById('search-input').value || '').toLowerCase();
  const grid  = document.getElementById('cards-grid');
  const empty = document.getElementById('empty-state');

  const visible = allProjects.filter(p => {
    if (!matchesFilter(p, activeFilter)) return false;
    if (query) {
      const haystack = [
        p[COL.project], p[COL.client], p[COL.institution], p[COL.status], p[COL.remark]
      ].join(' ').toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });

  if (visible.length === 0) {
    grid.classList.add('hidden');
    empty.classList.remove('hidden');
  } else {
    grid.innerHTML = visible.map(buildCard).join('');
    grid.classList.remove('hidden');
    empty.classList.add('hidden');
  }
}

/* ─── Fetch data from AppScript ─── */
async function fetchProjects() {
  const loading = document.getElementById('loading');
  const errEl   = document.getElementById('error-state');
  const grid    = document.getElementById('cards-grid');

  // Placeholder check
  if (!SHEET_API_URL || SHEET_API_URL === 'PASTE_YOUR_APPSCRIPT_URL_HERE') {
    loading.classList.add('hidden');
    errEl.innerHTML = `
      <p><strong>Setup required:</strong> Open <code>app.js</code> and replace
      <code>PASTE_YOUR_APPSCRIPT_URL_HERE</code> with your deployed Google Apps Script URL.</p>
      <p style="margin-top:.8rem;font-size:.82rem;">
        See the README or <code>Code.gs</code> for deployment instructions.
      </p>`;
    errEl.classList.remove('hidden');
    return;
  }

  try {
    const res  = await fetch(SHEET_API_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    allProjects = json.projects || [];

    renderStats(allProjects);
    renderCards();

    loading.classList.add('hidden');
    grid.classList.remove('hidden');

    // Last updated timestamp
    const ts = document.getElementById('last-updated');
    if (ts) ts.textContent = 'Last loaded: ' + new Date().toLocaleString();

  } catch (err) {
    console.error('Failed to fetch projects:', err);
    loading.classList.add('hidden');
    errEl.classList.remove('hidden');
  }
}

/* ─── Wire up filter tabs ─── */
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeFilter = btn.dataset.filter;
    renderCards();
  });
});

/* ─── Wire up search ─── */
document.getElementById('search-input').addEventListener('input', renderCards);

/* ─── Boot ─── */
fetchProjects();
