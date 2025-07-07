'use client';

import { Chart } from 'chart.js/auto';
import { useEffect, useRef, useState } from 'react';
import Snackbar from '../snackBar';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { apiFetch } from '@/utils/api';

// Register the plugin
Chart.register(ChartDataLabels);

export default function PieChart() {
    const [isLoading, setIsLoading] = useState(false);
    const [summaryData, setSummaryData] = useState({
        bilAkaun: 0,
        totalUnpaid: 0,
        totalPayment: 0,
        balanceToCollect: 0
    });
    const [snackbar, setSnackbar] = useState({ message: "", type: "" });
    const pieChartRef = useRef(null);
    const barChartRef = useRef(null);
    let pieChartInstance = null;
    let barChartInstance = null;

    useEffect(() => {
        async function fetchSummaryData() {
            setIsLoading(true);
            try {
                const response = await apiFetch('/api/v2/statusLPC/summaryCards');
                if (!response.ok) {
                    throw new Error(`Failed to fetch summary data: ${response.statusText}`);
                }
                const result = await response.json();
                setSummaryData(result.data || {
                    bilAkaun: 0,
                    totalUnpaid: 0,
                    totalPayment: 0,
                    balanceToCollect: 0
                });
            } catch (error) {
                console.error('Error fetching summary data:', error);
                setSnackbar({ message: 'Error fetching summary data', type: 'error' });
            } finally {
                setIsLoading(false);
            }
        }

        fetchSummaryData();
    }, []);

    // Format number to show millions with 2 decimal places
    const formatMillions = (value) => {
        return (value / 1000000).toFixed(2) + 'M';
    };

    useEffect(() => {
        if (isLoading) return;

        // Create Pie Chart
        if (pieChartRef.current) {
            // Clean up existing chart
            if (pieChartInstance) {
                pieChartInstance.destroy();
            }

            const pieCanvas = pieChartRef.current.getContext('2d');

            // Calculate percentages
            const unpaidAmount = summaryData.totalUnpaid || 1; // Prevent division by zero
            const paymentPercentage = Math.round((summaryData.totalPayment / unpaidAmount) * 100);
            const balancePercentage = Math.round((summaryData.balanceToCollect / unpaidAmount) * 100);

            // Prepare data for the pie chart
            const data = [
                summaryData.totalPayment,
                summaryData.balanceToCollect
            ];

            const labels = [
                `Payment (${paymentPercentage}%)`,
                `Balance (${balancePercentage}%)`
            ];

            pieChartInstance = new Chart(pieCanvas, {
                type: 'pie',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: [
                            'rgba(40, 167, 69, 0.6)',
                            'rgba(220, 53, 69, 0.6)'
                        ],
                        borderColor: [
                            'rgba(40, 167, 69, 1)',
                            'rgba(220, 53, 69, 1)',
                        ],
                        borderWidth: 1,
                    }],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        datalabels: {
                            formatter: (value) => {
                                const unpaidAmount = summaryData.totalUnpaid || 1;
                                const percentage = Math.round((value / unpaidAmount) * 100);
                                return `${formatMillions(value)}\n(${percentage}%)`;
                            },
                            color: '#fff',
                            font: {
                                weight: 'bold',
                                size: 14
                            }
                        },
                        legend: {
                            position: 'top',
                        },
                        title: {
                            display: true,
                            text: `Payments vs Balance To Collect (Total Unpaid: ${formatMillions(summaryData.totalUnpaid)})`,
                            font: {
                                size: 16,
                                weight: 'bold'
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function (context) {
                                    const label = context.label || '';
                                    const value = context.raw || 0;
                                    const unpaidAmount = summaryData.totalUnpaid || 1;
                                    const percentage = Math.round((value / unpaidAmount) * 100);

                                    return `${label}: ${formatMillions(value)} (${percentage}%)`;
                                }
                            }
                        }
                    }
                },
            });
        }

        // Create Bar Chart
        if (barChartRef.current) {
            // Clean up existing chart
            if (barChartInstance) {
                barChartInstance.destroy();
            }

            const barCanvas = barChartRef.current.getContext('2d');

            barChartInstance = new Chart(barCanvas, {
                type: 'bar',
                data: {
                    labels: ['Payment Status'],
                    datasets: [
                        {
                            label: 'Unpaid',
                            data: [summaryData.totalUnpaid],

                            backgroundColor: 'rgba(255, 193, 7, 0.6)',     // Yellow
                            borderColor: 'rgba(255, 193, 7, 1)',
                            borderWidth: 1
                        },
                        {
                            label: 'Payments',
                            data: [summaryData.totalPayment],
                            backgroundColor: 'rgba(40, 167, 69, 0.6)',     // Green
                            borderColor: 'rgba(40, 167, 69, 1)',
                            borderWidth: 1
                        },
                        {
                            label: 'Balance',
                            data: [summaryData.balanceToCollect],
                            backgroundColor: 'rgba(220, 53, 69, 0.6)',     // Red
                            borderColor: 'rgba(220, 53, 69, 1)',
                            borderWidth: 1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function (value) {
                                    return formatMillions(value);
                                }
                            }
                        }
                    },
                    plugins: {
                        datalabels: {
                            formatter: (value, context) => {
                                const total = summaryData.totalUnpaid || 1;
                                const percentage = Math.round((value / total) * 100);
                                return `${formatMillions(value)}\n(${percentage}%)`;
                            },
                            color: '#fff',
                            font: {
                                weight: 'bold',
                                size: 12
                            },
                            anchor: 'center',
                            align: 'center'
                        },
                        title: {
                            display: true,
                            text: `LPC Payment Status (${summaryData.bilAkaun} Accounts)`,
                            font: {
                                size: 16,
                                weight: 'bold'
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function (context) {
                                    const label = context.dataset.label || '';
                                    const value = context.raw || 0;

                                    return `${label}: ${formatMillions(value)}`;
                                }
                            }
                        }
                    }
                }
            });
        }

        return () => {
            if (pieChartInstance) {
                pieChartInstance.destroy();
            }
            if (barChartInstance) {
                barChartInstance.destroy();
            }
        };
    }, [summaryData, isLoading]);

    // Skeleton component for charts
    const ChartSkeleton = () => (
        <div className="flex items-center justify-center h-full w-full">
            <div className="relative w-48 h-48">
                <div className="absolute inset-0 rounded-full bg-gray-200 animate-pulse"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <svg className="w-12 h-12 text-gray-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                </div>
            </div>
        </div>
    );

    // Currency formatter helper function
    const formatCurrency = (value) => {
        return `RM ${value.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;
    };

    // Render a summary card
    const SummaryCard = ({ title, value, color, isCurrency = true }) => (
        <div className="bg-white rounded-lg shadow-md p-4 border-l-4" style={{ borderLeftColor: color }}>
            <h3 className="text-gray-500 text-sm font-medium">{title}</h3>
            <p className="text-xl font-bold mt-1">
                {isCurrency
                    ? formatCurrency(value)
                    : value.toLocaleString() // Format without RM and decimal places
                }
            </p>
        </div>
    );
    // Skeleton component for cards
    const SkeletonCard = () => (
        <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-gray-200">
            <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3 mb-2"></div>
            <div className="h-6 bg-gray-200 rounded animate-pulse w-1/2"></div>
        </div>
    );

    return (
        <>
            {snackbar.message && (
                <Snackbar
                    message={snackbar.message}
                    type={snackbar.type}
                    onClose={() => setSnackbar({ message: "", type: "" })}
                />
            )}

            <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                <h2 className="text-lg font-semibold mb-4 text-purple-800">Payment Summary Dashboard</h2>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left Side - Summary Cards in 2x2 Grid */}
                    <div className="lg:col-span-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
                            {isLoading ? (
                                <>
                                    <SkeletonCard />
                                    <SkeletonCard />
                                    <SkeletonCard />
                                    <SkeletonCard />
                                </>
                            ) : (
                                <>
                                    <SummaryCard
                                        title="Total Accounts"
                                        value={summaryData.bilAkaun}
                                        color="#9370DB"
                                        isCurrency={false} // Add this parameter
                                    />
                                    <SummaryCard
                                        title="Total Unpaid"
                                        value={summaryData.totalUnpaid}
                                        color="#663399"
                                        isCurrency={true} // This is the default, could be omitted
                                    />
                                    <SummaryCard
                                        title="Total Payment"
                                        value={summaryData.totalPayment}
                                        color="#9370DB"
                                    />
                                    <SummaryCard
                                        title="Balance to Collect"
                                        value={summaryData.balanceToCollect}
                                        color="#BA55D3"
                                    />
                                </>
                            )}
                        </div>
                    </div>

                    {/* Middle - Pie Chart */}
                    <div className="lg:col-span-4" style={{ height: "400px" }}>
                        {isLoading ? (
                            <ChartSkeleton />
                        ) : (
                            <canvas ref={pieChartRef} />
                        )}
                    </div>

                    {/* Right - Bar Chart */}
                    <div className="lg:col-span-5" style={{ height: "400px" }}>
                        {isLoading ? (
                            <ChartSkeleton />
                        ) : (
                            <canvas ref={barChartRef} />
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}