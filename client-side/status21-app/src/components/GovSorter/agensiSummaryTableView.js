'use client';

import { useEffect, useState } from "react";
import Snackbar from "../snackBar";
import { apiFetch } from "@/utils/api";

export default function AgensiSummaryTableView({ filter }) {
    const [isLoading, setIsLoading] = useState(false);
    const [data, setData] = useState([]);
    const [snackbar, setSnackbar] = useState({ message: "", type: "" });

    useEffect(() => {
        async function fetchAgensiSummary() {
            setIsLoading(true);
            try {
                const response = await apiFetch("/api/v2/govSorter/agensiSummary", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(filter)
                });
                if (!response.ok) {
                    throw new Error(`Failed to fetch agensi summary: ${response.statusText}`);
                }
                const result = await response.json();
                setData(result.data || []);
            } catch (error) {
                setSnackbar({ message: "Error fetching agensi summary", type: "error" });
            } finally {
                setIsLoading(false);
            }
        }
        fetchAgensiSummary();
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
                            <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">Business Area</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">Acc Status</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">Acc Class</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">Status Pukal</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">ADID</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">Bil Akaun</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">TTL O/S AMT(RM)</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">Total Unpaid(RM)</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-blue-100">
                        {isLoading ? (
                            <tr>
                                <td colSpan={8} className="text-center py-4 text-gray-500">Loading...</td>
                            </tr>
                        ) : (
                            <>
                                {data.filter(row => row['Buss Area'] !== 'JUMLAH').map((row, idx) => (
                                    <tr key={idx}>
                                        <td className="px-6 py-4 whitespace-nowrap">{row['Buss Area']}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">{Array.isArray(row['Acc Status']) ? row['Acc Status'].join(', ') : row['Acc Status']}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">{Array.isArray(row['Acc Class']) ? row['Acc Class'].join(', ') : row['Acc Class']}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">{Array.isArray(row['Status Pukal']) ? row['Status Pukal'].join(', ') : row['Status Pukal']}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">{Array.isArray(row['ADID']) ? row['ADID'].join(', ') : row['ADID']}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">{row['Bil Akaun']}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">RM {Number(row['TTL O/S AMT']).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">RM {Number(row['Total Unpaid']).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    </tr>
                                ))}
                                {/* Total row */}
                                {data.some(row => row['Buss Area'] === 'JUMLAH') && (
                                    <tr className="bg-blue-100 font-bold">
                                        <td className="px-6 py-4 whitespace-nowrap">JUMLAH</td>
                                        <td className="px-6 py-4 whitespace-nowrap"></td>
                                        <td className="px-6 py-4 whitespace-nowrap"></td>
                                        <td className="px-6 py-4 whitespace-nowrap"></td>
                                        <td className="px-6 py-4 whitespace-nowrap"></td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {data.find(row => row['Buss Area'] === 'JUMLAH')?.['Bil Akaun']}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                        RM {Number(data.find(row => row['Buss Area'] === 'JUMLAH')?.['TTL O/S AMT'] || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                        RM {Number(data.find(row => row['Buss Area'] === 'JUMLAH')?.['Total Unpaid'] || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
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