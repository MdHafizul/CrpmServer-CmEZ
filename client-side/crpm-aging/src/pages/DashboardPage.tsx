import React from 'react';
import { useAppContext } from '../context/AppContext';
import Layout from '../components/layout/Layout';
import { SummaryCardsContainer } from '../components/dashboard/SummaryCard';
import FilterSection from '../components/dashboard/FilterSection';
import DebtByStationTable from '../components/dashboard/DebtByStationTable';
import AccClassDebtSummary from '../components/dashboard/AccClassDebtSummary';
import AccDefinitionDebt  from '../components/dashboard/AccDefinitionDebt';
import StaffDebtTable from '../components/dashboard/StaffDebtTable';
import SmerSegmentDebtTable from '../components/dashboard/SmerSegmentDebtTable';
import DriverTree from '../components/dashboard/charts/DriverTree';
import DirectedGraph from '../components/dashboard/charts/DirectedGraph';
import DetailedTable from '../components/dashboard/DetailedTable';
import ReportButton from '../components/ui/ReportButton';

const DashboardPage: React.FC = () => {
  const { filters } = useAppContext();

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-end">
          <ReportButton />
        </div>
        <SummaryCardsContainer />
        <DriverTree />
        <DirectedGraph />
        <FilterSection filters={filters} />
        <DebtByStationTable filters={filters} />
        <AccClassDebtSummary filters={filters} />
        <AccDefinitionDebt filters={filters} />
        <SmerSegmentDebtTable filters={filters} />
        <StaffDebtTable filters={filters} />
        <DetailedTable filters={filters} />
      </div>
    </Layout>
  );
};

export default DashboardPage;