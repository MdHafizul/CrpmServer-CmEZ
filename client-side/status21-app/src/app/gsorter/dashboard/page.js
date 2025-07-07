'use client';

import Navbar from '@/components/navbar';
import { useState } from 'react';
import FilterDropdown from '@/components/GovSorter/filterDropdown';
import SummaryTableView from '@/components/GovSorter/summaryTableView';
import AgensiSummaryTableView from '@/components/GovSorter/agensiSummaryTableView';
import DetailedTableView from '@/components/GovSorter/detailedTableView';
import GenerateReportButton from '@/components/reportButton';

export default function GSorterDashboard() {
    const [filter, setFilter] = useState({
        category: 'ALL',
        AccClass: 'ALL',
        AccStatus: 'ALL',
        ADID: 'ALL',
        StatusPukal: 'ALL'
    });

    return (
        <>
            <Navbar />
            <main className="container mx-auto px-4 py-6">
                <h1 className="text-2xl font-bold mb-1 text-blue-800">GovSorter - Dashboard</h1>
                <p className="text-gray-600 mb-6">View and analyze data for the GovSorter system.</p>
                
                {/* Generate Report Button */}
                <GenerateReportButton filter={filter} setFilter={setFilter} type="govsorter" />

                {/* Agensi Summary Table */}
                <h2 className="text-xl font-semibold mb-2 text-blue-700"> Summary Table</h2>
                <SummaryTableView />

                {/* Universal Filter Bar */}
                <FilterDropdown filter={filter} setFilter={setFilter} />

                {/* Agensi Summary Table */}
                <h2 className="text-xl font-semibold mb-2 text-blue-700">Agency Summarised Table</h2>
                <AgensiSummaryTableView filter={filter} />

                {/* Detailed Table */}
                <h2 className="text-xl font-semibold mb-2 text-blue-700">Detailed Table</h2>
                <DetailedTableView filter={filter} />
            </main>
        </>
    );
}