import React, { useEffect, useState } from 'react';
import Card from '../ui/Card';
import Table from '../ui/Table';
import { getDebtByStationData } from '../../services/api';
import type { DebtByStationRow } from '../../types/dashboard.type';
import { useAppContext } from '../../context/AppContext'; // <-- Add this import


interface DebtByStationTableProps {
  filters: any;
  title?: string;
}

const DebtByStationTable: React.FC<DebtByStationTableProps> = ({ filters, title = 'Summary Aged Debt by Station' }) => {
  const [data, setData] = useState<DebtByStationRow[]>([]);
  const [grandTotal, setGrandTotal] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { parquetFileName } = useAppContext(); 

  useEffect(() => {
    if (!parquetFileName) return;
    setLoading(true);
    const getDebtRangeObj = (range: string) => {
      if (!range || range === 'all') return null;
      if (range.endsWith('+')) {
        const min = parseFloat(range.replace('+', ''));
        return { min, max: null };
      }
      const [min, max] = range.split('-').map(Number);
      return { min, max };
    };

    const apiParams = {
      viewType: filters.viewType === 'tradeReceivable' ? 'TR' : 'agedDebt',
      accClassType: filters.governmentType === 'government'
        ? 'GOVERNMENT'
        : filters.governmentType === 'non-government'
        ? 'NON_GOVERNMENT'
        : 'ALL',
      mitType: filters.mitFilter === 'mit'
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
      totalOutstandingRange: getDebtRangeObj(filters.debtRange),
      smerSegments: filters.smerSegments,
    };
    getDebtByStationData(parquetFileName, apiParams) 
      .then(res => {
        setData(res.data?.data || []);
        setGrandTotal(res.data?.grandTotal || null);
      })
      .finally(() => setLoading(false));
  }, [
    parquetFileName,
    filters.viewType,
    filters.governmentType,
    filters.mitFilter,
    filters.businessAreas,
    filters.accDefinitions,
    filters.accStatus,
    filters.netPositiveBalance,
    filters.accClass,
    filters.monthsOutstandingBracket,
    filters.debtRange,
    filters.smerSegments
  ]);

  // Define columns for both views
  const baseColumns = [
    { 
      header: 'Business Area', 
      accessor: 'businessArea',
      align: 'left' as const,
      cell: (value: string, row: any) => (
        <span className={`font-medium ${row.isGrandTotal ? 'text-blue-600 font-bold text-lg' : 'text-gray-900'}`}>
          {value}
        </span>
      )
    },
    { 
      header: 'Station', 
      accessor: 'station',
      align: 'left' as const,
      cell: (value: string, row: any) => (
        <span className={`font-medium ${row.isGrandTotal ? 'text-blue-600 font-bold text-lg' : 'text-gray-700'}`}>
          {value}
        </span>
      )
    },
    { 
      header: 'Number of Accounts', 
      accessor: 'numberOfAccounts',
      align: 'right' as const,
      cell: (value: number, row: any) => (
        <span className={`font-medium ${row.isGrandTotal ? 'font-bold text-blue-600 text-lg' : ''}`}>
          {value?.toLocaleString()}
        </span>
      )
    },
  ];

  const trColumns = [
    { 
      header: 'Total Undue', 
      accessor: 'totalUndue',
      align: 'right' as const,
      cell: (value: number, row: any) => (
        <span className={`font-medium ${row.isGrandTotal ? 'text-blue-600 font-bold text-lg' : 'text-blue-600'}`}>
          RM {value?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
        </span>
      )
    },
    { 
      header: 'Cur.Mth Unpaid', 
      accessor: 'curMthUnpaid',
      align: 'right' as const,
      cell: (value: number, row: any) => (
        <span className={`font-medium ${row.isGrandTotal ? 'text-blue-600 font-bold text-lg' : 'text-orange-600'}`}>
          RM {value?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
        </span>
      )
    },
    { 
      header: 'Total Unpaid', 
      accessor: 'totalUnpaid',
      align: 'right' as const,
      cell: (value: number, row: any) => (
        <span className={`${row.isGrandTotal ? 'font-bold text-blue-600 text-lg' : 'font-bold text-gray-900'}`}>
          RM {value?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
        </span>
      )
    },
  ];

  const commonColumns = [
    { 
      header: 'TTL O/S Amt', 
      accessor: 'ttlOSAmt',
      align: 'right' as const,
      cell: (value: number, row: any) => (
        <span className={`${row.isGrandTotal ? 'font-bold text-blue-600 text-lg' : 'font-bold text-red-600'}`}>
          RM {value?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
        </span>
      )
    },
    { 
      header: '% of Total', 
      accessor: 'percentOfTotal',
      align: 'right' as const,
      cell: (value: string, row: any) => (
        <span className={`${row.isGrandTotal ? 'font-bold text-blue-600 text-lg' : 'font-medium text-gray-900'}`}>
          {value ? `${parseFloat(value).toFixed(2)}%` : ''}
        </span>
      )
    }
  ];

  // Compose columns based on viewType
  const columns = filters.viewType === 'agedDebt'
    ? [...baseColumns, ...commonColumns]
    : [...baseColumns, ...trColumns, ...commonColumns];

  // Append grand total row if present
  const tableData = grandTotal
    ? [
        ...data,
        {
          businessArea: 'Grand Total',
          station: '',
          numberOfAccounts: grandTotal.totalNumberOfAccounts,
          totalUndue: grandTotal.totalUndue,
          curMthUnpaid: grandTotal.totalCurMthUnpaid,
          ttlOSAmt: grandTotal.totalTtlOSAmt,
          totalUnpaid: grandTotal.totalUnpaid,
          percentOfTotal: grandTotal.totalPercentOfTotal,
          isGrandTotal: true
        }
      ]
    : data;

  return (
    <Card title={title} >
      <Table 
        columns={columns} 
        data={tableData} 
        loading={loading}
        emptyMessage="No debt data available"
      />
    </Card>
  );
};

export default DebtByStationTable;