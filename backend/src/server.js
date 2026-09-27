import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
const httpServer = createServer(app);

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

app.use(cors({
  origin: process.env.FRONTEND_ORIGIN?.split(',') || '*'
}));
app.use(express.json());

const io = new Server(httpServer, {
  cors: { origin: '*' }
});

// -----------------------------------------------------------------------------
// Demo data layer
// Replace this with PostgreSQL later.
// -----------------------------------------------------------------------------

const users = [
  {
    id: 'u1',
    username: 'Shadow',
    email: 'shadow@example.com',
    avatar: 'https://i.pravatar.cc/150?img=12'
  },
  {
    id: 'u2',
    username: 'Vex',
    email: 'vex@example.com',
    avatar: 'https://i.pravatar.cc/150?img=32'
  }
];

const titles = [
  {
    id: 'm1',
    type: 'movie',
    title: 'Neon Horizon',
    year: 2026,
    rating: 8.7,
    genres: ['Sci-Fi', 'Mystery', 'Adventure'],
    runtime: 124,
    description: 'A group of teenagers discover a hidden layer of their city where reality behaves like a broken simulation.',
    poster: 'https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=500&q=80',
    backdrop: 'https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=1600&q=80',
    trailerUrl: '',
    media: {
      provider: 'authorized-placeholder',
      streamUrl: ''
    }
  },
  {
    id: 'm2',
    type: 'movie',
    title: 'The Last Signal',
    year: 2025,
    rating: 8.2,
    genres: ['Thriller', 'Mystery'],
    runtime: 111,
    description: 'A mysterious transmission arrives every midnight and appears to predict events before they happen.',
    poster: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=500&q=80',
    backdrop: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80',
    trailerUrl: '',
    media: { provider: 'authorized-placeholder', streamUrl: '' }
  },
  {
    id: 'm3',
    type: 'movie',
    title: 'Beyond the Gate',
    year: 2024,
    rating: 8.9,
    genres: ['Fantasy', 'Adventure'],
    runtime: 132,
    description: 'Four friends cross a strange gateway and find a world far larger than anything they imagined.',
    poster: 'https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=500&q=80',
    backdrop: 'https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=1600&q=80',
    trailerUrl: '',
    media: { provider: 'authorized-placeholder', streamUrl: '' }
  },
  {
    id: 's1',
    type: 'series',
    title: 'After Midnight',
    year: 2026,
    rating: 9.1,
    genres: ['Drama', 'Mystery', 'Supernatural'],
    runtime: 48,
    seasons: 2,
    description: 'Every night after midnight, one student remembers a different version of the same day.',
    poster: 'https://images.unsplash.com/photo-1533929736458-ca588d08c8be?auto=format&fit=crop&w=500&q=80',
    backdrop: 'https://images.unsplash.com/photo-1533929736458-ca588d08c8be?auto=format&fit=crop&w=1600&q=80',
    trailerUrl: '',
    media: { provider: 'authorized-placeholder', streamUrl: '' }
  }
];

const comments = [
  {
    id: 'c1',
    titleId: 'm1',
    user: 'Vex',
    avatar: 'https://i.pravatar.cc/100?img=32',
    text: 'That final reveal was insane.',
    likes: 24,
    createdAt: Date.now() - 3600000
  },
  {
    id: 'c2',
    titleId: 'm1',
    user: 'Shadow',
    avatar: 'https://i.pravatar.cc/100?img=12',
    text: 'The atmosphere carried this one.',
    likes: 17,
    createdAt: Date.now() - 7200000
  }
];

const history = new Map();
const watchLater = new Map();

function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    req.user = users[0];
    return next();
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function tokenFor(user) {
  return jwt.sign(
    { id: user.id, username: user.username, email: user.email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// -----------------------------------------------------------------------------
// Health
// -----------------------------------------------------------------------------

app.get('/api/health', (_, res) => {
  res.json({
    ok: true,
    service: 'shadow-stream-api',
    timestamp: new Date().toISOString()
  });
});

// -----------------------------------------------------------------------------
// Auth
// -----------------------------------------------------------------------------

app.post('/api/auth/login', (req, res) => {
  const { email, username } = req.body;

  const user = users.find(
    u => (email && u.email === email) || (username && u.username === username)
  ) || users[0];

  res.json({
    token: tokenFor(user),
    user
  });
});

app.get('/api/me', auth, (req, res) => {
  res.json({ user: req.user });
});

// -----------------------------------------------------------------------------
// Catalog
// -----------------------------------------------------------------------------

app.get('/api/catalog/home', (_, res) => {
  res.json({
    hero: titles[0],
    trending: titles,
    recommended: [...titles].reverse(),
    continueWatching: [
      { ...titles[1], progress: 0.63 },
      { ...titles[3], progress: 0.27 }
    ]
  });
});

app.get('/api/search', (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  if (!q) return res.json({ results: titles });

  const results = titles.filter(item =>
    item.title.toLowerCase().includes(q) ||
    item.genres.some(g => g.toLowerCase().includes(q))
  );

  res.json({ results });
});

app.get('/api/titles/:id', (req, res) => {
  const item = titles.find(t => t.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Title not found' });

  res.json({
    ...item,
    cast: [
      { name: 'Avery Stone', role: 'Alex' },
      { name: 'Mika Vale', role: 'Noah' },
      { name: 'Kai Rivers', role: 'Mason' }
    ],
    seasons: item.type === 'series'
      ? [
          { number: 1, episodes: 8 },
          { number: 2, episodes: 6 }
        ]
      : []
  });
});

// This endpoint deliberately returns provider metadata, not scraped media.
app.get('/api/titles/:id/stream', auth, (req, res) => {
  const item = titles.find(t => t.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Title not found' });

  res.json({
    titleId: item.id,
    provider: item.media.provider,
    streamUrl: item.media.streamUrl,
    message: item.media.streamUrl
      ? 'Authorized stream available.'
      : 'No media provider configured yet.'
  });
});

// -----------------------------------------------------------------------------
// Watch later / history
// -----------------------------------------------------------------------------

app.get('/api/watch-later', auth, (req, res) => {
  res.json({ results: watchLater.get(req.user.id) || [] });
});

app.post('/api/watch-later/:id', auth, (req, res) => {
  const item = titles.find(t => t.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Title not found' });

  const list = watchLater.get(req.user.id) || [];
  if (!list.some(x => x.id === item.id)) list.push(item);
  watchLater.set(req.user.id, list);

  res.json({ ok: true, results: list });
});

app.delete('/api/watch-later/:id', auth, (req, res) => {
  const list = watchLater.get(req.user.id) || [];
  const next = list.filter(x => x.id !== req.params.id);
  watchLater.set(req.user.id, next);
  res.json({ ok: true, results: next });
});

app.get('/api/history', auth, (req, res) => {
  res.json({ results: history.get(req.user.id) || [] });
});

app.post('/api/history', auth, (req, res) => {
  const { titleId, progress = 0 } = req.body;
  const item = titles.find(t => t.id === titleId);
  if (!item) return res.status(404).json({ error: 'Title not found' });

  const list = history.get(req.user.id) || [];
  const entry = { ...item, progress, updatedAt: Date.now() };
  const filtered = list.filter(x => x.id !== titleId);
  filtered.unshift(entry);
  history.set(req.user.id, filtered.slice(0, 50));

  res.json({ ok: true, results: history.get(req.user.id) });
});

// -----------------------------------------------------------------------------
// Comments
// -----------------------------------------------------------------------------

app.get('/api/titles/:id/comments', (req, res) => {
  res.json({
    comments: comments.filter(c => c.titleId === req.params.id)
  });
});

app.post('/api/titles/:id/comments', auth, (req, res) => {
  const text = String(req.body.text || '').trim();
  if (!text) return res.status(400).json({ error: 'Comment is empty' });

  const comment = {
    id: `c${Date.now()}`,
    titleId: req.params.id,
    user: req.user.username,
    avatar: req.user.avatar || 'https://i.pravatar.cc/100?img=12',
    text,
    likes: 0,
    createdAt: Date.now()
  };

  comments.unshift(comment);
  res.status(201).json({ comment });
});

// -----------------------------------------------------------------------------
// Friends
// -----------------------------------------------------------------------------

app.get('/api/friends', auth, (_, res) => {
  res.json({
    friends: [
      { id: 'u2', username: 'Vex', online: true, avatar: users[1].avatar }
    ],
    requests: []
  });
});

// -----------------------------------------------------------------------------
// Notifications
// -----------------------------------------------------------------------------

app.get('/api/notifications', auth, (_, res) => {
  res.json({
    notifications: [
      { id: 'n1', text: 'Vex is online.', read: false },
      { id: 'n2', text: 'Your watch party is ready.', read: false }
    ]
  });
});

// -----------------------------------------------------------------------------
// Watch party WebSocket
// -----------------------------------------------------------------------------

const rooms = new Map();

io.on('connection', socket => {
  socket.on('join-room', ({ roomId, username }) => {
    socket.join(roomId);

    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        host: username || 'Host',
        position: 0,
        playing: false,
        updatedAt: Date.now()
      });
    }

    socket.emit('room-state', rooms.get(roomId));
  });

  socket.on('player-event', ({ roomId, event }) => {
    if (!rooms.has(roomId)) return;

    const state = rooms.get(roomId);
    Object.assign(state, event, { updatedAt: Date.now() });
    rooms.set(roomId, state);

    socket.to(roomId).emit('player-sync', state);
  });

  socket.on('room-chat', ({ roomId, username, text }) => {
    if (!text?.trim()) return;
    io.to(roomId).emit('room-chat', {
      username: username || 'Guest',
      text: text.trim(),
      createdAt: Date.now()
    });
  });
});

httpServer.listen(PORT, () => {
  console.log(`Shadow Stream API running on port ${PORT}`);
});
