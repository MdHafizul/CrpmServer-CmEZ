/**
 * Format a number as currency (RM)
 */
export const formatCurrency = (value: number, minimumFractionDigits = 2, maximumFractionDigits = 2): string => {
  return `RM ${value.toLocaleString('en-MY', {
    minimumFractionDigits,
    maximumFractionDigits
  })}`;
};

/**
 * Format a date string to a readable format
 */
export const formatDate = (dateString: string | null): string => {
  if (!dateString) return '-';
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '-';
  
  return date.toLocaleDateString('en-MY', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

/**
 * Format a percentage value
 */
export const formatPercentage = (value: number): string => {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
};

/**
 * Format a large number with k/M/B suffix
 */
export const formatLargeNumber = (value: number): string => {
  if (value >= 1000000000) {
    return `${(value / 1000000000).toFixed(1)}B`;
  }
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toString();
};

/**
 * Format account status
 */
export const formatAccountStatus = (status: string): string => {
  if (!status) return '-';
  
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
};

/**
 * Convert decimal months to months.days format and determine range bracket
 */
export const getMonthsOutstandingBracket = (monthsOutstanding: number): string => {
  if (monthsOutstanding === null || monthsOutstanding === undefined || isNaN(monthsOutstanding)) {
    return 'Unknown';
  }
  
  const months = Math.floor(monthsOutstanding);
  
  if (months >= 0 && months < 3) {
    return '0-3';
  } else if (months >= 3 && months < 6) {
    return '3-6';
  } else if (months >= 6 && months < 9) {
    return '6-9';
  } else if (months >= 9 && months < 12) {
    return '9-12';
  } else if (months >= 12) {
    return '>12';
  } else {
    return 'Unknown';
  }
};

/**
 * Format months outstanding as months.days
 */
export const formatMonthsOutstanding = (monthsOutstanding: number): string => {
  if (monthsOutstanding === null || monthsOutstanding === undefined || isNaN(monthsOutstanding)) {
    return '-';
  }
  
  const months = Math.floor(monthsOutstanding);
  const days = Math.floor((monthsOutstanding - months) * 30); // Approximate days in month
  
  return `${months}.${days.toString().padStart(1, '0')}`;
};

/**
 * Get bracket color for styling - Matches web app color scheme
 */
export const getBracketColor = (bracket: string): string => {
  switch (bracket) {
    case '0-3':
      return '#10B981'; // Emerald 500 - Matches your success states
    case '3-6':
      return '#3B82F6'; // Blue 500 - Matches your primary blue theme
    case '6-9':
      return '#F59E0B'; // Amber 500 - Matches your warning states
    case '9-12':
      return '#EF4444'; // Red 500 - Matches your error/danger states
    case '>12':
      return '#991B1B'; // Red 800 - Darker red for critical state
    default:
      return '#64748B'; // Slate 500 - Matches your gray text colors
  }
};

/**
 * Get bracket background color with transparency - For backgrounds and highlights
 */
export const getBracketBackgroundColor = (bracket: string): string => {
  switch (bracket) {
    case '0-3':
      return '#D1FAE5'; // green-100 - Matches your filter badge backgrounds
    case '3-6':
      return '#DBEAFE'; // blue-100 - Matches your primary theme backgrounds
    case '6-9':
      return '#FEF3C7'; // amber-100 - Matches your warning backgrounds
    case '9-12':
      return '#FEE2E2'; // red-100 - Matches your error backgrounds
    case '>12':
      return '#FECACA'; // red-200 - Slightly more prominent for critical
    default:
      return '#F1F5F9'; // slate-100 - Matches your neutral backgrounds
  }
};

/**
 * Get bracket text color for contrast - For text on colored backgrounds
 */
export const getBracketTextColor = (bracket: string): string => {
  switch (bracket) {
    case '0-3':
      return '#065F46'; // green-800 - Matches your green text in filters
    case '3-6':
      return '#1E40AF'; // blue-800 - Matches your blue text theme
    case '6-9':
      return '#92400E'; // amber-800 - Matches your warning text
    case '9-12':
      return '#991B1B'; // red-800 - Matches your error text
    case '>12':
      return '#7F1D1D'; // red-900 - Darker for critical states
    default:
      return '#475569'; // slate-600 - Matches your secondary text
  }
};