'use client'

import Navbar from "@/components/navbar"
import { useState, useEffect } from "react";
import GenerateReportButton from "@/components/reportButton";
import SummaryTable from "@/components/statusLPC/summaryTable";
import FilterDropdown from "@/components/statusLPC/filterDropdown";
import SortedTable from "@/components/statusLPC/sortedTable";
import DetailedTable from "@/components/statusLPC/detailedTable";
import PieChart from "@/components/statusLPC/summaryChart";

export default function StatusLPCDashboard() {
    const [filter, setFilter] = useState('ALL');
    const [isLoading, setIsLoading] = useState(true);
    
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 2500); // 2.5 seconds minimum loading time
        
        return () => clearTimeout(timer);
    }, []);

    return (
        <>
            {isLoading && (
                <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center">
                    <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-purple-600 mb-4"></div>
                    <h2 className="text-xl font-semibold text-purple-800">Loading Dashboard...</h2>
                    <p className="text-gray-500 mt-2">Preparing your StatusLPC data</p>
                </div>
            )}
            
            <Navbar />
            <main className="container mx-auto px-4 py-6">
                <h1 className="text-2xl font-bold mb-1 text-purple-800">StatusLPC - Dashboard</h1>
                <p className="text-gray-600 mb-6">View and analyze payment collection data for the StatusLPC system.</p>

                {/* Generate Report Button */}
                <div className="mb-6">
                    <GenerateReportButton filter={filter} setFilter={setFilter} type="statusLPC" />
                </div>

                {/* Pie Chart */}
                <div className="flex-1">
                    <PieChart filter={filter} />
                </div>


                {/* Summary Table */}
                <SummaryTable />

                {/* Filter Dropdown */}
                <FilterDropdown filter={filter} setFilter={setFilter} />

                {/* Sorted Table */}
                <SortedTable/>

                {/* Detailed Table */}
                <DetailedTable/>
            </main>
        </>
    );
}