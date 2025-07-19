import React, { useState, useEffect } from 'react';
import apiClient from '../api/apiClient';
import { Building2, MapPin, Briefcase, Search, XCircle, Heart } from 'lucide-react'; // Added Heart icon

// JobCard Component - now with save functionality
const JobCard = ({ job, onSelectJob, onSaveToggle, isSaved }) => { // Added onSaveToggle, isSaved props
  const isClosingSoon = job.closing_soon;
  return (
    <div
      className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 cursor-pointer flex flex-col justify-between relative"
      onClick={() => onSelectJob(job.job_id)}
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
const JobListPage = ({ showMessageBox, onSelectJob, onSaveToggle, savedJobs }) => { // Added onSaveToggle, savedJobs props
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [jobTypeFilter, setJobTypeFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const [uniqueCompanies, setUniqueCompanies] = useState([]);
  const [uniqueLocations, setUniqueLocations] = useState([]);
  const [uniqueJobTypes, setUniqueJobTypes] = useState([]);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = {
          search: searchTerm,
          company: companyFilter,
          location: locationFilter,
          jobType: jobTypeFilter,
        };

        const response = await apiClient.get('/jobs', { params });
        const fetchedJobs = response.data;

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

        setUniqueCompanies([...new Set(fetchedJobs.map(job => job.company).filter(Boolean))].sort());
        setUniqueLocations([...new Set(fetchedJobs.map(job => job.location).filter(Boolean))].sort());
        setUniqueJobTypes([...new Set(fetchedJobs.map(job => job.job_type).filter(Boolean))].sort());

      } catch (err) {
        console.error("Error fetching jobs:", err);
        setError("Failed to load jobs. Please ensure the backend server is running and data is ingested.");
        showMessageBox("Failed to load jobs. Check backend server.", "error");
      } finally {
        setLoading(false);
      }
    };

    const handler = setTimeout(() => {
      fetchJobs();
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm, companyFilter, locationFilter, jobTypeFilter, showMessageBox]);

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
              placeholder="Search by job title, company, or keyword..."
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
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
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
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
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
                value={jobTypeFilter}
                onChange={(e) => setJobTypeFilter(e.target.value)}
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

        {loading && (
          <div className="flex items-center justify-center p-8">
            <p className="text-xl text-gray-700">Loading jobs...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-100 text-red-700 p-4 rounded-md text-center">
            <p className="text-xl">{error}</p>
          </div>
        )}

        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {jobs.length > 0 ? (
              jobs.map(job => (
                <JobCard
                  key={job.job_id}
                  job={job}
                  onSelectJob={onSelectJob}
                  onSaveToggle={onSaveToggle} // Pass to JobCard
                  isSaved={savedJobs.includes(job.job_id)} // Pass saved status
                />
              ))
            ) : (
              <p className="col-span-full text-center text-gray-600 text-lg">No jobs found matching your criteria.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default JobListPage;
