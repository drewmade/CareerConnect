const JobService = require('../services/jobService');

class JobController {
  // Controller method to get all jobs with search and filter capabilities
  static async getAllJobs(req, res) {
    try {
      // Extract query parameters for search and filters
      const { search, company, location, jobType } = req.query;
      const filters = { search, company, location, jobType };

      const jobs = await JobService.getAllJobs(filters); // Pass filters to the service
      res.status(200).json(jobs);
    } catch (error) {
      console.error('[JobController] Error getting all jobs:', error.message);
      res.status(500).json({ message: 'Failed to retrieve jobs.', error: error.message });
    }
  }

  // Controller method to get a single job by ID
  static async getJobById(req, res) {
    try {
      const { id } = req.params; // Get job ID from URL parameters
      const job = await JobService.getJobById(id);
      res.status(200).json(job);
    } catch (error) {
      console.error(`[JobController] Error getting job by ID ${req.params.id}:`, error.message);
      if (error.message === 'Job not found.') {
        res.status(404).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Failed to retrieve job details.', error: error.message });
      }
    }
  }

  // Controller method to trigger CSV data ingestion
  static async triggerJobIngestion(req, res) {
    try {
      const result = await JobService.ingestCsvData();
      res.status(200).json({ message: result.message || 'Job data ingestion process initiated.' });
    } catch (error) {
      console.error('[JobController] Error triggering job ingestion:', error.message);
      res.status(500).json({ message: 'Failed to initiate job data ingestion.', error: error.message });
    }
  }
}

module.exports = JobController;
