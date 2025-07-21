import React from 'react';
import Card from '../ui/Card';
import Table from '../ui/Table';

interface AccClassDebtSummaryData {
  businessArea: string;
  station: string;
  numOfAccounts: number;
  debtAmount: number;
  accClass?: string;
  type?: 'government' | 'non-government';
  totalUndue?: number;
  curMthUnpaid?: number;
  ttlOsAmt?: number;
  totalUnpaid?: number;
  percentage?: number;
  isTotal?: boolean;
  isGrandTotal?: boolean;
}

interface AccClassDebtSummaryProps {
  data: AccClassDebtSummaryData[];
  loading?: boolean;
  viewType: 'tradeReceivable' | 'agedDebt';
  onViewTypeChange: (viewType: 'tradeReceivable' | 'agedDebt') => void;
  filters: {
    governmentType: string;
    onGovernmentTypeChange: (value: string) => void;
    governmentTypeOptions: { value: string; label: string }[];
    accClass?: string;
  };
}

const AccClassDebtSummary: React.FC<AccClassDebtSummaryProps> = ({
  data,
  loading = false,
  viewType = 'agedDebt',
  filters,
}) => {
  // Use API response directly, optionally filter by frontend filters if needed
  const filteredData = React.useMemo(() => {
    if (!data?.length) return [];
    let filtered = [...data];
    if (filters.governmentType === 'government') {
      filtered = filtered.filter(item => item.accClass?.endsWith('G'));
    } else if (filters.governmentType === 'non-government') {
      filtered = filtered.filter(item => item.accClass?.endsWith('N'));
    }
    if (filters.accClass && filters.accClass !== 'all') {
      filtered = filtered.filter(item => item.accClass === filters.accClass);
    }
    return filtered;
  }, [data, filters.governmentType, filters.accClass]);

  // Group by businessArea + station, then render account classes, then render total row
  const groupedRows = React.useMemo(() => {
    const groups: Record<string, AccClassDebtSummaryData[]> = {};
    filteredData.forEach(row => {
      const key = `${row.businessArea}|${row.station}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(row);
    });

    // Find total rows (isTotal === true) and move them to the end of each group
    const result: AccClassDebtSummaryData[] = [];
    Object.entries(groups).forEach(([key, rows]) => {
      // Account class rows (not total)
      rows.filter(r => !r.isTotal && !r.isGrandTotal).forEach((row, idx) => {
        // Only show businessArea/station for first row in group
        result.push({
          ...row,
          businessArea: idx === 0 ? row.businessArea : '',
          station: idx === 0 ? row.station : '',
        });
      });
      // Total row for the group
      rows.filter(r => r.isTotal).forEach(totalRow => {
        result.push({
          ...totalRow,
          businessArea: totalRow.businessArea,
          station: totalRow.station,
        });
      });
    });
    // Add grand total row at the end if present
    const grandTotalRow = filteredData.find(r => r.isGrandTotal);
    if (grandTotalRow) result.push(grandTotalRow);
    return result;
  }, [filteredData]);

  const baseColumns = [
    {
      header: 'Business Area',
      accessor: 'businessArea',
      cell: (value: string, row: AccClassDebtSummaryData) => {
        if (row.isGrandTotal) {
          return <span className="font-bold text-lg text-blue-600">{value}</span>;
        }
        if (row.isTotal) {
          return <span className="font-medium text-blue-600">{value} Total</span>;
        }
        return <span className="font-medium text-gray-900">{value}</span>;
      }
    },
    {
      header: 'Station',
      accessor: 'station',
      cell: (value: string, row: AccClassDebtSummaryData) => {
        if (row.isGrandTotal || row.isTotal) return null;
        return <span className="text-gray-700">{value}</span>;
      }
    },
    {
      header: 'Account Class',
      accessor: 'accClass',
      cell: (value: string, row: AccClassDebtSummaryData) => {
        if (row.isGrandTotal) {
          return <span className="font-bold text-lg text-blue-600">{value}</span>;
        }
        if (row.isTotal) {
          return <span className="font-bold text-blue-600">Total</span>;
        }
        return (
          <span className={`font-medium ${value?.endsWith('G') ? 'text-blue-600' : 'text-pink-600'}`}>
            {value || '-'}
          </span>
        );
      }
    },
    {
      header: 'Number of Accounts',
      accessor: 'numOfAccounts',
      cell: (value: number, row: AccClassDebtSummaryData) => (
        <span className={`font-medium ${row.isTotal ? 'font-bold text-blue-600' : ''} ${row.isGrandTotal ? 'font-bold text-lg text-blue-600' : ''}`}>
          {value?.toLocaleString()}
        </span>
      )
    },
  ];

  const agedDebtColumns = [
    {
      header: 'Total Undue',
      accessor: 'totalUndue',
      align: 'right' as const,
      cell: (value: number, row: AccClassDebtSummaryData) => (
        <span className={`font-medium ${row.isGrandTotal || row.isTotal ? 'text-blue-600 font-bold' : 'text-blue-600'} ${row.isGrandTotal ? 'text-lg' : ''}`}>
          RM {value?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
        </span>
      )
    },
    {
      header: 'Cur.Mth Unpaid',
      accessor: 'curMthUnpaid',
      align: 'right' as const,
      cell: (value: number, row: AccClassDebtSummaryData) => (
        <span className={`font-medium ${row.isGrandTotal || row.isTotal ? 'text-blue-600 font-bold' : 'text-orange-600'} ${row.isGrandTotal ? 'text-lg' : ''}`}>
          RM {value?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
        </span>
      )
    },
    {
      header: 'TTL O/S Amt',
      accessor: 'ttlOsAmt',
      align: 'right' as const,
      cell: (value: number, row: AccClassDebtSummaryData) => (
        <span className={`${row.isGrandTotal || row.isTotal ? 'font-bold text-blue-600' : 'font-bold text-red-600'} ${row.isGrandTotal ? 'text-lg' : ''}`}>
          RM {value?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
        </span>
      )
    },
    {
      header: 'Total Unpaid',
      accessor: 'totalUnpaid',
      align: 'right' as const,
      cell: (value: number, row: AccClassDebtSummaryData) => (
        <span className={`${row.isGrandTotal || row.isTotal ? 'font-bold text-blue-600' : 'font-bold text-gray-900'} ${row.isGrandTotal ? 'text-lg' : ''}`}>
          RM {value?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
        </span>
      )
    },
    {
      header: '% of Total',
      accessor: 'percentage',
      align: 'right' as const,
      cell: (value: number, row: AccClassDebtSummaryData) => (
        <span className={`${row.isGrandTotal || row.isTotal ? 'font-bold text-blue-600' : 'font-medium text-gray-900'} ${row.isGrandTotal ? 'text-lg' : ''}`}>
          {value?.toFixed(2)}%
        </span>
      )
    },
  ];

  const columns = [...baseColumns, ...agedDebtColumns];

  const headerRight = (
    <div className="text-sm text-gray-600">
      {filteredData.length} account classes
    </div>
  );

  return (
    <Card title="Summary Aged Debt By Acc Class" headerRight={headerRight}>
      <Table
        columns={columns}
        data={groupedRows}
        loading={loading}
        emptyMessage="No account class debt data available"
      />
    </Card>
  );
};

export default AccClassDebtSummary;