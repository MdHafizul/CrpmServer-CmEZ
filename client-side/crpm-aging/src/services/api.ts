import axios from 'axios';
import type { SummaryCardApiResponse, UploadResponse, DebtByAccountClassApiResponse, DebtByAccountByADIDApiResponse, DebtByStaffApiResponse,
  DebtBySmerSegmentApiResponse } from '../types/dashboard.type';


const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';


// Function to upload debt file
export const uploadDebtFile = async (file: File): Promise<UploadResponse> => {
  const url = `${API_BASE_URL}/api/v2/crpm/process`;
  const formData = new FormData();
  formData.append('file', file);

  const response = await axios.post<UploadResponse>(url, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

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