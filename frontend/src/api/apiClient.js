import axios from 'axios';

// IMPORTANT: This URL MUST point to your live Render backend service.
const API_BASE_URL = 'https://careerconnect-backend-pa5m.onrender.com/api'; // <--- CONFIRM THIS IS YOUR LIVE BACKEND URL

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default apiClient;
