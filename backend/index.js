const express = require('express');
const cors = require('cors');
require('dotenv').config();

const analyzeRoutes = require('./routes/analyze');
const resumeRoutes = require('./routes/resumes');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/analyze-resume', analyzeRoutes);
app.use('/api/resumes', resumeRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
