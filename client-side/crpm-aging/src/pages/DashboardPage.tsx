import React, { useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import Layout from '../components/layout/Layout';
import { SummaryCardsContainer } from '../components/dashboard/SummaryCard';
import FilterSection from '../components/dashboard/FilterSection';
import DebtByStationTable from '../components/dashboard/DebtByStationTable';
import AccClassDebtSummary from '../components/dashboard/AccClassDebtSummary';
import AccDefinitionDebt  from '../components/dashboard/AccDefinitionDebt';
import StaffDebtTable from '../components/dashboard/StaffDebtTable';
import SmerSegmentDebtTable from '../components/dashboard/SmerSegmentDebtTable';

const DashboardPage: React.FC = () => {
  const { 
    summaryCardData, 
    filters,
    fetchSummaryCard,
    debtByStationData,
    fetchDebtByStation,
    loading,
    debtByAccountClassData,
    fetchDebtByAccountClass,
    debtByADIDData,
    fetchDebtByADID,
    debtByStaffData,
    fetchDebtByStaff,
    debtBySmerSegmentData,
    fetchDebtBySmerSegment,
  } = useAppContext();

  // Fetch summary card data on mount
  useEffect(() => {
    fetchSummaryCard('1750132052464-aging besar.parquet');
    // eslint-disable-next-line
  }, []);

  // Fetch debt by station data
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

  // Fetch debt by account class data
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
    fetchDebtByAccountClass('1750132052464-aging besar.parquet', apiParams);
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

const accClassSummaryData = debtByAccountClassData?.data
  ? [
      // Individual account class rows
      ...debtByAccountClassData.data.map(row => ({
        businessArea: row.businessArea,
        station: row.station,
        accClass: row.accountClass,
        numOfAccounts: row.numberOfAccounts,
        debtAmount: row.ttlOSAmt,
        totalUndue: row.totalUndue,
        curMthUnpaid: row.curMthUnpaid,
        ttlOsAmt: row.ttlOSAmt,
        totalUnpaid: row.totalUnpaid,
        mitAmt: row.mitAmt,
        percentage: parseFloat(row.percentOfTotal),
      })),
      // Station totals
      ...debtByAccountClassData.stationTotals.map(stationTotal => ({
        businessArea: stationTotal.businessArea,
        station: stationTotal.station,
        accClass: 'Total',
        numOfAccounts: stationTotal.totalNumberOfAccounts,
        debtAmount: stationTotal.totalTtlOSAmt,
        totalUndue: stationTotal.totalUndue,
        curMthUnpaid: stationTotal.totalCurMthUnpaid,
        ttlOsAmt: stationTotal.totalTtlOSAmt,
        totalUnpaid: stationTotal.totalUnpaid,
        mitAmt: stationTotal.totalMITAmt,
        percentage: parseFloat(stationTotal.totalPercentOfTotal),
        isTotal: true,
      })),
      // Grand total
      {
        businessArea: 'Grand Total',
        station: '',
        accClass: 'Total',
        numOfAccounts: debtByAccountClassData.grandTotal.totalNumberOfAccounts,
        debtAmount: debtByAccountClassData.grandTotal.totalTtlOSAmt,
        totalUndue: debtByAccountClassData.grandTotal.totalUndue,
        curMthUnpaid: debtByAccountClassData.grandTotal.totalCurMthUnpaid,
        ttlOsAmt: debtByAccountClassData.grandTotal.totalTtlOSAmt,
        totalUnpaid: debtByAccountClassData.grandTotal.totalUnpaid,
        mitAmt: debtByAccountClassData.grandTotal.totalMITAmt,
        percentage: parseFloat(debtByAccountClassData.grandTotal.totalPercentOfTotal),
        isGrandTotal: true,
      }
    ]
  : [];

  // Fetch debt by ADID data
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
    };
    fetchDebtByADID('1750132052464-aging besar.parquet', apiParams);
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

  // Map API data for DebtByADID
  const accDefinitionDebtData = debtByADIDData
    ? [
        // Individual ADID rows
        ...debtByADIDData.data.map(row => ({
          businessArea: row.businessArea,
          station: row.station,
          accDefinition: row.adid,
          numOfAccounts: row.numberOfAccounts,
          debtAmount: row.ttlOSAmt,
          totalUndue: row.totalUndue,
          curMthUnpaid: row.curMthUnpaid,
          ttlOsAmt: row.ttlOSAmt,
          totalUnpaid: row.totalUnpaid,
          mitAmt: row.mitAmt,
          percentage: parseFloat(row.percentOfTotal),
        })),
        // Station totals
        ...debtByADIDData.stationTotals.map(stationTotal => ({
          businessArea: stationTotal.businessArea,
          station: stationTotal.station,
          accDefinition: 'Total',
          numOfAccounts: stationTotal.totalNumberOfAccounts,
          debtAmount: stationTotal.totalTtlOSAmt,
          totalUndue: stationTotal.totalUndue,
          curMthUnpaid: stationTotal.totalCurMthUnpaid,
          ttlOsAmt: stationTotal.totalTtlOSAmt,
          totalUnpaid: stationTotal.totalUnpaid,
          mitAmt: stationTotal.totalMITAmt,
          percentage: parseFloat(stationTotal.totalPercentOfTotal),
          isTotal: true,
        })),
        // Grand total
        {
          businessArea: 'Grand Total',
          station: '',
          accDefinition: 'ADID',
          numOfAccounts: debtByADIDData.grandTotal.totalNumberOfAccounts,
          debtAmount: debtByADIDData.grandTotal.totalTtlOSAmt,
          totalUndue: debtByADIDData.grandTotal.totalUndue,
          curMthUnpaid: debtByADIDData.grandTotal.totalCurMthUnpaid,
          ttlOsAmt: debtByADIDData.grandTotal.totalTtlOSAmt,
          totalUnpaid: debtByADIDData.grandTotal.totalUnpaid,
          mitAmt: debtByADIDData.grandTotal.totalMITAmt,
          percentage: parseFloat(debtByADIDData.grandTotal.totalPercentOfTotal),
          isGrandTotal: true,
        }
      ]
    : [];

  // Fetch staff debt data
  useEffect(() => {
    const apiParams = {
      viewType: filters.viewType === 'tradeReceivable' ? 'TR' as 'TR' : 'agedDebt' as 'agedDebt',
      businessAreas: filters.businessAreas,
    };
    fetchDebtByStaff('1750132052464-aging besar.parquet', apiParams);
    // eslint-disable-next-line
  }, [
    filters.businessAreas,
    filters.viewType,
  ]);

  // Map API data for StaffDebtTable
  const staffRows = debtByStaffData?.data
    ? debtByStaffData.data
        .filter(row => row.businessArea !== 'TOTAL' && row.businessArea !== 'Grand Total') // Remove any TOTAL row from API
        .map(row => ({
          businessArea: row.businessArea,
          station: row.station,
          numOfAccounts: row.numberOfAccounts,
          totalUndue: row.totalUndue,
          curMthUnpaid: row.curMthUnpaid,
          ttlOsAmt: row.ttlOSAmt,
          debtAmount: row.ttlOSAmt,
          totalUnpaid: row.totalUnpaid,
          percentage: parseFloat(row.percentOfTotal),
        }))
    : [];

  const staffRowsSorted = [...staffRows].sort((a, b) => b.percentage - a.percentage);

  const staffDebtTableData = debtByStaffData?.data
    ? [
        ...staffRowsSorted,
        {
          businessArea: 'TOTAL',
          station: 'All Stations',
          numOfAccounts: debtByStaffData.grandTotal.totalNumberOfAccounts,
          totalUndue: debtByStaffData.grandTotal.totalUndue,
          curMthUnpaid: debtByStaffData.grandTotal.totalCurMthUnpaid,
          ttlOsAmt: debtByStaffData.grandTotal.totalTtlOSAmt,
          debtAmount: debtByStaffData.grandTotal.totalTtlOSAmt,
          totalUnpaid: debtByStaffData.grandTotal.totalUnpaid,
          percentage: parseFloat(debtByStaffData.grandTotal.totalPercentOfTotal),
        }
      ]
    : [];

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
  fetchDebtBySmerSegment('1750132052464-aging besar.parquet', apiParams);
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

const smerSegmentTableData = debtBySmerSegmentData?.data
  ? [
      // Individual segment rows
      ...debtBySmerSegmentData.data.map(row => ({
        businessArea: row.businessArea,
        station: row.station,
        segment: row.segment,
        numOfAccounts: row.numberOfAccounts,
        ttlOsAmt: row.ttlOSAmt,
        debtAmount: row.ttlOSAmt,
        totalUndue: row.totalUndue,
        curMthUnpaid: row.curMthUnpaid,
        totalUnpaid: row.totalUnpaid,
        mitAmt: row.mitAmt,
        percentage: parseFloat(row.percentOfTotal),
      })),
      // Station totals
      ...debtBySmerSegmentData.stationTotals.map(stationTotal => ({
        businessArea: stationTotal.businessArea,
        station: stationTotal.station,
        segment: 'Total',
        numOfAccounts: stationTotal.totalNumberOfAccounts,
        ttlOsAmt: stationTotal.totalTtlOSAmt,
        debtAmount: stationTotal.totalTtlOSAmt,
        totalUndue: stationTotal.totalUndue,
        curMthUnpaid: stationTotal.totalCurMthUnpaid,
        totalUnpaid: stationTotal.totalUnpaid,
        mitAmt: stationTotal.totalMITAmt,
        percentage: parseFloat(stationTotal.totalPercentOfTotal),
        isTotal: true,
      })),
      // Grand total
      {
        businessArea: 'Grand Total',
        station: '',
        segment: 'SMER',
        numOfAccounts: debtBySmerSegmentData.grandTotal.totalNumberOfAccounts,
        ttlOsAmt: debtBySmerSegmentData.grandTotal.totalTtlOSAmt,
        debtAmount: debtBySmerSegmentData.grandTotal.totalTtlOSAmt,
        totalUndue: debtBySmerSegmentData.grandTotal.totalUndue,
        curMthUnpaid: debtBySmerSegmentData.grandTotal.totalCurMthUnpaid,
        totalUnpaid: debtBySmerSegmentData.grandTotal.totalUnpaid,
        mitAmt: debtBySmerSegmentData.grandTotal.totalMITAmt,
        percentage: parseFloat(debtBySmerSegmentData.grandTotal.totalPercentOfTotal),
        isGrandTotal: true,
      }
    ]
  : [];

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
        <AccClassDebtSummary
          data={accClassSummaryData}
          loading={loading}
          viewType={filters.viewType}
          onViewTypeChange={filters.setViewType}
          filters={{
            governmentType: filters.governmentType,
            onGovernmentTypeChange: filters.setGovernmentType,
            governmentTypeOptions: filters.governmentTypeOptions,
            accClass: filters.accClass,
          }}
        />
        <AccDefinitionDebt
          data={accDefinitionDebtData}
          loading={loading}
          viewType={filters.viewType}
          onViewTypeChange={filters.setViewType}
          filters={{
            accDefinition: filters.accDefinition,
            accDefinitions: filters.accDefinitions,
          }}
        />
<SmerSegmentDebtTable
  data={smerSegmentTableData}
  stationTotals={debtBySmerSegmentData?.stationTotals || []}
  grandTotal={debtBySmerSegmentData?.grandTotal}
  loading={loading}
  viewType={filters.viewType}
  onViewTypeChange={filters.setViewType}
/>
        <StaffDebtTable
          data={staffDebtTableData}
          loading={loading}
          viewType={filters.viewType}
          onViewTypeChange={filters.setViewType}
        />
      </div>
    </Layout>
  );
};

export default DashboardPage;