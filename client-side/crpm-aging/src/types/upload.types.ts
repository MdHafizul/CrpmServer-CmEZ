export type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

export interface UploadResponse {
  success: boolean;
  message: string;
  fileName?: string;
  fileId?: string;
}

export interface UploadProgressEvent {
  loaded: number;
  total: number;
}