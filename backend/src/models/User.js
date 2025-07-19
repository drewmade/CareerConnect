const db = require('../config/db');

// Model for interacting with the 'users' and 'saved_jobs' tables
class User {
  // Create or find a user. This is important for Firebase UID integration.
  static async findOrCreate(userId, email = null) {
    try {
      let query = 'SELECT * FROM users WHERE id = $1;';
      let { rows } = await db.query(query, [userId]);

      if (rows.length > 0) {
        return rows[0]; // User found
      } else {
        query = `
          INSERT INTO users (id, email)
          VALUES ($1, $2)
          ON CONFLICT (id) DO NOTHING
          RETURNING *;
        `;
        const { rows: newRows } = await db.query(query, [userId, email]);
        return newRows[0]; // Return the newly created user
      }
    } catch (error) {
      console.error('Error finding or creating user:', error);
      throw error;
    }
  }

  // Get a user by ID
  static async findById(userId) {
    const query = 'SELECT * FROM users WHERE id = $1;';
    try {
      const { rows } = await db.query(query, [userId]);
      return rows[0];
    } catch (error) {
      console.error('Error fetching user by ID:', error);
      throw error;
    }
  }

  // Update user information (e.g., email)
  static async update(userId, updates) {
    const setClauses = [];
    const values = [userId];
    let paramIndex = 2;

    for (const key in updates) {
      if (updates.hasOwnProperty(key)) {
        setClauses.push(`${key} = $${paramIndex}`);
        values.push(updates[key]);
        paramIndex++;
      }
    }

    if (setClauses.length === 0) {
      return null;
    }

    const query = `
      UPDATE users
      SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *;
    `;

    try {
      const { rows } = await db.query(query, values);
      return rows[0];
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  // Add a job to a user's saved jobs
  static async addSavedJob(userId, jobId) {
    const query = `
      INSERT INTO saved_jobs (user_id, job_id)
      VALUES ($1, $2)
      ON CONFLICT (user_id, job_id) DO NOTHING; -- Do nothing if already saved
    `;
    try {
      await db.query(query, [userId, jobId]);
      return { success: true };
    } catch (error) {
      console.error('Error adding saved job:', error);
      throw error;
    }
  }

  // Remove a job from a user's saved jobs
  static async removeSavedJob(userId, jobId) {
    const query = `
      DELETE FROM saved_jobs
      WHERE user_id = $1 AND job_id = $2;
    `;
    try {
      await db.query(query, [userId, jobId]);
      return { success: true };
    } catch (error) {
      console.error('Error removing saved job:', error);
      throw error;
    }
  }

  // Get all saved jobs for a user
  static async getSavedJobs(userId) {
    // Join with the jobs table to get full job details
    const query = `
      SELECT j.*
      FROM jobs j
      JOIN saved_jobs sj ON j.job_id = sj.job_id
      WHERE sj.user_id = $1
      ORDER BY sj.saved_at DESC;
    `;
    try {
      const { rows } = await db.query(query, [userId]);
      return rows;
    } catch (error) {
      console.error('Error fetching saved jobs:', error);
      throw error;
    }
  }
}

module.exports = User;
