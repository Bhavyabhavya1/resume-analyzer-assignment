const express = require('express');
const { pool } = require('../db');
const router = express.Router();

// GET all resumes (brief info)
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT id, name, email, original_filename, created_at
      FROM resumes
      ORDER BY created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching resume list:', err.message);
    res.status(500).json({ error: 'Failed to fetch resumes' });
  }
});

// GET single resume by ID (full data)
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.execute(`SELECT * FROM resumes WHERE id = ?`, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Resume not found' });

    // Parse CSV and JSON fields
    const row = rows[0];
    row.skills_technical = row.skills_technical?.split(',') || [];
    row.skills_soft = row.skills_soft?.split(',') || [];
    row.suggested_skills = row.suggested_skills?.split(',') || [];

    row.experience = JSON.parse(row.experience || '{}');
    row.education = JSON.parse(row.education || '{}');
    row.projects = JSON.parse(row.projects || '{}');
    row.certifications = JSON.parse(row.certifications || '{}');

    res.json(row);
  } catch (err) {
    console.error('Error fetching resume:', err.message);
    res.status(500).json({ error: 'Failed to fetch resume' });
  }
});

module.exports = router;
