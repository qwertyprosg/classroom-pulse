const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const Groq = require('groq-sdk');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || 'placeholder' });
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

app.use(cors());
app.use(express.json());

// ── In-Memory Store ──────────────────────────────────────────────────────────
const sessions = new Map();

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
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

// ── Groq: PDF → Mind Map ─────────────────────────────────────────────────────
async function generateMindMap(text) {
  const truncated = text.slice(0, 12000); // stay in token budget
  const completion = await groq.chat.completions.create({
    model: 'llama3-8b-8192',
    messages: [
      {
        role: 'system',
        content: 'You are an educational content parser. Always respond with valid JSON only, no markdown, no explanation.'
      },
      {
        role: 'user',
        content: `Parse the following lecture content and return ONLY a JSON topic tree in this exact format:
{"title":"Root Topic","children":[{"title":"Chapter 1","children":[{"title":"Subtopic A","children":[{"title":"Key Concept 1","children":[]}]}]}]}

Make it 2-4 top-level chapters, each with 2-4 subtopics, each with 2-3 key concepts. Extract real topics from the content.

LECTURE CONTENT:
${truncated}

Respond with ONLY the JSON, nothing else.`
      }
    ],
    temperature: 0.3,
    max_tokens: 2048,
  });

  const raw = completion.choices[0].message.content.trim();
  // Strip markdown code fences if present
  const cleaned = raw.replace(/^```json?\s*/i, '').replace(/```\s*$/i, '').trim();
  return JSON.parse(cleaned);
}

// ── Groq: Confusion Alert Analysis ───────────────────────────────────────────
async function analyzeConfusion({ transcript, lostPercent, mindMapTitle, recentQuestions }) {
  const qText = recentQuestions.slice(0, 5).map((q, i) => `${i + 1}. "${q.text}"`).join('\n');
  const prompt = `You are an AI teaching assistant monitoring a live classroom.

SITUATION:
- ${lostPercent}% of students just indicated they are lost
- This spike occurred in the last 90 seconds
- Lecture topic tree root: "${mindMapTitle || 'Unknown'}"

LAST 60-90 SECONDS OF TRANSCRIPT:
"${transcript || '(no transcript available)'}"

RECENT STUDENT QUESTIONS:
${qText || '(none submitted)'}

Respond ONLY with a JSON object in exactly this format (no markdown, no extra text):
{
  "likelyTopic": "short topic name that probably caused confusion",
  "mindMapNodeTitle": "exact node title from topic tree if identifiable, else null",
  "studentDoubts": ["doubt 1 (max 12 words)", "doubt 2 (max 12 words)", "doubt 3 (max 12 words)"],
  "suggestion": "One concrete, actionable sentence the professor should say or do right now"
}`;

  const completion = await groq.chat.completions.create({
    model: 'llama3-8b-8192',
    messages: [
      { role: 'system', content: 'You are an AI teaching assistant. Respond ONLY with valid JSON.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.4,
    max_tokens: 512,
  });

  const raw = completion.choices[0].message.content.trim();
  const cleaned = raw.replace(/^```json?\s*/i, '').replace(/```\s*$/i, '').trim();
  return JSON.parse(cleaned);
}

// ── Alert Engine ─────────────────────────────────────────────────────────────
async function checkAndFireAlert(session, roomCode) {
  const now = Date.now();
  if (session.lastAlertTime && now - session.lastAlertTime < 120000) return;

  const log = session.comprehensionLog;
  if (log.length < 2) return;

  const current = log[log.length - 1];
  const windowStart = now - 90000;
  const pastEntries = log.filter(e => e.timestamp >= windowStart);
  if (pastEntries.length < 2) return;

  const earliest = pastEntries[0];
  const lostJump = current.lost - earliest.lost;

  // Also check for question spike
  const recentQCount = session.questions.filter(q => q.timestamp >= windowStart).length;
  const questionSpike = recentQCount >= 3;

  if (!((current.lost >= 30 && lostJump >= 15) || questionSpike)) return;

  session.lastAlertTime = now;

  const elapsed = now - session.createdAt;
  const mins = Math.floor(elapsed / 60000);
  const secs = Math.floor((elapsed % 60000) / 1000);
  const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;

  // Get last 90s of transcript
  const transcriptChunks = session.captions
    .filter(c => c.timestamp >= windowStart)
    .map(c => c.text)
    .join(' ');

  // Base alert
  const baseAlert = {
    id: uuidv4(),
    timestamp: now,
    timeStr,
    lostPercent: current.lost,
    jump: lostJump,
    questionSpike,
    mindMapNodeTitle: null,
    likelyTopic: null,
    studentDoubts: [],
    suggestion: null,
    llmPending: true,
  };

  session.alerts.push(baseAlert);
  io.to(`prof-${roomCode}`).emit('pivot-alert', baseAlert);

  // Fire Groq async
  if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'your_groq_api_key_here') {
    try {
      const analysis = await analyzeConfusion({
        transcript: transcriptChunks,
        lostPercent: current.lost,
        mindMapTitle: session.mindMapTree?.title || null,
        recentQuestions: session.questions.slice(-5),
      });
      Object.assign(baseAlert, analysis, { llmPending: false });
      io.to(`prof-${roomCode}`).emit('pivot-alert-enriched', baseAlert);
    } catch (err) {
      console.error('Groq alert error:', err.message);
      baseAlert.llmPending = false;
      baseAlert.suggestion = 'Pause and ask students what specifically is unclear.';
      io.to(`prof-${roomCode}`).emit('pivot-alert-enriched', baseAlert);
    }
  } else {
    // Fallback without Groq
    baseAlert.llmPending = false;
    baseAlert.likelyTopic = 'Recent concept from transcript';
    baseAlert.studentDoubts = ['How does this connect to previous material?', 'What does this term mean exactly?', 'Can you show a concrete example?'];
    baseAlert.suggestion = `${current.lost}% of students are lost. Pause and recap the last 2-3 minutes with a concrete example.`;
    io.to(`prof-${roomCode}`).emit('pivot-alert-enriched', baseAlert);
  }
}

// ── Comprehension Tick ───────────────────────────────────────────────────────
setInterval(() => {
  sessions.forEach((session, roomCode) => {
    if (session.endedAt || session.students.size === 0) return;
    const agg = getAggregatedComprehension(session);
    session.comprehensionLog.push(agg);
    if (session.comprehensionLog.length > 360) session.comprehensionLog.shift();
    io.to(`prof-${roomCode}`).emit('comprehension-update', agg);
    checkAndFireAlert(session, roomCode);
  });
}, 5000);

// ── REST: PDF Upload ─────────────────────────────────────────────────────────
app.post('/api/upload-pdf', upload.single('pdf'), async (req, res) => {
  const { roomCode } = req.body;
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    const data = await pdfParse(req.file.buffer);
    const text = data.text;

    const session = roomCode ? sessions.get(roomCode?.toUpperCase()) : null;
    if (session) session.pdfText = text;

    let mindMapTree = null;
    if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'your_groq_api_key_here') {
      mindMapTree = await generateMindMap(text);
    } else {
      // Demo fallback
      mindMapTree = {
        title: req.file.originalname.replace('.pdf', ''),
        children: [
          { title: 'Introduction', children: [{ title: 'Overview', children: [{ title: 'Key Terms', children: [] }] }, { title: 'Background', children: [] }] },
          { title: 'Core Concepts', children: [{ title: 'Fundamentals', children: [{ title: 'Principle 1', children: [] }, { title: 'Principle 2', children: [] }] }, { title: 'Applications', children: [{ title: 'Use Case A', children: [] }] }] },
          { title: 'Advanced Topics', children: [{ title: 'Deep Dive', children: [{ title: 'Method X', children: [] }] }] },
          { title: 'Summary', children: [{ title: 'Key Takeaways', children: [] }, { title: 'Further Reading', children: [] }] },
        ]
      };
    }

    if (session) {
      session.mindMapTree = mindMapTree;
      io.to(`prof-${roomCode?.toUpperCase()}`).emit('mindmap-ready', mindMapTree);
    }

    res.json({ success: true, mindMap: mindMapTree, pages: data.numpages });
  } catch (err) {
    console.error('PDF parse error:', err.message);
    res.status(500).json({ error: 'Failed to parse PDF: ' + err.message });
  }
});

// ── Post-Session Summary ─────────────────────────────────────────────────────
function generateSummary(session) {
  const log = session.comprehensionLog;
  const duration = session.endedAt - session.createdAt;
  const durationMins = Math.round(duration / 60000);

  const peakLost = [...log].sort((a, b) => b.lost - a.lost).slice(0, 5).map(e => {
    const elapsed = e.timestamp - session.createdAt;
    const mins = Math.floor(elapsed / 60000);
    const secs = Math.floor((elapsed % 60000) / 1000);
    const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;
    const captionAtTime = session.captions.find(c => Math.abs(c.timestamp - e.timestamp) < 15000);
    return { time: timeStr, lostPercent: e.lost, transcript: captionAtTime?.text || '' };
  });

  const avgFollowing = log.length ? Math.round(log.reduce((s, e) => s + e.following, 0) / log.length) : 0;
  const avgLost = log.length ? Math.round(log.reduce((s, e) => s + e.lost, 0) / log.length) : 0;
  const avgAhead = log.length ? Math.round(log.reduce((s, e) => s + e.ahead, 0) / log.length) : 0;
  const topQuestions = [...session.questions].sort((a, b) => b.upvotes - a.upvotes).slice(0, 10);

  return {
    duration: durationMins < 1 ? 'Less than 1 minute' : `${durationMins} minute${durationMins !== 1 ? 's' : ''}`,
    totalStudents: session.students.size,
    peakLostMoments: peakLost,
    topQuestions: topQuestions.map(q => ({ text: q.text, upvotes: q.upvotes, author: q.author })),
    averageComprehension: { following: avgFollowing, lost: avgLost, ahead: avgAhead },
    alerts: session.alerts,
    fullTranscript: session.captions,
    comprehensionLog: log,
    mindMapTree: session.mindMapTree || null,
  };
}

// ── Socket.IO ────────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`🔌 ${socket.id}`);

  socket.on('create-session', (callback) => {
    const roomCode = generateRoomCode();
    sessions.set(roomCode, {
      id: uuidv4(), roomCode,
      professorSocketId: socket.id,
      students: new Map(),
      comprehensionLog: [],
      questions: [],
      alerts: [],
      captions: [],
      pdfText: null,
      mindMapTree: null,
      settings: { anonymousQuestions: true },
      createdAt: Date.now(),
      endedAt: null,
      lastAlertTime: null,
    });
    socket.join(`prof-${roomCode}`);
    console.log(`📚 Session: ${roomCode}`);
    callback({ success: true, roomCode });
  });

  socket.on('join-session', ({ roomCode, name }, callback) => {
    const code = (roomCode || '').toUpperCase().trim();
    const session = sessions.get(code);
    if (!session) return callback({ success: false, error: 'Session not found. Check your room code.' });
    if (session.endedAt) return callback({ success: false, error: 'This session has already ended.' });

    session.students.set(socket.id, { id: socket.id, name: name || null, currentState: null, lastTapTime: null });
    socket.join(`room-${code}`);
    socket.roomCode = code;
    io.to(`prof-${code}`).emit('student-joined', { studentCount: session.students.size });

    const questions = session.questions.map(q => ({
      id: q.id, text: q.text, author: q.author, upvotes: q.upvotes, timestamp: q.timestamp, upvoted: q.upvotedBy.has(socket.id)
    }));
    callback({ success: true, settings: session.settings, questions, studentCount: session.students.size, captions: session.captions });
  });

  socket.on('comprehension-tap', ({ state }) => {
    const session = sessions.get(socket.roomCode);
    if (!session || session.endedAt) return;
    const student = session.students.get(socket.id);
    if (!student) return;
    student.currentState = state;
    student.lastTapTime = Date.now();
    const agg = getAggregatedComprehension(session);
    io.to(`prof-${socket.roomCode}`).emit('comprehension-update', agg);
  });

  socket.on('submit-question', ({ text }, callback) => {
    const session = sessions.get(socket.roomCode);
    if (!session || session.endedAt) return callback?.({ success: false });
    const student = session.students.get(socket.id);
    const question = {
      id: uuidv4(), text: text.trim(),
      author: session.settings.anonymousQuestions ? 'Anonymous' : (student?.name || 'Anonymous'),
      upvotes: 0, upvotedBy: new Set(), timestamp: Date.now()
    };
    session.questions.push(question);
    const q = { id: question.id, text: question.text, author: question.author, upvotes: 0, timestamp: question.timestamp };
    io.to(`room-${socket.roomCode}`).emit('new-question', q);
    io.to(`prof-${socket.roomCode}`).emit('new-question', q);
    callback?.({ success: true });
  });

  socket.on('upvote-question', ({ questionId }, callback) => {
    const session = sessions.get(socket.roomCode);
    if (!session) return callback?.({ success: false });
    const question = session.questions.find(q => q.id === questionId);
    if (!question) return callback?.({ success: false });
    if (question.upvotedBy.has(socket.id)) { question.upvotedBy.delete(socket.id); question.upvotes--; }
    else { question.upvotedBy.add(socket.id); question.upvotes++; }
    const update = { id: question.id, upvotes: question.upvotes, upvoted: question.upvotedBy.has(socket.id) };
    io.to(`room-${socket.roomCode}`).emit('question-upvoted', update);
    io.to(`prof-${socket.roomCode}`).emit('question-upvoted', update);
    callback?.({ success: true });
  });

  socket.on('toggle-anonymous', ({ enabled }, callback) => {
    let s = null;
    sessions.forEach(sess => { if (sess.professorSocketId === socket.id) s = sess; });
    if (!s) return callback?.({ success: false });
    s.settings.anonymousQuestions = enabled;
    io.to(`room-${s.roomCode}`).emit('settings-updated', s.settings);
    callback?.({ success: true });
  });

  // Live caption chunk from professor
  socket.on('caption-chunk', ({ text, timestamp }) => {
    let s = null;
    sessions.forEach((sess, code) => {
      if (sess.professorSocketId === socket.id) { s = sess; }
    });
    if (!s || !text?.trim()) return;
    const chunk = { text: text.trim(), timestamp: timestamp || Date.now() };
    s.captions.push(chunk);
    io.to(`prof-${s.roomCode}`).emit('caption-chunk', chunk);
    io.to(`room-${s.roomCode}`).emit('caption-chunk', chunk);
  });

  socket.on('end-session', (callback) => {
    let s = null; let code = null;
    sessions.forEach((sess, c) => { if (sess.professorSocketId === socket.id) { s = sess; code = c; } });
    if (!s) return callback?.({ success: false });
    s.endedAt = Date.now();
    io.to(`room-${code}`).emit('session-ended', { message: 'The session has ended. Thank you!' });
    callback?.({ success: true, summary: generateSummary(s) });
  });

  socket.on('disconnect', () => {
    const code = socket.roomCode;
    if (code) {
      const session = sessions.get(code);
      if (session) {
        session.students.delete(socket.id);
        io.to(`prof-${code}`).emit('student-left', { studentCount: session.students.size });
        if (session.students.size > 0 && !session.endedAt) {
          io.to(`prof-${code}`).emit('comprehension-update', getAggregatedComprehension(session));
        }
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`\n🎓 Classroom Pulse API → http://localhost:${PORT}\n`));
