import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import apiClient from './api/apiClient';
import { useFirebase } from './contexts/FireBaseContext'; // Corrected casing: FirebaseContext
import { XCircle, User as UserIcon } from 'lucide-react';

// Import our page components (these MUST exist as separate files in frontend/src/pages/)
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
  const { userId, isAuthReady, db } = useFirebase(); // Added db from useFirebase
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

  // Firestore app ID for user data
  // This is a Canvas-specific variable. For Render, it will default to 'default-app-id'.
  // We'll rely on Firebase security rules to manage user data.
  const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';


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

      // Use environment variable for API key in production builds
      const apiKey = process.env.REACT_APP_GEMINI_API_KEY;

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

          // Save AI recommendations to Firestore
          if (db && userId) {
            // Note: This path is for Firestore, which is separate from the PostgreSQL backend.
            // If you intend to store AI recommendations in PostgreSQL, you'd need a backend API route for it.
            // For now, it's set up for Firestore as per previous iterations.
            const userDocRef = doc(db, `artifacts/${appId}/users/${userId}/userData/profile`);
            await updateDoc(userDocRef, {
                aiRecommendations: parsedJson.recommendations || [],
                skillGaps: parsedJson.skillGaps || []
            });
          }
          showMessageBox("AI recommendations generated and saved!", "success");
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
  }, [userId, userCV, showMessageBox, db, appId]);

  // Effect to sync user with backend (PostgreSQL) and fetch user-specific data from Firestore
  useEffect(() => {
    if (!isAuthReady || !userId || !db || isFetchingUserData.current) {
      return;
    }

    isFetchingUserData.current = true;
    console.log("Firebase Auth Ready. Syncing user data. User ID:", userId);
    try {
        // Firestore user data path
        const userDocRef = doc(db, `artifacts/${appId}/users/${userId}/userData/profile`);

        // Listen for real-time updates to user data
        const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setUserCV(data.cv || '');
                // Ensure savedJobs are mapped correctly if coming from Firestore
                setSavedJobIds((data.savedJobs || []).map(job => job.job_id));
                setSavedJobsFull(data.savedJobs || []);
                setAiRecommendations(data.aiRecommendations || []);
                setSkillGaps(data.skillGaps || []);
                console.log("Fetched user data from Firestore.");
            } else {
                // Initialize user profile if it doesn't exist
                setDoc(userDocRef, { cv: '', savedJobs: [], aiRecommendations: [], skillGaps: [] }, { merge: true })
                    .then(() => console.log("User profile initialized in Firestore"))
                    .catch(error => console.error("Error initializing user profile in Firestore:", error));
            }
            // Only show initial sync notification if not already shown
            if (!initialSyncNotified.current) {
                showMessageBox("User session synced with backend.", "success");
                initialSyncNotified.current = true;
            }
        }, (error) => {
            console.error("Error listening to user data from Firestore:", error);
            showMessageBox("Failed to load user data from database. Please check your connection.", "error");
            initialSyncNotified.current = false; // Reset if sync fails
        });

        return () => unsubscribe(); // Cleanup listener
    } catch (err) {
      console.error("Error during initial user data fetch setup:", err);
      showMessageBox("Failed to setup user data fetch. Please try again later.", "error");
      initialSyncNotified.current = false;
    } finally {
      isFetchingUserData.current = false;
    }
  }, [isAuthReady, userId, db, showMessageBox, appId]); // Added db as dependency

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
