'use client';

import { useState, useRef, useEffect } from 'react';

export default function FilterDropdown({ onFilterChange }) {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedOption, setSelectedOption] = useState('Overall');
    const dropdownRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [dropdownRef]);

    const handleOptionClick = (option) => {
        setSelectedOption(option);
        setIsOpen(false);
        onFilterChange(option); // Notify parent of the filter change
    };

    return (
        <div className="flex justify-end mb-4">
            <div className="relative inline-block text-left" ref={dropdownRef}>
                <button
                    type="button"
                    className="inline-flex justify-between w-40 rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
                    onClick={() => setIsOpen(!isOpen)}
                >
                    {selectedOption}
                    <svg
                        className="-mr-1 ml-2 h-5 w-5"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        aria-hidden="true"
                    >
                        <path
                            fillRule="evenodd"
                            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                            clipRule="evenodd"
                        />
                    </svg>
                </button>

                {isOpen && (
                    <div className="absolute z-10 mt-2 w-40 bg-white shadow-lg ring-1 ring-black ring-opacity-5 rounded-md">
                        <div className="py-1" role="menu" aria-orientation="vertical">
                            {['Overall', 'Revisited', 'Pending Revisit'].map((option) => (
                                <button
                                    key={option}
                                    className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                                    role="menuitem"
                                    onClick={() => handleOptionClick(option)}
                                >
                                    {option}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}