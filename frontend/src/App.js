import React, { useState, useEffect, createContext, useContext } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app'; // Added getApps, getApp
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, updateDoc, onSnapshot, collection, getDocs, writeBatch } from 'firebase/firestore';

// PapaParse will be loaded dynamically, so no direct global access here initially.
// const Papa = window.Papa; // This line is no longer needed here as PapaParse is loaded dynamically

// Lucide React icons (assuming they are available or will be provided by the environment)
import { Search, MapPin, Briefcase, Building2, User, Heart, Upload, Lightbulb, BellRing, ChevronLeft, XCircle } from 'lucide-react';

// --- Firebase Context ---
const FirebaseContext = createContext(null);

const FirebaseProvider = ({ children }) => {
    const [app, setApp] = useState(null);
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);

    useEffect(() => {
        try {
            // --- CHANGED THIS SECTION FOR RENDER DEPLOYMENT ---
            const firebaseConfig = {
                apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
                authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
                projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
                storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
                messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
                appId: process.env.REACT_APP_FIREBASE_APP_ID,
                measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID // Optional
            };

            // Ensure projectId is provided
            if (!firebaseConfig.projectId) {
                console.error("Firebase Initialization Error: projectId not provided in environment variables.");
                showMessageBox("Firebase setup incomplete. Contact support.", "error"); // Use showMessageBox
                setIsAuthReady(true); // Mark auth ready to unblock UI, but with error
                return;
            }

            let initializedApp;
            // Check if a Firebase app with the default name already exists
            if (!getApps().length) { // Only initialize if no apps are already initialized
                initializedApp = initializeApp(firebaseConfig);
            } else {
                initializedApp = getApp(); // Get the already initialized app
                console.warn("Firebase app already initialized. Using existing app.");
            }
            // --- END CHANGED SECTION ---

            const firestoreDb = getFirestore(initializedApp);
            const firebaseAuth = getAuth(initializedApp);

            setApp(initializedApp);
            setDb(firestoreDb);
            setAuth(firebaseAuth);

            // Listen for auth state changes
            const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
                if (user) {
                    setUserId(user.uid);
                } else {
                    // For Render deployment, __initial_auth_token is not available.
                    // We will rely on anonymous sign-in or a proper login flow.
                    try {
                        await signInAnonymously(firebaseAuth);
                    } catch (error) {
                        console.error("Firebase anonymous authentication failed:", error);
                        showMessageBox("Anonymous login failed. Some features may not work.", "error");
                    }
                }
                setIsAuthReady(true); // Auth state is ready after initial check/sign-in
            });

            return () => unsubscribe(); // Clean up the listener
        } catch (error) {
            console.error("Failed to initialize Firebase in catch block:", error);
            showMessageBox("Failed to initialize Firebase. Check console for details.", "error");
            setIsAuthReady(true); // Ensure authReady is set even on error
        }
    }, []);

    return (
        <FirebaseContext.Provider value={{ app, db, auth, userId, isAuthReady }}>
            {children}
        </FirebaseContext.Provider>
    );
};

// --- Custom Hook for Firebase ---
const useFirebase = () => {
    return useContext(FirebaseContext);
};

// --- Components ---

// Notification Message Box Component
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


// Job Card Component
const JobCard = ({ job, onClick, onSave, isSaved }) => {
    const isClosingSoon = job.closingSoon; // Assuming this property is added to job object
    return (
        <div
            className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 cursor-pointer flex flex-col justify-between relative"
            onClick={() => onClick(job)}
        >
            <h3 className="text-xl font-semibold text-gray-800 mb-2">{job.JobTitle}</h3>
            <p className="text-gray-600 flex items-center mb-1"><Building2 className="mr-2" size={16} />{job.Company}</p>
            <p className="text-gray-600 flex items-center mb-1"><MapPin className="mr-2" size={16} />{job.Location}</p>
            <p className="text-gray-600 flex items-center mb-4"><Briefcase className="mr-2" size={16} />{job.JobType}</p>
            <div className="flex justify-between items-center mt-auto">
                <span className="text-sm text-gray-500">Closes: {job.ClosingDate}</span>
                <button
                    onClick={(e) => { e.stopPropagation(); onSave(job); }}
                    className={`p-2 rounded-full transition-colors duration-200 ${isSaved ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
                    title={isSaved ? "Unsave Job" : "Save Job"}
                >
                    <Heart size={20} fill={isSaved ? "currentColor" : "none"} />
                </button>
            </div>
            {isClosingSoon && (
                <span className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                    Closing Soon!
                </span>
            )}
        </div>
    );
};

// Job Listing Component
const JobListing = ({ jobs, onSelectJob, searchTerm, setSearchTerm, filters, setFilters, onSaveJob, savedJobs }) => {
    const [showFilters, setShowFilters] = useState(false);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const uniqueCompanies = [...new Set(jobs.map(job => job.Company))].sort();
    const uniqueLocations = [...new Set(jobs.map(job => job.Location))].sort();
    const uniqueJobTypes = [...new Set(jobs.map(job => job.JobType))].sort();

    return (
        <div className="p-8 bg-gray-100 min-h-screen">
            <div className="max-w-7xl mx-auto">
                <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">Find Your Next Opportunity</h2>

                {/* Search Bar */}
                <div className="bg-white p-6 rounded-xl shadow-md mb-8 flex flex-col md:flex-row items-center gap-4">
                    <div className="relative flex-grow w-full md:w-auto">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search by job title or keyword..."
                            className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="w-full md:w-auto bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors duration-300 shadow-md"
                    >
                        {showFilters ? 'Hide Filters' : 'Show Filters'}
                    </button>
                </div>

                {/* Filters */}
                {showFilters && (
                    <div className="bg-white p-6 rounded-xl shadow-md mb-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label htmlFor="company" className="block text-gray-700 text-sm font-medium mb-2">Company</label>
                            <select
                                id="company"
                                name="Company"
                                value={filters.Company}
                                onChange={handleFilterChange}
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">All Companies</option>
                                {uniqueCompanies.map(company => (
                                    <option key={company} value={company}>{company}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="location" className="block text-gray-700 text-sm font-medium mb-2">Location</label>
                            <select
                                id="location"
                                name="Location"
                                value={filters.Location}
                                onChange={handleFilterChange}
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">All Locations</option>
                                {uniqueLocations.map(location => (
                                    <option key={location} value={location}>{location}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="jobType" className="block text-gray-700 text-sm font-medium mb-2">Job Type</label>
                            <select
                                id="jobType"
                                name="JobType"
                                value={filters.JobType}
                                onChange={handleFilterChange}
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">All Job Types</option>
                                {uniqueJobTypes.map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}

                {/* Job Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {jobs.length > 0 ? (
                        jobs.map((job, index) => (
                            <JobCard
                                key={job.JobID || index} // Use JobID if available, otherwise index
                                job={job}
                                onClick={onSelectJob}
                                onSave={onSaveJob}
                                isSaved={savedJobs.some(saved => saved.JobID === job.JobID)}
                            />
                        ))
                    ) : (
                        <p className="col-span-full text-center text-gray-600 text-lg">No jobs found matching your criteria.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

// Job Detail Component
const JobDetail = ({ job, onBack, onSave, isSaved }) => {
    if (!job) return null;

    return (
        <div className="p-8 bg-gray-100 min-h-screen">
            <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-md">
                <button
                    onClick={onBack}
                    className="flex items-center text-blue-600 hover:text-blue-800 transition-colors duration-200 mb-6"
                >
                    <ChevronLeft size={20} className="mr-2" /> Back to Listings
                </button>

                <div className="flex justify-between items-start mb-6">
                    <h2 className="text-3xl font-bold text-gray-800">{job.JobTitle}</h2>
                    <button
                        onClick={() => onSave(job)}
                        className={`p-3 rounded-full transition-colors duration-200 ${isSaved ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
                        title={isSaved ? "Unsave Job" : "Save Job"}
                    >
                        <Heart size={24} fill={isSaved ? "currentColor" : "none"} />
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 text-gray-700">
                    <p className="flex items-center"><Building2 className="mr-2" size={18} /><strong>Company:</strong> {job.Company}</p>
                    <p className="flex items-center"><MapPin className="mr-2" size={18} /><strong>Location:</strong> {job.Location}</p>
                    <p className="flex items-center"><Briefcase className="mr-2" size={18} /><strong>Job Type:</strong> {job.JobType}</p>
                    <p className="flex items-center"><BellRing className="mr-2" size={18} /><strong>Closing Date:</strong> {job.ClosingDate}</p>
                </div>

                <div className="mb-6">
                    <h3 className="text-2xl font-semibold text-gray-800 mb-3">Job Description</h3>
                    <div className="prose max-w-none text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: job.Description }}></div>
                </div>

                {job.Requirements && (
                    <div className="mb-6">
                        <h3 className="text-2xl font-semibold text-gray-800 mb-3">Requirements</h3>
                        <div className="prose max-w-none text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: job.Requirements }}></div>
                    </div>
                )}

                {job.HowToApply && (
                    <div className="mb-6">
                        <h3 className="text-2xl font-semibold text-gray-800 mb-3">How to Apply</h3>
                        <div className="prose max-w-none text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: job.HowToApply }}></div>
                    </div>
                )}

                {job.SourceURL && (
                    <div className="mt-8 text-center">
                        <a
                            href={job.SourceURL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block bg-blue-600 text-white py-3 px-8 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors duration-300 shadow-md"
                        >
                            Apply Now
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
};

// User Dashboard Component
const UserDashboard = ({ userCV, onCVSave, savedJobs, onSelectJob, onUnsaveJob, aiRecommendations, skillGaps, onGenerateAI, isGeneratingAI, userId }) => {
    const [cvInput, setCvInput] = useState(userCV);
    const [showCVEditor, setShowCVEditor] = useState(false);

    useEffect(() => {
        setCvInput(userCV);
    }, [userCV]);

    const handleSaveClick = () => {
        onCVSave(cvInput);
        setShowCVEditor(false);
    };

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
                            onClick={onGenerateAI}
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
                                <div key={job.JobID} className="bg-gray-50 p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col justify-between">
                                    <h4 className="text-lg font-semibold text-gray-800 mb-1">{job.JobTitle}</h4>
                                    <p className="text-gray-600 text-sm mb-2">{job.Company} - {job.Location}</p>
                                    <div className="flex justify-between items-center mt-auto">
                                        <button
                                            onClick={() => onSelectJob(job)}
                                            className="text-blue-600 hover:underline text-sm"
                                        >
                                            View Details
                                        </button>
                                        <button
                                            onClick={() => onUnsaveJob(job)}
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

// Notification Center Component
const NotificationCenter = ({ notifications, onClearNotification }) => {
    return (
        <div className="fixed bottom-4 right-4 z-40 w-80">
            {notifications.map((notification, index) => (
                <div
                    key={index}
                    className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 shadow-md rounded-lg mb-3 flex justify-between items-center"
                    role="alert"
                >
                    <div>
                        <p className="font-bold">{notification.title}</p>
                        <p className="text-sm">{notification.message}</p>
                    </div>
                    <button onClick={() => onClearNotification(index)} className="ml-4 text-yellow-600 hover:text-yellow-800">
                        <XCircle size={20} />
                    </button>
                </div>
            ))}
        </div>
    );
};


// Main App Component
const App = () => {
    const { db, auth, userId, isAuthReady } = useFirebase();

    const [allJobs, setAllJobs] = useState([]);
    const [filteredJobs, setFilteredJobs] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({ Company: '', Location: '', JobType: '' });
    const [currentPage, setCurrentPage] = useState('home'); // 'home', 'jobDetail', 'dashboard'
    const [selectedJob, setSelectedJob] = useState(null);
    const [userCV, setUserCV] = useState('');
    const [savedJobs, setSavedJobs] = useState([]);
    const [aiRecommendations, setAiRecommendations] = useState([]);
    const [skillGaps, setSkillGaps] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [isGeneratingAI, setIsGeneratingAI] = useState(false);
    const [message, setMessage] = useState(null);
    const [messageType, setMessageType] = useState('success');
    const [papaParseLoaded, setPapaParseLoaded] = useState(false); // New state for PapaParse loading

    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

    // Function to show message box
    const showMessageBox = (msg, type = 'success') => {
        setMessage(msg);
        setMessageType(type);
        setTimeout(() => setMessage(null), 5000); // Hide after 5 seconds
    };

    // --- Dynamic PapaParse Loading ---
    useEffect(() => {
        if (window.Papa) {
            setPapaParseLoaded(true);
            return;
        }

        const script = document.createElement('script');
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.3.0/papaparse.min.js";
        script.async = true;
        script.onload = () => {
            console.log("PapaParse script loaded successfully.");
            setPapaParseLoaded(true);
        };
        script.onerror = () => {
            console.error("Failed to load PapaParse script.");
            showMessageBox("Failed to load CSV parser. Please check your internet connection.", "error");
        };
        document.head.appendChild(script);

        return () => {
            document.head.removeChild(script);
        };
    }, []);


    // --- Data Loading (CSV) and Firestore Ingestion/Fetching ---
    useEffect(() => {
        if (!isAuthReady || !db || !papaParseLoaded) return; // Ensure Firebase and PapaParse are ready

        const jobsCollectionRef = collection(db, `artifacts/${appId}/public/data/jobs`);

        const loadAndIngestCSVData = async () => {
            try {
                // Check if the jobs collection already has data
                const existingDocs = await getDocs(jobsCollectionRef);
                if (!existingDocs.empty) {
                    console.log("Jobs already exist in Firestore. Fetching from Firestore.");
                    // Set up real-time listener if data already exists
                    const unsubscribe = onSnapshot(jobsCollectionRef, (snapshot) => {
                        const fetchedJobs = snapshot.docs.map(doc => ({
                            id: doc.id,
                            ...doc.data(),
                            ClosingDateObj: doc.data().ClosingDate ? new Date(doc.data().ClosingDate) : null,
                        }));
                        setAllJobs(fetchedJobs);
                        setFilteredJobs(fetchedJobs);
                        console.log("Fetched jobs from Firestore:", fetchedJobs.length);
                    }, (error) => {
                        console.error("Error listening to jobs collection:", error);
                        showMessageBox("Failed to load jobs from database. Please check your connection.", "error");
                    });
                    return unsubscribe; // Return unsubscribe for cleanup
                }

                console.log("Jobs collection is empty. Ingesting from CSVs.");
                showMessageBox("First-time setup: Ingesting job data from CSVs...", "info");

                // Helper function to fetch and parse a single CSV
                const fetchAndParseCsv = async (fileName, contentFetchId) => {
                    const encodedContentFetchId = encodeURIComponent(contentFetchId);
                    const url = `/_api/v1/files/${fileName}?contentFetchId=${encodedContentFetchId}`;
                    console.log(`Attempting to fetch: ${url}`);
                    const response = await fetch(url);
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status} for ${fileName}`);
                    }
                    const csvText = await response.text();
                    const parsedData = window.Papa.parse(csvText, { header: true, skipEmptyLines: true }).data; // Use window.Papa
                    console.log(`Parsed data from ${fileName}:`, parsedData.length, parsedData);
                    return parsedData;
                };

                // Fetch CSV content
                const parsed1 = await fetchAndParseCsv('myjob_scraped_data_20250709_213032.csv', 'uploaded:myjob_scraped_data_20250709_213032.csv');
                const parsed2 = await fetchAndParseCsv('myjob_scraped_data_20250710_182758.csv', 'uploaded:myjob_scraped_data_20250710_182758.csv');
                const parsed3 = await fetchAndParseCsv('myjob_scraped_data_20250711_220002.csv', 'uploaded:myjob_scraped_data_20250711_220002.csv');

                // Combine and clean up data
                const combinedData = [...parsed1, ...parsed2, ...parsed3].map(job => ({
                    ...job,
                    // Ensure JobID is unique, if not present, generate one
                    JobID: job.JobID && job.JobID.trim() !== '' ? job.JobID : crypto.randomUUID(),
                    Description: job.Description || 'No description provided.',
                    Requirements: job.Requirements || 'No requirements listed.',
                    HowToApply: job.HowToApply || 'Refer to source URL for application instructions.',
                    SourceURL: job.SourceURL || '#',
                    // Store ClosingDate as string, convert to DateObj for client-side use
                    ClosingDate: job.ClosingDate || '',
                }));

                // Filter out jobs with invalid or missing JobTitle and remove duplicates
                const validJobs = combinedData.filter(job => job.JobTitle && job.JobTitle.trim() !== '');
                const uniqueJobsMap = new Map();
                validJobs.forEach(job => {
                    // Use JobID as the key for uniqueness, or a combination if JobID is not reliably unique
                    uniqueJobsMap.set(job.JobID, job);
                });
                const uniqueJobs = Array.from(uniqueJobsMap.values());

                console.log("Prepared unique jobs for ingestion:", uniqueJobs.length, uniqueJobs);

                // Ingest into Firestore in batches
                const batch = writeBatch(db);
                uniqueJobs.forEach(job => {
                    // Firestore document ID should be unique, using JobID for consistency
                    const jobDocRef = doc(jobsCollectionRef, job.JobID);
                    // Remove ClosingDateObj before saving to Firestore, as it's a client-side derived property
                    const { ClosingDateObj, ...jobToSave } = job;
                    batch.set(jobDocRef, jobToSave);
                });

                await batch.commit();
                console.log("Successfully ingested jobs into Firestore.");
                showMessageBox("Job data loaded and ready!", "success");

                // After ingestion, set up the real-time listener
                const unsubscribe = onSnapshot(jobsCollectionRef, (snapshot) => {
                    const fetchedJobs = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data(),
                        ClosingDateObj: doc.data().ClosingDate ? new Date(doc.data().ClosingDate) : null,
                    }));
                    setAllJobs(fetchedJobs);
                    setFilteredJobs(fetchedJobs);
                    console.log("Fetched jobs from Firestore after ingestion:", fetchedJobs.length);
                }, (error) => {
                    console.error("Error listening to jobs collection after ingestion:", error);
                    showMessageBox("Failed to load jobs from database. Please check your connection.", "error");
                });
                return unsubscribe;

            } catch (error) {
                console.error("Error during CSV ingestion or Firestore fetching:", error);
                showMessageBox("Failed to load job data. Please try again later.", "error");
            }
        };

        const cleanup = loadAndIngestCSVData();
        return () => {
            if (cleanup && typeof cleanup === 'function') {
                cleanup(); // Unsubscribe from Firestore listener on component unmount
            }
        };
    }, [db, isAuthReady, appId, papaParseLoaded]); // Depend on db, isAuthReady, and papaParseLoaded

    // --- Filtering Logic ---
    useEffect(() => {
        let currentJobs = [...allJobs];

        // Apply search term
        if (searchTerm) {
            const lowerCaseSearchTerm = searchTerm.toLowerCase();
            currentJobs = currentJobs.filter(job =>
                (job.JobTitle && job.JobTitle.toLowerCase().includes(lowerCaseSearchTerm)) ||
                (job.Description && job.Description.toLowerCase().includes(lowerCaseSearchTerm)) ||
                (job.Company && job.Company.toLowerCase().includes(lowerCaseSearchTerm)) ||
                (job.Location && job.Location.toLowerCase().includes(lowerCaseSearchTerm)) ||
                (job.JobType && job.JobType.toLowerCase().includes(lowerCaseSearchTerm))
            );
        }

        // Apply filters
        for (const key in filters) {
            if (filters[key]) {
                currentJobs = currentJobs.filter(job => job[key] === filters[key]);
            }
        }

        // Add 'closingSoon' flag
        const today = new Date();
        const twoDaysFromNow = new Date();
        twoDaysFromNow.setDate(today.getDate() + 2);

        const jobsWithClosingStatus = currentJobs.map(job => {
            let closingSoon = false;
            // Use ClosingDateObj which is derived from Firestore data
            if (job.ClosingDateObj) {
                // Check if closing date is within 2 days and is in the future
                if (job.ClosingDateObj > today && job.ClosingDateObj <= twoDaysFromNow) {
                    closingSoon = true;
                }
            }
            return { ...job, closingSoon };
        });

        setFilteredJobs(jobsWithClosingStatus);
        console.log("Filtered jobs for display:", jobsWithClosingStatus.length, jobsWithClosingStatus); // Log filtered jobs
    }, [searchTerm, filters, allJobs]);

    // --- Notifications for Closing Dates ---
    useEffect(() => {
        const generateNotifications = () => {
            const today = new Date();
            const twoDaysFromNow = new Date();
            twoDaysFromNow.setDate(today.getDate() + 2);

            const newNotifications = [];
            filteredJobs.forEach(job => {
                if (job.ClosingDateObj && job.ClosingDateObj > today && job.ClosingDateObj <= twoDaysFromNow) {
                    newNotifications.push({
                        title: `Job Closing Soon: ${job.JobTitle}`,
                        message: `Applications for ${job.Company} close on ${job.ClosingDate}.`,
                        jobId: job.JobID
                    });
                }
            });
            setNotifications(newNotifications);
        };

        if (allJobs.length > 0) {
            generateNotifications();
            // Set up an interval to check for notifications periodically (e.g., every hour)
            const interval = setInterval(generateNotifications, 3600000); // Every hour
            return () => clearInterval(interval); // Cleanup
        }
    }, [allJobs, filteredJobs]); // Re-run when job data changes

    const handleClearNotification = (indexToRemove) => {
        setNotifications(prev => prev.filter((_, index) => index !== indexToRemove));
    };

    // --- Firebase Data Management (User CV, Saved Jobs) ---
    useEffect(() => {
        if (!isAuthReady || !db || !userId) return;

        const userDocRef = doc(db, `artifacts/${appId}/users/${userId}/userData/profile`);

        // Listen for real-time updates to user data
        const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setUserCV(data.cv || '');
                setSavedJobs(data.savedJobs || []);
                setAiRecommendations(data.aiRecommendations || []);
                setSkillGaps(data.skillGaps || []);
            } else {
                // Initialize user profile if it doesn't exist
                setDoc(userDocRef, { cv: '', savedJobs: [], aiRecommendations: [], skillGaps: [] }, { merge: true })
                    .then(() => console.log("User profile initialized"))
                    .catch(error => console.error("Error initializing user profile:", error));
            }
        }, (error) => {
            console.error("Error listening to user data:", error);
            showMessageBox("Failed to load user data. Please check your connection.", "error");
        });

        return () => unsubscribe(); // Cleanup listener
    }, [db, userId, isAuthReady, appId]);

    const handleCVSave = async (cvContent) => {
        if (!db || !userId) {
            showMessageBox("User not authenticated. Please try again.", "error");
            return;
        }
        const userDocRef = doc(db, `artifacts/${appId}/users/${userId}/userData/profile`);
        try {
            await updateDoc(userDocRef, { cv: cvContent });
            setUserCV(cvContent);
            showMessageBox("CV saved successfully!");
        } catch (error) {
            console.error("Error saving CV:", error);
            showMessageBox("Failed to save CV. Please try again.", "error");
        }
    };

    const handleSaveJob = async (jobToSave) => {
        if (!db || !userId) {
            showMessageBox("User not authenticated. Please try again.", "error");
            return;
        }
        const userDocRef = doc(db, `artifacts/${appId}/users/${userId}/userData/profile`);
        const isAlreadySaved = savedJobs.some(job => job.JobID === jobToSave.JobID);

        try {
            let updatedSavedJobs;
            if (isAlreadySaved) {
                updatedSavedJobs = savedJobs.filter(job => job.JobID !== jobToSave.JobID);
                showMessageBox("Job unsaved successfully!");
            } else {
                updatedSavedJobs = [...savedJobs, jobToSave];
                showMessageBox("Job saved successfully!");
            }
            await updateDoc(userDocRef, { savedJobs: updatedSavedJobs });
            setSavedJobs(updatedSavedJobs); // Update local state immediately
        } catch (error) {
            console.error("Error saving/unsaving job:", error);
            showMessageBox("Failed to save/unsave job. Please try again.", "error");
        }
    };

    const handleUnsaveJob = async (jobToUnsave) => {
        if (!db || !userId) {
            showMessageBox("User not authenticated. Please try again.", "error");
            return;
        }
        const userDocRef = doc(db, `artifacts/${appId}/users/${userId}/userData/profile`);
        try {
            const updatedSavedJobs = savedJobs.filter(job => job.JobID !== jobToUnsave.JobID);
            await updateDoc(userDocRef, { savedJobs: updatedSavedJobs });
            setSavedJobs(updatedSavedJobs);
            showMessageBox("Job unsaved successfully!");
        } catch (error) {
            console.error("Error unsaving job:", error);
            showMessageBox("Failed to unsave job. Please try again.", "error");
        }
    };

    // --- AI Integration (Simulated with Gemini API) ---
    const generateAIRecommendations = async () => {
        if (!userCV || !allJobs.length) {
            showMessageBox("Please upload your CV and ensure job data is loaded to generate recommendations.", "error");
            return;
        }

        setIsGeneratingAI(true);
        showMessageBox("Generating AI recommendations and skill gaps...", "info");

        try {
            const jobDescriptions = allJobs.map(job => `Title: ${job.JobTitle}\nCompany: ${job.Company}\nDescription: ${job.Description}\nRequirements: ${job.Requirements}`).join('\n\n---\n\n');

            const prompt = `Given the following user CV and a list of job descriptions, please perform two tasks:
            1. Identify 5-10 job titles from the provided job descriptions that are most relevant to the user's CV. List them clearly.
            2. Identify 3-5 key skills mentioned in the job descriptions that the user's CV appears to lack, but would be beneficial for the recommended jobs. List these skills.

            User CV:
            ${userCV}

            Job Descriptions:
            ${jobDescriptions}

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
            const apiKey = process.env.REACT_APP_GEMINI_API_KEY; // <--- CHANGED THIS LINE

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

                // Save to Firestore
                const userDocRef = doc(db, `artifacts/${appId}/users/${userId}/userData/profile`);
                await updateDoc(userDocRef, {
                    aiRecommendations: parsedJson.recommendations || [],
                    skillGaps: parsedJson.skillGaps || []
                });
                showMessageBox("AI recommendations generated and saved!");
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
    };

    // --- Navigation Handlers ---
    const handleSelectJob = (job) => {
        setSelectedJob(job);
        setCurrentPage('jobDetail');
    };

    const handleBackToListing = () => {
        setSelectedJob(null);
        setCurrentPage('home');
    };

    const handleGoToDashboard = () => {
        setCurrentPage('dashboard');
    };

    const handleGoToHome = () => {
        setCurrentPage('home');
    };

    return (
        <div className="min-h-screen bg-gray-100 font-sans antialiased">
            <style>
                {`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
                body { font-family: 'Inter', sans-serif; }
                /* Basic Tailwind setup for prose */
                .prose img {
                    max-width: 100%;
                    height: auto;
                    border-radius: 0.5rem;
                }
                .prose h1, .prose h2, .prose h3, .prose h4, .prose h5, .prose h6 {
                    color: #1f2937; /* gray-900 */
                    font-weight: 700;
                    margin-top: 1.5em;
                    margin-bottom: 0.75em;
                }
                .prose p {
                    margin-bottom: 1em;
                    line-height: 1.6;
                }
                .prose ul, .prose ol {
                    margin-bottom: 1em;
                    padding-left: 1.5em;
                }
                .prose ul li {
                    list-style-type: disc;
                }
                .prose ol li {
                    list-style-type: decimal;
                }
                .prose a {
                    color: #2563eb; /* blue-600 */
                    text-decoration: underline;
                }
                .prose code {
                    background-color: #e5e7eb; /* gray-200 */
                    padding: 0.2em 0.4em;
                    border-radius: 0.25rem;
                    font-size: 0.875em;
                }
                `}
            </style>
            {/* Tailwind CSS CDN */}
            <script src="https://cdn.tailwindcss.com"></script>

            {/* PapaParse CDN is now loaded dynamically in useEffect */}
            {/* <script src="https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.3.0/papaparse.min.js"></script> */}

            <MessageBox message={message} type={messageType} onClose={() => setMessage(null)} />

            {/* Header */}
            <header className="bg-white shadow-sm py-4">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-blue-600">CareerConnect</h1>
                    <nav>
                        <ul className="flex space-x-6">
                            <li>
                                <button
                                    onClick={handleGoToHome}
                                    className={`text-gray-700 hover:text-blue-600 font-medium ${currentPage === 'home' ? 'text-blue-600 border-b-2 border-blue-600' : ''}`}
                                >
                                    Jobs
                                </button>
                            </li>
                            <li>
                                <button
                                    onClick={handleGoToDashboard}
                                    className={`text-gray-700 hover:text-blue-600 font-medium ${currentPage === 'dashboard' ? 'text-blue-600 border-b-2 border-blue-600' : ''}`}
                                >
                                    Dashboard
                                </button>
                            </li>
                            <li>
                                <span className="text-gray-500 text-sm flex items-center">
                                    <User size={16} className="mr-1" /> {userId ? `Logged In` : 'Logging In...'}
                                </span>
                            </li>
                        </ul>
                    </nav>
                </div>
            </header>

            <main>
                {currentPage === 'home' && (
                    <JobListing
                        jobs={filteredJobs}
                        onSelectJob={handleSelectJob}
                        searchTerm={searchTerm}
                        setSearchTerm={setSearchTerm}
                        filters={filters}
                        setFilters={setFilters}
                        onSaveJob={handleSaveJob}
                        savedJobs={savedJobs}
                    />
                )}
                {currentPage === 'jobDetail' && (
                    <JobDetail
                        job={selectedJob}
                        onBack={handleBackToListing}
                        onSave={handleSaveJob}
                        isSaved={savedJobs.some(job => job.JobID === selectedJob?.JobID)}
                    />
                )}
                {currentPage === 'dashboard' && (
                    <UserDashboard
                        userCV={userCV}
                        onCVSave={handleCVSave}
                        savedJobs={savedJobs}
                        onSelectJob={handleSelectJob}
                        onUnsaveJob={handleUnsaveJob}
                        aiRecommendations={aiRecommendations}
                        skillGaps={skillGaps}
                        onGenerateAI={generateAIRecommendations}
                        isGeneratingAI={isGeneratingAI}
                        userId={userId}
                    />
                )}
            </main>

            <NotificationCenter notifications={notifications} onClearNotification={handleClearNotification} />
        </div>
    );
};

// Wrap the App with FirebaseProvider
const CareerConnectApp = () => (
    <FirebaseProvider>
        <App />
    </FirebaseProvider>
);

export default CareerConnectApp;
