import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { Building2, MapPin, Briefcase, BellRing, ChevronLeft, Heart } from 'lucide-react';

const JobDetailPage = ({ showMessageBox, onSaveToggle, isSaved }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchJobDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get(`/jobs/${id}`);
      setJob(response.data);
      console.log("Fetched job details:", response.data);
    } catch (err) {
      console.error("Error fetching job details:", err);
      setError("Failed to load job details. Please try again.");
      showMessageBox("Failed to load job details.", "error");
    } finally {
      setLoading(false);
    }
  }, [id, showMessageBox]);

  useEffect(() => {
    if (id) {
      fetchJobDetails();
    }
  }, [id, fetchJobDetails]);

  const handleBack = useCallback(() => {
    navigate('/jobs');
  }, [navigate]);

  const handleSaveToggleClick = useCallback(() => {
    if (onSaveToggle && job) {
        onSaveToggle(job.job_id);
    }
  }, [onSaveToggle, job]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-xl text-gray-700">Loading job details...</p>
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

  if (!job) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-xl text-gray-700">Job not found.</p>
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-md">
        <button
          onClick={handleBack}
          className="flex items-center text-blue-600 hover:text-blue-800 transition-colors duration-200 mb-6"
        >
          <ChevronLeft size={20} className="mr-2" /> Back to Listings
        </button>

        <div className="flex justify-between items-start mb-6">
          <h2 className="text-3xl font-bold text-gray-800">{job.job_title}</h2>
          <button
            onClick={handleSaveToggleClick}
            className={`p-3 rounded-full transition-colors duration-200 ${isSaved ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
            title={isSaved ? "Unsave Job" : "Save Job"}
          >
            <Heart size={24} fill={isSaved ? "currentColor" : "none"} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 text-gray-700">
          <p className="flex items-center"><Building2 className="mr-2" size={18} /><strong>Company:</strong> {job.company}</p>
          <p className="flex items-center"><MapPin className="mr-2" size={18} /><strong>Location:</strong> {job.location}</p>
          <p className="flex items-center"><Briefcase className="mr-2" size={18} /><strong>Job Type:</strong> {job.job_type}</p>
          <p className="flex items-center"><BellRing className="mr-2" size={18} /><strong>Closing Date:</strong> {job.closing_date || 'N/A'}</p>
        </div>

        <div className="mb-6">
          <h3 className="text-2xl font-semibold text-gray-800 mb-3">Job Description</h3>
          <div className="prose max-w-none text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: job.description }}></div>
        </div>

        {job.requirements && (
            <div className="mb-6">
                <h3 className="text-2xl font-semibold text-gray-800 mb-3">Requirements</h3>
                <div className="prose max-w-none text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: job.requirements }}></div>
            </div>
        )}

        {job.how_to_apply && (
            <div className="mb-6">
                <h3 className="text-2xl font-semibold text-gray-800 mb-3">How to Apply</h3>
                <div className="prose max-w-none text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: job.how_to_apply }}></div>
            </div>
        )}

        {job.source_url && job.source_url !== '#' && (
          <div className="mt-8 text-center">
            <a
              href={job.source_url}
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

export default JobDetailPage;
