import { useState } from 'react';
import { uploadDebtFile } from '../services/api';
import type { UploadResponse } from '../types/upload.types';

export const useFileUpload = () => {
  const [fileName, setFileName] = useState<string>('');
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string>('');

  const uploadFile = async (file: File) => {
    setStatus('uploading');
    setError('');
    try {
      const result: UploadResponse = await uploadDebtFile(file);
      if (result.success) {
        setFileName(result.parquetFilename || file.name); // fallback to local file name if API doesn't return
        setStatus('success');
      } else {
        setError(result.message || 'Upload failed');
        setStatus('error');
        throw new Error(result.message || 'Upload failed');
      }
    } catch (err: any) {
      setError(err?.message || 'Upload failed');
      setStatus('error');
      throw err;
    }
  };

  return { uploadFile, fileName, status, error };
};