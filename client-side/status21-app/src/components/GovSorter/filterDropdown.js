'use client';

import { useEffect, useState } from "react";
import { apiFetch } from "@/utils/api";

/**
 * Universal filter dropdown for GSorter tables.
 * 
 * @param {object} props
 * @param {object} props.filter - Current filter state
 * @param {function} props.setFilter - Setter for filter state
 * @param {boolean} [props.showCategory=true] - Show category filter or not
 * @param {object} [props.optionsOverride] - Override options for any filter
 */
export default function FilterDropdown({
    filter,
    setFilter,
    showCategory = true,
    optionsOverride = {}
}) {
    // Default options
    const [categoryOptions, setCategoryOptions] = useState(['ALL']);
    const accClassOptions = optionsOverride.AccClass || ['ALL', 'LPCG', 'OPCG'];
    const accStatusOptions = optionsOverride.AccStatus || ['ALL', 'Active', 'Inactive'];
    const adidOptions = optionsOverride.ADID || ['ALL', 'CM', 'SL', 'AG', 'DM', 'IN'];
    const statusPukalOptions = optionsOverride.StatusPukal || ['ALL', 'PUKAL', 'TIDAK PUKAL'];

    // Fetch category options if needed
    useEffect(() => {
        if (!showCategory) return;
        async function fetchCategories() {
            try {
                const res = await apiFetch("/api/v2/govSorter/summary");
                const result = await res.json();
                const categories = Array.from(new Set((result.data || []).map(row => row.Category)));
                setCategoryOptions(['ALL', ...categories]);
            } catch (e) {
                setCategoryOptions(['ALL']);
            }
        }
        fetchCategories();
    }, [showCategory]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFilter(prev => ({ ...prev, [name]: value }));
    };

    return (
        <div className="flex flex-wrap gap-4 mb-6">
            {showCategory && (
                <div>
                    <label className="mr-2 font-medium text-blue-700">Category:</label>
                    <select
                        name="category"
                        value={filter.category}
                        onChange={handleChange}
                        className="border border-blue-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        {categoryOptions.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                </div>
            )}
            <div>
                <label className="mr-2 font-medium text-blue-700">Acc Class:</label>
                <select
                    name="AccClass"
                    value={filter.AccClass}
                    onChange={handleChange}
                    className="border border-blue-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    {accClassOptions.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>
            </div>
            <div>
                <label className="mr-2 font-medium text-blue-700">Acc Status:</label>
                <select
                    name="AccStatus"
                    value={filter.AccStatus}
                    onChange={handleChange}
                    className="border border-blue-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    {accStatusOptions.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>
            </div>
            <div>
                <label className="mr-2 font-medium text-blue-700">ADID:</label>
                <select
                    name="ADID"
                    value={filter.ADID}
                    onChange={handleChange}
                    className="border border-blue-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    {adidOptions.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>
            </div>
            <div>
                <label className="mr-2 font-medium text-blue-700">Status Pukal:</label>
                <select
                    name="StatusPukal"
                    value={filter.StatusPukal}
                    onChange={handleChange}
                    className="border border-blue-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    {statusPukalOptions.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>
            </div>
        </div>
    );
}