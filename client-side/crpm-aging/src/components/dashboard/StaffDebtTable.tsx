import React, { useEffect, useState } from 'react';
import Card from '../ui/Card';
import Table from '../ui/Table';
import Skeleton from '../ui/Skeleton';
import { getDebtByStaffData } from '../../services/api';
import type { DebtByStaffRow } from '../../types/dashboard.type';
import { useAppContext } from '../../context/AppContext';

interface StaffDebtData extends DebtByStaffRow {
  isTotal?: boolean;
  isGrandTotal?: boolean;
  percentage?: number;
}

interface StaffDebtTableProps {
  filters: any;
}

const StaffDebtTable: React.FC<StaffDebtTableProps> = ({ filters }) => {
  const [data, setData] = useState<StaffDebtData[]>([]);
  const [loading, setLoading] = useState(false);
  const { parquetFileName } = useAppContext();

  useEffect(() => {
    if (!parquetFileName) return;
    setLoading(true);
    const apiParams = {
      viewType: filters.viewType === 'tradeReceivable' ? 'TR' : 'agedDebt',
      businessAreas: filters.businessAreas,
    };
    getDebtByStaffData(parquetFileName, apiParams)
      .then(res => {
        const d = res.data?.data || [];
        const grandTotal = res.data?.grandTotal;
        const staffRows = d
          .filter(row => row.businessArea !== 'TOTAL' && row.businessArea !== 'Grand Total')
          .map(row => ({
            businessArea: row.businessArea,
            station: row.station,
            numberOfAccounts: row.numberOfAccounts,
            ttlOSAmt: row.ttlOSAmt,
            percentOfTotal: row.percentOfTotal,
            totalUndue: row.totalUndue,
            curMthUnpaid: row.curMthUnpaid,
            totalUnpaid: row.totalUnpaid,
            percentage: parseFloat(row.percentOfTotal),
          }));
        const staffRowsSorted = [...staffRows].sort((a, b) => b.percentage - a.percentage);
        const staffDebtTableData = [
          ...staffRowsSorted,
          grandTotal && {
            businessArea: 'TOTAL',
            station: 'All Stations',
            numberOfAccounts: grandTotal.totalNumberOfAccounts,
            ttlOSAmt: grandTotal.totalTtlOSAmt,
            percentOfTotal: grandTotal.totalPercentOfTotal,
            totalUndue: grandTotal.totalUndue,
            curMthUnpaid: grandTotal.totalCurMthUnpaid,
            totalUnpaid: grandTotal.totalUnpaid,
            percentage: parseFloat(grandTotal.totalPercentOfTotal),
            isGrandTotal: true,
          }
        ].filter(Boolean);
        setData(staffDebtTableData);
      })
      .finally(() => setLoading(false));
  }, [
    parquetFileName,
    filters.businessAreas,
    filters.viewType,
  ]);

  // Group by businessArea + station, then render staff rows, then render total row
  const groupedRows = React.useMemo(() => {
    const groups: Record<string, StaffDebtData[]> = {};
    data.forEach(row => {
      const key = `${row.businessArea}|${row.station}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(row);
    });

    const result: StaffDebtData[] = [];
    Object.entries(groups).forEach(([, rows]) => {
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
      accessor: 'numberOfAccounts',
      align: 'right' as const,
      cell: (value: number, row: StaffDebtData) => (
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
      header: 'Total Unpaid', 
      accessor: 'totalUnpaid',
      align: 'right' as const,
      cell: (value: number, row: StaffDebtData) => (
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

  const columns =
    filters.viewType === 'agedDebt'
      ? [...baseColumns, ...commonColumns]
      : [...baseColumns, ...trColumns, ...commonColumns];

  return (
    <Card title="By Staff Debt">
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
          emptyMessage="No staff debt data available"
          className="staff-debt-table"
          key="staff-debt-table"
        />
      )}
    </Card>
  );
};

export default StaffDebtTable;