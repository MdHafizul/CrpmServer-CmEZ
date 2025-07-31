import React, { useEffect, useState, useMemo } from 'react';
import Card from '../ui/Card';
import Table from '../ui/Table';
import { getDebtBySmerSegmentData } from '../../services/api';
import type { DebtBySmerSegmentRow } from '../../types/dashboard.type';

// Type for each row
interface SmerSegmentDebtData extends DebtBySmerSegmentRow {
  isTotal?: boolean;
  isGrandTotal?: boolean;
  percentage?: number;
}

interface SmerSegmentDebtTableProps {
  filters: any;
}

const FILENAME = '1750132052464-aging besar.parquet';

// New SMER segment order
const SMER_SEGMENT_ORDER = [
  'MASR',
  'MICB',
  'GNLA',
  'HRES',
  'MEDB',
  'SMLB',
  'EMRB',
  'BLANKS'
];

const SmerSegmentDebtTable: React.FC<SmerSegmentDebtTableProps> = ({ filters }) => {
  const [data, setData] = useState<SmerSegmentDebtData[]>([]);
  const [stationTotals, setStationTotals] = useState<any[]>([]);
  const [grandTotal, setGrandTotal] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
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
    getDebtBySmerSegmentData(FILENAME, apiParams)
      .then(res => {
        const d = res.data?.data || [];
        setData(d.map((row: any) => ({
          businessArea: row.businessArea,
          station: row.station,
          segment: row.segment,
          numberOfAccounts: row.numberOfAccounts,
          ttlOSAmt: row.ttlOSAmt,
          percentOfTotal: row.percentOfTotal,
          totalUndue: row.totalUndue,
          curMthUnpaid: row.curMthUnpaid,
          totalUnpaid: row.totalUnpaid,
          mitAmt: row.mitAmt,
          percentage: parseFloat(row.percentOfTotal),
        })));
        setStationTotals(res.data?.stationTotals || []);
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

  // Optionally filter by segment if needed, and sort by new SMER segment order
  const filteredData = useMemo(() => {
    if (!data?.length) return [];
    let filtered = [...data];
    if (filters.smerSegments && filters.smerSegments.length > 0) {
      filtered = filtered.filter(item => filters.smerSegments!.includes(item.segment || ''));
    } else if (filters.segment && filters.segment !== 'all') {
      filtered = filtered.filter(item => item.segment === filters.segment);
    }
    // Sort by new SMER segment order
    filtered.sort((a, b) => {
      const idxA = SMER_SEGMENT_ORDER.indexOf(a.segment);
      const idxB = SMER_SEGMENT_ORDER.indexOf(b.segment);
      return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
    });
    return filtered;
  }, [data, filters.segment, filters.smerSegments]);

  // Map stationTotals to table rows
  const stationTotalRows = useMemo(() => {
    if (!stationTotals?.length) return [];
    return stationTotals.map((st: any) => ({
      businessArea: st.businessArea,
      station: st.station,
      segment: 'Total',
      numberOfAccounts: st.totalNumberOfAccounts,
      ttlOSAmt: st.totalTtlOSAmt,
      percentOfTotal: st.totalPercentOfTotal,
      totalUndue: st.totalUndue,
      curMthUnpaid: st.totalCurMthUnpaid,
      totalUnpaid: st.totalUnpaid,
      mitAmt: st.totalMITAmt,
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
        numberOfAccounts: grandTotal.totalNumberOfAccounts,
        ttlOSAmt: grandTotal.totalTtlOSAmt,
        percentOfTotal: grandTotal.totalPercentOfTotal,
        totalUndue: grandTotal.totalUndue,
        curMthUnpaid: grandTotal.totalCurMthUnpaid,
        totalUnpaid: grandTotal.totalUnpaid,
        mitAmt: grandTotal.totalMITAmt,
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
      accessor: 'numberOfAccounts',
      cell: (value: number, row: SmerSegmentDebtData) => (
        <span className={`font-medium ${row.isTotal ? 'font-bold text-blue-600' : ''} ${row.isGrandTotal ? 'font-bold text-lg text-blue-600' : ''}`}>
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
      header: 'Total Unpaid',
      accessor: 'totalUnpaid',
      align: 'right' as const,
      cell: (value: number, row: SmerSegmentDebtData) => (
        <span className={`${row.isGrandTotal || row.isTotal ? 'font-bold text-blue-600' : 'font-bold text-gray-900'} ${row.isGrandTotal ? 'text-lg' : ''}`}>
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
      cell: (value: number, row: SmerSegmentDebtData) => (
        <span className={`${row.isGrandTotal || row.isTotal ? 'font-bold text-blue-600' : 'font-bold text-red-600'} ${row.isGrandTotal ? 'text-lg' : ''}`}>
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

  const columns =
    filters.viewType === 'agedDebt'
      ? [...baseColumns, ...commonColumns]
      : [...baseColumns, ...trColumns, ...commonColumns];

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