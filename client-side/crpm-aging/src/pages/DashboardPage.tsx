import React, { use, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import Layout from '../components/layout/Layout';
import { SummaryCardsContainer } from '../components/dashboard/SummaryCard';
import FilterSection from '../components/dashboard/FilterSection';
import DebtByStationTable from '../components/dashboard/DebtByStationTable';

const DashboardPage: React.FC = () => {
  const { 
    summaryCardData, 
    filters,
    fetchSummaryCard,
    debtByStationData,
    fetchDebtByStation,
    loading
  } = useAppContext();
  
  useEffect(() => {
    fetchSummaryCard('1750132052464-aging besar.parquet');
  }, []); 

useEffect(() => {
  const apiParams = {
    viewType: filters.viewType === 'tradeReceivable' ? 'TR' as 'TR' : 'agedDebt' as 'agedDebt',
    accClassType: filters.governmentType === 'government'
      ? 'GOVERNMENT' as 'GOVERNMENT'
      : filters.governmentType === 'non-government'
      ? 'NON_GOVERNMENT' as 'NON_GOVERNMENT'
      : 'ALL' as 'ALL',
    mitType: filters.mitFilter === 'mit'
      ? 'MIT' as 'MIT'
      : filters.mitFilter === 'non-mit'
      ? 'NON_MIT' as 'NON_MIT'
      : 'ALL' as 'ALL',
    businessAreas: filters.businessAreas,
    adids: filters.accDefinitions,
    accStatus: filters.accStatus !== 'all' ? filters.accStatus : null,
    balanceType: filters.netPositiveBalance !== 'all' ? filters.netPositiveBalance : null,
    accountClass: filters.accClass !== 'all' ? filters.accClass : '',
    agingBucket: filters.monthsOutstandingBracket !== 'all' ? filters.monthsOutstandingBracket : null,
    totalOutstandingRange: filters.debtRange !== 'all' ? filters.debtRange : null,
    smerSegments: filters.smerSegments,
  };
  console.log('DashboardPage filter params:', apiParams);
  fetchDebtByStation('1750132052464-aging besar.parquet', apiParams);
  // eslint-disable-next-line
}, [
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
  // Map API data to table data structure
  const tableData = debtByStationData
    ? debtByStationData.data.map(row => ({
        businessArea: row.businessArea,
        station: row.station,
        numOfAccounts: row.numberOfAccounts,
        debtAmount: row.ttlOSAmt,
        totalUndue: row.totalUndue,
        curMthUnpaid: row.curMthUnpaid,
        ttlOsAmt: row.ttlOSAmt,
        totalUnpaid: row.totalUnpaid,
      }))
    : [];
console.log('DebtByStationTable tableData:', tableData);

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Aged Debt Analytics Dashboard</h1>
        <SummaryCardsContainer summaryData={summaryCardData} />
        <FilterSection filters={{
          businessArea: filters.businessArea,
          onBusinessAreaChange: filters.setBusinessArea,
          businessAreaOptions: filters.businessAreaOptions,
          businessAreas: filters.businessAreas,
          setBusinessAreas: filters.setBusinessAreas,
          accDefinition: filters.accDefinition,
          onAccDefinitionChange: filters.setAccDefinition,
          accDefinitionOptions: filters.accDefinitionOptions,
          accDefinitions: filters.accDefinitions,
          setAccDefinitions: filters.setAccDefinitions,
          accStatus: filters.accStatus,
          onAccStatusChange: filters.setAccStatus,
          accStatusOptions: filters.accStatusOptions,
          accClass: filters.accClass,
          onAccClassChange: filters.setAccClass,
          accClassOptions: filters.accClassOptions,
          debtRange: filters.debtRange,
          onDebtRangeChange: filters.setDebtRange,
          debtRangeOptions: filters.debtRangeOptions,
          viewType: filters.viewType,
          onViewTypeChange: filters.setViewType,
          governmentType: filters.governmentType,
          onGovernmentTypeChange: filters.setGovernmentType,
          governmentTypeOptions: filters.governmentTypeOptions,
          mitFilter: filters.mitFilter,
          onMitFilterChange: filters.setMitFilter,
          mitFilterOptions: filters.mitFilterOptions,
          netPositiveBalance: filters.netPositiveBalance,
          onNetPositiveBalanceChange: filters.setNetPositiveBalance,
          netPositiveBalanceOptions: filters.netPositiveBalanceOptions,
          monthsOutstandingBracket: filters.monthsOutstandingBracket,
          onMonthsOutstandingBracketChange: filters.setMonthsOutstandingBracket,
          monthsOutstandingBracketOptions: filters.monthsOutstandingBracketOptions,
          smerSegmentOptions: filters.smerSegmentOptions,
        }} />
        <DebtByStationTable
          data={tableData}
          loading={loading}
          viewType={filters.viewType}
          onViewTypeChange={filters.setViewType}
          filters={{
            businessArea: filters.businessArea,
            onBusinessAreaChange: filters.setBusinessArea,
            businessAreaOptions: filters.businessAreaOptions,
          }}
        />
      </div>
    </Layout>
  );
};

export default DashboardPage;