'use client';

import { useEffect, useState } from "react";
import Snackbar from "../snackBar";
import { apiFetch } from "@/utils/api";

export default function SummaryTable() {
    const [isLoading, setIsLoading] = useState(false);
    const [data, setData] = useState([]);
    const [totalRow, setTotalRow] = useState(null);
    const [snackbar, setSnackbar] = useState({ message: "", type: "" });

    useEffect(() => {
        async function fetchSummaryData() {
            setIsLoading(true);
            try {
                const response = await apiFetch("/api/v2/statusLPC/summaryTable");
                if (!response.ok) {
                    throw new Error(`Failed to fetch summary data: ${response.statusText}`);
                }
                const result = await response.json();
                
                // Extract total row and regular data
                const regularData = (result.data || []).filter(row => row.kategori !== 'JUMLAH');
                const total = (result.data || []).find(row => row.kategori === 'JUMLAH');
                
                setData(regularData);
                setTotalRow(total);
            } catch (error) {
                console.error("Error fetching summary data:", error);
                setSnackbar({ message: "Error fetching summary data", type: "error" });
                setData([]);
                setTotalRow(null);
            } finally {
                setIsLoading(false);
            }
        }
        
        fetchSummaryData();
    }, []);

    return (
        <>
            {snackbar.message && (
                <Snackbar
                    message={snackbar.message}
                    type={snackbar.type}
                    onClose={() => setSnackbar({ message: "", type: "" })}
                />
            )}
            <h2 className="text-xl font-semibold mb-2 text-purple-700">Summary Table</h2>
            <div className="bg-white border border-purple-200 rounded-lg mb-6 overflow-x-auto shadow">
                <table className="min-w-full divide-y divide-purple-100">
                    <thead className="bg-purple-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-purple-700 uppercase tracking-wider">Category</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-purple-700 uppercase tracking-wider">No. Of CA</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-purple-700 uppercase tracking-wider">Total Unpaid (RM)</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-purple-700 uppercase tracking-wider">No. Of Paying Acc</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-purple-700 uppercase tracking-wider">Total Payment (RM)</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-purple-700 uppercase tracking-wider">Balance to Collect (RM)</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-purple-100">
                        {isLoading ? (
                            <tr>
                                <td colSpan={6} className="text-center py-4 text-gray-500">Loading...</td>
                            </tr>
                        ) : data.length > 0 ? (
                            <>
                                {data.map((row, idx) => (
                                    <tr key={idx}>
                                        <td className="px-6 py-4 whitespace-nowrap">{row.kategori}</td>
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
                                    </tr>
                                ))}
                                
                                {totalRow && (
                                    <tr className="bg-purple-100 font-bold">
                                        <td className="px-6 py-4 whitespace-nowrap">{totalRow.kategori}</td>
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
                                    </tr>
                                )}
                            </>
                        ) : (
                            <tr>
                                <td colSpan={6} className="text-center py-4 text-gray-500">No data available</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </>
    );
}