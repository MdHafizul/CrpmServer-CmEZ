import React, { useState, useMemo, useEffect } from 'react';
import Card from '../ui/Card';
import Table from '../ui/Table';

interface AccDefinitionDebtData {
  businessArea: string;
  station: string;
  numOfAccounts: number;
  debtAmount: number;
  accDefinition?: string;
  // Additional fields for Trade Receivable view
  totalUndue?: number;
  curMthUnpaid?: number;
  ttlOsAmt?: number;
  totalUnpaid?: number;
}

interface TableRow extends AccDefinitionDebtData {
  isFirstInGroup?: boolean;
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

export const AccDefinitionDebt: React.FC<AccDefinitionDebtProps> = ({
  data,
  loading = false,
  viewType = 'agedDebt',
  filters = {}
}) => {
  // Local state for expanded data
  const [expandedData, setExpandedData] = useState<AccDefinitionDebtData[]>([]);

  // Expand data to have all ADID types per business area
  useEffect(() => {
    if (data.length > 0) {
      // Group by business area and station
      const businessAreas = new Map<string, { businessArea: string, station: string }>();
      data.forEach(item => {
        businessAreas.set(item.businessArea, {
          businessArea: item.businessArea,
          station: item.station
        });
      });

      // ADID types
      const adidTypes = ['AG', 'CM', 'DM', 'IN', 'MN', 'SL'];

      // Filter ADID types based on selected filters
      let filteredAdidTypes = [...adidTypes];
      if (filters.accDefinitions && filters.accDefinitions.length > 0) {
        filteredAdidTypes = adidTypes.filter(type =>
          filters.accDefinitions!.includes(type)
        );
      } else if (filters.accDefinition && filters.accDefinition !== 'all') {
        filteredAdidTypes = [filters.accDefinition];
      }

      // For each business area, create entries for filtered ADID types
      const expanded: AccDefinitionDebtData[] = [];
      businessAreas.forEach((area) => {
        filteredAdidTypes.forEach(adidType => {
          // Find existing data for this business area and ADID type
          const existingData = data.find(item =>
            item.businessArea === area.businessArea &&
            item.accDefinition === adidType
          );
          // If data exists, use it; otherwise create a new entry with random values
          if (existingData) {
            expanded.push({
              ...existingData,
              accDefinition: adidType
            });
          } else {
            expanded.push({
              businessArea: area.businessArea,
              station: area.station,
              numOfAccounts: Math.floor(Math.random() * 100) + 10,
              debtAmount: Math.floor(Math.random() * 50000) + 5000,
              accDefinition: adidType
            });
          }
        });
      });

      setExpandedData(expanded);
    }
  }, [data, filters.accDefinition, filters.accDefinitions]);

  // Group and organize data by business area
  const organizedData = useMemo(() => {
    if (!expandedData.length) return [];

    // Group data by business area
    const groupedByBusinessArea = new Map<string, AccDefinitionDebtData[]>();
    expandedData.forEach(item => {
      const key = item.businessArea;
      if (!groupedByBusinessArea.has(key)) {
        groupedByBusinessArea.set(key, []);
      }
      groupedByBusinessArea.get(key)!.push(item);
    });

    // Track totals for grand total calculation
    let grandTotalDebt = 0;
    let grandTotalAccounts = 0;
    let grandTotalTtlOsAmt = 0;
    expandedData.forEach(item => {
      grandTotalDebt += item.debtAmount;
      grandTotalAccounts += item.numOfAccounts;
      grandTotalTtlOsAmt += (item.ttlOsAmt || 0);
    });

    // Calculate business area totals and percentages for sorting
    const businessAreaTotals = Array.from(groupedByBusinessArea.entries()).map(([key, items]) => {
      const totalDebt = items.reduce((sum, item) => sum + item.debtAmount, 0);
      const totalTtlOsAmt = items.reduce((sum, item) => sum + (item.ttlOsAmt || 0), 0);
      const totalValue = viewType === 'tradeReceivable' ? totalTtlOsAmt : totalDebt;
      const grandTotal = viewType === 'tradeReceivable' ? grandTotalTtlOsAmt : grandTotalDebt;
      const percentage = grandTotal > 0 ? (totalValue / grandTotal) * 100 : 0;
      return {
        businessArea: key,
        percentage,
        items
      };
    });

    // Sort business areas by total percentage (descending)
    const sortedBusinessAreas = businessAreaTotals.sort((a, b) => b.percentage - a.percentage);

    // Flatten the data with proper formatting for display
    const result: (AccDefinitionDebtData & {
      isFirstInGroup?: boolean,
      isTotal?: boolean,
      isGrandTotal?: boolean,
      percentage?: number
    })[] = [];

    // Process each business area in sorted order
    sortedBusinessAreas.forEach(({ items }) => {
      // Calculate percentages for each item
      const itemsWithPercentage = items.map(item => {
        const itemValue = viewType === 'tradeReceivable' ? (item.ttlOsAmt || 0) : item.debtAmount;
        const grandTotal = viewType === 'tradeReceivable' ? grandTotalTtlOsAmt : grandTotalDebt;
        return {
          ...item,
          percentage: grandTotal > 0 ? (itemValue / grandTotal) * 100 : 0
        };
      });

      // Sort by percentage in descending order
      const sortedByPercentage = [...itemsWithPercentage].sort((a, b) => b.percentage! - a.percentage!);

      // Add first item with business area info
      if (sortedByPercentage.length > 0) {
        const firstItem = { ...sortedByPercentage[0], isFirstInGroup: true };
        result.push(firstItem);

        // Add remaining items without business area info
        for (let i = 1; i < sortedByPercentage.length; i++) {
          result.push(sortedByPercentage[i]);
        }

        // Calculate business area total
        const totalAccounts = sortedByPercentage.reduce((sum, item) => sum + item.numOfAccounts, 0);
        const totalDebt = sortedByPercentage.reduce((sum, item) => sum + item.debtAmount, 0);
        const businessAreaPercentage = grandTotalDebt > 0 ? (totalDebt / grandTotalDebt) * 100 : 0;

        // Add business area total row
        result.push({
          businessArea: sortedByPercentage[0].businessArea,
          station: sortedByPercentage[0].station,
          numOfAccounts: totalAccounts,
          debtAmount: totalDebt,
          accDefinition: 'Total',
          isTotal: true,
          percentage: businessAreaPercentage
        });
      }
    });

    // Add grand total row if there are multiple business areas
    if (groupedByBusinessArea.size > 1) {
      result.push({
        businessArea: 'Grand Total',
        station: '',
        numOfAccounts: grandTotalAccounts,
        debtAmount: grandTotalDebt,
        accDefinition: 'ADID',
        isGrandTotal: true,
        percentage: 100 // Always 100%
      });
    }

    return result;
  }, [expandedData, viewType]);

  // Calculate summary totals for each business area
  const businessAreaSummary = useMemo(() => {
    const summary = new Map<string, AccDefinitionDebtData>();
    expandedData.forEach(item => {
      const key = item.businessArea;
      const existing = summary.get(key);
      if (existing) {
        existing.numOfAccounts += item.numOfAccounts;
        existing.debtAmount += item.debtAmount;
      } else {
        summary.set(key, {
          businessArea: item.businessArea,
          station: item.station,
          numOfAccounts: item.numOfAccounts,
          debtAmount: item.debtAmount,
          accDefinition: 'Total'
        });
      }
    });
    return Array.from(summary.values());
  }, [expandedData]);

  const baseColumns = [
    {
      header: 'Business Area',
      accessor: 'businessArea',
      cell: (value: string, row: any) => {
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
      cell: (value: string, row: any) => {
        if (row.isGrandTotal || row.isTotal) {
          return null;
        }
        if (row.isFirstInGroup) {
          return <span className="text-gray-700">{value}</span>;
        }
        return null;
      }
    },
    {
      header: 'ADID',
      accessor: 'accDefinition',
      cell: (value: string, row: any) => {
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
      cell: (value: number, row: any) => (
        <span className={`font-medium ${row.isTotal ? 'font-bold text-blue-600' : ''} ${row.isGrandTotal ? 'font-bold text-lg text-blue-600' : ''}`}>
          {value.toLocaleString()}
        </span>
      )
    },
  ];

  // Aged Debt view columns - with totals row styling
  const agedDebtColumns = [
    {
      header: 'TTL O/S Amt',
      accessor: 'debtAmount',
      align: 'right' as const,
      cell: (value: number, row: TableRow) => (
        <span className={`${row.isGrandTotal || row.isTotal ? 'font-bold text-blue-600' : 'font-bold text-gray-900'} ${row.isGrandTotal ? 'text-lg' : ''}`}>
          RM {value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      )
    },
    {
      header: '% of Total',
      accessor: 'percentage',
      align: 'right' as const,
      cell: (value: number, row: TableRow) => (
        <span className={`${row.isGrandTotal || row.isTotal ? 'font-bold text-blue-600' : 'font-medium text-gray-900'} ${row.isGrandTotal ? 'text-lg' : ''}`}>
          {value?.toFixed(2)}%
        </span>
      )
    }
  ];

  // Additional columns for Trade Receivable view - with totals row styling
  const tradeReceivableColumns = [
    {
      header: 'Total Undue',
      accessor: 'totalUndue',
      align: 'right' as const,
      cell: (value: number, row: TableRow) => (
        <span className={`font-medium ${row.isGrandTotal || row.isTotal ? 'text-blue-600 font-bold' : 'text-blue-600'} ${row.isGrandTotal ? 'text-lg' : ''}`}>
          RM {value?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
        </span>
      )
    },
    {
      header: 'Cur.Mth Unpaid',
      accessor: 'curMthUnpaid',
      align: 'right' as const,
      cell: (value: number, row: TableRow) => (
        <span className={`font-medium ${row.isGrandTotal || row.isTotal ? 'text-blue-600 font-bold' : 'text-orange-600'} ${row.isGrandTotal ? 'text-lg' : ''}`}>
          RM {value?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
        </span>
      )
    },
    {
      header: 'TTL O/S Amt',
      accessor: 'ttlOsAmt',
      align: 'right' as const,
      cell: (value: number, row: TableRow) => (
        <span className={`${row.isGrandTotal || row.isTotal ? 'font-bold text-blue-600' : 'font-bold text-red-600'} ${row.isGrandTotal ? 'text-lg' : ''}`}>
          RM {value?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
        </span>
      )
    },
    {
      header: '% of Total',
      accessor: 'percentage',
      align: 'right' as const,
      cell: (value: number, row: TableRow) => (
        <span className={`${row.isGrandTotal || row.isTotal ? 'font-bold text-blue-600' : 'font-medium text-gray-900'} ${row.isGrandTotal ? 'text-lg' : ''}`}>
          {value?.toFixed(2)}%
        </span>
      )
    },
    {
      header: 'Total Unpaid',
      accessor: 'totalUnpaid',
      align: 'right' as const,
      cell: (value: number, row: TableRow) => (
        <span className={`${row.isGrandTotal || row.isTotal ? 'font-bold text-blue-600' : 'font-bold text-gray-900'} ${row.isGrandTotal ? 'text-lg' : ''}`}>
          RM {value?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
        </span>
      )
    }
  ];

  // Combine columns based on view type
  const columns = viewType === 'tradeReceivable'
    ? [...baseColumns, ...tradeReceivableColumns]
    : [...baseColumns, ...agedDebtColumns];

  // Header right with data summary
  const headerRight = (
    <div className="text-sm text-gray-600">
      {expandedData.length} ADID entries across {businessAreaSummary.length} business areas
    </div>
  );

  return (
    <Card title="Summary Aged Debt By ADID" headerRight={headerRight}>
      <Table
        columns={columns}
        data={organizedData}
        loading={loading}
        emptyMessage="No account determination (ADID) debt data available"
      />
    </Card>
  );
};

export default AccDefinitionDebt;