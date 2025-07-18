// filepath: c:\Users\hafiz\OneDrive\Desktop\DebtAging\client-side\crpm-aging\src\utils\tableHelpers.ts
/**
 * Sort table data by a specific column
 */
export const sortTableData = <T>(
  data: T[],
  sortField: keyof T,
  sortOrder: 'asc' | 'desc'
): T[] => {
  return [...data].sort((a, b) => {
    const valueA = a[sortField];
    const valueB = b[sortField];
    
    // Handle string comparison
    if (typeof valueA === 'string' && typeof valueB === 'string') {
      return sortOrder === 'asc'
        ? valueA.localeCompare(valueB)
        : valueB.localeCompare(valueA);
    }
    
    // Handle number comparison
    if (typeof valueA === 'number' && typeof valueB === 'number') {
      return sortOrder === 'asc' ? valueA - valueB : valueB - valueA;
    }
    
    // Handle date comparison
    if (valueA instanceof Date && valueB instanceof Date) {
      return sortOrder === 'asc'
        ? valueA.getTime() - valueB.getTime()
        : valueB.getTime() - valueA.getTime();
    }
    
    // Default case
    return 0;
  });
};

/**
 * Filter table data based on search term
 */
export const filterTableData = <T>(
  data: T[],
  searchTerm: string,
  searchFields: (keyof T)[]
): T[] => {
  if (!searchTerm) return data;
  
  const lowercaseSearchTerm = searchTerm.toLowerCase();
  
  return data.filter(item => {
    return searchFields.some(field => {
      const value = item[field];
      if (value === null || value === undefined) return false;
      
      return String(value).toLowerCase().includes(lowercaseSearchTerm);
    });
  });
};

/**
 * Paginate table data
 */
export const paginateTableData = <T>(
  data: T[],
  page: number,
  pageSize: number
): T[] => {
  const startIndex = (page - 1) * pageSize;
  return data.slice(startIndex, startIndex + pageSize);
};

/**
 * Group table data by a field
 */
export const groupTableData = <T>(
  data: T[],
  groupField: keyof T
): Record<string, T[]> => {
  return data.reduce((groups, item) => {
    const key = String(item[groupField]);
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
    return groups;
  }, {} as Record<string, T[]>);
};

/**
 * Calculate totals for numeric columns
 */
export const calculateColumnTotals = <T>(
  data: T[],
  numericFields: (keyof T)[]
): Record<string, number> => {
  return numericFields.reduce((totals, field) => {
    totals[field as string] = data.reduce((sum, item) => {
      const value = item[field];
      return sum + (typeof value === 'number' ? value : 0);
    }, 0);
    return totals;
  }, {} as Record<string, number>);
};