const Papa = require('papaparse');
const Job = require('../models/Job'); // This Job model uses db internally for create, find, isEmpty
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const db = require('../config/db'); // <-- IMPORTANT: Import db directly for custom queries

const csvFilePaths = [
  'data/myjob_scraped_data_20250709_213032.csv',
  'data/myjob_scraped_data_20250710_182758.csv',
  'data/myjob_scraped_data_20250711_220002.csv'
];

class JobService {
  static async readAndParseLocalCsv(filePath) {
    try {
      const absolutePath = path.join(__dirname, '../../', filePath);
      console.log(`[JobService] Attempting to read local CSV from: ${absolutePath}`);
      const csvText = await fs.readFile(absolutePath, 'utf8');
      const parsedData = Papa.parse(csvText, { header: true, skipEmptyLines: true }).data;
      console.log(`[JobService] Parsed ${parsedData.length} rows from ${filePath}. First row example:`, parsedData[0]);
      return parsedData;
    } catch (error) {
      console.error(`[JobService] Error reading or parsing local CSV ${filePath}:`, error.message);
      throw new Error(`Failed to process local CSV file: ${filePath}`);
    }
  }

  static async ingestCsvData() {
    try {
      const isJobsTableEmpty = await Job.isEmpty();
      if (!isJobsTableEmpty) {
        console.log('[JobService] Jobs table is not empty. Skipping CSV ingestion.');
        return { message: 'Jobs already ingested.' };
      }

      console.log('[JobService] Jobs table is empty. Starting CSV ingestion...');
      let allCombinedData = [];

      for (const filePath of csvFilePaths) {
        const data = await this.readAndParseLocalCsv(filePath);
        allCombinedData = [...allCombinedData, ...data];
      }

      console.log(`[JobService] Total rows combined from all CSVs: ${allCombinedData.length}`);

      const processedJobs = allCombinedData.map(job => {
        const getValue = (obj, keys) => {
          for (const key of keys) {
            const foundKey = Object.keys(obj).find(k => k.toLowerCase() === key.toLowerCase());
            if (foundKey && obj[foundKey] !== undefined && obj[foundKey] !== null) {
              return String(obj[foundKey]).trim();
            }
          }
          return '';
        };

        const jobTitle = getValue(job, ['JobTitle', 'job_title', 'Job Title', 'title']);
        const company = getValue(job, ['Company', 'company_name', 'Company Name']);
        const location = getValue(job, ['Location', 'location_name']);
        const jobType = getValue(job, ['JobType', 'job_type', 'Type']);
        const description = getValue(job, ['Description', 'description_text', 'Job Description']);
        const requirements = getValue(job, ['Requirements', 'job_requirements']);
        const howToApply = getValue(job, ['HowToApply', 'how_to_apply_instructions']);
        const sourceUrl = getValue(job, ['SourceURL', 'source_url', 'URL']);
        const closingDate = getValue(job, ['ClosingDate', 'closing_date', 'Close Date']);
        const postedDate = getValue(job, ['PostedDate', 'posted_date', 'Date Posted']);
        const salary = getValue(job, ['Salary', 'salary_range']);
        const experienceLevel = getValue(job, ['ExperienceLevel', 'experience_level']);
        const industry = getValue(job, ['Industry', 'industry_type']);
        const jobId = getValue(job, ['JobID', 'job_id', 'Job ID', 'id']);


        return {
          job_id: jobId || `generated-${crypto.randomUUID()}`,
          job_title: jobTitle || 'No Title',
          company: company || 'Unknown Company',
          location: location || 'Unknown Location',
          job_type: jobType || 'Full-time',
          description: description || 'No description provided.',
          requirements: requirements || 'No requirements listed.',
          how_to_apply: howToApply || 'Refer to source URL for application instructions.',
          source_url: sourceUrl || '#',
          closing_date: closingDate || '',
          posted_date: postedDate || '',
          salary: salary || '',
          experience_level: experienceLevel || '',
          industry: industry || ''
        };
      });

      const filteredJobs = processedJobs.filter(job => job.job_title && job.job_title !== 'No Title' && job.job_title.trim() !== '');

      const uniqueJobsMap = new Map();
      filteredJobs.forEach(job => {
        uniqueJobsMap.set(job.job_id, job);
      });
      const uniqueJobs = Array.from(uniqueJobsMap.values());

      console.log(`[JobService] Prepared ${uniqueJobs.length} unique jobs for ingestion after filtering and de-duplication.`);

      for (const job of uniqueJobs) {
        await Job.create(job);
      }

      console.log(`[JobService] Successfully ingested ${uniqueJobs.length} jobs into the database.`);
      return { message: `Successfully ingested ${uniqueJobs.length} jobs.` };

    } catch (error) {
      console.error('[JobService] Error during CSV ingestion process:', error);
      throw new Error('Failed to ingest job data.');
    }
  }

  // Method to get all jobs from the database with search and filter
  static async getAllJobs(filters = {}) {
    const { search, company, location, jobType } = filters;
    let query = 'SELECT * FROM jobs';
    const conditions = [];
    const values = [];
    let paramIndex = 1;

    // Build WHERE clause based on filters
    if (search) {
      const searchTerm = `%${search.toLowerCase()}%`;
      conditions.push(
        `(LOWER(job_title) LIKE $${paramIndex} OR ` +
        `LOWER(company) LIKE $${paramIndex} OR ` +
        `LOWER(description) LIKE $${paramIndex} OR ` +
        `LOWER(requirements) LIKE $${paramIndex})`
      );
      values.push(searchTerm);
      paramIndex++;
    }
    if (company) {
      conditions.push(`LOWER(company) = LOWER($${paramIndex})`);
      values.push(company);
      paramIndex++;
    }
    if (location) {
      conditions.push(`LOWER(location) = LOWER($${paramIndex})`);
      values.push(location);
      paramIndex++;
    }
    if (jobType) {
      conditions.push(`LOWER(job_type) = LOWER($${paramIndex})`);
      values.push(jobType);
      paramIndex++;
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created_at DESC;'; // Always order by creation date

    try {
      console.log(`[JobService] Executing SQL query: ${query} with values: ${values}`);
      // FIX: Changed Job.query to db.query
      const { rows } = await db.query(query, values); // <-- THIS IS THE FIX
      console.log(`[JobService] Fetched ${rows.length} jobs from database with filters.`);
      return rows;
    } catch (error) {
      console.error('[JobService] Error fetching jobs with filters from database:', error);
      throw new Error('Failed to retrieve jobs with specified criteria.');
    }
  }

  static async getJobById(jobId) {
    try {
      const job = await Job.findById(jobId);
      if (!job) {
        throw new Error('Job not found.');
      }
      console.log(`[JobService] Fetched job by ID: ${jobId}`);
      return job;
    } catch (error) {
      console.error(`[JobService] Error fetching job by ID ${jobId} from database:`, error);
      throw error;
    }
  }
}

module.exports = JobService;
