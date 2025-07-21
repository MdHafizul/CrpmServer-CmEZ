import React, { useState } from 'react';
import Dropdown from '../ui/Dropdown';
import MultiSelect from '../ui/MultiSelect';
import {
  getBracketColor,
  getBracketBackgroundColor,
  getBracketTextColor,
} from '../../utils/formatter';

interface FilterSectionProps {
  filters: {
    accStatus: string;
    onAccStatusChange: (value: string) => void;
    accStatusOptions: { value: string; label: string }[];

    accClass: string;
    onAccClassChange: (value: string) => void;
    accClassOptions: { value: string; label: string }[];

    accDefinition: string;
    onAccDefinitionChange: (value: string) => void;
    accDefinitionOptions: { value: string; label: string }[];

    accDefinitions: string[];
    setAccDefinitions: (values: string[]) => void;

    netPositiveBalance: string;
    onNetPositiveBalanceChange: (value: string) => void;
    netPositiveBalanceOptions: { value: string; label: string }[];

    businessArea: string;
    onBusinessAreaChange: (value: string) => void;
    businessAreaOptions: { value: string; label: string }[];

    businessAreas: string[];
    setBusinessAreas: (values: string[]) => void;

    monthsOutstandingBracket: string;
    onMonthsOutstandingBracketChange: (value: string) => void;
    monthsOutstandingBracketOptions: { value: string; label: string }[];

    debtRange: string;
    onDebtRangeChange: (value: string) => void;
    debtRangeOptions: { value: string; label: string }[];

    smerSegments?: string[];
    setSmerSegments?: (values: string[]) => void;
    smerSegmentOptions: { value: string; label: string }[];

    governmentType: string;
    onGovernmentTypeChange: (value: string) => void;
    governmentTypeOptions: { value: string; label: string }[];

    viewType: 'tradeReceivable' | 'agedDebt';
    onViewTypeChange: (value: 'tradeReceivable' | 'agedDebt') => void;

    mitFilter: string;
    onMitFilterChange: (value: string) => void;
    mitFilterOptions: { value: string; label: string }[];
  };
}

const FilterSection: React.FC<FilterSectionProps> = ({ filters }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  // Check if any filters are active (not 'all' and not empty)
  const hasActiveFilters =
    (filters.businessArea && filters.businessArea !== 'all') ||
    (filters.accStatus && filters.accStatus !== 'all') ||
    (filters.accClass && filters.accClass !== 'all') ||
    (filters.accDefinition && filters.accDefinition !== 'all') ||
    (filters.netPositiveBalance && filters.netPositiveBalance !== 'all') ||
    (filters.monthsOutstandingBracket && filters.monthsOutstandingBracket !== 'all') ||
    (filters.debtRange && filters.debtRange !== 'all') ||
    (filters.smerSegments && filters.smerSegments.length > 0);

  // Count active filters
  const activeFilterCount =
    [
      filters.businessArea,
      filters.accStatus,
      filters.accClass,
      filters.accDefinition,
      filters.netPositiveBalance,
      filters.monthsOutstandingBracket,
      filters.debtRange,
    ].filter(value => value && value !== 'all').length +
    ((filters.smerSegments && filters.smerSegments.length > 0) ? 1 : 0);

  // Helper function to get filter display value
  const getFilterDisplayValue = (value: string, options: { value: string; label: string }[]) => {
    if (!value || value === 'all') return null;
    const option = options.find(opt => opt.value === value);
    return option?.label || value;
  };

  // Helper function to get multi-select display values
  const getMultiSelectDisplayValues = (values: string[], options: { value: string; label: string }[]) => {
    if (!values.length) return null;
    return values.map(value => {
      const option = options.find(opt => opt.value === value);
      return option?.label || value;
    }).join(', ');
  };

  const clearAllFilters = () => {
    filters.onBusinessAreaChange('');
    filters.onAccStatusChange('');
    filters.onAccClassChange('');
    filters.onAccDefinitionChange('');
    filters.onNetPositiveBalanceChange('');
    filters.onMonthsOutstandingBracketChange('');
    filters.onDebtRangeChange('');
    filters.onGovernmentTypeChange('');
    filters.onMitFilterChange('');
    filters.setBusinessAreas([]);
    filters.setAccDefinitions([]);
    filters.setSmerSegments && filters.setSmerSegments([]);
  };

  return (
    <div className="mb-6">
      {/* Filter Header with Toggle */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* View Type Toggle at the top */}
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Data View</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Main View Type Toggle */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-600">View Type</label>
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => filters.onViewTypeChange('agedDebt')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    filters.viewType === 'agedDebt'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Aged Debt
                </button>
                <button
                  onClick={() => filters.onViewTypeChange('tradeReceivable')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    filters.viewType === 'tradeReceivable'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Trade Receivable
                </button>
              </div>
            </div>
            {/* Government Type Toggle for AccClassDebtSummary */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-600">Account Class Type</label>
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => filters.onGovernmentTypeChange('government')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    filters.governmentType === 'government'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Government
                </button>
                <button
                  onClick={() => filters.onGovernmentTypeChange('non-government')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    filters.governmentType === 'non-government'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Non-Gov
                </button>
                <button
                  onClick={() => filters.onGovernmentTypeChange('all')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    filters.governmentType === 'all'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  All
                </button>
              </div>
            </div>
            {/* MIT Filter Toggle */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-600">MIT Filter</label>
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => filters.onMitFilterChange('mit')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    filters.mitFilter === 'mit'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  MIT
                </button>
                <button
                  onClick={() => filters.onMitFilterChange('non-mit')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    filters.mitFilter === 'non-mit'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Non-MIT
                </button>
                <button
                  onClick={() => filters.onMitFilterChange('all')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    filters.mitFilter === 'all'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  All
                </button>
              </div>
            </div>
          </div>
        </div>
        {/* Filters Section */}
        <div
          className="px-6 py-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
              {hasActiveFilters && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {activeFilterCount} active
                </span>
              )}
            </div>
            <div className="flex items-center space-x-3">
              {hasActiveFilters && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    clearAllFilters();
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
                >
                  Clear All
                </button>
              )}
              <svg
                className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${
                  isExpanded ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          {/* Active Filters Summary */}
          {hasActiveFilters && !isExpanded && (
            <div className="mt-3 flex flex-wrap gap-2">
              {getFilterDisplayValue(filters.businessArea, filters.businessAreaOptions) && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                  Area: {getFilterDisplayValue(filters.businessArea, filters.businessAreaOptions)}
                </span>
              )}
              {getFilterDisplayValue(filters.accStatus, filters.accStatusOptions) && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                  Status: {getFilterDisplayValue(filters.accStatus, filters.accStatusOptions)}
                </span>
              )}
              {getFilterDisplayValue(filters.accClass, filters.accClassOptions) && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                  Class: {getFilterDisplayValue(filters.accClass, filters.accClassOptions)}
                </span>
              )}
              {getFilterDisplayValue(filters.accDefinition, filters.accDefinitionOptions) && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200">
                  ADID: {getFilterDisplayValue(filters.accDefinition, filters.accDefinitionOptions)}
                </span>
              )}
              {getFilterDisplayValue(filters.netPositiveBalance, filters.netPositiveBalanceOptions) && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                  Balance: {getFilterDisplayValue(filters.netPositiveBalance, filters.netPositiveBalanceOptions)}
                </span>
              )}
              {getFilterDisplayValue(filters.monthsOutstandingBracket, filters.monthsOutstandingBracketOptions) && (
                <span
                  className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border"
                  style={{
                    backgroundColor: getBracketBackgroundColor(filters.monthsOutstandingBracket),
                    color: getBracketTextColor(filters.monthsOutstandingBracket),
                    borderColor: getBracketColor(filters.monthsOutstandingBracket) + '60'
                  }}
                >
                  Range: {getFilterDisplayValue(filters.monthsOutstandingBracket, filters.monthsOutstandingBracketOptions)}
                </span>
              )}
              {/* New Debt Range Filter Badge */}
              {getFilterDisplayValue(filters.debtRange, filters.debtRangeOptions) && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-200">
                  Debt: {getFilterDisplayValue(filters.debtRange, filters.debtRangeOptions)}
                </span>
              )}
              {/* Multi-select SMER Segment Filter Badge */}
              {filters.smerSegments && filters.smerSegments.length > 0 && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Segment: {getMultiSelectDisplayValues(filters.smerSegments, filters.smerSegmentOptions)}
                </span>
              )}
            </div>
          )}
        </div>
        {/* Filter Controls */}
        {isExpanded && (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {/* Business Area Filter - Multi-select version */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-semibold text-gray-800">
                    Business Areas <span className="text-xs font-normal text-blue-600">(Multi-select)</span>
                  </label>
                  {filters.businessAreas.length > 0 && (
                    <span className="text-xs text-blue-600 font-medium">
                      {filters.businessAreas.length} selected
                    </span>
                  )}
                </div>
                <MultiSelect
                  options={filters.businessAreaOptions.filter(opt => opt.value !== 'all')}
                  values={filters.businessAreas}
                  onChange={filters.setBusinessAreas}
                  placeholder="Select Business Areas"
                  className="w-full"
                />
                {filters.businessAreas.length > 0 && (
                  <div className="text-xs text-gray-600 bg-blue-50 px-2 py-1 rounded max-h-16 overflow-auto">
                    Selected: {filters.businessAreas.map(value => {
                      const option = filters.businessAreaOptions.find(opt => opt.value === value);
                      return option?.label || value;
                    }).join(', ')}
                  </div>
                )}
              </div>
              {/* Account Status Filter */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-semibold text-gray-800">
                    Account Status
                  </label>
                  {filters.accStatus && filters.accStatus !== 'all' && (
                    <span className="text-xs text-green-600 font-medium">
                      Active
                    </span>
                  )}
                </div>
                <Dropdown
                  options={filters.accStatusOptions}
                  value={filters.accStatus}
                  onChange={filters.onAccStatusChange}
                  placeholder="Select Status"
                  className="w-full"
                />
                {filters.accStatus && filters.accStatus !== 'all' && (
                  <div className="text-xs text-gray-600 bg-green-50 px-2 py-1 rounded">
                    Selected: {getFilterDisplayValue(filters.accStatus, filters.accStatusOptions)}
                  </div>
                )}
              </div>
              {/* Account Class Filter */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-semibold text-gray-800">
                    Account Class
                  </label>
                  {filters.accClass && filters.accClass !== 'all' && (
                    <span className="text-xs text-purple-600 font-medium">
                      Active
                    </span>
                  )}
                </div>
                <Dropdown
                  options={filters.accClassOptions}
                  value={filters.accClass}
                  onChange={filters.onAccClassChange}
                  placeholder="Select Class"
                  className="w-full"
                />
                {filters.accClass && filters.accClass !== 'all' && (
                  <div className="text-xs text-gray-600 bg-purple-50 px-2 py-1 rounded">
                    Selected: {getFilterDisplayValue(filters.accClass, filters.accClassOptions)}
                  </div>
                )}
              </div>
              {/* ADID Filter - Multi-select version */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-semibold text-gray-800">
                    ADIDs <span className="text-xs font-normal text-blue-600">(Multi-select)</span>
                  </label>
                  {filters.accDefinitions.length > 0 && (
                    <span className="text-xs text-orange-600 font-medium">
                      {filters.accDefinitions.length} selected
                    </span>
                  )}
                </div>
                <MultiSelect
                  options={filters.accDefinitionOptions.filter(opt => opt.value !== 'all')}
                  values={filters.accDefinitions}
                  onChange={filters.setAccDefinitions}
                  placeholder="Select ADIDs"
                  className="w-full"
                />
                {filters.accDefinitions.length > 0 && (
                  <div className="text-xs text-gray-600 bg-orange-50 px-2 py-1 rounded max-h-16 overflow-auto">
                    Selected: {filters.accDefinitions.map(value => {
                      const option = filters.accDefinitionOptions.find(opt => opt.value === value);
                      return option?.label || value;
                    }).join(', ')}
                  </div>
                )}
              </div>
              {/* Balance Type Filter */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-semibold text-gray-800">
                    Balance Type
                  </label>
                  {filters.netPositiveBalance && filters.netPositiveBalance !== 'all' && (
                    <span className="text-xs text-red-600 font-medium">
                      Active
                    </span>
                  )}
                </div>
                <Dropdown
                  options={filters.netPositiveBalanceOptions}
                  value={filters.netPositiveBalance}
                  onChange={filters.onNetPositiveBalanceChange}
                  placeholder="Select Balance Type"
                  className="w-full"
                />
                {filters.netPositiveBalance && filters.netPositiveBalance !== 'all' && (
                  <div className="text-xs text-gray-600 bg-red-50 px-2 py-1 rounded">
                    Selected: {getFilterDisplayValue(filters.netPositiveBalance, filters.netPositiveBalanceOptions)}
                  </div>
                )}
              </div>
              {/* Months Outstanding Bracket Filter */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-semibold text-gray-800">
                    Aging Bucket Range
                  </label>
                  {filters.monthsOutstandingBracket && filters.monthsOutstandingBracket !== 'all' && (
                    <span className="text-xs text-indigo-600 font-medium">
                      Active
                    </span>
                  )}
                </div>
                <Dropdown
                  options={filters.monthsOutstandingBracketOptions}
                  value={filters.monthsOutstandingBracket}
                  onChange={filters.onMonthsOutstandingBracketChange}
                  placeholder="Select Range"
                  className="w-full"
                />
                {filters.monthsOutstandingBracket && filters.monthsOutstandingBracket !== 'all' && (
                  <div className="text-xs text-gray-600 bg-indigo-50 px-2 py-1 rounded">
                    Selected: {getFilterDisplayValue(filters.monthsOutstandingBracket, filters.monthsOutstandingBracketOptions)}
                  </div>
                )}
              </div>
              {/* Debt Range Filter */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-semibold text-gray-800">
                    Total Outstanding Range
                  </label>
                  {filters.debtRange && filters.debtRange !== 'all' && (
                    <span className="text-xs text-yellow-600 font-medium">
                      Active
                    </span>
                  )}
                </div>
                <Dropdown
                  options={filters.debtRangeOptions}
                  value={filters.debtRange}
                  onChange={filters.onDebtRangeChange}
                  placeholder="Select Debt Range"
                  className="w-full"
                />
                {filters.debtRange && filters.debtRange !== 'all' && (
                  <div className="text-xs text-gray-600 bg-yellow-50 px-2 py-1 rounded">
                    Selected: {getFilterDisplayValue(filters.debtRange, filters.debtRangeOptions)}
                  </div>
                )}
              </div>
              {/* SMER Segment Filter - Multi-select version */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-semibold text-gray-800">
                    SMER Segment <span className="text-xs font-normal text-blue-600">(Multi-select)</span>
                  </label>
                  {filters.smerSegments && filters.smerSegments.length > 0 && (
                    <span className="text-xs text-indigo-600 font-medium">
                      {filters.smerSegments.length} selected
                    </span>
                  )}
                </div>
                <MultiSelect
                  options={filters.smerSegmentOptions.filter(opt => opt.value !== 'all')}
                  values={filters.smerSegments || []}
                  onChange={filters.setSmerSegments || (() => {})}
                  placeholder="Select SMER Segments"
                  className="w-full"
                />
                {filters.smerSegments && filters.smerSegments.length > 0 && (
                  <div className="text-xs text-gray-600 bg-indigo-50 px-2 py-1 rounded max-h-16 overflow-auto">
                    Selected: {filters.smerSegments.map(value => {
                      const option = filters.smerSegmentOptions.find(opt => opt.value === value);
                      return option?.label || value;
                    }).join(', ')}
                  </div>
                )}
              </div>
            </div>
            {/* Action Buttons */}
            {hasActiveFilters && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} applied
                  </div>
                  <button
                    onClick={clearAllFilters}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 hover:border-blue-300 transition-colors"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Clear All Filters
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FilterSection;