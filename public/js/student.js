// ── Student Client ──────────────────────────────────────────────────────────
const socket = io();

// ── DOM References ──
const joinScreen       = document.getElementById('join-screen');
const sessionScreen    = document.getElementById('session-screen');
const roomCodeInput    = document.getElementById('room-code-input');
const nameInput        = document.getElementById('name-input');
const joinBtn          = document.getElementById('join-btn');
const joinError        = document.getElementById('join-error');
const displayRoomCode  = document.getElementById('display-room-code');
const studentCount     = document.getElementById('student-count');
const questionPanel    = document.getElementById('question-panel');
const questionBackdrop = document.getElementById('question-panel-backdrop');
const questionInput    = document.getElementById('question-input');
const submitQBtn       = document.getElementById('submit-question-btn');
const questionList     = document.getElementById('question-list');
const emptyQuestions   = document.getElementById('empty-questions');
const questionBubble   = document.getElementById('question-count-bubble');
const modeLabel        = document.getElementById('question-mode-label');
const endedOverlay     = document.getElementById('session-ended-overlay');
const toastContainer   = document.getElementById('toast-container');

let currentState = null;
let questions = [];

// ── Toast ──
function showToast(msg, type = 'success') {
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  toastContainer.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(30px)'; setTimeout(() => t.remove(), 300); }, 3000);
}

// ── Join Flow ──
roomCodeInput.addEventListener('input', () => {
  roomCodeInput.value = roomCodeInput.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  joinBtn.disabled = roomCodeInput.value.length < 6;
  joinError.textContent = '';
});

roomCodeInput.addEventListener('keydown', e => { if (e.key === 'Enter' && !joinBtn.disabled) joinBtn.click(); });
nameInput.addEventListener('keydown', e => { if (e.key === 'Enter' && !joinBtn.disabled) joinBtn.click(); });

joinBtn.addEventListener('click', () => {
  const code = roomCodeInput.value.trim();
  const name = nameInput.value.trim();
  if (code.length < 6) return;

  joinBtn.querySelector('.join-btn-text').style.display = 'none';
  joinBtn.querySelector('.join-btn-loader').style.display = 'inline-flex';
  joinBtn.disabled = true;

  socket.emit('join-session', { roomCode: code, name: name || null }, (res) => {
    joinBtn.querySelector('.join-btn-text').style.display = '';
    joinBtn.querySelector('.join-btn-loader').style.display = 'none';

    if (!res.success) {
      joinBtn.disabled = false;
      joinError.textContent = res.error;
      return;
    }

    // Success — show session screen
    joinScreen.style.display = 'none';
    sessionScreen.style.display = 'flex';
    displayRoomCode.textContent = code;
    studentCount.textContent = res.studentCount;

    // Update mode
    updateMode(res.settings);

    // Load existing questions
    questions = res.questions || [];
    renderQuestions();
  });
});

// ── Comprehension Buttons ──
const compBtns = document.querySelectorAll('.comp-btn[data-state]');
compBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const state = btn.dataset.state;
    // Toggle off if same state
    if (currentState === state) {
      currentState = null;
      compBtns.forEach(b => b.classList.remove('active'));
    } else {
      currentState = state;
      compBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    }
    socket.emit('comprehension-tap', { state: currentState });
  });
});

// ── Question Panel ──
document.getElementById('btn-open-questions').addEventListener('click', () => {
  questionPanel.classList.add('open');
});

questionBackdrop.addEventListener('click', () => {
  questionPanel.classList.remove('open');
});

questionInput.addEventListener('input', () => {
  submitQBtn.disabled = questionInput.value.trim().length === 0;
});

submitQBtn.addEventListener('click', () => {
  const text = questionInput.value.trim();
  if (!text) return;
  submitQBtn.disabled = true;

  socket.emit('submit-question', { text }, (res) => {
    if (res?.success) {
      questionInput.value = '';
      submitQBtn.disabled = true;
      showToast('Question submitted!');
    } else {
      submitQBtn.disabled = false;
      showToast('Failed to submit question', 'error');
    }
  });
});

questionInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    if (!submitQBtn.disabled) submitQBtn.click();
  }
});

// ── Render Questions ──
function renderQuestions() {
  const sorted = [...questions].sort((a, b) => b.upvotes - a.upvotes);

  if (sorted.length === 0) {
    emptyQuestions.style.display = '';
    // Clear any question items
    questionList.querySelectorAll('.question-item').forEach(el => el.remove());
    return;
  }

  emptyQuestions.style.display = 'none';

  // Remove old items
  questionList.querySelectorAll('.question-item').forEach(el => el.remove());

  sorted.forEach(q => {
    const div = document.createElement('div');
    div.className = 'question-item';
    div.dataset.id = q.id;

    const timeAgo = getTimeAgo(q.timestamp);
    div.innerHTML = `
      <div class="question-item-text">
        <p>${escapeHtml(q.text)}</p>
        <div class="question-item-meta">${escapeHtml(q.author)} · ${timeAgo}</div>
      </div>
      <button class="upvote-btn ${q.upvoted ? 'upvoted' : ''}" data-qid="${q.id}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"/></svg>
        <span>${q.upvotes}</span>
      </button>
    `;

    div.querySelector('.upvote-btn').addEventListener('click', () => {
      socket.emit('upvote-question', { questionId: q.id }, () => {});
    });

    questionList.appendChild(div);
  });

  updateQuestionBubble();
}

function updateQuestionBubble() {
  if (questions.length > 0) {
    questionBubble.style.display = 'flex';
    questionBubble.textContent = questions.length;
  } else {
    questionBubble.style.display = 'none';
  }
}

// ── Socket Events ──
socket.on('new-question', (q) => {
  q.upvoted = false;
  questions.push(q);
  renderQuestions();
});

socket.on('question-upvoted', (update) => {
  const q = questions.find(x => x.id === update.id);
  if (q) {
    q.upvotes = update.upvotes;
    if (update.upvoted !== undefined) q.upvoted = update.upvoted;
  }
  renderQuestions();
});

socket.on('student-joined', (data) => {
  studentCount.textContent = data.studentCount;
});

socket.on('student-left', (data) => {
  studentCount.textContent = data.studentCount;
});

socket.on('settings-updated', (settings) => {
  updateMode(settings);
});

socket.on('session-ended', () => {
  endedOverlay.style.display = 'flex';
});

function updateMode(settings) {
  modeLabel.textContent = settings.anonymousQuestions ? 'Anonymous mode' : 'Named mode — your name will be shown';
}

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
