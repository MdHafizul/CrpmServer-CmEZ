import React from 'react';
import Button from '../ui/Button';

interface UploadStatusProps {
  isUploaded: boolean;
  fileName: string;
  onViewDashboard: () => void;
}

const UploadStatus: React.FC<UploadStatusProps> = ({
  isUploaded,
  fileName,
  onViewDashboard
}) => {
  if (!isUploaded) return null;
  
  return (
    <div className="mt-6">
      <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-green-800">Upload successful</h3>
            <div className="mt-2 text-sm text-green-700">
              <p>File <span className="font-medium">{fileName}</span> has been uploaded successfully.</p>
            </div>
          </div>
        </div>
      </div>
      <div className="text-center">
        <Button variant="primary" onClick={onViewDashboard}>
          View Dashboard
        </Button>
      </div>
    </div>
  );
};

export default UploadStatus;