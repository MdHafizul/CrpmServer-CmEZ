import React, { useMemo } from 'react';
import Card from '../ui/Card';
import Table from '../ui/Table';

interface SmerSegmentDebtData {
  businessArea: string;
  station: string;
  segment: string;
  numOfAccounts: number;
  ttlOsAmt?: number;
  debtAmount?: number;
  totalUndue?: number;
  curMthUnpaid?: number;
  totalUnpaid?: number;
  mitAmt?: number;
  percentage?: number;
  isFirstInGroup?: boolean;
  isTotal?: boolean;
  isGrandTotal?: boolean;
}

interface SmerSegmentDebtTableProps {
  data: SmerSegmentDebtData[];
  loading?: boolean;
  viewType?: 'tradeReceivable' | 'agedDebt';
  onViewTypeChange?: (viewType: 'tradeReceivable' | 'agedDebt') => void;
}

const SmerSegmentDebtTable: React.FC<SmerSegmentDebtTableProps> = ({
  data,
  loading = false,
  viewType = 'agedDebt'
}) => {
  // Organize data similar to AccClassDebtSummary
  const organizedData = useMemo(() => {
    if (!data.length) return [];

    // Group by business area
    const groupedByBusinessArea = new Map<string, SmerSegmentDebtData[]>();
    data.forEach(item => {
      const key = item.businessArea;
      if (!groupedByBusinessArea.has(key)) {
        groupedByBusinessArea.set(key, []);
      }
      groupedByBusinessArea.get(key)!.push(item);
    });

    // Calculate grand totals
    let grandTotalDebt = data.reduce((sum, item) => sum + (item.debtAmount ?? item.ttlOsAmt ?? 0), 0);
    let grandTotalTtlOsAmt = data.reduce((sum, item) => sum + (item.ttlOsAmt ?? 0), 0);
    let grandTotalAccounts = data.reduce((sum, item) => sum + item.numOfAccounts, 0);

    const result: (SmerSegmentDebtData & { percentage?: number })[] = [];

    // Sort business areas by percentage
    const businessAreaTotals = Array.from(groupedByBusinessArea.entries()).map(([key, items]) => {
      const totalValue = viewType === 'tradeReceivable'
        ? items.reduce((sum, item) => sum + (item.ttlOsAmt ?? 0), 0)
        : items.reduce((sum, item) => sum + (item.debtAmount ?? item.ttlOsAmt ?? 0), 0);

      const grandTotal = viewType === 'tradeReceivable' ? grandTotalTtlOsAmt : grandTotalDebt;
      const percentage = grandTotal > 0 ? (totalValue / grandTotal) * 100 : 0;

      return {
        businessArea: key,
        percentage,
        items
      };
    });

    const sortedBusinessAreas = businessAreaTotals.sort((a, b) => b.percentage - a.percentage);

    sortedBusinessAreas.forEach(({ items }) => {
      // Calculate percentages for each item
      const totalValue = viewType === 'tradeReceivable' ? grandTotalTtlOsAmt : grandTotalDebt;
      let sortedItems = items.map(item => ({
        ...item,
        percentage: totalValue > 0 ? ((viewType === 'tradeReceivable' ? (item.ttlOsAmt ?? 0) : (item.debtAmount ?? item.ttlOsAmt ?? 0)) / totalValue) * 100 : 0
      }));

      // Sort by percentage
      sortedItems = sortedItems.sort((a, b) => (b.percentage ?? 0) - (a.percentage ?? 0));

      // Add first item with business area info
      if (sortedItems.length > 0) {
        const firstItem = { ...sortedItems[0], isFirstInGroup: true };
        result.push(firstItem);

        // Add remaining items
        for (let i = 1; i < sortedItems.length; i++) {
          result.push(sortedItems[i]);
        }

        // Add business area total row
        const totalAccounts = sortedItems.reduce((sum, item) => sum + item.numOfAccounts, 0);
        const totalDebt = sortedItems.reduce((sum, item) => sum + (item.debtAmount ?? item.ttlOsAmt ?? 0), 0);
        const totalOsAmt = sortedItems.reduce((sum, item) => sum + (item.ttlOsAmt ?? 0), 0);

        const businessAreaPercentage = totalValue > 0 ? (viewType === 'tradeReceivable' ? totalOsAmt : totalDebt) / totalValue * 100 : 0;

        result.push({
          businessArea: sortedItems[0].businessArea,
          station: sortedItems[0].station,
          segment: 'Total',
          numOfAccounts: totalAccounts,
          debtAmount: totalDebt,
          ttlOsAmt: totalOsAmt,
          isTotal: true,
          percentage: businessAreaPercentage,
          totalUndue: sortedItems.reduce((sum, item) => sum + (item.totalUndue ?? 0), 0),
          curMthUnpaid: sortedItems.reduce((sum, item) => sum + (item.curMthUnpaid ?? 0), 0),
          totalUnpaid: sortedItems.reduce((sum, item) => sum + (item.totalUnpaid ?? 0), 0),
          mitAmt: sortedItems.reduce((sum, item) => sum + (item.mitAmt ?? 0), 0),
        });
      }
    });

    // Add grand total row if multiple business areas
    if (groupedByBusinessArea.size > 1) {
      result.push({
        businessArea: 'Grand Total',
        station: '',
        segment: '',
        numOfAccounts: grandTotalAccounts,
        debtAmount: grandTotalDebt,
        ttlOsAmt: grandTotalTtlOsAmt,
        isGrandTotal: true,
        percentage: 100,
        totalUndue: data.reduce((sum, item) => sum + (item.totalUndue ?? 0), 0),
        curMthUnpaid: data.reduce((sum, item) => sum + (item.curMthUnpaid ?? 0), 0),
        totalUnpaid: data.reduce((sum, item) => sum + (item.totalUnpaid ?? 0), 0),
        mitAmt: data.reduce((sum, item) => sum + (item.mitAmt ?? 0), 0),
      });
    }

    return result;
  }, [data, viewType]);

  // Columns similar to AccClassDebtSummary
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
        if (row.isFirstInGroup) {
          return <span className="font-medium text-gray-900">{value}</span>;
        }
        return null;
      }
    },
    {
      header: 'Station',
      accessor: 'station',
      cell: (value: string, row: SmerSegmentDebtData) => {
        if (row.isFirstInGroup) {
          return <span className="text-gray-700">{value}</span>;
        }
        return null;
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
          <span className="font-medium text-indigo-600">
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
          {value.toLocaleString()}
        </span>
      )
    },
  ];

  const agedDebtColumns = [
    {
      header: 'TTL O/S Amt',
      accessor: 'debtAmount',
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
    }
  ];

  const tradeReceivableColumns = [
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

  const columns = viewType === 'tradeReceivable'
    ? [...baseColumns, ...tradeReceivableColumns]
    : [...baseColumns, ...agedDebtColumns];

  // Header right with filter counts
  const headerRight = (
    <div className="text-sm text-gray-600">
      {data.length} SMER segments across {new Set(data.map(d => d.businessArea)).size} business areas
    </div>
  );

  return (
    <Card title="Aged Debt Summary By SMER Segment" headerRight={headerRight}>
      <Table
        columns={columns}
        data={organizedData}
        loading={loading}
        emptyMessage="No SMER segment debt data available"
      />
    </Card>
  );
};

export default SmerSegmentDebtTable;