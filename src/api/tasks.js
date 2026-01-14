const express = require('express');
const pool = require('../database');
const redis = require('../redis');

const router = express.Router();

// GET /api/tasks
router.get('/', async (req, res) => {
  try {
    const cacheKey = 'tasks:all';
    
    // Try cache first
    const cached = await redis.getFromCache(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    // Query database
    const result = await pool.query(
      'SELECT id, title, description, status, importance, created_at, updated_at FROM tasks ORDER BY created_at DESC LIMIT 100'
    );

    const tasks = result.rows;

    // Cache result
    await redis.setCache(cacheKey, JSON.stringify(tasks), 3600);

    res.json(tasks);
  } catch (err) {
    console.error('GET /tasks error:', err);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// POST /api/tasks
router.post('/', async (req, res) => {
  try {
    const { title, description, status, importance } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const result = await pool.query(
      'INSERT INTO tasks (title, description, status, importance) VALUES ($1, $2, $3, $4) RETURNING *',
      [title, description || null, status || 'pending', importance || 'normal']
    );

    // Invalidate cache
    await redis.setCache('tasks:all', null);

    res.status(201).json(result.rows);
  } catch (err) {
    console.error('POST /tasks error:', err);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// GET /api/tasks/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM tasks WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(result.rows);
  } catch (err) {
    console.error('GET /tasks/:id error:', err);
    res.status(500).json({ error: 'Failed to fetch task' });
  }
});

// PATCH /api/tasks/:id
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, status, importance } = req.body;

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(title);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description);
    }
    if (status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(status);
    }
    if (importance !== undefined) {
      updates.push(`importance = $${paramIndex++}`);
      values.push(importance);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const query = `UPDATE tasks SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Invalidate cache
    await redis.setCache('tasks:all', null);

    res.json(result.rows);
  } catch (err) {
    console.error('PATCH /tasks/:id error:', err);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// DELETE /api/tasks/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM tasks WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Invalidate cache
    await redis.setCache('tasks:all', null);

    res.json({ message: 'Task deleted', task: result.rows });
  } catch (err) {
    console.error('DELETE /tasks/:id error:', err);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

module.exports = router;
