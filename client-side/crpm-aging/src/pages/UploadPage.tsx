import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { useFileUpload } from '../hooks/useFileUpload';
import Snackbar from '../components/ui/Snackbar';
import Layout from '../components/layout/Layout';
import FileUploader from '../components/upload/FileUploader';
import UploadStatus from '../components/upload/UploadStatus';

const UploadPage: React.FC = () => {
  const navigate = useNavigate();
  const { setUploadedFile,setParquetFileName } = useAppContext();
  const { uploadFile, fileName, status, error } = useFileUpload();
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarType, setSnackbarType] = useState<'success' | 'error' | 'info'>('info');
  
  // Sync fileName to AppContext after upload success
  useEffect(() => {
    if (status === 'success' && fileName) {
      setParquetFileName(fileName);
    }
  }, [status, fileName, setParquetFileName]);

  const handleFileSelected = async (selectedFile: File) => {
    try {
      await uploadFile(selectedFile);
      setUploadedFile(selectedFile);
      setSnackbarMessage('File uploaded successfully!');
      setSnackbarType('success');
      setShowSnackbar(true);
    } catch (err) {
      // Show error from hook or fallback
      setSnackbarMessage(error || (err instanceof Error ? err.message : 'Upload failed'));
      setSnackbarType('error');
      setShowSnackbar(true);
    }
  };

  const handleViewDashboard = () => {
    navigate('/dashboard');
  };

  const handleCancel = () => {
    navigate('/');
  };

  return (
    <Layout>
      {/* Modern Upload Popup Section */}
      <div className="fixed inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg w-full transform transition-all duration-300 hover:scale-105">
          {/* Header with Icon */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
              Upload Your File
            </h1>
            <p className="text-gray-500 text-sm">
              Upload your Excel file to start debt aging analysis
            </p>
          </div>

          {/* Upload Area */}
          <div className="space-y-6">
            {/* File Upload Component */}
            <FileUploader 
              onFileSelected={handleFileSelected} 
              isUploading={status === 'uploading'} 
            />
            
            {/* Upload Status */}
            <UploadStatus 
              isUploaded={status === 'success'} 
              fileName={fileName} 
              onViewDashboard={handleViewDashboard} 
            />

            {/* Quick Actions */}
            {status !== 'success' && (
              <div className="flex space-x-3 pt-4">
                <button 
                  onClick={() => (document.querySelector('input[type="file"]') as HTMLInputElement)?.click()}
                  disabled={status === 'uploading'}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {status === 'uploading' ? 'Uploading...' : 'Select File'}
                </button>
                <button 
                  onClick={handleCancel}
                  className="px-6 py-3 border border-gray-200 text-gray-600 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Help Text */}
            <div className="text-center pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-400">
                Need help? Check our{' '}
                <a href="#" className="text-blue-500 hover:text-blue-600 underline">
                  upload guide
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <Snackbar 
        message={snackbarMessage} 
        type={snackbarType} 
        isVisible={showSnackbar} 
        onClose={() => setShowSnackbar(false)} 
      />
    </Layout>
  );
};

export default UploadPage;