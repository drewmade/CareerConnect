import React, { useState, useEffect, useRef, useCallback } from 'react'; // Added useCallback
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import apiClient from './api/apiClient';
import { useFirebase } from './contexts/FirebaseContext';
import { XCircle, User as UserIcon } from 'lucide-react';

// Import our page components
import JobListPage from './pages/JobListPage';
import UserDashboardPage from './pages/UserDashboardPage';
import JobDetailPage from './pages/JobDetailPage';

// --- Global Message Box Component ---
const MessageBox = ({ message, type, onClose }) => {
  if (!message) return null;
  const bgColor = type === 'error' ? 'bg-red-100 border-red-400 text-red-700' : 'bg-green-100 border-green-400 text-green-700';
  const borderColor = type === 'error' ? 'border-red-500' : 'border-green-500';

  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 p-4 rounded-md shadow-lg ${bgColor} border ${borderColor} flex items-center justify-between`}>
      <p className="text-sm font-medium">{message}</p>
      <button onClick={onClose} className="ml-4 text-gray-500 hover:text-gray-700 focus:outline-none">
        <XCircle size={20} />
      </button>
    </div>
  );
};

// --- Main App Component ---
function App() {
  const { userId, isAuthReady } = useFirebase();
  const [message, setMessage] = useState(null);
  const [messageType, setMessageType] = useState('success');
  const [savedJobIds, setSavedJobIds] = useState([]); // Stores only IDs for quick lookup
  const [savedJobsFull, setSavedJobsFull] = useState([]); // Stores full job objects for dashboard display
  const [userCV, setUserCV] = useState(''); // New state for user CV
  const [aiRecommendations, setAiRecommendations] = useState([]); // State for AI recommendations
  const [skillGaps, setSkillGaps] = useState([]); // State for skill gaps
  const [isGeneratingAI, setIsGeneratingAI] = useState(false); // Loading state for AI generation
  const location = useLocation();
  const navigate = useNavigate();

  const initialSyncNotified = useRef(false);
  const isFetchingUserData = useRef(false); // New ref to prevent multiple fetches

  const showMessageBox = useCallback((msg, type = 'success') => { // Memoize showMessageBox
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(null), 5000);
  }, []); // Empty dependency array means this function is stable

  const handleSelectJob = useCallback((jobId) => { // Memoize handleSelectJob
    navigate(`/jobs/${jobId}`);
  }, [navigate]);

  const handleSaveToggle = useCallback(async (jobId) => { // Memoize handleSaveToggle
    if (!userId) {
      showMessageBox("Please log in to save jobs.", "error");
      return;
    }

    const isCurrentlySaved = savedJobIds.includes(jobId);
    try {
      if (isCurrentlySaved) {
        await apiClient.delete(`/users/${userId}/saved-jobs/${jobId}`);
        setSavedJobIds(prev => prev.filter(id => id !== jobId));
        showMessageBox("Job unsaved successfully!", "success");
      } else {
        await apiClient.post(`/users/${userId}/saved-jobs`, { jobId });
        setSavedJobIds(prev => [...prev, jobId]);
        showMessageBox("Job saved successfully!", "success");
      }
      // Re-fetch full saved jobs after toggle to update dashboard
      if (userId && isAuthReady) {
          const savedJobsResponse = await apiClient.get(`/users/${userId}/saved-jobs`);
          setSavedJobsFull(savedJobsResponse.data);
      }
    } catch (error) {
      console.error("Error toggling saved job status:", error);
      showMessageBox("Failed to update saved job status. Please try again.", "error");
    }
  }, [userId, savedJobIds, showMessageBox, isAuthReady]); // Dependencies for handleSaveToggle

  // Handler for saving CV
  const handleSaveCV = useCallback(async (cvContent) => {
    if (!userId) {
      showMessageBox("Please log in to save your CV.", "error");
      return;
    }
    try {
      await apiClient.post(`/users/${userId}/cv`, { cvContent });
      setUserCV(cvContent); // Update displayed CV
      showMessageBox("CV saved successfully!", "success");
    } catch (error) {
      console.error("Error saving CV:", error);
      showMessageBox("Failed to save CV. Please try again.", "error");
    }
  }, [userId, showMessageBox]);

  // Handler for generating AI recommendations
  const handleGenerateAI = useCallback(async () => {
    if (!userId || !userCV) {
      showMessageBox("Please log in and upload your CV to generate recommendations.", "error");
      return;
    }
    setIsGeneratingAI(true);
    showMessageBox("Generating AI recommendations...", "info");

    try {
      // Fetch all jobs to send to AI for context
      const allJobsResponse = await apiClient.get('/jobs');
      const allJobs = allJobsResponse.data;

      const prompt = `Given the following user CV and a list of job descriptions, please perform two tasks:
      1. Identify 5-10 job titles from the provided job descriptions that are most relevant to the user's CV. List them clearly.
      2. Identify 3-5 key skills mentioned in the job descriptions that the user's CV appears to lack, but would be beneficial for the recommended jobs. List these skills.

      User CV:
      ${userCV}

      Job Descriptions (Title, Company, Description, Requirements):
      ${allJobs.map(job => `Title: ${job.job_title}\nCompany: ${job.company}\nDescription: ${job.description}\nRequirements: ${job.requirements}`).join('\n\n---\n\n')}

      Please format your response as a JSON object with two arrays: "recommendations" (for job titles) and "skillGaps" (for skills).
      Example:
      {
        "recommendations": ["Job Title 1", "Job Title 2"],
        "skillGaps": ["Skill A", "Skill B"]
      }`;

      let chatHistory = [];
      chatHistory.push({ role: "user", parts: [{ text: prompt }] });

      const payload = {
          contents: chatHistory,
          generationConfig: {
              responseMimeType: "application/json",
              responseSchema: {
                  type: "OBJECT",
                  properties: {
                      "recommendations": { "type": "ARRAY", "items": { "type": "STRING" } },
                      "skillGaps": { "type": "ARRAY", "items": { "type": "STRING" } }
                  },
                  "propertyOrdering": ["recommendations", "skillGaps"]
              }
          }
      };

      // --- TEMPORARY: REPLACE WITH YOUR ACTUAL GEMINI API KEY FOR LOCAL TESTING ---
      const apiKey = ""; // <-- REPLACE THIS LINE
      // --- REMEMBER TO CHANGE THIS BACK TO "" BEFORE DEPLOYING TO CANVAS ---

      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

      const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (result.candidates && result.candidates.length > 0 &&
          result.candidates[0].content && result.candidates[0].content.parts &&
          result.candidates[0].content.parts.length > 0) {
          const jsonString = result.candidates[0].content.parts[0].text;
          const parsedJson = JSON.parse(jsonString);

          setAiRecommendations(parsedJson.recommendations || []);
          setSkillGaps(parsedJson.skillGaps || []);
          showMessageBox("AI recommendations generated!", "success");
      } else {
          console.error("Unexpected API response structure:", result);
          showMessageBox("Failed to generate AI recommendations. Unexpected response.", "error");
      }
    } catch (error) {
      console.error("Error generating AI recommendations:", error);
      showMessageBox("Failed to generate AI recommendations. Please try again later.", "error");
    } finally {
      setIsGeneratingAI(false);
    }
  }, [userId, userCV, showMessageBox]);


  // Effect to sync user with backend (PostgreSQL) and fetch user-specific data
  useEffect(() => {
    const syncUserAndFetchUserData = async () => {
      if (!isAuthReady || !userId || isFetchingUserData.current) {
        return;
      }

      isFetchingUserData.current = true;
      console.log("Firebase Auth Ready. Syncing user with backend. User ID:", userId);
      try {
        const userSyncResponse = await apiClient.post('/users/sync', { userId });
        console.log("User synced with backend:", userSyncResponse.data);

        if (!initialSyncNotified.current) {
          showMessageBox("User session synced with backend.", "success");
          initialSyncNotified.current = true;
        }

        // Fetch saved jobs
        const savedJobsResponse = await apiClient.get(`/users/${userId}/saved-jobs`);
        setSavedJobIds(savedJobsResponse.data.map(job => job.job_id)); // Store only IDs
        setSavedJobsFull(savedJobsResponse.data); // Store full objects for dashboard
        console.log("Fetched saved jobs for user:", savedJobsResponse.data.length);

        // Fetch user CV
        const userCVResponse = await apiClient.get(`/users/${userId}/cv`);
        setUserCV(userCVResponse.data.cvContent || '');
        console.log("Fetched user CV:", userCVResponse.data.cvContent ? "exists" : "none");

      } catch (err) {
        console.error("Error syncing user or fetching user data with backend:", err);
        showMessageBox("Failed to sync user session or load user data with backend.", "error");
        initialSyncNotified.current = false;
      } finally {
        isFetchingUserData.current = false;
      }
    };

    syncUserAndFetchUserData();
  }, [isAuthReady, userId, showMessageBox]);

  return (
    <div className="min-h-screen bg-gray-100 font-sans antialiased">
      <MessageBox message={message} type={messageType} onClose={() => setMessage(null)} />

      {/* Header */}
      <header className="bg-white shadow-sm py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-600">CareerConnect</h1>
          <nav>
            <ul className="flex space-x-6">
              <li>
                <Link
                  to="/jobs"
                  className={`text-gray-700 hover:text-blue-600 font-medium ${location.pathname.startsWith('/jobs') ? 'border-b-2 border-blue-600 text-blue-600' : ''}`}
                >
                  Jobs
                </Link>
              </li>
              <li>
                <Link
                  to="/dashboard"
                  className={`text-gray-700 hover:text-blue-600 font-medium ${location.pathname === '/dashboard' ? 'border-b-2 border-blue-600 text-blue-600' : ''}`}
                >
                  Dashboard
                </Link>
              </li>
              <li>
                <span className="text-gray-500 text-sm flex items-center">
                  <UserIcon size={16} className="mr-1" /> {userId ? `Logged In: ${userId.substring(0, 8)}...` : 'Logging In...'}
                </span>
              </li>
            </ul>
          </nav>
        </div>
      </header>

      {/* Main Content Area with Routes */}
      <main>
        <Routes>
          <Route
            path="/"
            element={
              <JobListPage
                showMessageBox={showMessageBox}
                onSelectJob={handleSelectJob}
                onSaveToggle={handleSaveToggle}
                savedJobs={savedJobIds}
              />
            }
          />
          <Route
            path="/jobs"
            element={
              <JobListPage
                showMessageBox={showMessageBox}
                onSelectJob={handleSelectJob}
                onSaveToggle={handleSaveToggle}
                savedJobs={savedJobIds}
              />
            }
          />
          <Route
            path="/jobs/:id"
            element={
              <JobDetailPage
                showMessageBox={showMessageBox}
                onSaveToggle={handleSaveToggle}
                isSaved={savedJobIds.includes(location.pathname.split('/').pop())}
              />
            }
          />
          <Route
            path="/dashboard"
            element={
              <UserDashboardPage
                showMessageBox={showMessageBox}
                userCV={userCV}
                onSaveCV={handleSaveCV}
                savedJobs={savedJobsFull}
                onSelectJob={handleSelectJob}
                onUnsaveJob={handleSaveToggle}
                aiRecommendations={aiRecommendations}
                skillGaps={skillGaps}
                onGenerateAI={handleGenerateAI} // Pass the AI generation handler
                isGeneratingAI={isGeneratingAI} // Pass the AI loading state
              />
            }
          />
          {/* We'll add a 404 Not Found page here later */}
        </Routes>
      </main>
    </div>
  );
}

// Wrap App with Router
const Root = () => (
  <Router>
    <App />
  </Router>
);

export default Root;
