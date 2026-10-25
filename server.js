const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

app.use(express.static(path.join(__dirname, 'public')));

// ── In-Memory Store ──────────────────────────────────────────────────────────
const sessions = new Map();

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return sessions.has(code) ? generateRoomCode() : code;
}

function getAggregatedComprehension(session) {
  const students = Array.from(session.students.values());
  const total = students.length || 1;
  const counts = { following: 0, lost: 0, ahead: 0 };
  students.forEach(s => { if (s.currentState && counts.hasOwnProperty(s.currentState)) counts[s.currentState]++; });
  return {
    following: Math.round((counts.following / total) * 100),
    lost: Math.round((counts.lost / total) * 100),
    ahead: Math.round((counts.ahead / total) * 100),
    studentCount: students.length,
    timestamp: Date.now()
  };
}

// ── Alert Engine ─────────────────────────────────────────────────────────────
function checkForAlerts(session) {
  const now = Date.now();
  if (session.lastAlertTime && now - session.lastAlertTime < 120000) return null; // 2-min cooldown

  const log = session.comprehensionLog;
  if (log.length < 2) return null;

  const current = log[log.length - 1];
  const windowStart = now - 90000; // 90 seconds ago
  const pastEntries = log.filter(e => e.timestamp >= windowStart);
  if (pastEntries.length < 2) return null;

  const earliest = pastEntries[0];
  const lostJump = current.lost - earliest.lost;

  if (current.lost >= 30 && lostJump >= 15) {
    const sessionStart = session.createdAt;
    const elapsedMs = now - sessionStart;
    const mins = Math.floor(elapsedMs / 60000);
    const secs = Math.floor((elapsedMs % 60000) / 1000);
    const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;

    let suggestion;
    if (current.lost >= 50) {
      suggestion = `Majority of students are lost. Consider stopping and re-explaining with a different approach or example.`;
    } else if (current.lost >= 40) {
      suggestion = `Comprehension dropped ${lostJump}% at ${timeStr}. Consider pausing to recap the last concept before moving on.`;
    } else {
      suggestion = `About ${current.lost}% of students are struggling (up from ${earliest.lost}%). Consider a quick check-in or re-phrasing.`;
    }

    const alert = {
      id: uuidv4(),
      timestamp: now,
      timeStr,
      lostPercent: current.lost,
      jump: lostJump,
      message: `⚠️ Comprehension dropped ${lostJump}% in the last 90 seconds (now ${current.lost}% lost at ${timeStr}).`,
      suggestion
    };

    session.lastAlertTime = now;
    session.alerts.push(alert);
    return alert;
  }
  return null;
}

// ── Generate Post-Session Summary ────────────────────────────────────────────
function generateSummary(session) {
  const log = session.comprehensionLog;
  const duration = session.endedAt - session.createdAt;
  const durationMins = Math.round(duration / 60000);

  // Peak lost moments
  const peakLost = [...log]
    .sort((a, b) => b.lost - a.lost)
    .slice(0, 5)
    .map(e => {
      const elapsed = e.timestamp - session.createdAt;
      const mins = Math.floor(elapsed / 60000);
      const secs = Math.floor((elapsed % 60000) / 1000);
      return { time: `${mins}:${secs.toString().padStart(2, '0')}`, lostPercent: e.lost };
    });

  // Average comprehension
  const avgFollowing = log.length ? Math.round(log.reduce((s, e) => s + e.following, 0) / log.length) : 0;
  const avgLost = log.length ? Math.round(log.reduce((s, e) => s + e.lost, 0) / log.length) : 0;
  const avgAhead = log.length ? Math.round(log.reduce((s, e) => s + e.ahead, 0) / log.length) : 0;

  // Top questions
  const topQuestions = [...session.questions]
    .sort((a, b) => b.upvotes - a.upvotes)
    .slice(0, 10);

  // Confusion spikes (any point where lost > 30%)
  const confusionSpikes = log
    .filter(e => e.lost >= 30)
    .map(e => {
      const elapsed = e.timestamp - session.createdAt;
      const mins = Math.floor(elapsed / 60000);
      const secs = Math.floor((elapsed % 60000) / 1000);
      return { time: `${mins}:${secs.toString().padStart(2, '0')}`, lostPercent: e.lost };
    });

  return {
    duration: durationMins < 1 ? 'Less than 1 minute' : `${durationMins} minute${durationMins > 1 ? 's' : ''}`,
    totalStudents: session.students.size,
    peakLostMoments: peakLost,
    confusionSpikes,
    topQuestions: topQuestions.map(q => ({ text: q.text, upvotes: q.upvotes, author: q.author })),
    averageComprehension: { following: avgFollowing, lost: avgLost, ahead: avgAhead },
    alerts: session.alerts,
    comprehensionLog: log
  };
}

// ── Comprehension Tick (every 5 seconds per session) ─────────────────────────
setInterval(() => {
  sessions.forEach((session, roomCode) => {
    if (session.endedAt) return;
    if (session.students.size === 0) return;

    const agg = getAggregatedComprehension(session);
    session.comprehensionLog.push(agg);

    // Only keep last 30 minutes of data (360 entries at 5s interval)
    if (session.comprehensionLog.length > 360) session.comprehensionLog.shift();

    io.to(`prof-${roomCode}`).emit('comprehension-update', agg);

    // Check for alerts
    const alert = checkForAlerts(session);
    if (alert) {
      io.to(`prof-${roomCode}`).emit('pivot-alert', alert);
    }
  });
}, 5000);

// ── Socket.IO Events ─────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`🔌 Connected: ${socket.id}`);

  // ── Professor: Create Session ──
  socket.on('create-session', (callback) => {
    const roomCode = generateRoomCode();
    const session = {
      id: uuidv4(),
      roomCode,
      professorSocketId: socket.id,
      students: new Map(),
      comprehensionLog: [],
      questions: [],
      alerts: [],
      settings: { anonymousQuestions: true },
      createdAt: Date.now(),
      endedAt: null,
      lastAlertTime: null
    };
    sessions.set(roomCode, session);
    socket.join(`prof-${roomCode}`);
    console.log(`📚 Session created: ${roomCode}`);
    callback({ success: true, roomCode, sessionId: session.id });
  });

  // ── Student: Join Session ──
  socket.on('join-session', ({ roomCode, name }, callback) => {
    const code = (roomCode || '').toUpperCase().trim();
    const session = sessions.get(code);
    if (!session) return callback({ success: false, error: 'Session not found. Check your room code.' });
    if (session.endedAt) return callback({ success: false, error: 'This session has already ended.' });

    const student = {
      id: socket.id,
      name: name || null,
      currentState: null,
      lastTapTime: null
    };
    session.students.set(socket.id, student);
    socket.join(`room-${code}`);
    socket.roomCode = code;

    // Notify professor
    io.to(`prof-${code}`).emit('student-joined', { studentCount: session.students.size });

    // Send current state to student
    const questions = session.questions.map(q => ({
      id: q.id, text: q.text, author: q.author,
      upvotes: q.upvotes, timestamp: q.timestamp,
      upvoted: q.upvotedBy.has(socket.id)
    }));

    callback({
      success: true,
      settings: session.settings,
      questions,
      studentCount: session.students.size
    });
    console.log(`👤 Student joined ${code} (${session.students.size} total)`);
  });

  // ── Student: Comprehension Tap ──
  socket.on('comprehension-tap', ({ state }) => {
    const code = socket.roomCode;
    if (!code) return;
    const session = sessions.get(code);
    if (!session || session.endedAt) return;

    const student = session.students.get(socket.id);
    if (!student) return;

    student.currentState = state; // 'following', 'lost', 'ahead'
    student.lastTapTime = Date.now();

    // Immediately broadcast updated aggregate
    const agg = getAggregatedComprehension(session);
    io.to(`prof-${code}`).emit('comprehension-update', agg);
  });

  // ── Student: Submit Question ──
  socket.on('submit-question', ({ text }, callback) => {
    const code = socket.roomCode;
    if (!code) return callback?.({ success: false });
    const session = sessions.get(code);
    if (!session || session.endedAt) return callback?.({ success: false });

    const student = session.students.get(socket.id);
    if (!student) return callback?.({ success: false });

    const question = {
      id: uuidv4(),
      text: text.trim(),
      author: session.settings.anonymousQuestions ? 'Anonymous' : (student.name || 'Anonymous'),
      upvotes: 0,
      upvotedBy: new Set(),
      timestamp: Date.now()
    };

    session.questions.push(question);

    const q = {
      id: question.id, text: question.text, author: question.author,
      upvotes: question.upvotes, timestamp: question.timestamp
    };

    io.to(`room-${code}`).emit('new-question', q);
    io.to(`prof-${code}`).emit('new-question', q);

    callback?.({ success: true });
    console.log(`❓ Question in ${code}: "${text.substring(0, 50)}..."`);
  });

  // ── Student: Upvote Question ──
  socket.on('upvote-question', ({ questionId }, callback) => {
    const code = socket.roomCode;
    if (!code) return callback?.({ success: false });
    const session = sessions.get(code);
    if (!session || session.endedAt) return callback?.({ success: false });

    const question = session.questions.find(q => q.id === questionId);
    if (!question) return callback?.({ success: false });

    if (question.upvotedBy.has(socket.id)) {
      question.upvotedBy.delete(socket.id);
      question.upvotes--;
    } else {
      question.upvotedBy.add(socket.id);
      question.upvotes++;
    }

    const update = { id: question.id, upvotes: question.upvotes, upvoted: question.upvotedBy.has(socket.id) };
    io.to(`room-${code}`).emit('question-upvoted', update);
    io.to(`prof-${code}`).emit('question-upvoted', update);

    callback?.({ success: true, upvotes: question.upvotes });
  });

  // ── Professor: Toggle Anonymous ──
  socket.on('toggle-anonymous', ({ enabled }, callback) => {
    // Find session owned by this professor
    let targetSession = null;
    sessions.forEach(s => { if (s.professorSocketId === socket.id) targetSession = s; });
    if (!targetSession) return callback?.({ success: false });

    targetSession.settings.anonymousQuestions = enabled;
    io.to(`room-${targetSession.roomCode}`).emit('settings-updated', targetSession.settings);
    callback?.({ success: true });
    console.log(`🔧 Anonymous mode ${enabled ? 'ON' : 'OFF'} in ${targetSession.roomCode}`);
  });

  // ── Professor: End Session ──
  socket.on('end-session', (callback) => {
    let targetSession = null;
    let targetCode = null;
    sessions.forEach((s, code) => {
      if (s.professorSocketId === socket.id) { targetSession = s; targetCode = code; }
    });
    if (!targetSession) return callback?.({ success: false });

    targetSession.endedAt = Date.now();
    const summary = generateSummary(targetSession);

    io.to(`room-${targetCode}`).emit('session-ended', { message: 'The session has ended. Thank you for participating!' });
    callback?.({ success: true, summary });

    console.log(`🏁 Session ended: ${targetCode}`);
  });

  // ── Disconnect ──
  socket.on('disconnect', () => {
    const code = socket.roomCode;
    if (code) {
      const session = sessions.get(code);
      if (session) {
        session.students.delete(socket.id);
        io.to(`prof-${code}`).emit('student-left', { studentCount: session.students.size });

        // Broadcast updated aggregate
        if (session.students.size > 0 && !session.endedAt) {
          const agg = getAggregatedComprehension(session);
          io.to(`prof-${code}`).emit('comprehension-update', agg);
        }
      }
    }
    console.log(`❌ Disconnected: ${socket.id}`);
  });
});

// ── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n🎓 Classroom Pulse running at http://localhost:${PORT}\n`);
});
