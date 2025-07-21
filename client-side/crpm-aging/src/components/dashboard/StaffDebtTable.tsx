import React from 'react';
import Card from '../ui/Card';
import Table from '../ui/Table';

interface StaffDebtData {
  businessArea: string;
  station: string;
  numOfAccounts: number;
  ttlOsAmt?: number;
  debtAmount?: number;
  totalUndue?: number;
  curMthUnpaid?: number;
  totalUnpaid?: number;
  percentage?: number;
  isTotal?: boolean;
  isGrandTotal?: boolean;
}

interface StaffDebtTableProps {
  data: StaffDebtData[];
  loading?: boolean;
  viewType?: 'tradeReceivable' | 'agedDebt';
  onViewTypeChange?: (viewType: 'tradeReceivable' | 'agedDebt') => void;
}

const StaffDebtTable: React.FC<StaffDebtTableProps> = ({
  data,
  loading = false,
  viewType = 'agedDebt'
}) => {
  // Group by businessArea + station, then render staff rows, then render total row
  const groupedRows = React.useMemo(() => {
    const groups: Record<string, StaffDebtData[]> = {};
    data.forEach(row => {
      const key = `${row.businessArea}|${row.station}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(row);
    });

    const result: StaffDebtData[] = [];
    Object.entries(groups).forEach(([key, rows]) => {
      // Staff rows (not total)
      rows.filter(r => !r.isTotal && !r.isGrandTotal).forEach((row, idx) => {
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
    const grandTotalRow = data.find(r => r.isGrandTotal);
    if (grandTotalRow) result.push(grandTotalRow);
    return result;
  }, [data]);

  const baseColumns = [
    { 
      header: 'Business Area', 
      accessor: 'businessArea',
      align: 'left' as const,
      cell: (value: string, row: StaffDebtData) => {
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
      align: 'left' as const,
      cell: (value: string, row: StaffDebtData) => {
        if (row.isGrandTotal || row.isTotal) return null;
        return <span className="text-gray-700">{value}</span>;
      }
    },
    { 
      header: 'Number of Accounts', 
      accessor: 'numOfAccounts',
      align: 'right' as const,
      cell: (value: number, row: StaffDebtData) => (
        <span className={`font-medium ${row.isTotal ? 'font-bold text-blue-600' : ''} ${row.isGrandTotal ? 'font-bold text-lg text-blue-600' : ''}`}>
          {value?.toLocaleString()}
        </span>
      )
    },
  ];

  const tradeReceivableColumns = [
    { 
      header: 'Total Undue', 
      accessor: 'totalUndue',
      align: 'right' as const,
      cell: (value: number, row: StaffDebtData) => (
        <span className={`font-medium ${row.isGrandTotal || row.isTotal ? 'text-blue-600 font-bold' : 'text-blue-600'} ${row.isGrandTotal ? 'text-lg' : ''}`}>
          RM {value?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
        </span>
      )
    },
    { 
      header: 'Cur.Mth Unpaid', 
      accessor: 'curMthUnpaid',
      align: 'right' as const,
      cell: (value: number, row: StaffDebtData) => (
        <span className={`font-medium ${row.isGrandTotal || row.isTotal ? 'text-blue-600 font-bold' : 'text-orange-600'} ${row.isGrandTotal ? 'text-lg' : ''}`}>
          RM {value?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
        </span>
      )
    },
    { 
      header: 'TTL O/S Amt', 
      accessor: 'ttlOsAmt',
      align: 'right' as const,
      cell: (value: number, row: StaffDebtData) => (
        <span className={`${row.isGrandTotal || row.isTotal ? 'font-bold text-blue-600' : 'font-bold text-red-600'} ${row.isGrandTotal ? 'text-lg' : ''}`}>
          RM {value?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
        </span>
      )
    },
    { 
      header: 'Total Unpaid', 
      accessor: 'totalUnpaid',
      align: 'right' as const,
      cell: (value: number, row: StaffDebtData) => (
        <span className={`${row.isGrandTotal || row.isTotal ? 'font-bold text-blue-600' : 'font-bold text-gray-900'} ${row.isGrandTotal ? 'text-lg' : ''}`}>
          RM {value?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
        </span>
      )
    },
    { 
      header: '% of Total', 
      accessor: 'percentage',
      align: 'right' as const,
      cell: (value: number, row: StaffDebtData) => (
        <span className={`${row.isGrandTotal || row.isTotal ? 'font-bold text-blue-600' : 'font-medium text-gray-900'} ${row.isGrandTotal ? 'text-lg' : ''}`}>
          {value?.toFixed(2)}%
        </span>
      )
    }
  ];

  const agedDebtColumns = [
    { 
      header: 'TTL O/S Amt', 
      accessor: 'ttlOsAmt',
      align: 'right' as const,
      cell: (value: number, row: StaffDebtData) => (
        <span className={`${row.isGrandTotal || row.isTotal ? 'font-bold text-blue-600' : 'font-bold text-gray-900'} ${row.isGrandTotal ? 'text-lg' : ''}`}>
          RM {value?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
        </span>
      )
    },
    { 
      header: '% of Total', 
      accessor: 'percentage',
      align: 'right' as const,
      cell: (value: number, row: StaffDebtData) => (
        <span className={`${row.isGrandTotal || row.isTotal ? 'font-bold text-blue-600' : 'font-medium text-gray-900'} ${row.isGrandTotal ? 'text-lg' : ''}`}>
          {value?.toFixed(2)}%
        </span>
      )
    }
  ];

  const columns = viewType === 'tradeReceivable' 
    ? [...baseColumns, ...tradeReceivableColumns]
    : [...baseColumns, ...agedDebtColumns];

  return (
    <Card title="By Staff Debt">
      <Table 
        columns={columns} 
        data={groupedRows} 
        loading={loading}
        emptyMessage="No staff debt data available"
        className="staff-debt-table"
        key="staff-debt-table"
      />
    </Card>
  );
};

export default StaffDebtTable;