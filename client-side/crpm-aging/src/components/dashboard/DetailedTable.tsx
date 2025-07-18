import React, { useState, useMemo } from 'react';
import Card from '../ui/Card';
import Table from '../ui/Table';
import Dropdown from '../ui/Dropdown';
import { formatMonthsOutstanding, getMonthsOutstandingBracket, getBracketColor, getBracketBackgroundColor, getBracketTextColor } from '../../utils/formatter';

interface DetailedTableProps {
  data: any[];
  loading?: boolean;
  viewType: 'tradeReceivable' | 'agedDebt';
  onViewTypeChange: (viewType: 'tradeReceivable' | 'agedDebt') => void;
  filters: {
    // MIT filters (local to DetailedTable)
    mitFilter: string;
    onMitFilterChange: (value: string) => void;
    mitFilterOptions: { value: string; label: string }[];
    monthsOutstandingBracket: string;
    onMonthsOutstandingBracketChange: (value: string) => void;
    monthsOutstandingBracketOptions: { value: string; label: string }[];
    
    // Global filters (from FilterSection)
    businessArea: string;
    accStatus: string;
    accClass: string;
    accDefinition: string;
    netPositiveBalance: string;
    
    // Add governmentType filter
    governmentType?: string;
  };
}

const DetailedTable: React.FC<DetailedTableProps> = ({
  data,
  loading = false,
  filters,
  viewType,
  onViewTypeChange: _onViewTypeChange
}) => {
  const [page, setPage] = useState(1);
  const rowsPerPage = 10;
  
  // Filter data based on governmentType
  const filteredData = useMemo(() => {
    let filteredRecords = [...data];
    
    // Apply government type filter if available
    if (filters.governmentType === 'government') {
      // Show only account classes ending with 'G' (OPCG, LPCG)
      filteredRecords = filteredRecords.filter(item => 
        item.accClass?.endsWith('G')
      );
    } else if (filters.governmentType === 'non-government') {
      // Show only account classes ending with 'N' (OPCN, LPCN)
      filteredRecords = filteredRecords.filter(item => 
        item.accClass?.endsWith('N')
      );
    }
    
    return filteredRecords;
  }, [data, filters.governmentType]);
  
  // Base columns that appear in both views
  const baseColumns = [
    { 
      header: 'Business Area', 
      accessor: 'businessArea',
      align: 'left' as const
    },
    { 
      header: 'Station', 
      accessor: 'station',
      align: 'left' as const
    },
    { 
      header: 'Contract Acc', 
      accessor: 'contractAcc',
      align: 'left' as const
    },
    { 
      header: 'Contract Account Name', 
      accessor: 'contractAccountName',
      align: 'left' as const
    },
    {
      header: 'ADID', 
      accessor: 'accDefinition',
      align: 'left' as const,
      cell: (value: string) => <span className="font-medium text-gray-800">{value || '-'}</span>
    },
    { 
      header: 'Account Class', 
      accessor: 'accClass',
      align: 'left' as const,
      cell: (value: string) => <span className="text-gray-600">{value || '-'}</span>
    },
    { 
      header: 'Acc Status', 
      accessor: 'accStatus',
      align: 'left' as const
    },
    { 
      header: 'No of Months Outstanding', 
      accessor: 'monthsOutstanding',
      align: 'center' as const,
      cell: (value: number) => {
        const formattedValue = formatMonthsOutstanding(value);
        return <span className="font-medium text-gray-800">{formattedValue}</span>;
      }
    },
    { 
      header: 'Outstanding Range', 
      accessor: 'monthsOutstanding',
      align: 'center' as const,
      cell: (value: number) => {
        const bracket = getMonthsOutstandingBracket(value);
        const bracketColor = getBracketColor(bracket);
        const backgroundColor = getBracketBackgroundColor(bracket);
        const textColor = getBracketTextColor(bracket);
        
        return (
          <span 
            className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border"
            style={{ 
              backgroundColor: backgroundColor,
              color: textColor,
              borderColor: bracketColor + '40' // Add transparency to border
            }}
          >
            {bracket}
          </span>
        );
      }
    },
       { 
      header: 'Staff ID', 
      accessor: 'staffId',
      align: 'left' as const
    },
       { 
      header: 'MIT Amount', 
      accessor: 'mit',
      align: 'left' as const,
      cell: (value: number) => {
        if (filters.mitFilter === 'non-mit') {
          return <span className="text-gray-400">-</span>;
        }
        return (
          <span className="font-medium text-gray-700">
            {value ? `RM ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
          </span>
        );
      }
    },
    { 
      header: 'Last Payment Date', 
      accessor: 'lastPymtDate',
      align: 'center' as const,
      cell: (value: string) => <span className="text-gray-600">{value || '-'}</span>
    },
    { 
      header: 'Last Payment Amount', 
      accessor: 'lastPymtAmt',
      align: 'right' as const,
      cell: (value: number) => (
        <span className="font-medium text-gray-700">
          {value ? `RM ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
        </span>
      )
      }
    ];

  // Additional columns for Trade Receivable view
  const tradeReceivableColumns = [
    { 
      header: 'Total Undue', 
      accessor: 'totalUndue',
      align: 'right' as const,
      cell: (value: number) => (
        <span className="font-medium text-blue-600">
          RM {value?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
        </span>
      )
    },
    { 
      header: 'Cur.Mth Unpaid', 
      accessor: 'curMthUnpaid',
      align: 'right' as const,
      cell: (value: number) => (
        <span className="font-medium text-orange-600">
          RM {value?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
        </span>
      )
    },
    { 
      header: 'TTL O/S Amt', 
      accessor: 'ttlOsAmt',
      align: 'right' as const,
      cell: (value: number) => (
        <span className="font-bold text-red-600">
          RM {value?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
        </span>
      )
    },
    { 
      header: 'Total Unpaid', 
      accessor: 'totalUnpaid',
      align: 'right' as const,
      cell: (value: number) => (
        <span className="font-bold text-gray-900">
          RM {value?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
        </span>
      )
    }
  ];

  // Aged Debt view columns - only show TTL O/S Amt
  const agedDebtColumns = [
    { 
      header: 'TTL O/S Amt', 
      accessor: 'totalOutstandingAmt',
      align: 'right' as const,
      cell: (value: number) => (
        <span className={`font-bold ${value > 0 ? 'text-red-600' : 'text-green-600'}`}>
          RM {Math.abs(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      )
    }
  ];


  // Combine columns based on view type
  const columns = viewType === 'tradeReceivable' 
    ? [...baseColumns, ...tradeReceivableColumns]
    : [...baseColumns, ...agedDebtColumns];
  
  // Calculate pagination based on filtered data
  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const paginatedData = filteredData.slice((page - 1) * rowsPerPage, page * rowsPerPage);
  
  const headerRight = (
    <div className="flex flex-wrap gap-3 items-center">
      {/* Range Bracket Filter */}
      <div className="space-y-1">
        <label className="block text-xs font-medium text-gray-600">
          Outstanding Range
        </label>
        <Dropdown
          options={filters.monthsOutstandingBracketOptions}
          value={filters.monthsOutstandingBracket}
          onChange={filters.onMonthsOutstandingBracketChange}
          placeholder="All Ranges"
          className="min-w-[140px]"
        />
      </div>
    </div>
  );
  
  return (
    <Card title="Detailed Customer Data" headerRight={headerRight}>
      <Table 
        columns={columns} 
        data={paginatedData} 
        loading={loading}
        emptyMessage="No customer data available"
      />
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-4">
          <div className="flex flex-1 justify-between sm:hidden">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className={`relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 ${page === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}
            >
              Previous
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className={`relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 ${page === totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{Math.min(1 + (page - 1) * rowsPerPage, data.length)}</span> to <span className="font-medium">{Math.min(page * rowsPerPage, data.length)}</span> of{' '}
                <span className="font-medium">{data.length}</span> results
              </p>
            </div>
            <div>
              <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className={`relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 ${page === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}
                >
                  <span className="sr-only">Previous</span>
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                  </svg>
                </button>
                
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum = i + 1;
                  if (totalPages > 5) {
                    if (page > 3) {
                      pageNum = page - 3 + i;
                      if (pageNum > totalPages) {
                        pageNum = totalPages - 4 + i;
                      }
                    }
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                        page === pageNum ? 'z-10 bg-blue-600 text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600' 
                        : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className={`relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 ${page === totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}
                >
                  <span className="sr-only">Next</span>
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                  </svg>
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default DetailedTable;