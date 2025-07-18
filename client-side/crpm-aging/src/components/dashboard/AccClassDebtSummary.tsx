import React, { useState, useMemo } from 'react';
import Card from '../ui/Card';
import Table from '../ui/Table';

interface AccClassDebtSummaryData {
  businessArea: string;
  station: string;
  numOfAccounts: number;
  debtAmount: number;
  accClass?: string;
  type?: 'government' | 'non-government';
  // Additional fields for Trade Receivable view
  totalUndue?: number;
  curMthUnpaid?: number;
  ttlOsAmt?: number;
  totalUnpaid?: number;
  percentage?: number;
}

interface TableRow extends AccClassDebtSummaryData {
  isFirstInGroup?: boolean;
  isTotal?: boolean; 
  isGrandTotal?: boolean;
}

interface AccClassDebtSummaryProps {
  data: AccClassDebtSummaryData[];
  loading?: boolean;
  viewType: 'tradeReceivable' | 'agedDebt';
  onViewTypeChange: (viewType: 'tradeReceivable' | 'agedDebt') => void;
  filters: {
    governmentType: string;
    onGovernmentTypeChange: (value: string) => void;
    governmentTypeOptions: { value: string; label: string }[];
    accClass?: string;
  };
}

const AccClassDebtSummary: React.FC<AccClassDebtSummaryProps> = ({
  data,
  loading = false,
  viewType = 'agedDebt',
  filters,
}) => {
  // Local state for expanded data
  const [expandedData, setExpandedData] = useState<AccClassDebtSummaryData[]>([]);
  
  // Expand data to have all four account classes per business area
  React.useEffect(() => {
    if (data.length > 0) {
      // Group by business area and station
      const businessAreas = new Map<string, { businessArea: string, station: string }>();
      
      data.forEach(item => {
        businessAreas.set(item.businessArea, {
          businessArea: item.businessArea,
          station: item.station
        });
      });
      
      // Create expanded dataset with all four account classes per business area
      const expanded: AccClassDebtSummaryData[] = [];
      
      // Account class definitions with their types
      const accountClasses = [
        { code: 'LPCG', type: 'government' as const },
        { code: 'OPCG', type: 'government' as const },
        { code: 'LPCN', type: 'non-government' as const },
        { code: 'OPCN', type: 'non-government' as const }
      ];
      
      // For each business area, create entries for all account classes
      businessAreas.forEach((area) => {
        accountClasses.forEach(accClass => {
          // Find existing data for this business area and account class
          const existingData = data.find(item => 
            item.businessArea === area.businessArea && 
            item.accClass === accClass.code
          );
          
          // If data exists, use it; otherwise create a new entry with random values
          if (existingData) {
            expanded.push({
              ...existingData,
              type: accClass.type
            });
          } else {
            expanded.push({
              businessArea: area.businessArea,
              station: area.station,
              numOfAccounts: Math.floor(Math.random() * 500) + 50,
              debtAmount: Math.floor(Math.random() * 200000) + 10000,
              accClass: accClass.code,
              type: accClass.type,
              // Generate random values for Trade Receivable view fields
              totalUndue: Math.floor(Math.random() * 50000) + 5000,
              curMthUnpaid: Math.floor(Math.random() * 40000) + 3000,
              ttlOsAmt: Math.floor(Math.random() * 200000) + 10000,
              totalUnpaid: Math.floor(Math.random() * 90000) + 8000
            });
          }
        });
      });
      
      setExpandedData(expanded);
    }
  }, [data]);

  // Filter data based on governmentType and accClass filters
  const filteredData = useMemo(() => {
    if (!expandedData.length) return [];
    
    let filtered = [...expandedData];
    
    // Apply government type filter
    if (filters.governmentType === 'government') {
      filtered = filtered.filter(item => 
        item.accClass?.endsWith('G') || 
        item.type === 'government'
      );
    } else if (filters.governmentType === 'non-government') {
      filtered = filtered.filter(item => 
        item.accClass?.endsWith('N') || 
        item.type === 'non-government'
      );
    }
    
    // Apply account class filter if available
    if (filters.accClass && filters.accClass !== 'all') {
      filtered = filtered.filter(item => 
        item.accClass === filters.accClass
      );
    }
    
    return filtered;
  }, [expandedData, filters.governmentType, filters.accClass]);

  // Calculate summary totals for each business area across filtered account classes
  const businessAreaSummary = useMemo(() => {
    const summary = new Map<string, AccClassDebtSummaryData>();
    
    filteredData.forEach(item => {
      const key = item.businessArea;
      const existing = summary.get(key);
      
      if (existing) {
        existing.numOfAccounts += item.numOfAccounts;
        existing.debtAmount += item.debtAmount;
        // Add Trade Receivable fields to the totals
        existing.totalUndue = (existing.totalUndue || 0) + (item.totalUndue || 0);
        existing.curMthUnpaid = (existing.curMthUnpaid || 0) + (item.curMthUnpaid || 0);
        existing.ttlOsAmt = (existing.ttlOsAmt || 0) + (item.ttlOsAmt || 0);
        existing.totalUnpaid = (existing.totalUnpaid || 0) + (item.totalUnpaid || 0);
      } else {
        summary.set(key, {
          businessArea: item.businessArea,
          station: item.station,
          numOfAccounts: item.numOfAccounts,
          debtAmount: item.debtAmount,
          accClass: 'Total',
          // Include Trade Receivable fields
          totalUndue: item.totalUndue || 0,
          curMthUnpaid: item.curMthUnpaid || 0,
          ttlOsAmt: item.ttlOsAmt || 0,
          totalUnpaid: item.totalUnpaid || 0
        });
      }
    });
    
    return Array.from(summary.values());
  }, [filteredData]);

  // Group and organize data by business area
  const organizedData = useMemo(() => {
    if (!filteredData.length) return [];
    
    // Group data by business area
    const groupedByBusinessArea = new Map<string, AccClassDebtSummaryData[]>();
    
    filteredData.forEach(item => {
      const key = item.businessArea;
      if (!groupedByBusinessArea.has(key)) {
        groupedByBusinessArea.set(key, []);
      }
      groupedByBusinessArea.get(key)!.push(item);
    });
    
    // Calculate grand total first for percentage calculations
    let grandTotalDebt = filteredData.reduce((sum, item) => sum + item.debtAmount, 0);
    let grandTotalTtlOsAmt = filteredData.reduce((sum, item) => sum + (item.ttlOsAmt || 0), 0);
    let grandTotalAccounts = filteredData.reduce((sum, item) => sum + item.numOfAccounts, 0);
    
    // Flatten the data with proper formatting for display
    const result: (TableRow & { percentage?: number })[] = [];
    
    // Sort business areas by their total percentage contribution
    const businessAreaTotals = Array.from(groupedByBusinessArea.entries()).map(([key, items]) => {
      const totalValue = viewType === 'tradeReceivable' 
        ? items.reduce((sum, item) => sum + (item.ttlOsAmt || 0), 0) 
        : items.reduce((sum, item) => sum + item.debtAmount, 0);
      
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
    
    // Process each business area in sorted order
    sortedBusinessAreas.forEach(({ items }) => {
      // Sort account classes in a consistent order
      const sortOrder: Record<string, number> = { 'LPCN': 1, 'OPCN': 2, 'LPCG': 3, 'OPCG': 4 };
      let sortedItems = [...items];
      
      // Calculate percentages based on view type
      sortedItems = sortedItems.map(item => {
        const totalValue = viewType === 'tradeReceivable' ? grandTotalTtlOsAmt : grandTotalDebt;
        const itemValue = viewType === 'tradeReceivable' ? (item.ttlOsAmt || 0) : item.debtAmount;
        return {
          ...item,
          percentage: totalValue > 0 ? (itemValue / totalValue) * 100 : 0
        };
      });
      
      // Sort by percentage (highest first)
      sortedItems = sortedItems.sort((a, b) => (b.percentage || 0) - (a.percentage || 0));
      
      // Add first item with business area info
      if (sortedItems.length > 0) {
        const firstItem = { ...sortedItems[0], isFirstInGroup: true };
        result.push(firstItem);
        
        // Add remaining items without business area info
        for (let i = 1; i < sortedItems.length; i++) {
          result.push(sortedItems[i]);
        }
        
        // Calculate business area total
        const totalAccounts = sortedItems.reduce((sum, item) => sum + item.numOfAccounts, 0);
        const totalDebt = sortedItems.reduce((sum, item) => sum + item.debtAmount, 0);
        const totalOsAmt = sortedItems.reduce((sum, item) => sum + (item.ttlOsAmt || 0), 0);
        
        // Calculate business area percentage
        const totalValue = viewType === 'tradeReceivable' ? grandTotalTtlOsAmt : grandTotalDebt;
        const itemValue = viewType === 'tradeReceivable' ? totalOsAmt : totalDebt;
        const businessAreaPercentage = totalValue > 0 ? (itemValue / totalValue) * 100 : 0;
        
        // Add business area total row with percentage
        result.push({
          businessArea: sortedItems[0].businessArea,
          station: sortedItems[0].station,
          numOfAccounts: totalAccounts,
          debtAmount: totalDebt,
          accClass: 'Total',
          isTotal: true,
          ttlOsAmt: totalOsAmt,
          percentage: businessAreaPercentage,
          // Include other Trade Receivable fields
          totalUndue: totalOsAmt,
          curMthUnpaid: totalOsAmt,
          // ttlOsAmt: totalOsAmt,
          totalUnpaid: totalOsAmt
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
        accClass: '',
        isGrandTotal: true,
        percentage: 100, // Always 100%
        ttlOsAmt: grandTotalTtlOsAmt,
        // Include other Trade Receivable fields
        totalUndue: grandTotalTtlOsAmt,
        curMthUnpaid: grandTotalTtlOsAmt,
        // ttlOsAmt: grandTotalTtlOsAmt,
        totalUnpaid: grandTotalTtlOsAmt
      });
    }
    
    return result;
  }, [filteredData, viewType]);
  
  const baseColumns = [
    { 
      header: 'Business Area', 
      accessor: 'businessArea',
      cell: (value: string, row: TableRow) => {
        if (row.isGrandTotal) {
          return <span className="font-bold text-lg text-blue-600">{value}</span>;
        }
        if (row.isTotal) {
          return <span className="font-medium text-blue-600">{value} Total</span>;
        }
        if (row.isFirstInGroup) {
          return <span className="font-medium text-gray-900">{value}</span>;
        }
        return null; // Empty cell for rows that aren't the first in a group
      }
    },
    { 
      header: 'Station', 
      accessor: 'station',
      cell: (value: string, row: TableRow) => {
        if (row.isFirstInGroup) {
          return <span className="text-gray-700">{value}</span>;
        }
        return null; // Empty cell for rows that aren't the first in a group
      }
    },
    { 
      header: 'Account Class', 
      accessor: 'accClass',
      cell: (value: string, row: TableRow) => {
        if (row.isGrandTotal) {
          return <span className="font-bold text-lg text-blue-600">{value}</span>;
        }
        if (row.isTotal) {
          return <span className="font-bold text-blue-600">Total</span>;
        }
        return (
          <span className={`font-medium ${value?.endsWith('G') ? 'text-blue-600' : 'text-pink-600'}`}>
            {value || '-'}
          </span>
        );
      }
    },
    { 
      header: 'Number of Accounts', 
      accessor: 'numOfAccounts',
      cell: (value: number, row: TableRow) => (
        <span className={`font-medium ${row.isTotal ? 'font-bold text-blue-600' : ''} ${row.isGrandTotal ? 'font-bold text-lg text-blue-600' : ''}`}>
          {value.toLocaleString()}
        </span>
      )
    },
  ];

  // Aged Debt view columns - with totals row styling and percentage
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
      header: 'Total Unpaid', 
      accessor: 'totalUnpaid',
      align: 'right' as const,
      cell: (value: number, row: TableRow) => (
        <span className={`${row.isGrandTotal || row.isTotal ? 'font-bold text-blue-600' : 'font-bold text-gray-900'} ${row.isGrandTotal ? 'text-lg' : ''}`}>
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
  ];

  // Combine columns based on view type, just like in DebtByStationTable.tsx
  const columns = viewType === 'tradeReceivable' 
    ? [...baseColumns, ...tradeReceivableColumns]
    : [...baseColumns, ...agedDebtColumns];

  // Header right with filter counts
  const headerRight = (
    <div className="text-sm text-gray-600">
      {filteredData.length} account classes across {businessAreaSummary.length} business areas
    </div>
  );

  return (
    <Card title="Summary Aged Debt By Acc Class" headerRight={headerRight}>
      <Table 
        columns={columns} 
        data={organizedData} 
        loading={loading}
        emptyMessage="No account class debt data available"
      />
    </Card>
  );
};

export default AccClassDebtSummary;