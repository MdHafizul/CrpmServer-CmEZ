import React, { useMemo } from 'react';
import Card from '../ui/Card';
import Table from '../ui/Table';

interface AccDefinitionDebtData {
  businessArea: string;
  station: string;
  numOfAccounts: number;
  debtAmount: number;
  accDefinition?: string;
  totalUndue?: number;
  curMthUnpaid?: number;
  ttlOsAmt?: number;
  totalUnpaid?: number;
  isTotal?: boolean;
  isGrandTotal?: boolean;
  percentage?: number;
}

interface AccDefinitionDebtProps {
  data: AccDefinitionDebtData[];
  loading?: boolean;
  viewType: 'tradeReceivable' | 'agedDebt';
  onViewTypeChange: (viewType: 'tradeReceivable' | 'agedDebt') => void;
  filters?: {
    accDefinition?: string;
    accDefinitions?: string[];
  };
}

const AccDefinitionDebt: React.FC<AccDefinitionDebtProps> = ({
  data,
  loading = false,
  viewType = 'agedDebt',
  filters = {}
}) => {
  // Optionally filter by ADID if needed
  const filteredData = useMemo(() => {
    if (!data?.length) return [];
    let filtered = [...data];
    if (filters.accDefinitions && filters.accDefinitions.length > 0) {
      filtered = filtered.filter(item => filters.accDefinitions!.includes(item.accDefinition || ''));
    } else if (filters.accDefinition && filters.accDefinition !== 'all') {
      filtered = filtered.filter(item => item.accDefinition === filters.accDefinition);
    }
    return filtered;
  }, [data, filters.accDefinition, filters.accDefinitions]);

  // Group rows by businessArea+station, show only first row's businessArea/station, then total, then grand total
  const groupedRows = useMemo(() => {
    const groups: Record<string, AccDefinitionDebtData[]> = {};
    filteredData.forEach(row => {
      const key = `${row.businessArea}|${row.station}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(row);
    });

    const result: AccDefinitionDebtData[] = [];
    Object.entries(groups).forEach(([key, rows]) => {
      // ADID rows (not total/grand total)
      rows.filter(r => !r.isTotal && !r.isGrandTotal).forEach((row, idx) => {
        result.push({
          ...row,
          businessArea: idx === 0 ? row.businessArea : '',
          station: idx === 0 ? row.station : '',
        });
      });
      // Station total row
      rows.filter(r => r.isTotal).forEach(totalRow => {
        result.push({
          ...totalRow,
          businessArea: totalRow.businessArea,
          station: totalRow.station,
        });
      });
    });
    // Grand total row at the end
    const grandTotalRow = filteredData.find(r => r.isGrandTotal);
    if (grandTotalRow) result.push(grandTotalRow);
    return result;
  }, [filteredData]);

  const baseColumns = [
    {
      header: 'Business Area',
      accessor: 'businessArea',
      cell: (value: string, row: AccDefinitionDebtData) => {
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
      cell: (value: string, row: AccDefinitionDebtData) => {
        if (row.isGrandTotal || row.isTotal) return null;
        return <span className="text-gray-700">{value}</span>;
      }
    },
    {
      header: 'ADID',
      accessor: 'accDefinition',
      cell: (value: string, row: AccDefinitionDebtData) => {
        if (row.isGrandTotal) {
          return <span className="font-bold text-lg text-blue-600">{value}</span>;
        }
        if (row.isTotal) {
          return <span className="font-bold text-blue-600">Total</span>;
        }
        const colors: Record<string, string> = {
          'AG': 'text-green-600',
          'CM': 'text-blue-600',
          'DM': 'text-purple-600',
          'IN': 'text-orange-600',
          'MN': 'text-red-600',
          'SL': 'text-teal-600'
        };
        return (
          <span className={`font-medium ${colors[value] || 'text-gray-600'}`}>
            {value || '-'}
          </span>
        );
      }
    },
    {
      header: 'Number of Accounts',
      accessor: 'numOfAccounts',
      cell: (value: number, row: AccDefinitionDebtData) => (
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
      cell: (value: number, row: AccDefinitionDebtData) => (
        <span className={`font-medium ${row.isGrandTotal || row.isTotal ? 'text-blue-600 font-bold' : 'text-blue-600'} ${row.isGrandTotal ? 'text-lg' : ''}`}>
          RM {value?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
        </span>
      )
    },
    {
      header: 'Cur.Mth Unpaid',
      accessor: 'curMthUnpaid',
      align: 'right' as const,
      cell: (value: number, row: AccDefinitionDebtData) => (
        <span className={`font-medium ${row.isGrandTotal || row.isTotal ? 'text-blue-600 font-bold' : 'text-orange-600'} ${row.isGrandTotal ? 'text-lg' : ''}`}>
          RM {value?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
        </span>
      )
    },
    {
      header: 'TTL O/S Amt',
      accessor: 'ttlOsAmt',
      align: 'right' as const,
      cell: (value: number, row: AccDefinitionDebtData) => (
        <span className={`${row.isGrandTotal || row.isTotal ? 'font-bold text-blue-600' : 'font-bold text-red-600'} ${row.isGrandTotal ? 'text-lg' : ''}`}>
          RM {value?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
        </span>
      )
    },
    {
      header: 'Total Unpaid',
      accessor: 'totalUnpaid',
      align: 'right' as const,
      cell: (value: number, row: AccDefinitionDebtData) => (
        <span className={`${row.isGrandTotal || row.isTotal ? 'font-bold text-blue-600' : 'font-bold text-gray-900'} ${row.isGrandTotal ? 'text-lg' : ''}`}>
          RM {value?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
        </span>
      )
    },
    {
      header: '% of Total',
      accessor: 'percentage',
      align: 'right' as const,
      cell: (value: number, row: AccDefinitionDebtData) => (
        <span className={`${row.isGrandTotal || row.isTotal ? 'font-bold text-blue-600' : 'font-medium text-gray-900'} ${row.isGrandTotal ? 'text-lg' : ''}`}>
          {value?.toFixed(2)}%
        </span>
      )
    },
  ];

  const columns = [...baseColumns, ...agedDebtColumns];

  const headerRight = (
    <div className="text-sm text-gray-600">
      {filteredData.length} ADID entries
    </div>
  );

  return (
    <Card title="Summary Aged Debt By ADID" headerRight={headerRight}>
      <Table
        columns={columns}
        data={groupedRows}
        loading={loading}
        emptyMessage="No account determination (ADID) debt data available"
      />
    </Card>
  );
};

export default AccDefinitionDebt;