import React, { useMemo } from 'react';
import Card from '../ui/Card';
import Table from '../ui/Table';
import Dropdown from '../ui/Dropdown';

interface DebtByStationData {
  businessArea: string;
  station: string;
  numOfAccounts: number;
  debtAmount: number;
  // Additional fields for Trade Receivable view
  totalUndue?: number;
  curMthUnpaid?: number;
  ttlOsAmt?: number;
  totalUnpaid?: number;
}

interface DebtByStationTableProps {
  data: DebtByStationData[];
  loading?: boolean;
  title?: string;
  viewType: 'tradeReceivable' | 'agedDebt';
  onViewTypeChange: (viewType: 'tradeReceivable' | 'agedDebt') => void;
  filters?: {
    businessArea: string;
    onBusinessAreaChange: (value: string) => void;
    businessAreaOptions: { value: string; label: string }[];
  };
}

const DebtByStationTable: React.FC<DebtByStationTableProps> = ({
  data,
  loading = false,
  title = 'Summary Aged Debt by Station',
  viewType,
  filters
}) => {
  // Calculate totals first for percentage calculations
  const totals = useMemo(() => ({
    numOfAccounts: data.reduce((sum, item) => sum + item.numOfAccounts, 0),
    debtAmount: data.reduce((sum, item) => sum + item.debtAmount, 0),
    totalUndue: data.reduce((sum, item) => sum + (item.totalUndue || 0), 0),
    curMthUnpaid: data.reduce((sum, item) => sum + (item.curMthUnpaid || 0), 0),
    ttlOsAmt: data.reduce((sum, item) => sum + (item.ttlOsAmt || 0), 0),
    totalUnpaid: data.reduce((sum, item) => sum + (item.totalUnpaid || 0), 0)
  }), [data]);

  // Add percentage and sort data
  const processedData = useMemo(() => {
    // Calculate which total to use based on view type
    const totalToUse = viewType === 'tradeReceivable' ? totals.ttlOsAmt : totals.debtAmount;
    
    // Add percentage to each row
    const withPercentages = data.map(item => {
      const valueToUse = viewType === 'tradeReceivable' ? (item.ttlOsAmt || 0) : item.debtAmount;
      return {
        ...item,
        percentage: totalToUse > 0 ? (valueToUse / totalToUse) * 100 : 0
      };
    });
    
    // Sort by percentage in descending order
    return [...withPercentages].sort((a, b) => b.percentage - a.percentage);
  }, [data, totals, viewType]);

  const baseColumns = [
    { 
      header: 'Business Area', 
      accessor: 'businessArea',
      align: 'left' as const,
      cell: (value: string) => (
        <span className={`font-medium ${value === 'Grand Total' ? 'text-blue-600 font-bold' : 'text-gray-900'}`}>
          {value}
        </span>
      )
    },
    { 
      header: 'Station', 
      accessor: 'station',
      align: 'left' as const,
      cell: (value: string, row: any) => (
        <span className={`font-medium ${row.businessArea === 'Grand Total' ? 'text-blue-600 font-bold' : 'text-gray-700'}`}>
          {value}
        </span>
      )
    },
    { 
      header: 'Number of Accounts', 
      accessor: 'numOfAccounts',
      align: 'right' as const,
      cell: (value: number, row: any) => (
        <span className={`font-medium ${row.businessArea === 'Grand Total' ? 'text-blue-600 font-bold text-lg' : ''}`}>
          {value.toLocaleString()}
        </span>
      )
    }
  ];

  // Aged Debt view columns - with totals row styling
  const agedDebtColumns = [
    { 
      header: 'TTL O/S Amt', 
      accessor: 'debtAmount',
      align: 'right' as const,
      cell: (value: number, row: any) => (
        <span className={`${row.businessArea === 'Grand Total' ? 'font-bold text-blue-600 text-lg' : 'font-bold text-gray-900'}`}>
          RM {value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      )
    },
    { 
      header: '% of Total', 
      accessor: 'percentage',
      align: 'right' as const,
      cell: (value: number, row: any) => (
        <span className={`${row.businessArea === 'Grand Total' ? 'font-bold text-blue-600 text-lg' : 'font-medium text-gray-900'}`}>
          {row.businessArea === 'Grand Total' ? '100.00%' : value.toFixed(2) + '%'}
        </span>
      )
    }
  ];

  // Additional columns for Trade Receivable view - with totals row styling
  const tradeReceivableColumns = [
    { 
      header: 'Total Undue', 
      accessor: 'totalUndue',
      align: 'right' as const,
      cell: (value: number, row: any) => (
        <span className={`font-medium ${row.businessArea === 'Grand Total' ? 'text-blue-600 font-bold text-lg' : 'text-blue-600'}`}>
          RM {value?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
        </span>
      )
    },
    { 
      header: 'Cur.Mth Unpaid', 
      accessor: 'curMthUnpaid',
      align: 'right' as const,
      cell: (value: number, row: any) => (
        <span className={`font-medium ${row.businessArea === 'Grand Total' ? 'text-blue-600 font-bold text-lg' : 'text-orange-600'}`}>
          RM {value?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
        </span>
      )
    },
    { 
      header: 'TTL O/S Amt', 
      accessor: 'ttlOsAmt',
      align: 'right' as const,
      cell: (value: number, row: any) => (
        <span className={`${row.businessArea === 'Grand Total' ? 'font-bold text-blue-600 text-lg' : 'font-bold text-red-600'}`}>
          RM {value?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
        </span>
      )
    },
    { 
      header: '% of Total', 
      accessor: 'percentage',
      align: 'right' as const,
      cell: (value: number, row: any) => (
        <span className={`${row.businessArea === 'Grand Total' ? 'font-bold text-blue-600 text-lg' : 'font-medium text-gray-900'}`}>
          {row.businessArea === 'Grand Total' ? '100.00%' : value.toFixed(2) + '%'}
        </span>
      )
    },
    { 
      header: 'Total Unpaid', 
      accessor: 'totalUnpaid',
      align: 'right' as const,
      cell: (value: number, row: any) => (
        <span className={`${row.businessArea === 'Grand Total' ? 'font-bold text-blue-600 text-lg' : 'font-bold text-gray-900'}`}>
          RM {value?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
        </span>
      )
    }
  ];

  // Combine columns based on view type
  const columns = viewType === 'tradeReceivable' 
    ? [...baseColumns, ...tradeReceivableColumns]
    : [...baseColumns, ...agedDebtColumns];

  // Create totals row data
  const totalsRowData = {
    businessArea: 'Grand Total',
    station: '',
    numOfAccounts: totals.numOfAccounts,
    totalUndue: totals.totalUndue,
    curMthUnpaid: totals.curMthUnpaid,
    ttlOsAmt: totals.ttlOsAmt,
    totalUnpaid: totals.totalUnpaid,
    debtAmount: totals.debtAmount,
    percentage: 100 // Always 100%
  };

  // Combine data with totals row
  const dataWithTotals = [...processedData, totalsRowData];

  const headerRight = (
    <div className="flex items-center gap-4">
      {/* Business Area Filter - remove view type toggle buttons as they're now in FilterSection */}
      {filters && (
        <Dropdown
          options={filters.businessAreaOptions}
          value={filters.businessArea}
          onChange={filters.onBusinessAreaChange}
          placeholder="All Business Areas"
          className="w-64"
        />
      )}
    </div>
  );

  return (
    <Card title={title} headerRight={headerRight}>
      <Table 
        columns={columns} 
        data={dataWithTotals} 
        loading={loading}
        emptyMessage="No debt data available"
      />
    </Card>
  );
};

export default DebtByStationTable;