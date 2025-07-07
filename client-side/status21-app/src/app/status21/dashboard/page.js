'use client';

import Navbar from '../../../components/navbar';
import SummaryCards from '@/components/status21/summaryCard';
import FilterDropdown from '../../../components/filterDropdown';
import TableView from '@/components/status21/tableView';
import ChartView from '@/components/status21/chartView';
import GenerateReportButton from '@/components/reportButton';
import { useState, useEffect } from 'react';

export default function Dashboard() {
    const [filter, setFilter] = useState('Overall');
    const [selectedDate, setSelectedDate] = useState(null);

    useEffect(() => {
        // Only runs on client
        const storedDate = typeof window !== "undefined" ? localStorage.getItem('status21_selectedDate') : null;
        if (storedDate) {
            setSelectedDate(new Date(storedDate));
        }
    }, []);

    const handleFilterChange = (selectedOption) => {
        setFilter(selectedOption);
    };

    return (
        <>
            <Navbar />
            <main className="container mx-auto px-4 py-6">
                <h1 className="text-2xl font-bold mb-1">Dashboard</h1>
                <p className="text-gray-600 mb-6">View and analise overall accounts data.</p>
                <GenerateReportButton filter={filter} setFilter={setFilter} type="status21" selectedDate={selectedDate} />
                <SummaryCards filter={filter} />
                <FilterDropdown onFilterChange={handleFilterChange} />
                <TableView filter={filter} />
                <div className="chart-container">
                    <ChartView filter={filter} />
                </div>
            </main>
        </>
    );
}