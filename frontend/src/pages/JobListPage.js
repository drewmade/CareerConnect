import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../api/apiClient';
import { Building2, MapPin, Briefcase, Heart } from 'lucide-react';

// JobCard Component
const JobCard = ({ job, onSelectJob, onSaveToggle, isSaved }) => {
  const isClosingSoon = job.closing_soon; // Assuming backend will provide this flag
  return (
    <div
      className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 cursor-pointer flex flex-col justify-between relative"
      onClick={() => onSelectJob(job.job_id)} // Call onSelectJob with job_id when card is clicked
    >
      <h3 className="text-xl font-semibold text-gray-800 mb-2">{job.job_title}</h3>
      <p className="text-gray-600 flex items-center mb-1"><Building2 className="mr-2" size={16} />{job.company}</p>
      <p className="text-gray-600 flex items-center mb-1"><MapPin className="mr-2" size={16} />{job.location}</p>
      <p className="text-gray-600 flex items-center mb-4"><Briefcase className="mr-2" size={16} />{job.job_type}</p>
      <div className="flex justify-between items-center mt-auto">
        <span className="text-sm text-gray-500">Closes: {job.closing_date || 'N/A'}</span>
        <button
            onClick={(e) => { e.stopPropagation(); onSaveToggle(job.job_id); }} // Prevent card click
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

// JobListPage Component
const JobListPage = ({ showMessageBox, onSelectJob, onSaveToggle, savedJobs }) => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setLoading(true);
        setError(null);

        // No search/filter parameters here, fetching all jobs
        const response = await apiClient.get('/jobs');
        const fetchedJobs = response.data;

        // Client-side processing for closing_soon flag (as before)
        const today = new Date();
        const twoDaysFromNow = new Date();
        twoDaysFromNow.setDate(today.getDate() + 2);

        const jobsWithStatus = fetchedJobs.map(job => {
            let closingSoon = false;
            const closingDateObj = job.closing_date ? new Date(job.closing_date) : null;

            if (closingDateObj && closingDateObj > today && closingDateObj <= twoDaysFromNow) {
                closingSoon = true;
            }
            return { ...job, closing_soon: closingSoon };
        });

        setJobs(jobsWithStatus);
        console.log("Fetched and processed jobs:", jobsWithStatus.length, jobsWithStatus);

      } catch (err) {
        console.error("Error fetching jobs:", err);
        setError("Failed to load jobs. Please ensure the backend server is running and data is ingested.");
        showMessageBox("Failed to load jobs. Check backend server.", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchJobs(); // Fetch jobs on component mount
  }, [showMessageBox]); // Only re-fetch if showMessageBox changes (unlikely)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-xl text-gray-700">Loading jobs...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-100 text-red-700 p-4 rounded-md">
        <p className="text-xl">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">Available Jobs</h2>
        {/* Search and Filter components removed */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {jobs.length > 0 ? (
            jobs.map(job => (
              <JobCard
                key={job.job_id}
                job={job}
                onSelectJob={onSelectJob}
                onSaveToggle={onSaveToggle}
                isSaved={savedJobs.includes(job.job_id)}
              />
            ))
          ) : (
            <p className="col-span-full text-center text-gray-600 text-lg">No jobs found.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobListPage;
