const express = require('express');
const router = express.Router();
const JobController = require('../controllers/jobController');

// GET all jobs
router.get('/', JobController.getAllJobs);

// GET a single job by ID
router.get('/:id', JobController.getJobById);

// POST endpoint to trigger CSV data ingestion (for initial setup)
router.post('/ingest', JobController.triggerJobIngestion);

module.exports = router;
