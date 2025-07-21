import React, { useMemo } from 'react';
import Card from '../ui/Card';
import Table from '../ui/Table';

interface SmerSegmentDebtData {
  businessArea: string;
  station: string;
  segment?: string;
  numOfAccounts: number;
  debtAmount: number;
  totalUndue?: number;
  curMthUnpaid?: number;
  ttlOsAmt?: number;
  totalUnpaid?: number;
  isTotal?: boolean;
  isGrandTotal?: boolean;
  percentage?: number;
}

interface SmerSegmentDebtTableProps {
  data: SmerSegmentDebtData[];
  loading?: boolean;
  viewType: 'tradeReceivable' | 'agedDebt';
  onViewTypeChange: (viewType: 'tradeReceivable' | 'agedDebt') => void;
  filters?: {
    segment?: string;
    segments?: string[];
  };
  stationTotals?: any[];
  grandTotal?: any;
}

const SmerSegmentDebtTable: React.FC<SmerSegmentDebtTableProps> = ({
  data,
  loading = false,
  viewType = 'agedDebt',
  filters = {},
  stationTotals = [],
  grandTotal
}) => {
  // Optionally filter by segment if needed
  const filteredData = useMemo(() => {
    if (!data?.length) return [];
    let filtered = [...data];
    if (filters.segments && filters.segments.length > 0) {
      filtered = filtered.filter(item => filters.segments!.includes(item.segment || ''));
    } else if (filters.segment && filters.segment !== 'all') {
      filtered = filtered.filter(item => item.segment === filters.segment);
    }
    return filtered;
  }, [data, filters.segment, filters.segments]);

  // Map stationTotals to table rows
  const stationTotalRows = useMemo(() => {
    if (!stationTotals?.length) return [];
    return stationTotals.map(st => ({
      businessArea: st.businessArea,
      station: st.station,
      segment: 'Total',
      numOfAccounts: st.totalNumberOfAccounts,
      debtAmount: st.totalTtlOSAmt,
      totalUndue: st.totalUndue,
      curMthUnpaid: st.totalCurMthUnpaid,
      ttlOsAmt: st.totalTtlOSAmt,
      totalUnpaid: st.totalUnpaid,
      percentage: parseFloat(st.totalPercentOfTotal),
      isTotal: true
    }));
  }, [stationTotals]);

  // Group rows by businessArea+station, show only first row's businessArea/station, then total, then grand total
  const groupedRows = useMemo(() => {
    const groups: Record<string, SmerSegmentDebtData[]> = {};
    filteredData.forEach(row => {
      const key = `${row.businessArea}|${row.station}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(row);
    });

    const result: SmerSegmentDebtData[] = [];
    Object.entries(groups).forEach(([key, rows]) => {
      // Segment rows (not total/grand total)
      rows.filter(r => !r.isTotal && !r.isGrandTotal).forEach((row, idx) => {
        result.push({
          ...row,
          businessArea: idx === 0 ? row.businessArea : '',
          station: idx === 0 ? row.station : '',
        });
      });
      // Add station total row from stationTotalRows
      const [area, station] = key.split('|');
      const totalRow = stationTotalRows.find(st => st.businessArea === area && st.station === station);
      if (totalRow) result.push(totalRow);
    });
    // Grand total row at the end
    if (grandTotal) {
      result.push({
        businessArea: 'Grand Total',
        station: '',
        segment: 'Total',
        numOfAccounts: grandTotal.totalNumberOfAccounts,
        debtAmount: grandTotal.totalTtlOSAmt,
        totalUndue: grandTotal.totalUndue,
        curMthUnpaid: grandTotal.totalCurMthUnpaid,
        ttlOsAmt: grandTotal.totalTtlOSAmt,
        totalUnpaid: grandTotal.totalUnpaid,
        percentage: parseFloat(grandTotal.totalPercentOfTotal),
        isGrandTotal: true
      });
    }
    return result;
  }, [filteredData, stationTotalRows, grandTotal]);

  const baseColumns = [
    {
      header: 'Business Area',
      accessor: 'businessArea',
      cell: (value: string, row: SmerSegmentDebtData) => {
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
      cell: (value: string, row: SmerSegmentDebtData) => {
        if (row.isGrandTotal || row.isTotal) return null;
        return <span className="text-gray-700">{value}</span>;
      }
    },
    {
      header: 'SMER Segment',
      accessor: 'segment',
      cell: (value: string, row: SmerSegmentDebtData) => {
        if (row.isGrandTotal) {
          return <span className="font-bold text-lg text-blue-600">{value}</span>;
        }
        if (row.isTotal) {
          return <span className="font-bold text-blue-600">Total</span>;
        }
        return (
          <span className={`font-medium ${value ? 'text-blue-600' : 'text-gray-600'}`}>
            {value || '-'}
          </span>
        );
      }
    },
    {
      header: 'Number of Accounts',
      accessor: 'numOfAccounts',
      cell: (value: number, row: SmerSegmentDebtData) => (
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
      cell: (value: number, row: SmerSegmentDebtData) => (
        <span className={`font-medium ${row.isGrandTotal || row.isTotal ? 'text-blue-600 font-bold' : 'text-blue-600'} ${row.isGrandTotal ? 'text-lg' : ''}`}>
          RM {value?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
        </span>
      )
    },
    {
      header: 'Cur.Mth Unpaid',
      accessor: 'curMthUnpaid',
      align: 'right' as const,
      cell: (value: number, row: SmerSegmentDebtData) => (
        <span className={`font-medium ${row.isGrandTotal || row.isTotal ? 'text-blue-600 font-bold' : 'text-orange-600'} ${row.isGrandTotal ? 'text-lg' : ''}`}>
          RM {value?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
        </span>
      )
    },
    {
      header: 'TTL O/S Amt',
      accessor: 'ttlOsAmt',
      align: 'right' as const,
      cell: (value: number, row: SmerSegmentDebtData) => (
        <span className={`${row.isGrandTotal || row.isTotal ? 'font-bold text-blue-600' : 'font-bold text-red-600'} ${row.isGrandTotal ? 'text-lg' : ''}`}>
          RM {value?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
        </span>
      )
    },
    {
      header: 'Total Unpaid',
      accessor: 'totalUnpaid',
      align: 'right' as const,
      cell: (value: number, row: SmerSegmentDebtData) => (
        <span className={`${row.isGrandTotal || row.isTotal ? 'font-bold text-blue-600' : 'font-bold text-gray-900'} ${row.isGrandTotal ? 'text-lg' : ''}`}>
          RM {value?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
        </span>
      )
    },
    {
      header: '% of Total',
      accessor: 'percentage',
      align: 'right' as const,
      cell: (value: number, row: SmerSegmentDebtData) => (
        <span className={`${row.isGrandTotal || row.isTotal ? 'font-bold text-blue-600' : 'font-medium text-gray-900'} ${row.isGrandTotal ? 'text-lg' : ''}`}>
          {value?.toFixed(2)}%
        </span>
      )
    },
  ];

  const columns = [...baseColumns, ...agedDebtColumns];

  const headerRight = (
    <div className="text-sm text-gray-600">
      {filteredData.length} SMER segment entries
    </div>
  );

  return (
    <Card title="Summary Aged Debt By SMER Segment" headerRight={headerRight}>
      <Table
        columns={columns}
        data={groupedRows}
        loading={loading}
        emptyMessage="No SMER segment debt data available"
      />
    </Card>
  );
};

export default SmerSegmentDebtTable;