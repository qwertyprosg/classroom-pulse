// ── Professor Dashboard Client ──────────────────────────────────────────────
const socket = io();

// ── DOM ──
const createScreen    = document.getElementById('create-screen');
const dashboardScreen = document.getElementById('dashboard-screen');
const createBtn       = document.getElementById('create-btn');
const roomCodeText    = document.getElementById('room-code-text');
const copyCodeBtn     = document.getElementById('copy-code-btn');
const dashStudentCount= document.getElementById('dash-student-count');
const statFollowing   = document.getElementById('stat-following');
const statLost        = document.getElementById('stat-lost');
const statAhead       = document.getElementById('stat-ahead');
const statQuestions   = document.getElementById('stat-questions');
const alertsList      = document.getElementById('alerts-list');
const alertsEmpty     = document.getElementById('alerts-empty');
const alertCountBadge = document.getElementById('alert-count-badge');
const questionsFeed   = document.getElementById('questions-feed');
const questionsEmpty  = document.getElementById('questions-empty');
const anonToggle      = document.getElementById('anon-toggle');
const endSessionBtn   = document.getElementById('end-session-btn');
const heatmapContainer= document.getElementById('heatmap-container');
const summaryModal    = document.getElementById('summary-modal');
const summaryBody     = document.getElementById('summary-body');
const summaryCloseBtn = document.getElementById('summary-close-btn');
const toastContainer  = document.getElementById('toast-container');

let roomCode = '';
let sessionStartTime = Date.now();
let questions = [];
let alertCount = 0;
let comprehensionData = { labels: [], following: [], lost: [], ahead: [] };
let chart = null;

// ── Toast ──
function showToast(msg, type = 'success') {
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  toastContainer.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(30px)'; setTimeout(() => t.remove(), 300); }, 3000);
}

// ── Create Session ──
createBtn.addEventListener('click', () => {
  createBtn.querySelector('.create-btn-text').style.display = 'none';
  createBtn.querySelector('.create-btn-loader').style.display = 'inline-flex';
  createBtn.disabled = true;

  socket.emit('create-session', (res) => {
    if (res.success) {
      roomCode = res.roomCode;
      sessionStartTime = Date.now();
      roomCodeText.textContent = roomCode;
      createScreen.style.display = 'none';
      dashboardScreen.style.display = 'block';
      initChart();
      showToast(`Session created! Code: ${roomCode}`);
    } else {
      createBtn.querySelector('.create-btn-text').style.display = '';
      createBtn.querySelector('.create-btn-loader').style.display = 'none';
      createBtn.disabled = false;
      showToast('Failed to create session', 'error');
    }
  });
});

// ── Copy Code ──
copyCodeBtn.addEventListener('click', () => {
  navigator.clipboard.writeText(roomCode).then(() => showToast('Room code copied!'));
});

// ── End Session ──
endSessionBtn.addEventListener('click', () => {
  if (!confirm('Are you sure you want to end this session?')) return;

  socket.emit('end-session', (res) => {
    if (res.success) {
      showSummary(res.summary);
    }
  });
});

// ── Anonymous Toggle ──
anonToggle.addEventListener('change', () => {
  socket.emit('toggle-anonymous', { enabled: anonToggle.checked }, (res) => {
    if (res?.success) {
      showToast(anonToggle.checked ? 'Anonymous mode enabled' : 'Named mode enabled');
    }
  });
});

// ── Chart.js Setup ──
function initChart() {
  const ctx = document.getElementById('comprehension-chart').getContext('2d');
  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Following',
          data: [],
          borderColor: '#22c55e',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          fill: true,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
        },
        {
          label: 'Lost',
          data: [],
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          fill: true,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
        },
        {
          label: 'Ahead',
          data: [],
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          fill: true,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            color: '#8a8a9a',
            usePointStyle: true,
            pointStyle: 'circle',
            padding: 16,
            font: { family: 'Inter', size: 12, weight: '600' }
          }
        },
        tooltip: {
          backgroundColor: '#1a1a2e',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          titleFont: { family: 'Inter', size: 12 },
          bodyFont: { family: 'Inter', size: 12 },
          titleColor: '#f0f0f5',
          bodyColor: '#8a8a9a',
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y}%`
          }
        }
      },
      scales: {
        x: {
          ticks: { color: '#5a5a6a', font: { family: 'Inter', size: 10 }, maxTicksLimit: 15 },
          grid: { color: 'rgba(255,255,255,0.04)' }
        },
        y: {
          min: 0,
          max: 100,
          ticks: {
            color: '#5a5a6a',
            font: { family: 'Inter', size: 10 },
            callback: v => v + '%',
            stepSize: 20
          },
          grid: { color: 'rgba(255,255,255,0.04)' }
        }
      },
      animation: { duration: 400 }
    }
  });
}

// ── Update Chart ──
function updateChart(data) {
  const elapsed = data.timestamp - sessionStartTime;
  const mins = Math.floor(elapsed / 60000);
  const secs = Math.floor((elapsed % 60000) / 1000);
  const label = `${mins}:${secs.toString().padStart(2, '0')}`;

  comprehensionData.labels.push(label);
  comprehensionData.following.push(data.following);
  comprehensionData.lost.push(data.lost);
  comprehensionData.ahead.push(data.ahead);

  // Keep last 120 data points (10 minutes at 5s intervals)
  const maxPoints = 120;
  if (comprehensionData.labels.length > maxPoints) {
    comprehensionData.labels.shift();
    comprehensionData.following.shift();
    comprehensionData.lost.shift();
    comprehensionData.ahead.shift();
  }

  chart.data.labels = comprehensionData.labels;
  chart.data.datasets[0].data = comprehensionData.following;
  chart.data.datasets[1].data = comprehensionData.lost;
  chart.data.datasets[2].data = comprehensionData.ahead;
  chart.update('none');
}

// ── Update Heatmap ──
function updateHeatmap(data) {
  const heatmapEmpty = heatmapContainer.querySelector('.heatmap-empty');
  if (heatmapEmpty) heatmapEmpty.remove();

  const bar = document.createElement('div');
  bar.className = 'heatmap-bar';

  const lost = data.lost;
  const height = Math.max(8, (lost / 100) * 60);
  bar.style.height = height + 'px';

  // Color based on lost percentage
  if (lost < 15) {
    bar.style.background = 'var(--green)';
  } else if (lost < 30) {
    bar.style.background = 'var(--amber)';
  } else {
    bar.style.background = 'var(--red)';
  }

  const elapsed = data.timestamp - sessionStartTime;
  const mins = Math.floor(elapsed / 60000);
  const secs = Math.floor((elapsed % 60000) / 1000);
  const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;

  bar.innerHTML = `<div class="heatmap-tooltip">${timeStr} — ${lost}% lost</div>`;

  heatmapContainer.appendChild(bar);

  // Limit bars
  const bars = heatmapContainer.querySelectorAll('.heatmap-bar');
  if (bars.length > 180) bars[0].remove();

  // Auto scroll right
  heatmapContainer.scrollLeft = heatmapContainer.scrollWidth;
}

// ── Render Questions ──
function renderQuestions() {
  const sorted = [...questions].sort((a, b) => b.upvotes - a.upvotes);

  if (sorted.length === 0) {
    questionsEmpty.style.display = '';
    questionsFeed.querySelectorAll('.q-feed-item').forEach(el => el.remove());
    return;
  }

  questionsEmpty.style.display = 'none';
  questionsFeed.querySelectorAll('.q-feed-item').forEach(el => el.remove());

  sorted.forEach((q, i) => {
    const div = document.createElement('div');
    div.className = 'q-feed-item';
    div.dataset.id = q.id;

    const timeAgo = getTimeAgo(q.timestamp);

    div.innerHTML = `
      <div class="q-feed-rank">${i + 1}</div>
      <div class="q-feed-body">
        <div class="q-feed-text">${escapeHtml(q.text)}</div>
        <div class="q-feed-meta">${escapeHtml(q.author)} · ${timeAgo}</div>
      </div>
      <div class="q-feed-votes">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"/></svg>
        ${q.upvotes}
      </div>
    `;

    questionsFeed.appendChild(div);
  });

  statQuestions.textContent = questions.length;
}

// ── Show Summary ──
function showSummary(summary) {
  let peaksHtml = '';
  if (summary.peakLostMoments && summary.peakLostMoments.length > 0) {
    peaksHtml = summary.peakLostMoments.map(p => `
      <div class="summary-peak-item">
        <div class="summary-peak-time">${p.time}</div>
        <div class="summary-peak-bar"><div class="summary-peak-fill" style="width:${p.lostPercent}%"></div></div>
        <div class="summary-peak-pct">${p.lostPercent}%</div>
      </div>
    `).join('');
  } else {
    peaksHtml = '<p style="color:var(--text-muted);font-size:0.85rem;">No significant confusion spikes recorded.</p>';
  }

  let questionsHtml = '';
  if (summary.topQuestions && summary.topQuestions.length > 0) {
    questionsHtml = summary.topQuestions.map(q => `
      <div class="summary-q-item">
        <span class="summary-q-votes">▲ ${q.upvotes}</span>
        <span class="summary-q-text">${escapeHtml(q.text)}</span>
      </div>
    `).join('');
  } else {
    questionsHtml = '<p style="color:var(--text-muted);font-size:0.85rem;">No questions were submitted.</p>';
  }

  let alertsHtml = '';
  if (summary.alerts && summary.alerts.length > 0) {
    alertsHtml = `
      <div>
        <div class="summary-section-title">🚨 AI Alerts Triggered</div>
        ${summary.alerts.map(a => `
          <div class="summary-peak-item" style="border-left:3px solid var(--amber);">
            <div class="summary-peak-time">${a.timeStr}</div>
            <div style="flex:1;font-size:0.85rem;color:var(--text-secondary);">${a.suggestion}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  summaryBody.innerHTML = `
    <div>
      <div class="summary-section-title">Overview</div>
      <div class="summary-stats-row">
        <div class="summary-stat">
          <div class="summary-stat-value">${summary.duration}</div>
          <div class="summary-stat-label">Duration</div>
        </div>
        <div class="summary-stat">
          <div class="summary-stat-value">${summary.totalStudents}</div>
          <div class="summary-stat-label">Total Students</div>
        </div>
        <div class="summary-stat">
          <div class="summary-stat-value" style="color:var(--green);">${summary.averageComprehension.following}%</div>
          <div class="summary-stat-label">Avg Following</div>
        </div>
      </div>
    </div>

    <div>
      <div class="summary-section-title">Average Comprehension</div>
      <div class="summary-stats-row">
        <div class="summary-stat">
          <div class="summary-stat-value" style="color:var(--green);">${summary.averageComprehension.following}%</div>
          <div class="summary-stat-label">Following</div>
        </div>
        <div class="summary-stat">
          <div class="summary-stat-value" style="color:var(--red);">${summary.averageComprehension.lost}%</div>
          <div class="summary-stat-label">Lost</div>
        </div>
        <div class="summary-stat">
          <div class="summary-stat-value" style="color:var(--amber);">${summary.averageComprehension.ahead}%</div>
          <div class="summary-stat-label">Ahead</div>
        </div>
      </div>
    </div>

    <div>
      <div class="summary-section-title">🔴 Peak Lost Moments</div>
      ${peaksHtml}
    </div>

    ${alertsHtml}

    <div>
      <div class="summary-section-title">❓ Top Questions</div>
      ${questionsHtml}
    </div>
  `;

  summaryModal.style.display = 'flex';
}

summaryCloseBtn.addEventListener('click', () => {
  summaryModal.style.display = 'none';
});

// ── Socket Events ──
socket.on('comprehension-update', (data) => {
  statFollowing.textContent = data.following + '%';
  statLost.textContent = data.lost + '%';
  statAhead.textContent = data.ahead + '%';
  dashStudentCount.textContent = data.studentCount;

  if (chart) updateChart(data);
  updateHeatmap(data);
});

socket.on('student-joined', (data) => {
  dashStudentCount.textContent = data.studentCount;
  showToast(`Student joined (${data.studentCount} total)`);
});

socket.on('student-left', (data) => {
  dashStudentCount.textContent = data.studentCount;
});

socket.on('new-question', (q) => {
  questions.push(q);
  renderQuestions();
  showToast('New question received!', 'warning');
});

socket.on('question-upvoted', (update) => {
  const q = questions.find(x => x.id === update.id);
  if (q) q.upvotes = update.upvotes;
  renderQuestions();
});

socket.on('pivot-alert', (alert) => {
  alertCount++;
  alertCountBadge.style.display = '';
  alertCountBadge.textContent = alertCount;
  alertsEmpty.style.display = 'none';

  const div = document.createElement('div');
  div.className = 'alert-card';
  div.innerHTML = `
    <div class="alert-card-header">
      <span class="alert-card-time">⏱ ${alert.timeStr}</span>
      <span class="alert-card-badge">${alert.lostPercent}% Lost</span>
    </div>
    <div class="alert-card-message">${alert.message}</div>
    <div class="alert-card-suggestion">💡 ${alert.suggestion}</div>
  `;

  alertsList.insertBefore(div, alertsEmpty.nextSibling || null);

  // Flash the alerts panel
  const panel = document.querySelector('.alerts-panel');
  panel.style.animation = 'none';
  panel.offsetHeight; // trigger reflow
  panel.style.animation = 'glow-pulse 1s ease 3';
});

// ── Helpers ──
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function getTimeAgo(ts) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}
