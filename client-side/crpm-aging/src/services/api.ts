import axios from 'axios';
import type { SummaryCardApiResponse, DebtByAccountClassApiResponse, DebtByAccountByADIDApiResponse, DebtByStaffApiResponse,
  DebtBySmerSegmentApiResponse, DetailedTableApiResponse } from '../types/dashboard.type';
import type { UploadResponse } from '../types/upload.types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// Function to upload debt file
export async function uploadDebtFile(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch(`${API_BASE_URL}/api/v2/crpm/process`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      let errorMsg = 'Upload failed';
      try {
        const errData = await response.json();
        errorMsg = errData?.message || errorMsg;
      } catch {}
      return {
        success: false,
        message: errorMsg,
        parquetFilename: '', 
      };
    }

    const data = await response.json();
    return {
      success: data.success,
      message: data.message,
      parquetFilename: data.parquetFilename, 
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Network error during upload',
      parquetFilename: '', 
    };
  }
}

//Function to fetch summary card data
export const getSummaryCardData = async (filename: string): Promise<SummaryCardApiResponse> => {
  const url = `${API_BASE_URL}/api/v2/crpm/summary-card/${encodeURIComponent(filename)}`;
  const response = await axios.get<SummaryCardApiResponse>(url);
  return response.data;
};

//Function to fetch SummaryAgedDebtData by station with filters
export const getDebtByStationData = async (filename: string, body: any) => {
  const url = `${API_BASE_URL}/api/v2/crpm/debt-by-station/${encodeURIComponent(filename)}`;
  const response = await axios.post(url, body); 
  return response.data;
};


export const getDebtByAccountClassData = async (filename: string , body:any) =>{
  const url = `${API_BASE_URL}/api/v2/crpm/debt-by-account-class/${encodeURIComponent(filename)}`;
  const response = await axios.post<DebtByAccountClassApiResponse>(url, body);
  return response.data;
}

export const getDebtByAdidData = async (filename: string, body: any) => {
  const url = `${API_BASE_URL}/api/v2/crpm/debt-by-adid/${encodeURIComponent(filename)}`;
  const response = await axios.post<DebtByAccountByADIDApiResponse>(url, body);
  return response.data;
};

export const getDebtByStaffData = async (filename: string, body: any) => {
  const url = `${API_BASE_URL}/api/v2/crpm/debt-by-staff/${encodeURIComponent(filename)}`;
  const response = await axios.post<DebtByStaffApiResponse>(url, body);
  return response.data;
}

export const getDebtBySmerSegmentData = async (
  filename: string,
  body: any
): Promise<DebtBySmerSegmentApiResponse> => {
  const url = `${API_BASE_URL}/api/v2/crpm/debt-by-smer-segment/${encodeURIComponent(filename)}`;
  const response = await axios.post<DebtBySmerSegmentApiResponse>(url, body);
  return response.data;
};

export const getDetailedTableData = async (
  filename: string,
  params: any,
  query: { limit?: number; sortField?: string; sortDirection?: 'ASC' | 'DESC'; cursor?: string } = {}
): Promise<DetailedTableApiResponse> => {
  // Build path string (works when API_BASE_URL is empty or absolute)
  const path = `${API_BASE_URL}/api/v2/crpm/detailed-table/${encodeURIComponent(filename)}`;

  // Append query params safely for relative or absolute URLs
  const searchParams = new URLSearchParams();
  if (query.limit) searchParams.append('limit', String(query.limit));
  if (query.sortField) searchParams.append('sortField', query.sortField);
  if (query.sortDirection) searchParams.append('sortDirection', query.sortDirection);
  if (query.cursor) searchParams.append('cursor', query.cursor);

  const url = searchParams.toString() ? `${path}?${searchParams.toString()}` : path;

  const response = await axios.post<DetailedTableApiResponse>(url, params);
  return response.data;
};

export const getAllDataFromParquet = async (
  filename: string
): Promise<void> => {
  const url = `${API_BASE_URL}/api/v2/crpm/alldata/${encodeURIComponent(filename)}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch all data as Excel');
  const blob = await response.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = downloadUrl;
  a.download = `FULLDATA CRPM Aging - ${filename.replace(/\.parquet$/i, '.xlsx')}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(downloadUrl);
};

export const getDriverTreeSummary = async (filename: string) => {
  const url = `${API_BASE_URL}/api/v2/crpm/driver-tree-summary/${encodeURIComponent(filename)}`;
  const response = await axios.post(url);
  return response.data;
};

export const getDirectedGraphSummary = async (filename: string) => {
   const url = `${API_BASE_URL}/api/v2/crpm/directed-graph-summary/${encodeURIComponent(filename)}`;
   const response = await axios.post(url);
   return response.data;
 };