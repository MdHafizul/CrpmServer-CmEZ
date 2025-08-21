import React, { useState } from 'react';
import Loader from '../ui/Loader';

interface FileUploaderProps {
  onFileSelected: (file: File) => void;
  isUploading: boolean;
  accept?: string;
}

const FileUploader: React.FC<FileUploaderProps> = ({
  onFileSelected,
  isUploading,
  accept = '.xlsx,.xls'
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handleFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleFile = (file: File) => {
    // Check if file is an Excel file
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls') && !file.name.endsWith('.csv')) {
      alert('Please upload an Excel or CSV file');
      return;
    }
    
    onFileSelected(file);
  };

  return (
    <div className="relative">
      <input
        type="file"
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        onChange={handleFileChange}
        accept={accept}
        disabled={isUploading}
      />
      
      <div 
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 relative
          ${isUploading 
            ? 'bg-gray-50 border-gray-300 cursor-not-allowed' 
            : isDragging 
              ? 'border-blue-400 bg-blue-50/70 transform scale-105' 
              : 'border-blue-200 bg-blue-50/50 hover:border-blue-400 hover:bg-blue-50/70 cursor-pointer'
          }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isUploading ? (
          <div className="flex flex-col items-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full">
              <Loader size="md" color="white" className="" />
            </div>
            <div>
              <p className="text-lg font-medium text-gray-700 mb-1">Uploading file...</p>
              <p className="text-sm text-gray-500">Please wait while we process your file</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full transition-all duration-300
                ${isDragging 
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-700 transform scale-110' 
                  : 'bg-gradient-to-r from-blue-500 to-indigo-600'
                }`}>
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
            
            <div>
              <p className="text-lg font-medium text-gray-700 mb-1">
                {isDragging ? 'Drop your file here' : 'Drag & drop your file here'}
              </p>
              <p className="text-sm text-gray-500">
                or <span className="text-blue-500 font-medium hover:text-blue-600">click to browse files</span>
              </p>
            </div>
            
            <div className="flex items-center justify-center space-x-2 text-xs text-gray-400">
              <span>Supported formats:</span>
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded font-medium">Excel</span>
            </div>
            
            {isDragging && (
              <div className="absolute inset-0 bg-blue-500/10 rounded-xl border-2 border-blue-500 flex items-center justify-center">
                <div className="text-blue-600 font-semibold text-lg">
                  Release to upload
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUploader;