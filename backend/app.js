const express = require('express');
const mongoose = require('mongoose');
const Todo = require('./models/Todo');

// This file builds the Express app but does NOT call listen().
// server.js calls listen() for local development, and api/index.js
// exports the app for Vercel's serverless runtime.
const app = express();
app.use(express.json());

// Serverless functions start cold, so we connect lazily on the first
// /api request and reuse the connection while the function stays warm.
async function connectDB() {
  if (mongoose.connection.readyState === 1) return; // already connected
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not set');
  }
  await mongoose.connect(process.env.MONGODB_URI);
}

app.use('/api', async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    next(err);
  }
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

// List all todos, newest first
app.get('/api/todos', async (req, res, next) => {
  try {
    const todos = await Todo.find().sort({ createdAt: -1 });
    res.json(todos);
  } catch (err) {
    next(err);
  }
});

// Create a todo
app.post('/api/todos', async (req, res, next) => {
  try {
    const todo = await Todo.create({ title: req.body.title });
    res.status(201).json(todo);
  } catch (err) {
    next(err);
  }
});

// Update a todo's title and/or completed flag
app.patch('/api/todos/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }

    const update = {};
    if ('title' in req.body) update.title = req.body.title;
    if ('completed' in req.body) update.completed = Boolean(req.body.completed);

    const todo = await Todo.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    });
    if (!todo) return res.status(404).json({ error: 'Todo not found' });
    res.json(todo);
  } catch (err) {
    next(err);
  }
});

// Delete a todo
app.delete('/api/todos/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }
    const todo = await Todo.findByIdAndDelete(req.params.id);
    if (!todo) return res.status(404).json({ error: 'Todo not found' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// Unknown API routes get a JSON 404 instead of an HTML page
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Central error handler: any next(err) ends up here
app.use((err, req, res, next) => {
  const status = err.name === 'ValidationError' ? 400 : 500;
  if (status === 500) console.error(err);
  res.status(status).json({ error: err.message });
});

module.exports = app;
