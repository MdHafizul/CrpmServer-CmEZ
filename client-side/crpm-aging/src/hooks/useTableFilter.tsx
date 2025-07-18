import { useState, useCallback, useMemo } from 'react';
import type { FilterOptions } from '../types/dashboard.type';

interface UseTableFiltersProps<T> {
  data: T[];
  filterFn: (item: T, filters: Record<string, string>) => boolean;
  initialFilters?: Record<string, string>;
}

interface UseTableFiltersReturn<T> {
  filteredData: T[];
  filters: Record<string, string>;
  setFilter: (key: string, value: string) => void;
  resetFilters: () => void;
  createFilterOptions: (key: string, items: T[], labelFn: (item: T) => string, valueFn: (item: T) => string) => FilterOptions[];
}

export const useTableFilters = <T,>({
  data,
  filterFn,
  initialFilters = {}
}: UseTableFiltersProps<T>): UseTableFiltersReturn<T> => {
  const [filters, setFilters] = useState<Record<string, string>>(initialFilters);

  // Set a single filter
  const setFilter = useCallback((key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  // Reset all filters to initial values
  const resetFilters = useCallback(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  // Apply filters to data
  const filteredData = useMemo(() => {
    return data.filter(item => filterFn(item, filters));
  }, [data, filters, filterFn]);

  // Create filter options from data
  const createFilterOptions = useCallback(
    (key: string, items: T[], labelFn: (item: T) => string, valueFn: (item: T) => string): FilterOptions[] => {
      // Add "All" option
      const options: FilterOptions[] = [{ value: 'all', label: `All ${key}` }];
      
      // Get unique values
      const uniqueValues = new Set<string>();
      items.forEach(item => {
        uniqueValues.add(valueFn(item));
      });
      
      // Create options
      Array.from(uniqueValues).sort().forEach(value => {
        const item = items.find(i => valueFn(i) === value);
        if (item) {
          options.push({
            value,
            label: labelFn(item)
          });
        }
      });
      
      return options;
    },
    []
  );

  return {
    filteredData,
    filters,
    setFilter,
    resetFilters,
    createFilterOptions
  };
};