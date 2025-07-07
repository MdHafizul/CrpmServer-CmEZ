'use client';

import useStatusLPCStore from "@/store/statusLPCStore";

export default function FilterDropdown() {
    const filter = useStatusLPCStore((state) => state.filter);
    const setFilter = useStatusLPCStore((state) => state.setFilter);

    const categoryOptions = ['ALL', 'PRIME', 'CURRENT', 'DEBT'];

    const handleChange = (e) => {
        setFilter(e.target.value);
    };

    return (
        <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-semibold text-purple-700">Sorted Table</h2>
            <div className="w-64">
                <select 
                    value={filter}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-purple-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                    {categoryOptions.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>
            </div>
        </div>
    );
}