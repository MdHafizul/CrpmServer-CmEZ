import React, { useEffect, useState, useMemo } from 'react';
import Card from '../ui/Card';
import Table from '../ui/Table';
import Dropdown from '../ui/Dropdown';
import Skeleton from '../ui/Skeleton';
import { useAppContext } from '../../context/AppContext';
import { formatMonthsOutstanding, getMonthsOutstandingBracket, getBracketColor, getBracketBackgroundColor, getBracketTextColor } from '../../utils/formatter';

interface DetailedTableProps {
  filters: any;
}

const PAGE_SIZE = 100;

const DetailedTable: React.FC<DetailedTableProps> = ({ filters }) => {
  const { parquetFileName, fetchDetailedTable, detailedTableData, loading } = useAppContext();
  const [sortField, setSortField] = useState<string>('Contract Acc');
  const [sortDirection, setSortDirection] = useState<'ASC' | 'DESC'>('ASC');
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  // Compose API params from filters
  const getApiParams = () => ({
    viewType: filters.viewType === 'tradeReceivable' ? 'TR' : 'AgedDebt',
    accClassType:
      filters.governmentType === 'government'
        ? 'GOVERNMENT'
        : filters.governmentType === 'non-government'
        ? 'NON_GOVERNMENT'
        : 'ALL',
    mitType:
      filters.mitFilter === 'mit'
        ? 'MIT'
        : filters.mitFilter === 'non-mit'
        ? 'NON_MIT'
        : 'ALL',
    businessAreas: filters.businessAreas,
    adids: filters.accDefinitions,
    accStatus: filters.accStatus !== 'all' ? filters.accStatus : null,
    balanceType: filters.netPositiveBalance !== 'all' ? filters.netPositiveBalance : null,
    accountClass: filters.accClass !== 'all' ? filters.accClass : '',
    agingBucket: filters.monthsOutstandingBracket !== 'all' ? filters.monthsOutstandingBracket : null,
    totalOutstandingRange: filters.debtRange && filters.debtRange !== 'all'
      ? (() => {
          if (filters.debtRange.endsWith('+')) {
            const min = parseFloat(filters.debtRange.replace('+', ''));
            return { min, max: null };
          }
          const [min, max] = filters.debtRange.split('-').map(Number);
          return { min, max };
        })()
      : null,
    smerSegments: filters.smerSegments,
  });

  // Fetch data on mount and when filters/sort/cursor change
  useEffect(() => {
    if (!parquetFileName) return;
    fetchDetailedTable(parquetFileName, getApiParams(), {
      limit: PAGE_SIZE,
      sortField,
      sortDirection,
      cursor,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parquetFileName, JSON.stringify(filters), sortField, sortDirection, cursor]);

  // Filter data based on governmentType
  const filteredData = useMemo(() => {
    let filteredRecords = [...(detailedTableData?.items || [])];
    
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
  }, [detailedTableData?.items, filters.governmentType]);
  
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
      accessor: 'adid',
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
      accessor: 'noOfMonthsOutstanding',
      align: 'center' as const,
      cell: (value: number) => {
        const formattedValue = formatMonthsOutstanding(value);
        return <span className="font-medium text-gray-800">{formattedValue}</span>;
      }
    },
    { 
      header: 'Outstanding Range', 
      accessor: 'noOfMonthsOutstanding',
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
      accessor: 'mitAmt',
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
      accessor: 'ttlOSAmt',
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
      accessor: 'ttlOSAmt', 
      align: 'right' as const,
      cell: (value: number) => (
        <span className={`font-bold ${value > 0 ? 'text-red-600' : 'text-green-600'}`}>
          RM {Math.abs(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      )
    }
  ];


  // Combine columns based on view type
  const columns = filters.viewType === 'tradeReceivable' 
    ? [...baseColumns, ...tradeReceivableColumns]
    : [...baseColumns, ...agedDebtColumns];
  
  // Calculate pagination based on filtered data
  const totalPages = Math.ceil((detailedTableData?.items?.length || 0) / PAGE_SIZE);
  const paginatedData = filteredData.slice(0, PAGE_SIZE);
  
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
  
  function handleNext(event: React.MouseEvent<HTMLButtonElement, MouseEvent>): void {
    // Set the cursor to the next page's cursor if available
    if (detailedTableData?.pagination?.nextCursor) {
      setCursor(detailedTableData.pagination.nextCursor);
    }
  }

  return (
    <Card title="Detailed Customer Data" headerRight={headerRight}>
      {loading ? (
        <div>
          {/* Skeleton Table Header */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {columns.map((col, idx) => (
                    <th key={idx} className="px-6 py-3">
                      <Skeleton width={80} height={20} className="mx-auto" />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...Array(PAGE_SIZE)].map((_, i) => (
                  <tr key={i}>
                    {columns.map((col, idx) => (
                      <td key={idx} className="px-6 py-4">
                        <Skeleton height={18} width="90%" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Skeleton Pagination */}
          <div className="mt-4 flex justify-between">
            <Skeleton height={32} width="40%" className="rounded" />
            <Skeleton height={32} width="40%" className="rounded" />
          </div>
        </div>
      ) : (
        <>
          <Table 
            columns={columns} 
            data={paginatedData} 
            loading={false}
            emptyMessage="No customer data available"
          />
          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-4">
            <button
              onClick={() => setCursor(undefined)}
              disabled={!cursor}
              className={`relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 ${!cursor ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}
            >
              Previous
            </button>
            <span className="text-sm text-gray-700">
              Showing {detailedTableData?.items?.length || 0} rows
            </span>
            <button
              onClick={handleNext}
              disabled={!detailedTableData?.pagination?.hasMore}
              className={`relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 ${!detailedTableData?.pagination?.hasMore ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}
            >
              Next
            </button>
          </div>
        </>
      )}
    </Card>
  );
};

export default DetailedTable;