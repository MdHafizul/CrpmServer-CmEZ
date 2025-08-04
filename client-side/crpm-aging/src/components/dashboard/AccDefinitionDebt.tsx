import React, { useEffect, useState, useMemo } from 'react';
import Card from '../ui/Card';
import Table from '../ui/Table';
import Skeleton from '../ui/Skeleton';
import { getDebtByAdidData } from '../../services/api';
import type { DebtByAccountByADIDRow } from '../../types/dashboard.type';
import { useAppContext } from '../../context/AppContext';

// Type for each row
interface AccDefinitionDebtData extends DebtByAccountByADIDRow {
  isTotal?: boolean;
  isGrandTotal?: boolean;
  percentage?: number;
}

interface AccDefinitionDebtProps {
  filters: any;
}

const AccDefinitionDebt: React.FC<AccDefinitionDebtProps> = ({ filters }) => {
  const [data, setData] = useState<AccDefinitionDebtData[]>([]);
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
    getDebtByAdidData(parquetFileName, apiParams)
      .then(res => {
        // Map API data for DebtByADID
        const d = res.data?.data || [];
        const stationTotals = res.data?.stationTotals || [];
        const grandTotal = res.data?.grandTotal;
        const mapped: AccDefinitionDebtData[] = [
          ...d.map((row: any) => ({
            businessArea: row.businessArea,
            station: row.station,
            adid: row.adid,
            numberOfAccounts: row.numberOfAccounts,
            ttlOSAmt: row.ttlOSAmt,
            percentOfTotal: row.percentOfTotal,
            totalUndue: row.totalUndue,
            curMthUnpaid: row.curMthUnpaid,
            totalUnpaid: row.totalUnpaid,
            mitAmt: row.mitAmt,
            percentage: parseFloat(row.percentOfTotal),
          })),
          ...stationTotals.map((stationTotal: any) => ({
            businessArea: stationTotal.businessArea,
            station: stationTotal.station,
            adid: 'Total',
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
            adid: 'ADID',
            numberOfAccounts: grandTotal.totalNumberOfAccounts,
            ttlOSAmt: grandTotal.totalTtlOSAmt,
            percentOfTotal: grandTotal.totalPercentOfTotal,
            totalUndue: grandTotal.totalUndue,
            curMthUnpaid: grandTotal.totalCurMthUnpaid,
            totalUnpaid: grandTotal.totalUnpaid,
            mitAmt: grandTotal.totalMITAmt,
            percentage: parseFloat(grandTotal.totalPercentOfTotal),
            isGrandTotal: true,
          }
        ].filter(Boolean) as AccDefinitionDebtData[];
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
    filters.smerSegments
  ]);

  // Optionally filter by ADID if needed
  const filteredData = useMemo(() => {
    if (!data?.length) return [];
    let filtered = [...data];
    if (filters.accDefinitions && filters.accDefinitions.length > 0) {
      filtered = filtered.filter(item => filters.accDefinitions!.includes(item.adid || ''));
    } else if (filters.accDefinition && filters.accDefinition !== 'all') {
      filtered = filtered.filter(item => item.adid === filters.accDefinition);
    }
    return filtered;
  }, [data, filters.accDefinition, filters.accDefinitions]);

  // Group rows by businessArea+station, show only first row's businessArea/station, then total, then grand total
  const groupedRows = useMemo(() => {
    if (!filteredData.length) return [];
    // Find all unique businessArea+station in filteredData
    const groups: Record<string, AccDefinitionDebtData[]> = {};
    filteredData.forEach(row => {
      const key = `${row.businessArea}|${row.station}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(row);
    });

    // Find all station total rows from the original data
    const stationTotals = data.filter(r => r.isTotal);

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
      // Add station total row for this group if present
      const [area, station] = key.split('|');
      const totalRow = stationTotals.find(st => st.businessArea === area && st.station === station);
      if (totalRow) {
        result.push({
          ...totalRow,
          businessArea: totalRow.businessArea,
          station: totalRow.station,
        });
      }
    });
    // Grand total row at the end
    const grandTotalRow = data.find(r => r.isGrandTotal);
    if (grandTotalRow) result.push(grandTotalRow);
    return result;
  }, [filteredData, data]);

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
      accessor: 'adid',
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
      accessor: 'numberOfAccounts',
      cell: (value: number, row: AccDefinitionDebtData) => (
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
      header: 'Total Unpaid',
      accessor: 'totalUnpaid',
      align: 'right' as const,
      cell: (value: number, row: AccDefinitionDebtData) => (
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
      cell: (value: number, row: AccDefinitionDebtData) => (
        <span className={`${row.isGrandTotal || row.isTotal ? 'font-bold text-blue-600' : 'font-bold text-red-600'} ${row.isGrandTotal ? 'text-lg' : ''}`}>
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

  const columns =
    filters.viewType === 'agedDebt'
      ? [...baseColumns, ...commonColumns]
      : [...baseColumns, ...trColumns, ...commonColumns];

  const headerRight = (
    <div className="text-sm text-gray-600">
      {filteredData.length} ADID entries
    </div>
  );

  return (
    <Card title="Summary Aged Debt By ADID" headerRight={headerRight}>
      {loading ? (
        <div>
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
              {[...Array(10)].map((_, i) => (
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
      ) : (
        <Table
          columns={columns}
          data={groupedRows}
          loading={false}
          emptyMessage="No account determination (ADID) debt data available"
        />
      )}
    </Card>
  );
};

export default AccDefinitionDebt;