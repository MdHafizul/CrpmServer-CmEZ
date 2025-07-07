'use client'

import { useCallback, useEffect, useState } from "react"
import Snackbar from "../snackBar"
import { apiFetch } from '@/utils/api'

export default function SummaryTableView() {
    const [isLoading, setIsLoading] = useState(false)
    const [data, setData] = useState([])
    const [snackbar, setSnackbar] = useState({ message: "", type: "" })

    const fetchFileData = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await apiFetch("/api/v2/govSorter/summary")
            if (!response.ok) {
                throw new Error(`Failed to fetch summary data: ${response.statusText}`)
            }
            const result = await response.json()
            // Map backend keys to frontend keys for display
            const mapped = (result.data || []).map(row => ({
                namaAgensi: row.Category,
                bilAkaun: row.BilAkaun,
                jumlahTunggakan: row.JumlahTunggakan,
            }))
            setData(mapped)
        } catch (error) {
            console.error("Error fetching summary data:", error)
            setSnackbar({ message: "Error fetching summary data", type: "error" })
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchFileData();
    }, [fetchFileData]);

    return (
        <>
            <main className="container mx-auto px-4 py-6">
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
                                <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">
                                    Nama Agensi
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">
                                    Bil Akaun
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">
                                    Jumlah Tunggakan (RM)
                                </th>
                            </tr>
                            <tr></tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-blue-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={3} className="text-center py-4 text-gray-500">Loading...</td>
                                </tr>
                            ) : (
                                <>
                                    {data.filter(row => row.namaAgensi !== 'JUMLAH').map((row, idx) => (
                                        <tr key={idx}>
                                            <td className="px-6 py-4 whitespace-nowrap">{row.namaAgensi}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">{row.bilAkaun}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">RM {Number(row.jumlahTunggakan).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                        </tr>
                                    ))}
                                    {/* Total row */}
                                    {data.some(row => row.namaAgensi === 'JUMLAH') && (
                                        <tr className="bg-blue-100 font-bold">
                                            <td className="px-6 py-4 whitespace-nowrap">JUMLAH</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {data.find(row => row.namaAgensi === 'JUMLAH')?.bilAkaun}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                RM {data.find(row => row.namaAgensi === 'JUMLAH')?.jumlahTunggakan.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    )}
                                </>
                            )}
                        </tbody>
                    </table>
                </div>
            </main>
        </>
    )
}