const UserService = require('../services/userService');

class UserController {
  static async syncUser(req, res) {
    try {
      const { userId, email } = req.body;
      if (!userId) {
        return res.status(400).json({ message: 'User ID is required.' });
      }
      const user = await UserService.syncUser(userId, email);
      res.status(200).json({ message: 'User synced successfully.', user: { id: user.id, email: user.email } });
    } catch (error) {
      console.error('[UserController] Error syncing user:', error.message);
      res.status(500).json({ message: 'Failed to sync user.', error: error.message });
    }
  }

  static async getUserProfile(req, res) {
    try {
      const userId = req.params.id;
      const user = await UserService.getUserById(userId);
      res.status(200).json(user);
    } catch (error) {
      console.error('[UserController] Error getting user profile:', error.message);
      if (error.message === 'User not found.') {
        res.status(404).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Failed to retrieve user profile.', error: error.message });
      }
    }
  }

  static async addSavedJob(req, res) {
    try {
      const { userId } = req.params;
      const { jobId } = req.body;
      if (!userId || !jobId) {
        return res.status(400).json({ message: 'User ID and Job ID are required.' });
      }
      await UserService.addSavedJob(userId, jobId);
      res.status(201).json({ message: 'Job saved successfully.' });
    } catch (error) {
      console.error('[UserController] Error adding saved job:', error.message);
      res.status(500).json({ message: 'Failed to save job.', error: error.message });
    }
  }

  static async removeSavedJob(req, res) {
    try {
      const { userId, jobId } = req.params;
      if (!userId || !jobId) {
        return res.status(400).json({ message: 'User ID and Job ID are required.' });
      }
      await UserService.removeSavedJob(userId, jobId);
      res.status(200).json({ message: 'Job unsaved successfully.' });
    } catch (error) {
      console.error('[UserController] Error removing saved job:', error.message);
      res.status(500).json({ message: 'Failed to unsave job.', error: error.message });
    }
  }

  static async getSavedJobs(req, res) {
    try {
      const { userId } = req.params;
      if (!userId) {
        return res.status(400).json({ message: 'User ID is required.' });
      }
      const savedJobs = await UserService.getSavedJobs(userId);
      res.status(200).json(savedJobs);
    } catch (error) {
      console.error('[UserController] Error fetching saved jobs:', error.message);
      res.status(500).json({ message: 'Failed to retrieve saved jobs.', error: error.message });
    }
  }

  // --- New CV related controller methods ---
  static async uploadCV(req, res) {
    try {
      const { userId } = req.params;
      const { cvContent } = req.body; // Expect CV content as plain text
      if (!userId || !cvContent) {
        return res.status(400).json({ message: 'User ID and CV content are required.' });
      }
      const cv = await UserService.saveUserCV(userId, cvContent);
      res.status(200).json({ message: 'CV uploaded successfully.', cv });
    } catch (error) {
      console.error('[UserController] Error uploading CV:', error.message);
      res.status(500).json({ message: 'Failed to upload CV.', error: error.message });
    }
  }

  static async getCV(req, res) {
    try {
      const { userId } = req.params;
      if (!userId) {
        return res.status(400).json({ message: 'User ID is required.' });
      }
      const cvContent = await UserService.getUserCV(userId);
      if (cvContent === null) {
        return res.status(404).json({ message: 'CV not found for this user.' });
      }
      res.status(200).json({ cvContent });
    } catch (error) {
      console.error('[UserController] Error fetching CV:', error.message);
      res.status(500).json({ message: 'Failed to retrieve CV.', error: error.message });
    }
  }
}

module.exports = UserController;
