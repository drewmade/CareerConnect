import axios from 'axios';

// IMPORTANT: For production deployment on Render, this URL MUST point to your live backend service.
// You can also use an environment variable (e.g., process.env.REACT_APP_BACKEND_URL)
// if your hosting platform supports injecting it during the frontend build.
// For Render, you'll set an environment variable when creating the static site.
const API_BASE_URL = 'https://careerconnect-backend-pa5m.onrender.com/api'; // <--- Update this line with your LIVE Render Backend URL + /api

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default apiClient;
