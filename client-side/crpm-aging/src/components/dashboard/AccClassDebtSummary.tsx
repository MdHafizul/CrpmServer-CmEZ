import React, { useEffect, useState } from 'react';
import Card from '../ui/Card';
import Table from '../ui/Table';
import { getDebtByAccountClassData } from '../../services/api';
import type { DebtByAccountClassRow } from '../../types/dashboard.type';
import { useAppContext } from '../../context/AppContext';

interface AccClassDebtSummaryData extends DebtByAccountClassRow {
  isTotal?: boolean;
  isGrandTotal?: boolean;
  percentage?: number;
}

interface AccClassDebtSummaryProps {
  filters: any;
}

const AccClassDebtSummary: React.FC<AccClassDebtSummaryProps> = ({ filters }) => {
  const [data, setData] = useState<AccClassDebtSummaryData[]>([]);
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
      totalOutstandingRange: getDebtRangeObj(filters.debtRange),
      smerSegments: filters.smerSegments,
    };
    getDebtByAccountClassData(parquetFileName, apiParams)
      .then(res => {
        // Map API data to table data structure as before
        const d = res.data?.data || [];
        const stationTotals = res.data?.stationTotals || [];
        const grandTotal = res.data?.grandTotal;
        const mapped = [
          ...d.map(row => ({
            businessArea: row.businessArea,
            station: row.station,
            accountClass: row.accountClass,
            numberOfAccounts: row.numberOfAccounts,
            ttlOSAmt: row.ttlOSAmt,
            percentOfTotal: row.percentOfTotal,
            totalUndue: row.totalUndue,
            curMthUnpaid: row.curMthUnpaid,
            totalUnpaid: row.totalUnpaid,
            mitAmt: row.mitAmt,
            percentage: parseFloat(row.percentOfTotal),
          })),
          ...stationTotals.map(stationTotal => ({
            businessArea: stationTotal.businessArea,
            station: stationTotal.station,
            accountClass: 'Total',
            numberOfAccounts: stationTotal.totalNumberOfAccounts,
            ttlOSAmt: stationTotal.totalTtlOSAmt,
            percentOfTotal: stationTotal.totalPercentOfTotal,
            totalUndue: stationTotal.totalUndue,
            curMthUnpaid: stationTotal.totalCurMthUnpaid,
            totalUnpaid: stationTotal.totalUnpaid,
            mitAmt: stationTotal.totalMITAmt,
            percentage: parseFloat(stationTotal.totalPercentOfTotal),
            isTotal: true,
          })),
          grandTotal && {
            businessArea: 'Grand Total',
            station: '',
            accountClass: 'Total',
            numberOfAccounts: grandTotal.totalNumberOfAccounts,
            ttlOSAmt: grandTotal.totalTtlOSAmt,
            percentOfTotal: grandTotal.totalPercentOfTotal,
            totalUndue: grandTotal.totalUndue,
            curMthUnpaid: grandTotal.totalCurMthUnpaid,
            totalUnpaid: grandTotal.totalUnpaid,
            mitAmt: grandTotal.totalMITAmt,
            percentage: parseFloat(grandTotal.totalPercentOfTotal),
            isGrandTotal: true,
          },
        ].filter(Boolean);
        setData(mapped);
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
    filters.smerSegments,
  ]);

  // Use API response directly, optionally filter by frontend filters if needed
  const filteredData = React.useMemo(() => {
    if (!data?.length) return [];
    let filtered = [...data];
    if (filters.governmentType === 'government') {
      filtered = filtered.filter(item => item.accountClass?.endsWith('G'));
    } else if (filters.governmentType === 'non-government') {
      filtered = filtered.filter(item => item.accountClass?.endsWith('N'));
    }
    if (filters.accClass && filters.accClass !== 'all') {
      filtered = filtered.filter(item => item.accountClass === filters.accClass);
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

    // Find all station total rows from the original data
    const stationTotals = data.filter(r => r.isTotal);

    const result: AccClassDebtSummaryData[] = [];
    Object.entries(groups).forEach(([key, rows]) => {
      // Account class rows (not total/grand total)
      rows
        .filter(r => !r.isTotal && !r.isGrandTotal)
        .forEach((row, idx) => {
          // Only show businessArea/station for first row in group
          result.push({
            ...row,
            businessArea: idx === 0 ? row.businessArea : '',
            station: idx === 0 ? row.station : '',
          });
        });
      // If governmentType is government or non-government, add station total row for this group if present
      if (filters.governmentType === 'government' || filters.governmentType === 'non-government') {
        const [area, station] = key.split('|');
        const totalRow = stationTotals.find(st => st.businessArea === area && st.station === station);
        if (totalRow) {
          result.push({
            ...totalRow,
            businessArea: totalRow.businessArea,
            station: totalRow.station,
          });
        }
      } else {
        // For other types, keep previous logic (add total row if present in filteredData)
        rows.filter(r => r.isTotal).forEach(totalRow => {
          result.push({
            ...totalRow,
            businessArea: totalRow.businessArea,
            station: totalRow.station,
          });
        });
      }
    });
    // Add grand total row at the end if present in the original data (not just filteredData)
    const grandTotalRow = data.find(r => r.isGrandTotal);
    if (grandTotalRow) result.push(grandTotalRow);
    return result;
  }, [filteredData, data, filters.governmentType]);

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
      },
    },
    {
      header: 'Station',
      accessor: 'station',
      cell: (value: string, row: AccClassDebtSummaryData) => {
        if (row.isGrandTotal || row.isTotal) return null;
        return <span className="text-gray-700">{value}</span>;
      },
    },
    {
      header: 'Account Class',
      accessor: 'accountClass',
      cell: (value: string, row: AccClassDebtSummaryData) => {
        if (row.isGrandTotal) {
          return <span className="font-bold text-lg text-blue-600">{value}</span>;
        }
        if (row.isTotal) {
          return <span className="font-bold text-blue-600">Total</span>;
        }
        return (
          <span
            className={`font-medium ${
              value?.endsWith('G') ? 'text-blue-600' : 'text-pink-600'
            }`}
          >
            {value || '-'}
          </span>
        );
      },
    },
    {
      header: 'Number of Accounts',
      accessor: 'numberOfAccounts',
      cell: (value: number, row: AccClassDebtSummaryData) => (
        <span
          className={`font-medium ${
            row.isTotal ? 'font-bold text-blue-600' : ''
          } ${row.isGrandTotal ? 'font-bold text-lg text-blue-600' : ''}`}
        >
          {value?.toLocaleString()}
        </span>
      ),
    },
  ];

  const trColumns = [
    {
      header: 'Total Undue',
      accessor: 'totalUndue',
      align: 'right' as const,
      cell: (value: number, row: AccClassDebtSummaryData) => (
        <span
          className={`font-medium ${
            row.isGrandTotal || row.isTotal ? 'text-blue-600 font-bold' : 'text-blue-600'
          } ${row.isGrandTotal ? 'text-lg' : ''}`}
        >
          RM{' '}
          {value?.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }) || '0.00'}
        </span>
      ),
    },
    {
      header: 'Cur.Mth Unpaid',
      accessor: 'curMthUnpaid',
      align: 'right' as const,
      cell: (value: number, row: AccClassDebtSummaryData) => (
        <span
          className={`font-medium ${
            row.isGrandTotal || row.isTotal ? 'text-blue-600 font-bold' : 'text-orange-600'
          } ${row.isGrandTotal ? 'text-lg' : ''}`}
        >
          RM{' '}
          {value?.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }) || '0.00'}
        </span>
      ),
    },
    {
      header: 'Total Unpaid',
      accessor: 'totalUnpaid',
      align: 'right' as const,
      cell: (value: number, row: AccClassDebtSummaryData) => (
        <span
          className={`${
            row.isGrandTotal || row.isTotal ? 'font-bold text-blue-600' : 'font-bold text-gray-900'
          } ${row.isGrandTotal ? 'text-lg' : ''}`}
        >
          RM{' '}
          {value?.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }) || '0.00'}
        </span>
      ),
    },
  ];

  const commonColumns = [
    {
      header: 'TTL O/S Amt',
      accessor: 'ttlOSAmt',
      align: 'right' as const,
      cell: (value: number, row: AccClassDebtSummaryData) => (
        <span
          className={`${
            row.isGrandTotal || row.isTotal ? 'font-bold text-blue-600' : 'font-bold text-red-600'
          } ${row.isGrandTotal ? 'text-lg' : ''}`}
        >
          RM{' '}
          {value?.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }) || '0.00'}
        </span>
      ),
    },
    {
      header: '% of Total',
      accessor: 'percentage',
      align: 'right' as const,
      cell: (value: number, row: AccClassDebtSummaryData) => (
        <span
          className={`${
            row.isGrandTotal || row.isTotal ? 'font-bold text-blue-600' : 'font-medium text-gray-900'
          } ${row.isGrandTotal ? 'text-lg' : ''}`}
        >
          {value?.toFixed(2)}%
        </span>
      ),
    },
  ];

  // Compose columns based on governmentType
  const columns =
    (filters.governmentType === 'government' || filters.governmentType === 'non-government')
      ? [...baseColumns, ...commonColumns]
      : [...baseColumns, ...trColumns, ...commonColumns];

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