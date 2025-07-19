const express = require('express');
const router = express.Router();
const UserController = require('../controllers/userController');

// User Sync & Profile
router.post('/sync', UserController.syncUser);
router.get('/:id', UserController.getUserProfile);

// Saved Jobs Endpoints
router.post('/:userId/saved-jobs', UserController.addSavedJob);
router.delete('/:userId/saved-jobs/:jobId', UserController.removeSavedJob);
router.get('/:userId/saved-jobs', UserController.getSavedJobs);

// CV Endpoints
router.post('/:userId/cv', UserController.uploadCV); // Upload/Update CV
router.get('/:userId/cv', UserController.getCV);     // Get CV content

module.exports = router;
