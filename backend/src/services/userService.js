const User = require('../models/User'); // User model for saved jobs
const CV = require('../models/CV');     // CV model for CV content

class UserService {
  static async syncUser(userId, email = null) {
    try {
      const user = await User.findOrCreate(userId, email);
      console.log(`[UserService] User synced: ${user.id}`);
      return user;
    } catch (error) {
      console.error('[UserService] Error syncing user:', error);
      throw new Error('Failed to sync user with database.');
    }
  }

  static async getUserById(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found.');
      }
      console.log(`[UserService] Fetched user: ${user.id}`);
      return user;
    } catch (error) {
      console.error(`[UserService] Error fetching user ${userId}:`, error);
      throw error;
    }
  }

  static async updateUserDetails(userId, updates) {
    try {
      const updatedUser = await User.update(userId, updates);
      if (!updatedUser) {
        throw new Error('User not found or no updates provided.');
      }
      console.log(`[UserService] User updated: ${updatedUser.id}`);
      return updatedUser;
    } catch (error) {
      console.error(`[UserService] Error updating user ${userId}:`, error);
      throw error;
    }
  }

  static async addSavedJob(userId, jobId) {
    try {
      await User.addSavedJob(userId, jobId);
      console.log(`[UserService] Job ${jobId} saved for user ${userId}`);
      return { success: true };
    } catch (error) {
      console.error(`[UserService] Error saving job ${jobId} for user ${userId}:`, error);
      throw new Error('Failed to save job.');
    }
  }

  static async removeSavedJob(userId, jobId) {
    try {
      await User.removeSavedJob(userId, jobId);
      console.log(`[UserService] Job ${jobId} unsaved for user ${userId}`);
      return { success: true };
    } catch (error) {
      console.error(`[UserService] Error unsaving job ${jobId} for user ${userId}:`, error);
      throw new Error('Failed to unsave job.');
    }
  }

  static async getSavedJobs(userId) {
    try {
      const savedJobs = await User.getSavedJobs(userId);
      console.log(`[UserService] Fetched ${savedJobs.length} saved jobs for user ${userId}`);
      return savedJobs;
    } catch (error) {
      console.error(`[UserService] Error fetching saved jobs for user ${userId}:`, error);
      throw new Error('Failed to retrieve saved jobs.');
    }
  }

  // --- New CV related methods ---
  static async saveUserCV(userId, cvContent) {
    try {
      const cv = await CV.upsert(userId, cvContent); // Use CV model's upsert method
      console.log(`[UserService] CV saved for user ${userId}`);
      return cv;
    } catch (error) {
      console.error(`[UserService] Error saving CV for user ${userId}:`, error);
      throw new Error('Failed to save CV.');
    }
  }

  static async getUserCV(userId) {
    try {
      const cv = await CV.findByUserId(userId); // Use CV model's findByUserId method
      console.log(`[UserService] Fetched CV for user ${userId}`);
      return cv ? cv.cv_content : null; // Return only the content
    } catch (error) {
      console.error(`[UserService] Error fetching CV for user ${userId}:`, error);
      throw new Error('Failed to retrieve CV.');
    }
  }
}

module.exports = UserService;
