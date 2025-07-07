'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import Navbar from '@/components/navbar';
import Snackbar from '@/components/snackBar';
import { CloudArrowUpIcon } from '@heroicons/react/24/outline';
import { apiFetch } from '@/utils/api';


export default function Upload() {
  const [snackbar, setSnackbar] = useState({ message: '', type: '' });
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isUploading, setIsUploading] = useState(false);
  const [isUploaded, setIsUploaded] = useState(false);
  const router = useRouter();

  const handleFileUpload = async (file) => {
    if (!file) {
      setSnackbar({ message: 'No file selected', type: 'error' });
      return;
    }

    setIsUploading(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('uploadDate', selectedDate.toISOString());

    try {
      const response = await apiFetch('/api/v2/status21/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        let errorMessage = 'Failed to upload file';
        try {
          const errorResponse = await response.json();
          errorMessage = errorResponse.error?.message || errorMessage;
        } catch (jsonError) {
          console.error('Error parsing JSON response:', jsonError);
          errorMessage = await response.text();
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();

      setSnackbar({ message: 'File uploaded and processed successfully!', type: 'success' });
      setIsUploaded(true);
      localStorage.setItem('status21_selectedDate', selectedDate.toISOString());
    } catch (error) {
      console.error('Error uploading file:', error);
      setSnackbar({ message: error.message, type: 'error' });
    } finally {
      setIsUploading(false);
    }
  };

  const onDrop = (acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      handleFileUpload(acceptedFiles[0]);
    } else {
      setSnackbar({ message: 'No valid file selected', type: 'error' });
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    multiple: false,
  });

  const handleCloseSnackbar = () => {
    setSnackbar({ message: '', type: '' });
  };

  const handleSnackbarClick = () => {
    if (snackbar.type === 'success') {
      router.push('/dashboard');
    }
  };

  return (
    <>
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-1">Welcome to Status21 System</h1>
        <p className="text-gray-600 mb-6">Upload Excel files containing overall accounts data.</p>

        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6 shadow-sm">
          {isUploaded ? (
            // Success Message UI
            <div className="text-center">
              <h2 className="text-xl font-semibold text-green-600 mb-4">Upload Successful!</h2>
              <p className="text-gray-700 mb-6">
                Your file has been uploaded and processed successfully.
              </p>
              <button
                onClick={() => router.push('/status21/dashboard')}
                className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium 
                rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Go to Dashboard
              </button>
            </div>
          ) : (
            // Upload Section UI
            <>
              {/* Date Picker */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Upload Date
                </label>
                <input
                  type="date"
                  value={selectedDate.toISOString().split('T')[0]}
                  onChange={(e) => setSelectedDate(new Date(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm 
                             focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isUploading}
                />
              </div>

              {/* File Upload Area */}
              <div
                {...getRootProps()}
                className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg px-6 py-12 transition-all cursor-pointer
                  ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
                  ${isUploading ? 'opacity-50 pointer-events-none' : ''}
                  min-h-[300px] sm:min-h-[400px] md:min-h-[500px]`}
              >
                <input {...getInputProps()} />

                {isUploading ? (
                  <div className="flex flex-col items-center">
                    {/* Spinner (Tailwind-based or custom) */}
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mb-4"></div>
                    <p className="text-sm text-gray-600">Uploading file...</p>
                  </div>
                ) : (
                  <>
                    {/* OPTIONAL: Heroicon (CloudArrowUpIcon) */}
                    <CloudArrowUpIcon className="h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-lg text-gray-600">
                      {isDragActive ? 'Drop your file here' : 'Drag & drop or click to upload'}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">Excel files only (.xlsx or .xls)</p>
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {/* Snackbar */}
        {snackbar.message && (
          <Snackbar
            message={snackbar.message}
            type={snackbar.type}
            onClose={handleCloseSnackbar}
            onClick={handleSnackbarClick}
          />
        )}
      </div>
    </>
  );
}
