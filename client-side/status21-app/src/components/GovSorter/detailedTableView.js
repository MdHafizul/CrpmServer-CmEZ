'use client';

import { useEffect, useState } from "react";
import Snackbar from "../snackBar";
import { apiFetch } from "@/utils/api";

export default function DetailedTableView({ filter }) {
    const [isLoading, setIsLoading] = useState(false);
    const [data, setData] = useState([]);
    const [snackbar, setSnackbar] = useState({ message: "", type: "" });

    useEffect(() => {
        async function fetchDetailData() {
            setIsLoading(true);
            try {
                const response = await apiFetch("/api/v2/govSorter/detailedData", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(filter)
                });
                if (!response.ok) {
                    throw new Error(`Failed to fetch detailed data: ${response.statusText}`);
                }
                const result = await response.json();
                setData(result.data || []);
            } catch (error) {
                setSnackbar({ message: "Error fetching detailed data", type: "error" });
            } finally {
                setIsLoading(false);
            }
        }
        fetchDetailData();
    }, [filter]);

    return (
        <>
            {snackbar.message && (
                <Snackbar
                    message={snackbar.message}
                    type={snackbar.type}
                    onClose={() => setSnackbar({ message: "", type: "" })}
                />
            )}
            <div className="bg-white border border-blue-200 rounded-lg mb-6 overflow-x-auto shadow">
                <table className="min-w-full divide-y divide-blue-100">
                    <thead className="bg-blue-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">Customer Group</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">Sector</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">SMER Segment</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">Business Area</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">Contract Account</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">Contract Account Name</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">ADID</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">Acc Class</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">Acc Status</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">Status Pukal</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">No of Months Outstanding</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">Current Month Unpaid(RM)</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">TTL O/S AMT(RM)</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">Total Unpaid(RM)</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">Move Out Date</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-blue-100">
                        {isLoading ? (
                            <tr>
                                <td colSpan={15} className="text-center py-4 text-gray-500">Loading...</td>
                            </tr>
                        ) : (
                            <>
                                {data.filter(row => row['Customer Group'] !== 'JUMLAH').map((row, idx) => (
                                    <tr key={idx}>
                                        <td className="px-4 py-2 whitespace-nowrap">{row['Customer Group']}</td>
                                        <td className="px-4 py-2 whitespace-nowrap">{row['Sector']}</td>
                                        <td className="px-4 py-2 whitespace-nowrap">{row['SMER Segment']}</td>
                                        <td className="px-4 py-2 whitespace-nowrap">{row['Business Area']}</td>
                                        <td className="px-4 py-2 whitespace-nowrap">{row['Contract Account']}</td>
                                        <td className="px-4 py-2 whitespace-nowrap">{row['Contract Account Name']}</td>
                                        <td className="px-4 py-2 whitespace-nowrap">{row['ADID']}</td>
                                        <td className="px-4 py-2 whitespace-nowrap">{row['Acc Class']}</td>
                                        <td className="px-4 py-2 whitespace-nowrap">{row['Acc Status']}</td>
                                        <td className="px-4 py-2 whitespace-nowrap">{row['Status Pukal']}</td>
                                        <td className="px-4 py-2 whitespace-nowrap">{row['No of Months Outstanding']}</td>
                                        <td className="px-4 py-2 whitespace-nowrap">
                                            RM {Number(row['Current Month Unpaid']).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-4 py-2 whitespace-nowrap">
                                            RM {Number(row['TTL O/S AMT']).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-4 py-2 whitespace-nowrap">
                                            RM {Number(row['Total Unpaid']).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-4 py-2 whitespace-nowrap">{row['Move Out Date']}</td>
                                    </tr>
                                ))}
                                {/* Total row */}
                                {data.some(row => row['Customer Group'] === 'JUMLAH') && (
                                    <tr className="bg-blue-100 font-bold">
                                        <td className="px-4 py-2 whitespace-nowrap">JUMLAH</td>
                                        <td className="px-4 py-2 whitespace-nowrap"></td>
                                        <td className="px-4 py-2 whitespace-nowrap"></td>
                                        <td className="px-4 py-2 whitespace-nowrap"></td>
                                        <td className="px-4 py-2 whitespace-nowrap"></td>
                                        <td className="px-4 py-2 whitespace-nowrap"></td>
                                        <td className="px-4 py-2 whitespace-nowrap"></td>
                                        <td className="px-4 py-2 whitespace-nowrap"></td>
                                        <td className="px-4 py-2 whitespace-nowrap"></td>
                                        <td className="px-4 py-2 whitespace-nowrap"></td>
                                        <td className="px-4 py-2 whitespace-nowrap"></td>
                                        <td className="px-4 py-2 whitespace-nowrap">
                                            RM {Number(data.find(row => row['Customer Group'] === 'JUMLAH')?.['Current Month Unpaid'] || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-4 py-2 whitespace-nowrap">
                                            RM {Number(data.find(row => row['Customer Group'] === 'JUMLAH')?.['TTL O/S AMT'] || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-4 py-2 whitespace-nowrap">
                                            RM {Number(data.find(row => row['Customer Group'] === 'JUMLAH')?.['Total Unpaid'] || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-4 py-2 whitespace-nowrap"></td>
                                    </tr>
                                )}
                            </>
                        )}
                    </tbody>
                </table>
            </div>
        </>
    );
}