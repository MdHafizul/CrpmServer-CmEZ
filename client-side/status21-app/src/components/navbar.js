import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

export default function Navbar() {
  const pathname = usePathname();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  // Determine initial system based on path
  const initialSystem =
    pathname.startsWith('/gsorter') ? 'gsorter'
      : pathname.startsWith('/status21') ? 'status21'
        : pathname.startsWith('/statusLPC') ? 'statusLPC'
        : null;
  const [selectedSystem, setSelectedSystem] = useState(initialSystem);

  // Handle dropdown selection
  const handleSystemSelect = (system) => {
    setSelectedSystem(system);
    setDropdownOpen(false);
  };

  return (
    <header className="bg-white border-b border-gray-200">
      <nav className="px-4 py-2.5 mx-auto flex items-center justify-between">
        <div className="flex items-center">
          <Link
            href="/"
            className="text-xl font-bold text-blue-700 hover:text-blue-900 transition-colors"
            onClick={() => setDropdownOpen(false)}
          >
            CmEZ
          </Link>
          <div className="relative ml-4">
            <button
              className="text-gray-600 hover:text-gray-900 px-2 py-1 rounded focus:outline-none"
              onClick={() => setDropdownOpen((open) => !open)}
              aria-haspopup="true"
              aria-expanded={dropdownOpen}
            >
              {/* Show current system or "Systems" */}
              {selectedSystem === 'status21'
                ? 'Status 21'
                : selectedSystem === 'gsorter'
                  ? 'GovSorter'
                    : selectedSystem === 'statusLPC'
                      ? 'StatusLPC'
                  : 'Systems'}
              <svg
                className="inline ml-1 w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {dropdownOpen && (
              <div
                className="absolute left-0 mt-2 w-40 bg-white border border-gray-200 rounded shadow-lg z-10"
                onMouseLeave={() => setDropdownOpen(false)}
              >
                <Link
                  href="/status21"
                  className={`block px-4 py-2 text-gray-700 hover:bg-gray-100 ${selectedSystem === 'status21' ? 'font-semibold bg-gray-100' : ''
                    }`}
                  onClick={() => handleSystemSelect('status21')}
                >
                  Status 21
                </Link>
                <Link
                  href="/gsorter"
                  className={`block px-4 py-2 text-gray-700 hover:bg-gray-100 ${selectedSystem === 'gsorter' ? 'font-semibold bg-gray-100' : ''
                    }`}
                  onClick={() => handleSystemSelect('gsorter')}
                >
                  GovSorter
                </Link>
                <Link
                  href="/statusLPC"
                  className={`block px-4 py-2 text-gray-700 hover:bg-gray-100 ${selectedSystem === 'statusLPC' ? 'font-semibold bg-gray-100' : ''
                    }`}
                  onClick={() => handleSystemSelect('statusLPC')}
                  >
                  StatusLPC
                </Link>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-4">
          {selectedSystem === 'status21' && (
            <>
              <Link href="/status21" className="flex items-center text-gray-600 hover:text-gray-900">
                {/* Upload Icon */}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Upload
              </Link>
              <Link href="/status21/dashboard" className="flex items-center text-gray-600 hover:text-gray-900">
                {/* Dashboard Icon */}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Dashboard
              </Link>
            </>
          )}
          {selectedSystem === 'gsorter' && (
            <>
              <Link href="/gsorter" className="flex items-center text-gray-600 hover:text-gray-900">
                {/* Upload Icon */}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Upload
              </Link>
              <Link href="/gsorter/dashboard" className="flex items-center text-gray-600 hover:text-gray-900">
                {/* Dashboard Icon */}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2m0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Dashboard
              </Link>
            </>
          )}
          {selectedSystem === 'statusLPC' && (
            <>
              <Link href="/statusLPC" className="flex items-center text-gray-600 hover:text-gray-900">
                {/* Upload Icon */}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Upload
              </Link>
              <Link href="/statusLPC/dashboard" className="flex items-center text-gray-600 hover:text-gray-900">
                {/* Dashboard Icon */}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2m0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Dashboard
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}