import axios from 'axios';

// Create an Axios instance with a base URL for your backend API
const apiClient = axios.create({
  baseURL: 'http://localhost:5000/api', // Your backend API base URL
  headers: {
    'Content-Type': 'application/json',
  },
});

export default apiClient;
