const db = require('../config/db');

// Model for interacting with the 'jobs' table
class Job {
  // Insert a single job into the database
  static async create(jobData) {
    const {
      job_id, job_title, company, location, job_type,
      description, requirements, how_to_apply, source_url,
      closing_date, posted_date, salary, experience_level, industry
    } = jobData;

    const query = `
      INSERT INTO jobs (
        job_id, job_title, company, location, job_type,
        description, requirements, how_to_apply, source_url,
        closing_date, posted_date, salary, experience_level, industry
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (job_id) DO UPDATE SET
        job_title = EXCLUDED.job_title,
        company = EXCLUDED.company,
        location = EXCLUDED.location,
        job_type = EXCLUDED.job_type,
        description = EXCLUDED.description,
        requirements = EXCLUDED.requirements,
        how_to_apply = EXCLUDED.how_to_apply,
        source_url = EXCLUDED.source_url,
        closing_date = EXCLUDED.closing_date,
        posted_date = EXCLUDED.posted_date,
        salary = EXCLUDED.salary,
        experience_level = EXCLUDED.experience_level,
        industry = EXCLUDED.industry,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `;
    const values = [
      job_id, job_title, company, location, job_type,
      description, requirements, how_to_apply, source_url,
      closing_date, posted_date, salary, experience_level, industry
    ];

    try {
      const { rows } = await db.query(query, values);
      return rows[0];
    } catch (error) {
      console.error('Error creating/updating job:', error);
      throw error;
    }
  }

  // Get all jobs from the database
  static async findAll() {
    const query = 'SELECT * FROM jobs ORDER BY created_at DESC;';
    try {
      const { rows } = await db.query(query);
      return rows;
    } catch (error) {
      console.error('Error fetching all jobs:', error);
      throw error;
    }
  }

  // Get a job by its ID
  static async findById(jobId) {
    const query = 'SELECT * FROM jobs WHERE job_id = $1;';
    try {
      const { rows } = await db.query(query, [jobId]);
      return rows[0];
    } catch (error) {
      console.error('Error fetching job by ID:', error);
      throw error;
    }
  }

  // Check if jobs table is empty
  static async isEmpty() {
    const query = 'SELECT COUNT(*) FROM jobs;';
    try {
      const { rows } = await db.query(query);
      return parseInt(rows[0].count) === 0;
    } catch (error) {
      console.error('Error checking if jobs table is empty:', error);
      throw error;
    }
  }
}

module.exports = Job;
