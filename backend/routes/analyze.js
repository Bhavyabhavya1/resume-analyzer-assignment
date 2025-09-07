const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const fs = require('fs');
const axios = require('axios');
const { pool } = require('../db');
const router = express.Router();

const upload = multer({ dest: 'uploads/' });

router.post('/', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const dataBuffer = fs.readFileSync(filePath);
    const parsed = await pdfParse(dataBuffer);
    const resumeText = parsed.text;

    console.log('Parsed Resume Text: ', resumeText.slice(0, 300)); // First 300 chars

    const geminiRes = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts: [
              {
                text: `Extract this resume into the following JSON:
{
  personalDetails: { name, email, phone, linkedin },
  summary,
  experience,
  education,
  projects,
  certifications,
  skills: { technical, soft },
  rating,
  feedback,
  suggestedSkills
}
Resume:
${resumeText}`
              }
            ]
          }
        ]
      }
    );

    const raw = geminiRes.data?.candidates?.[0]?.content?.parts?.[0]?.text;

    console.log('Gemini Raw Output:', raw);

    if (!raw) {
      throw new Error('Gemini returned empty or malformed response');
    }

    let extracted;
    try {
      extracted = JSON.parse(raw);
    } catch (jsonErr) {
      console.error('JSON parse error:', jsonErr.message);
      return res.status(500).json({ error: 'Failed to parse Gemini response. Please try another resume.' });
    }

    // Validate required fields before DB insert
    if (!extracted.personalDetails || !extracted.personalDetails.name) {
      return res.status(400).json({ error: 'Incomplete data returned from AI' });
    }

    const {
      personalDetails, summary, experience, education,
      projects, certifications, skills, rating, feedback, suggestedSkills
    } = extracted;

    const sql = `
      INSERT INTO resumes (
        name, email, phone, linkedin, summary, experience, education,
        projects, certifications, skills_technical, skills_soft,
        rating, feedback, suggested_skills, original_filename
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      personalDetails.name || '',
      personalDetails.email || '',
      personalDetails.phone || '',
      personalDetails.linkedin || '',
      summary || '',
      JSON.stringify(experience || {}),
      JSON.stringify(education || {}),
      JSON.stringify(projects || {}),
      JSON.stringify(certifications || {}),
      (skills?.technical || []).join(','),
      (skills?.soft || []).join(','),
      rating || 0,
      feedback || '',
      (suggestedSkills || []).join(','),
      req.file.originalname
    ];

    await pool.execute(sql, values);

    fs.unlinkSync(filePath);
    res.json({ message: 'Resume analyzed and saved successfully.' });

  } catch (err) {
    console.error('Server Error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to analyze resume' });
  }
});


module.exports = router;
