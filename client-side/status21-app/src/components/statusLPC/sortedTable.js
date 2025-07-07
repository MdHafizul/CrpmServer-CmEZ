'use client';

import { useEffect, useState } from "react";
import Snackbar from "../snackBar";
import useStatusLPCStore from "@/store/statusLPCStore";
import { apiFetch } from '@/utils/api';

const sortedTableCache = {};

export default function SortedTable() {
    const [isLoading, setIsLoading] = useState(false);
    const [data, setData] = useState([]);
    const [totalRow, setTotalRow] = useState(null);
    const [snackbar, setSnackbar] = useState({ message: "", type: "" });
    const filter = useStatusLPCStore((state) => state.filter);


    useEffect(() => {
        async function fetchSortedData() {
            setIsLoading(true);

            // Check cache first
            if (sortedTableCache[filter]) {
                setData(sortedTableCache[filter].data);
                setTotalRow(sortedTableCache[filter].totalRow);
                setIsLoading(false);
                return;
            }

            try {
                const response = await apiFetch("/api/v2/statusLPC/sortedTable", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ filter })
                });
                if (!response.ok) {
                    throw new Error(`Failed to fetch sorted data: ${response.statusText}`);
                }
                const result = await response.json();

                const regularData = (result.data || []).filter(row => row.businessArea !== 'JUMLAH');
                const total = (result.data || []).find(row => row.businessArea === 'JUMLAH');

                // Store in cache
                sortedTableCache[filter] = { data: regularData, totalRow: total };

                setData(regularData);
                setTotalRow(total);
            } catch (error) {
                console.error("Error fetching sorted data:", error);
                setSnackbar({ message: "Error fetching sorted data", type: "error" });
                setData([]);
                setTotalRow(null);
            } finally {
                setIsLoading(false);
            }
        }

        fetchSortedData();
    }, [filter]);

    // Function to determine color based on percentage
    const getPercentageColor = (percentage) => {
        if (percentage === 100) return "text-green-600";
        if (percentage > 90) return "text-yellow-600";
        return "text-red-600";
    };

    return (
        <>
            {snackbar.message && (
                <Snackbar
                    message={snackbar.message}
                    type={snackbar.type}
                    onClose={() => setSnackbar({ message: "", type: "" })}
                />
            )}
            <div className="bg-white border border-purple-200 rounded-lg mb-6 overflow-x-auto shadow">
                <table className="min-w-full divide-y divide-purple-100">
                    <thead className="bg-purple-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-purple-700 uppercase tracking-wider">Business Area</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-purple-700 uppercase tracking-wider">No. Of CA</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-purple-700 uppercase tracking-wider">Total Unpaid (RM)</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-purple-700 uppercase tracking-wider">No. Of Paying Acc</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-purple-700 uppercase tracking-wider">Total Payment (RM)</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-purple-700 uppercase tracking-wider">Balance to Collect (RM)</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-purple-700 uppercase tracking-wider">% Collection</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-purple-100">
                        {isLoading ? (
                            <tr>
                                <td colSpan={7} className="text-center py-4 text-gray-500">Loading...</td>
                            </tr>
                        ) : data.length > 0 ? (
                            <>
                                {data.map((row, idx) => (
                                    <tr key={idx}>
                                        <td className="px-6 py-4 whitespace-nowrap">{row.businessArea}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">{row.bilAkaun.toLocaleString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {row.totalUnpaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">{row.bilAkaunBuatBayaran.toLocaleString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {row.totalPayment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {row.balanceToCollect.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className={`px-6 py-4 whitespace-nowrap font-bold ${getPercentageColor(row.percentCollection)}`}>
                                            {row.percentCollection}%
                                        </td>
                                    </tr>
                                ))}

                                {totalRow && (
                                    <tr className="bg-purple-100 font-bold">
                                        <td className="px-6 py-4 whitespace-nowrap">{totalRow.businessArea}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">{totalRow.bilAkaun.toLocaleString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {totalRow.totalUnpaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">{totalRow.bilAkaunBuatBayaran.toLocaleString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {totalRow.totalPayment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {totalRow.balanceToCollect.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className={`px-6 py-4 whitespace-nowrap font-bold ${getPercentageColor(totalRow.percentCollection)}`}>
                                            {totalRow.percentCollection}%
                                        </td>
                                    </tr>
                                )}
                            </>
                        ) : (
                            <tr>
                                <td colSpan={7} className="text-center py-4 text-gray-500">No data available</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </>
    );
}