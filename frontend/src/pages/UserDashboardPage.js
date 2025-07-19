import React, { useState, useEffect } from 'react';
import { useFirebase } from '../contexts/FirebaseContext';
import apiClient from '../api/apiClient'; // Import apiClient
import { Upload, Lightbulb, XCircle } from 'lucide-react'; // Added Upload, Lightbulb, XCircle icons

const UserDashboardPage = ({ showMessageBox, savedJobs, onSelectJob, onUnsaveJob, userCV, onSaveCV, aiRecommendations, skillGaps, onGenerateAI, isGeneratingAI }) => {
  const { userId, isAuthReady } = useFirebase();
  // userCV is now a prop, so we don't need local state for it here:
  // const [userCV, setUserCV] = useState('');
  const [cvInput, setCvInput] = useState(''); // State for the textarea input
  const [showCVEditor, setShowCVEditor] = useState(false);
  // AI related states are now props:
  // const [aiRecommendations, setAiRecommendations] = useState([]);
  // const [skillGaps, setSkillGaps] = useState([]);
  // const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  // Initialize cvInput with the prop userCV when it changes
  useEffect(() => {
    setCvInput(userCV);
  }, [userCV]);

  // Fetch user CV when userId is available (this logic is now handled in App.js)
  // useEffect(() => {
  //   const fetchUserCV = async () => {
  //     if (isAuthReady && userId) {
  //       try {
  //         const response = await apiClient.get(`/users/${userId}/cv`);
  //         setUserCV(response.data.cvContent || '');
  //         setCvInput(response.data.cvContent || ''); // Initialize input with fetched CV
  //         showMessageBox("User CV loaded.", "success");
  //       } catch (err) {
  //         if (err.response && err.response.status === 404) {
  //           console.log("No CV found for this user.");
  //           setUserCV('');
  //           setCvInput('');
  //         } else {
  //           console.error("Error fetching user CV:", err);
  //           showMessageBox("Failed to load user CV.", "error");
  //         }
  //       }
  //     }
  //   };
  //   fetchUserCV();
  // }, [isAuthReady, userId, showMessageBox]);

  const handleSaveClick = () => {
    onSaveCV(cvInput); // Call the prop function to save CV
    setShowCVEditor(false); // Hide editor after saving
  };

  // handleGenerateAI is now a prop
  // const handleGenerateAI = async () => {
  //   showMessageBox("AI recommendation generation coming soon!", "info");
  // };

  if (!isAuthReady) {
    return (
      <div className="p-8 text-center text-gray-600">
        <p>Loading user session...</p>
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">Your Dashboard</h2>
        <p className="text-center text-gray-600 mb-8">User ID: <span className="font-mono bg-gray-200 px-2 py-1 rounded text-sm">{userId || 'Loading...'}</span></p>

        {/* CV Management */}
        <div className="bg-white p-6 rounded-xl shadow-md mb-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-2xl font-semibold text-gray-800">Your CV</h3>
            <button
              onClick={() => setShowCVEditor(!showCVEditor)}
              className="bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors duration-300 flex items-center"
            >
              <Upload size={18} className="mr-2" /> {showCVEditor ? 'Hide Editor' : (userCV ? 'Edit CV' : 'Upload CV')}
            </button>
          </div>
          {showCVEditor ? (
            <>
              <textarea
                className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4 h-64 resize-y"
                placeholder="Paste your CV content here (e.g., skills, experience, education)..."
                value={cvInput}
                onChange={(e) => setCvInput(e.target.value)}
              ></textarea>
              <button
                onClick={handleSaveClick}
                className="bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition-colors duration-300"
              >
                Save CV
              </button>
            </>
          ) : (
            userCV ? (
              <div className="prose max-w-none text-gray-700 bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h4 className="font-semibold mb-2">Current CV Content:</h4>
                <p className="whitespace-pre-wrap">{userCV}</p>
              </div>
            ) : (
              <p className="text-gray-600">No CV uploaded yet. Upload your CV to get personalized recommendations!</p>
            )
          )}
        </div>

        {/* AI Recommendations */}
        <div className="bg-white p-6 rounded-xl shadow-md mb-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-2xl font-semibold text-gray-800">AI-Powered Recommendations</h3>
            <button
              onClick={onGenerateAI} // Use the prop function
              disabled={!userCV || isGeneratingAI}
              className={`py-2 px-4 rounded-lg transition-colors duration-300 flex items-center ${
                  !userCV || isGeneratingAI ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-purple-600 text-white hover:bg-purple-700'
              }`}
            >
              {isGeneratingAI ? (
                  <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generating...
                  </>
              ) : (
                  <>
                      <Lightbulb size={18} className="mr-2" /> Generate Recommendations
                  </>
              )}
            </button>
          </div>
          {userCV ? (
              <>
                  {aiRecommendations.length > 0 ? (
                      <div className="prose max-w-none text-gray-700 bg-gray-50 p-4 rounded-lg border border-gray-200">
                          <h4 className="font-semibold mb-2">Recommended Jobs:</h4>
                          <ul className="list-disc pl-5">
                              {aiRecommendations.map((rec, index) => (
                                  <li key={index} className="mb-1">{rec}</li>
                              ))}
                          </ul>
                      </div>
                  ) : (
                      <p className="text-gray-600">No recommendations generated yet. Click "Generate Recommendations" above.</p>
                  )}
                  {skillGaps.length > 0 && (
                      <div className="prose max-w-none text-gray-700 bg-gray-50 p-4 rounded-lg border border-gray-200 mt-4">
                          <h4 className="font-semibold mb-2">Suggested Skills to Acquire:</h4>
                          <ul className="list-disc pl-5">
                              {skillGaps.map((skill, index) => (
                                  <li key={index} className="mb-1">{skill}</li>
                              ))}
                          </ul>
                      </div>
                  )}
              </>
          ) : (
              <p className="text-gray-600">Upload your CV to enable AI-powered recommendations and skill gap analysis.</p>
          )}
        </div>

        {/* Saved Jobs */}
        <div className="bg-white p-6 rounded-xl shadow-md">
            <h3 className="text-2xl font-semibold text-gray-800 mb-4">Your Saved Jobs ({savedJobs.length})</h3>
            {savedJobs.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {savedJobs.map(job => (
                        <div key={job.job_id} className="bg-gray-50 p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col justify-between">
                            <h4 className="text-lg font-semibold text-gray-800 mb-1">{job.job_title}</h4>
                            <p className="text-gray-600 text-sm mb-2">{job.company} - {job.location}</p>
                            <div className="flex justify-between items-center mt-auto">
                                <button
                                    onClick={() => onSelectJob(job.job_id)} // Navigate to job detail
                                    className="text-blue-600 hover:underline text-sm"
                                >
                                    View Details
                                </button>
                                <button
                                    onClick={() => onUnsaveJob(job.job_id)} // Unsave job
                                    className="text-red-500 hover:text-red-700 p-1 rounded-full bg-red-100"
                                    title="Unsave Job"
                                >
                                    <XCircle size={20} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-gray-600">You haven't saved any jobs yet.</p>
            )}
        </div>
      </div>
    </div>
  );
};

export default UserDashboardPage;
