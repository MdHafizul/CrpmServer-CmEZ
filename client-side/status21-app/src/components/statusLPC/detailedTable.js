'use client';

import { useEffect, useState, useCallback } from "react";
import Snackbar from "../snackBar";
import React from "react";
import useStatusLPCStore from "@/store/statusLPCStore";
import { apiFetch } from '@/utils/api';

const detailedTableCache = {};

// Debounce utility
function debounce(func, delay) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), delay);
    };
}

export default function DetailedTable() {
    const [isLoading, setIsLoading] = useState(false);
    const [data, setData] = useState([]);
    const [headers, setHeaders] = useState([]);
    const [snackbar, setSnackbar] = useState({ message: "", type: "" });
    const [selectedBusinessArea, setSelectedBusinessArea] = useState('ALL'); 
    const filter = useStatusLPCStore((state) => state.filter);

    const businessAreas = [
        'ALL',
        '6210',
        '6211',
        '6212',
        '6213',
        '6218',
        '6219',
        '6220',
        '6221',
        '6222',
        '6223',
        '6224',
        '6225',
        '6227',
        '6250',
        '6252'
    ];

    // Reset business area when filter changes
    useEffect(() => {
        setSelectedBusinessArea('ALL');
    }, [filter]);

    // Debounced fetch function
    const fetchDetailedData = useCallback(
        debounce(async (filter, selectedBusinessArea) => {
            setIsLoading(true);

            // Use a composite key for caching
            const cacheKey = `${filter}-${selectedBusinessArea}`;
            if (detailedTableCache[cacheKey]) {
                const { data, headers } = detailedTableCache[cacheKey];
                setData(data);
                setHeaders(headers);
                setIsLoading(false);
                return;
            }

            try {
                const response = await apiFetch("/api/v2/statusLPC/detailedTable", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        teamFilter: filter,
                        businessAreaFilter: selectedBusinessArea,
                    }),
                });
                if (!response.ok) {
                    throw new Error(`Failed to fetch detailed data: ${response.statusText}`);
                }
                const result = await response.json();
                const responseData = result.data || [];
                let columnHeaders = [];
                if (responseData.length > 0) {
                    // Use all unique keys from all rows to avoid missing columns
                    const allKeys = new Set();
                    responseData.forEach(row => Object.keys(row).forEach(k => allKeys.add(k)));
                    columnHeaders = Array.from(allKeys);
                    setHeaders(columnHeaders);
                } else {
                    setHeaders([]);
                }
                setData(responseData);

                // Store in cache
                detailedTableCache[cacheKey] = { data: responseData, headers: columnHeaders };
            } catch (error) {
                console.error("Error fetching detailed data:", error);
                setSnackbar({ message: "Error fetching detailed data", type: "error" });
                setData([]);
                setHeaders([]);
            } finally {
                setIsLoading(false);
            }
        }, 200),
        []
    );

    useEffect(() => {
        fetchDetailedData(filter, selectedBusinessArea);
    }, [filter, selectedBusinessArea, fetchDetailedData]);

    // Function to format header text for display
    const formatHeaderText = (header) => {
        // Handle date headers specifically - format them nicely
        if (
            header.includes('GMT+0800') ||
            header.match(/\d{4}-\d{2}-\d{2}/) ||
            header.match(/[A-Za-z]{3} [A-Za-z]{3} \d{2} \d{4}/)
        ) {
            try {
                const date = new Date(header);
                if (!isNaN(date)) {
                    // Format as DD-MMM-YYYY
                    return new Intl.DateTimeFormat('en-MY', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                    }).format(date);
                }
            } catch (e) {
                // If date parsing fails, fall back to original header
            }
        }

        // Handle other headers by converting camelCase or snake_case to Title Case with spaces
        return header
            .replace(/([A-Z])/g, ' $1')
            .replace(/_/g, ' ')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    };

    // Function to format cell value based on its type
    const formatCellValue = (value, header) => {
        // If value is numeric and header suggests it's a financial value, format as currency
        if (
            typeof value === 'number' &&
            (
                header.toLowerCase().includes('amount') ||
                header.toLowerCase().includes('payment') ||
                header.toLowerCase().includes('unpaid') ||
                header.toLowerCase().includes('balance') ||
                header.toLowerCase().includes('total') ||
                header.toLowerCase().includes('os') ||
                header.toLowerCase().includes('collect')
            )
        ) {
            return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }

        // Handle other types of values
        if (value === null || value === undefined) return '-';
        if (typeof value === 'boolean') return value ? 'Yes' : 'No';
        return value.toString();
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
            <div className="flex justify-between items-center mb-2">
                <h2 className="text-xl font-semibold text-purple-700">Detailed Table</h2>
                <div className="w-64">
                    <select
                        value={selectedBusinessArea}
                        onChange={(e) => setSelectedBusinessArea(e.target.value)}
                        className="w-full px-3 py-2 border border-purple-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                        {businessAreas.map(area => (
                            <option key={area} value={area}>{area}</option>
                        ))}
                    </select>
                </div>
            </div>
            <div className="bg-white border border-purple-200 rounded-lg mb-6 overflow-x-auto shadow">
                <table className="min-w-full divide-y divide-purple-100 table-fixed">
                    <thead className="bg-purple-50">
                        <tr>
                            {headers.map((header, index) => (
                                <th key={index} className="px-4 py-3 text-left text-xs font-semibold text-purple-700 uppercase tracking-wider">
                                    {formatHeaderText(header)}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-purple-100">
                        {isLoading ? (
                            <tr>
                                <td colSpan={headers.length || 1} className="text-center py-4 text-gray-500">Loading...</td>
                            </tr>
                        ) : data.length === 0 ? (
                            <tr>
                                <td colSpan={headers.length || 1} className="px-4 py-4 text-center text-gray-500">
                                    No detailed data available
                                </td>
                            </tr>
                        ) : (
                            data.map((row, rowIdx) => (
                                <tr key={rowIdx} className={rowIdx % 2 === 0 ? "bg-white" : "bg-purple-50"}>
                                    {headers.map((header, cellIdx) => (
                                        <td key={cellIdx} className="px-4 py-2 whitespace-nowrap text-sm text-gray-600">
                                            {formatCellValue(row[header], header)}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </>
    );
}