import React, { useEffect, useState } from 'react';
import Card from '../ui/Card';
import Table from '../ui/Table';
import Dropdown from '../ui/Dropdown';
import { getDebtByStationData } from '../../services/api';
import type { DebtByStationRow } from '../../types/dashboard.type';

interface DebtByStationTableProps {
  filters: any;
  title?: string;
}

const FILENAME = '1750132052464-aging besar.parquet';

const DebtByStationTable: React.FC<DebtByStationTableProps> = ({ filters, title = 'Summary Aged Debt by Station' }) => {
  const [data, setData] = useState<DebtByStationRow[]>([]);
  const [grandTotal, setGrandTotal] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
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
      totalOutstandingRange: filters.debtRange !== 'all' ? filters.debtRange : null,
      smerSegments: filters.smerSegments,
    };
    getDebtByStationData(FILENAME, apiParams)
      .then(res => {
        setData(res.data?.data || []);
        setGrandTotal(res.data?.grandTotal || null);
      })
      .finally(() => setLoading(false));
  }, [
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

  const columns = [
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
      header: 'Total Unpaid', 
      accessor: 'totalUnpaid',
      align: 'right' as const,
      cell: (value: number, row: any) => (
        <span className={`${row.isGrandTotal ? 'font-bold text-blue-600 text-lg' : 'font-bold text-gray-900'}`}>
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

  const headerRight = (
    <div className="flex items-center gap-4">
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
        data={tableData} 
        loading={loading}
        emptyMessage="No debt data available"
      />
    </Card>
  );
};

export default DebtByStationTable;