export type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

export interface UploadResponse {
  success: boolean;
  message?: string;
  parquetFilename?: string; 
}

export interface UploadProgressEvent {
  loaded: number;
  total: number;
}