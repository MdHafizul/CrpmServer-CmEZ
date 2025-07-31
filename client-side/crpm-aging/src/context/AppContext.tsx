import React, { createContext, useContext, useState } from 'react';
import type { SummaryCardApiResponse, FilterOptions, DebtByStationApiResponse,DebtByAccountClassApiResponse, DebtByAccountByADIDApiResponse,DebtByStaffApiResponse,DebtBySmerSegmentApiResponse } from '../types/dashboard.type';
import { getSummaryCardData, getDebtByStationData, getDebtByAccountClassData, getDebtByAdidData, getDebtByStaffData, getDebtBySmerSegmentData} from '../services/api';

interface AppContextType {
  summaryCardData: SummaryCardApiResponse['data'] | null;
  loading: boolean;
  error: string | null;
  fetchSummaryCard: (filename: string) => Promise<void>;
  uploadedFile: File | null;
  setUploadedFile: (file: File | null) => void;
  filters: FiltersType;
  debtByStationData: DebtByStationApiResponse['data'] | null;
  fetchDebtByStation: (
    filename: string,
    params: {
      viewType: 'TR' | 'agedDebt';
      accClassType: 'GOVERNMENT' | 'NON_GOVERNMENT' | 'ALL';
      mitType: 'MIT' | 'NON_MIT' | 'ALL';
      businessAreas?: string[];
      adids?: string[];
      accStatus?: string | null;
      balanceType?: string | null;
      accountClass?: string;
      agingBucket?: string | null;
      totalOutstandingRange?: string | null;
      smerSegments?: string[];
    }
  ) => Promise<void>;
  debtByAccountClassData: DebtByAccountClassApiResponse['data'] | null;
  fetchDebtByAccountClass: (
    filename: string,
    params: {
      viewType: 'TR' | 'agedDebt';
      accClassType: 'GOVERNMENT' | 'NON_GOVERNMENT' | 'ALL';
      mitType: 'MIT' | 'NON_MIT' | 'ALL';
      businessAreas?: string[];
      adids?: string[];
      accStatus?: string | null;
      balanceType?: string | null;
      accountClass?: string;
      agingBucket?: string | null;
      totalOutstandingRange?: string | null;
      smerSegments?: string[];
    }
  ) => Promise<void>;

  debtByADIDData: DebtByAccountByADIDApiResponse['data'] | null;
  fetchDebtByADID: (
    filename: string,
    params: {
      viewType: 'TR' | 'agedDebt';
      accClassType: 'GOVERNMENT' | 'NON_GOVERNMENT' | 'ALL';
      mitType: 'MIT' | 'NON_MIT' | 'ALL';
      businessAreas?: string[];
      adids?: string[];
      accStatus?: string | null;
      balanceType?: string | null;
      accountClass?: string;
      agingBucket?: string | null;
      totalOutstandingRange?: string | null;
      smerSegments?: string[];
    }
  ) => Promise<void>;

  debtByStaffData: DebtByStaffApiResponse['data'] | null;
  fetchDebtByStaff: (
    filename: string,
    params: {
      viewType: 'TR' | 'agedDebt';
      businessAreas?: string[];
    }
  ) => Promise<void>;
  debtBySmerSegmentData: DebtBySmerSegmentApiResponse['data'] | null;
  fetchDebtBySmerSegment: (
    filename: string,
    params: {
      viewType: 'TR' | 'agedDebt';
      accClassType: 'GOVERNMENT' | 'NON_GOVERNMENT' | 'ALL';
      mitType: 'MIT' | 'NON_MIT' | 'ALL';
      businessAreas?: string[];
      adids?: string[];
      accStatus?: string | null;
      balanceType?: string | null;
      accountClass?: string;
      agingBucket?: string | null;
      totalOutstandingRange?: string | null;
      smerSegments?: string[];
    }
  ) => Promise<void>;
  parquetFileName: string | null;
  setParquetFileName: (fileName: string | null) => void;
}

interface FiltersType {
  businessArea: string;
  setBusinessArea: (value: string) => void;
  onBusinessAreaChange: (value: string) => void;
  businessAreaOptions: FilterOptions[];

  businessAreas: string[];
  setBusinessAreas: (value: string[]) => void;

  accStatus: string;
  setAccStatus: (value: string) => void;
  onAccStatusChange: (value: string) => void;
  accStatusOptions: FilterOptions[];

  netPositiveBalance: string;
  setNetPositiveBalance: (value: string) => void;
  onNetPositiveBalanceChange: (value: string) => void;
  netPositiveBalanceOptions: FilterOptions[];

  accClass: string;
  setAccClass: (value: string) => void;
  onAccClassChange: (value: string) => void;
  accClassOptions: FilterOptions[];

  accDefinition: string;
  setAccDefinition: (value: string) => void;
  onAccDefinitionChange: (value: string) => void;
  accDefinitionOptions: FilterOptions[];

  accDefinitions: string[];
  setAccDefinitions: (value: string[]) => void;

  governmentType: string;
  setGovernmentType: (value: string) => void;
  onGovernmentTypeChange: (value: string) => void;
  governmentTypeOptions: FilterOptions[];

  mitFilter: string;
  setMitFilter: (value: string) => void;
  onMitFilterChange: (value: string) => void;
  mitFilterOptions: FilterOptions[];

  monthsOutstandingBracket: string;
  setMonthsOutstandingBracket: (value: string) => void;
  onMonthsOutstandingBracketChange: (value: string) => void;
  monthsOutstandingBracketOptions: FilterOptions[];

  debtRange: string;
  setDebtRange: (value: string) => void;
  onDebtRangeChange: (value: string) => void;
  debtRangeOptions: FilterOptions[];

  smerSegmentOptions: FilterOptions[];
  smerSegments: string[];
  setSmerSegments: (value: string[]) => void;

  viewType: 'tradeReceivable' | 'agedDebt';
  setViewType: (value: 'tradeReceivable' | 'agedDebt') => void;
  onViewTypeChange: (value: 'tradeReceivable' | 'agedDebt') => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
}

const PARQUET_FILENAME_CACHE_KEY = 'parquetFileNameCache';
const PARQUET_FILENAME_TTL_MS = 10 * 60 * 1000; // 10 minutes

function setParquetFileNameCache(fileName: string | null) {
  if (fileName) {
    const cacheObj = {
      value: fileName,
      expires: Date.now() + PARQUET_FILENAME_TTL_MS
    };
    localStorage.setItem(PARQUET_FILENAME_CACHE_KEY, JSON.stringify(cacheObj));
  } else {
    localStorage.removeItem(PARQUET_FILENAME_CACHE_KEY);
  }
}

function getParquetFileNameCache(): string | null {
  const raw = localStorage.getItem(PARQUET_FILENAME_CACHE_KEY);
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw);
    if (obj.expires && obj.expires > Date.now()) {
      return obj.value;
    } else {
      localStorage.removeItem(PARQUET_FILENAME_CACHE_KEY);
      return null;
    }
  } catch {
    localStorage.removeItem(PARQUET_FILENAME_CACHE_KEY);
    return null;
  }
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Filters state and functions
  const [businessArea, setBusinessArea] = useState('');
  const [businessAreas, setBusinessAreas] = useState<string[]>([]);
  const [accDefinition, setAccDefinition] = useState('');
  const [accDefinitions, setAccDefinitions] = useState<string[]>([]);
  const [accStatus, setAccStatus] = useState('');
  const [accClass, setAccClass] = useState('');
  const [debtRange, setDebtRange] = useState('');
  const [viewType, setViewType] = useState<'tradeReceivable' | 'agedDebt'>('tradeReceivable');
  const [governmentType, setGovernmentType] = useState('');
  const [mitFilter, setMitFilter] = useState('');
  const [netPositiveBalance, setNetPositiveBalance] = useState('');
  const [monthsOutstandingBracket, setMonthsOutstandingBracket] = useState('');
  const [smerSegments, setSmerSegments] = useState<string[]>([]);
  const [debtByStationData, setDebtByStationData] = useState<DebtByStationApiResponse['data'] | null>(null);
  const [debtByAccountClassData, setDebtByAccountClassData] = useState<DebtByAccountClassApiResponse['data'] | null>(null);
  const [debtByADIDData, setDebtByADIDData] = useState<DebtByAccountByADIDApiResponse['data'] | null>(null);
  const [debtByStaffData, setDebtByStaffData] = useState<DebtByStaffApiResponse['data'] | null>(null);
  const [debtBySmerSegmentData, setDebtBySmerSegmentData] = useState<DebtBySmerSegmentApiResponse['data'] | null>(null);
  const [parquetFileName, setParquetFileNameState] = useState<string | null>(() => getParquetFileNameCache());

  // Debug: log parquetFileName whenever it changes
  React.useEffect(() => {
    console.log('[AppContext] parquetFileName:', parquetFileName);
  }, [parquetFileName]);

  // Debug: log when AppProvider renders
  console.log('[AppContext] AppProvider render, parquetFileName:', parquetFileName);


  // State for summary card data and related properties
  const [summaryCardData, setSummaryCardData] = useState<SummaryCardApiResponse['data'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  // Function to fetch summary card data
    const fetchSummaryCard = async (filename: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getSummaryCardData(filename);
      setSummaryCardData(result.data);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch data');
      setSummaryCardData(null);
    } finally {
      setLoading(false);
    }
  };

  // Function to fetch debt summary by station
  const fetchDebtByStation = async (
    filename: string,
    params: {
      viewType: 'TR' | 'agedDebt';
      accClassType: 'GOVERNMENT' | 'NON_GOVERNMENT' | 'ALL';
      mitType: 'MIT' | 'NON_MIT' | 'ALL';
      businessAreas?: string[];
      adids?: string[];
      accStatus?: string | null;
      balanceType?: string | null;
      accountClass?: string;
      agingBucket?: string | null;
      totalOutstandingRange?: string | null;
      smerSegments?: string[];
    }
  ) => {
    setLoading(true);
    setError(null);
    try {
      // Correct: send params as POST body, not as { params }
      const result = await getDebtByStationData(filename, params);
      setDebtByStationData(result.data);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch debt by station');
      setDebtByStationData(null);
    } finally {
      setLoading(false);
    }
  };

  // Function to fetch debt summary by account class
  const fetchDebtByAccountClass = async (
    filename: string,
    params: {
      viewType: 'TR' | 'agedDebt';
      accClassType: 'GOVERNMENT' | 'NON_GOVERNMENT' | 'ALL';
      mitType: 'MIT' | 'NON_MIT' | 'ALL';
      businessAreas?: string[];
      adids?: string[];
      accStatus?: string | null;
      balanceType?: string | null;
      accountClass?: string;
      agingBucket?: string | null;
      totalOutstandingRange?: string | null;
      smerSegments?: string[];
    }
  ) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getDebtByAccountClassData(filename, params);
      setDebtByAccountClassData(result.data);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch debt by account class');
      setDebtByAccountClassData(null);
    } finally {
      setLoading(false);
    }
  };

  //function to fetch debt summary by ADID
  const fetchDebtByADID = async (
    filename: string,
    params: {
      viewType: 'TR' | 'agedDebt';
      accClassType: 'GOVERNMENT' | 'NON_GOVERNMENT' | 'ALL';
      mitType: 'MIT' | 'NON_MIT' | 'ALL';
      businessAreas?: string[];
      adids?: string[];
      accStatus?: string | null;
      balanceType?: string | null;
      accountClass?: string;
      agingBucket?: string | null;
      totalOutstandingRange?: string | null;
      smerSegments?: string[];
    }
  ) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getDebtByAdidData(filename, params);
      setDebtByADIDData(result.data);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch debt by ADID');
      setDebtByADIDData(null);
    } finally {
      setLoading(false);
    }
  };

  //function to fetch debt summary by staff
  const fetchDebtByStaff = async (
    filename: string,
    params: {
      viewType: 'TR' | 'agedDebt';
      businessAreas?: string[];
    }
  ) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getDebtByStaffData(filename, params);
      setDebtByStaffData(result.data);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch debt by staff');
      setDebtByStaffData(null);
    } finally {
      setLoading(false);
    }
  }

  
  const fetchDebtBySmerSegment = async (
    filename: string,
    params: {
      viewType: 'TR' | 'agedDebt';
      accClassType: 'GOVERNMENT' | 'NON_GOVERNMENT' | 'ALL';
      mitType: 'MIT' | 'NON_MIT' | 'ALL';
      businessAreas?: string[];
      adids?: string[];
      accStatus?: string | null;
      balanceType?: string | null;
      accountClass?: string;
      agingBucket?: string | null;
      totalOutstandingRange?: string | null;
      smerSegments?: string[];
    }
  ) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getDebtBySmerSegmentData(filename, params);
      setDebtBySmerSegmentData(result.data);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch debt by SMER segment');
      setDebtBySmerSegmentData(null);
    } finally {
      setLoading(false);
    }
  };


  // Filter options
  const businessAreaOptions: FilterOptions[] = [
    { value: 'all', label: 'All Business Areas' },
    { value: '6210', label: 'TNB IPOH' },
    { value: '6211', label: 'TNB KAMPAR' },
    { value: '6212', label: 'TNB BIDOR' },
    { value: '6213', label: 'TNB TANJONG MALIM' },
    { value: '6218', label: 'TNB SERI ISKANDAR' },
    { value: '6219', label: 'TNB ULU KINTA' },
    { value: '6220', label: 'TNB TAIPING' },
    { value: '6221', label: 'TNB BATU GAJAH' },
    { value: '6222', label: 'TNB KUALA KANGSAR' },
    { value: '6223', label: 'TNB GERIK' },
    { value: '6224', label: 'TNB BAGAN SERAI' },
    { value: '6225', label: 'TNB SG. SIPUT' },
    { value: '6227', label: 'TNB SRI MANJUNG' },
    { value: '6250', label: 'TNB TELUK INTAN' },
    { value: '6252', label: 'TNB HUTAN MELINTANG' },
  ];

  const accStatusOptions: FilterOptions[] = [
    { value: 'all', label: 'All Statuses' },
    { value: 'Active', label: 'Active' },
    { value: 'Inactive', label: 'Inactive' },
  ];

  const netPositiveBalanceOptions: FilterOptions[] = [
    { value: 'all', label: 'All Balances' },
    { value: 'Positive', label: 'Positive Balance' },
    { value: 'Negative', label: 'Negative Balance' },
  ];

  const accClassOptions: FilterOptions[] = [
    { value: 'all', label: 'All Classes' },
    { value: 'LPCG', label: 'LPCG' },
    { value: 'LPCN', label: 'LPCN' },
    { value: 'OPCG', label: 'OPCG' },
    { value: 'OPCN', label: 'OPCN' },
  ];

  const accDefinitionOptions: FilterOptions[] = [
    { value: 'all', label: 'All' },
    { value: 'AG', label: 'AG' },
    { value: 'CM', label: 'CM' },
    { value: 'DM', label: 'DM' },
    { value: 'IN', label: 'IN' },
    { value: 'SL', label: 'SL' },
    { value: 'MN', label: 'MN' },
  ];

  const governmentTypeOptions: FilterOptions[] = [
    { value: 'all', label: 'All Types' },
    { value: 'government', label: 'Government' },
    { value: 'non-government', label: 'Non-Government' },
  ];

  const mitFilterOptions: FilterOptions[] = [
    { value: 'all', label: 'All' },
    { value: 'mit', label: 'MIT' },
    { value: 'non-mit', label: 'Non-MIT' },
  ];

  const monthsOutstandingBracketOptions: FilterOptions[] = [
    { value: 'all', label: 'All Ranges' },
    { value: '0-3', label: '0-3 Months' },
    { value: '3-6', label: '3-6 Months' },
    { value: '6-9', label: '6-9 Months' },
    { value: '9-12', label: '9-12 Months' },
    { value: '>12', label: '>12 Months' },
  ];

  const debtRangeOptions: FilterOptions[] = [
    { value: 'all', label: 'All Debt Ranges' },
    { value: '0.01-200', label: 'RM0.01 - RM200' },
    { value: '201-500', label: 'RM201 - RM500' },
    { value: '501-1000', label: 'RM501 - RM1,000' },
    { value: '1001-3000', label: 'RM1,001 - RM3,000' },
    { value: '3001-5000', label: 'RM3,001 - RM5,000' },
    { value: '5001-10000', label: 'RM5,001 - RM10,000' },
    { value: '10001-30000', label: 'RM10,001 - RM30,000' },
    { value: '30001-50000', label: 'RM30,001 - RM50,000' },
    { value: '50001-100000', label: 'RM50,001 - RM100,000' },
    { value: '100001+', label: 'RM100,000+' },
  ];

  const smerSegmentOptions: FilterOptions[] = [
    { value: 'all', label: 'All Segments' },
    { value: 'EMRB', label: 'EMRB' },
    { value: 'GNLA', label: 'GNLA' },
    { value: 'HRES', label: 'HRES' },
    { value: 'MASR', label: 'MASR' },
    { value: 'MEDB', label: 'MEDB' },
    { value: 'MICB', label: 'MICB' },
    { value: 'SMLB', label: 'SMLB' },
    { value: 'BLANK', label: 'BLANKS' },
  ];

  const filters: FiltersType = {
    businessArea,
    setBusinessArea,
    onBusinessAreaChange: setBusinessArea,
    businessAreaOptions,
    businessAreas,
    setBusinessAreas,
    accStatus,
    setAccStatus,
    onAccStatusChange: setAccStatus,
    accStatusOptions,
    netPositiveBalance,
    setNetPositiveBalance,
    onNetPositiveBalanceChange: setNetPositiveBalance,
    netPositiveBalanceOptions,
    accClass,
    setAccClass,
    onAccClassChange: setAccClass,
    accClassOptions,
    accDefinition,
    setAccDefinition,
    onAccDefinitionChange: setAccDefinition,
    accDefinitionOptions,
    accDefinitions,
    setAccDefinitions,
    governmentType,
    setGovernmentType,
    onGovernmentTypeChange: setGovernmentType,
    governmentTypeOptions,
    mitFilter,
    setMitFilter,
    onMitFilterChange: setMitFilter,
    mitFilterOptions,
    monthsOutstandingBracket,
    setMonthsOutstandingBracket,
    onMonthsOutstandingBracketChange: setMonthsOutstandingBracket,
    monthsOutstandingBracketOptions,
    debtRange,
    setDebtRange,
    onDebtRangeChange: setDebtRange,
    debtRangeOptions,
    smerSegmentOptions,
    smerSegments,
    setSmerSegments,
    viewType,
    setViewType,
    onViewTypeChange: setViewType,
  };

  const setParquetFileName = (fileName: string | null) => {
    setParquetFileNameState(fileName);
    setParquetFileNameCache(fileName);
  };

  return (
    <AppContext.Provider value={{
      summaryCardData,
      loading,
      error,
      fetchSummaryCard,
      uploadedFile,
      setUploadedFile,
      filters,
      debtByStationData,
      fetchDebtByStation,
      debtByAccountClassData,
      fetchDebtByAccountClass,
      debtByADIDData,
      fetchDebtByADID,
      debtByStaffData,
      fetchDebtByStaff,
      debtBySmerSegmentData,
      fetchDebtBySmerSegment,
      parquetFileName,
      setParquetFileName
    }}>
      {children}
    </AppContext.Provider>
  );
};