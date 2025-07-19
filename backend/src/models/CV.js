const db = require('../config/db');

// Model for interacting with the 'user_cvs' table
class CV {
  // Create or update a user's CV
  static async upsert(userId, cvContent, fileName = null, fileType = null) {
    const query = `
      INSERT INTO user_cvs (user_id, cv_content, file_name, file_type)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id) DO UPDATE SET
        cv_content = EXCLUDED.cv_content,
        file_name = EXCLUDED.file_name,
        file_type = EXCLUDED.file_type,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `;
    const values = [userId, cvContent, fileName, fileType];

    try {
      const { rows } = await db.query(query, values);
      return rows[0];
    } catch (error) {
      console.error('Error upserting CV:', error);
      throw error;
    }
  }

  // Get a user's CV by user ID
  static async findByUserId(userId) {
    const query = 'SELECT * FROM user_cvs WHERE user_id = $1;';
    try {
      const { rows } = await db.query(query, [userId]);
      return rows[0];
    } catch (error) {
      console.error('Error fetching CV by user ID:', error);
      throw error;
    }
  }
}

module.exports = CV;
