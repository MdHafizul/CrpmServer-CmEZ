'use client';

import Link from 'next/link';
import { BoltIcon } from '@heroicons/react/24/outline'; // For Status21
import { ListBulletIcon } from '@heroicons/react/24/outline'; // For GSorter
import { BuildingOfficeIcon } from '@heroicons/react/24/outline'; // Factory for LPC

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-blue-50 to-green-50">
      <div className="flex items-center mb-4">
        <h1 className="text-4xl font-extrabold text-blue-900 drop-shadow mr-3">Welcome to CmEZ</h1>
        {/* TNB Logo Image */}
        <img src="/TNB.png" alt="TNB Logo" className="w-10 h-10 inline-block align-middle" />
      </div>
      <p className="text-gray-600 mb-10 text-lg">Choose a system to proceed:</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-10 w-full max-w-5xl">
        {/* Status 21 Card */}
        <Link
          href="/status21"
          className="group block rounded-2xl bg-white shadow-xl hover:shadow-2xl transition-shadow duration-300 border border-green-100 p-8 text-center hover:-translate-y-1"
        >
          <div className="flex flex-col items-center">
            <div className="bg-green-100 rounded-full p-4 mb-4 shadow-inner">
              {/* Lightning Bolt Icon using Heroicons */}
              <BoltIcon className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-green-800 mb-2 group-hover:text-green-900 transition-colors">Status 21 System</h2>
            <p className="text-gray-500 mb-4">Analyze and manage disconnected accounts data.</p>
            <span className="inline-block mt-2 px-4 py-2 bg-green-500 text-white rounded-lg shadow hover:bg-green-600 transition-colors font-semibold">
              Go to Status 21
            </span>
          </div>
        </Link>
        
        {/* GovSorter Card */}
        <Link
          href="/gsorter"
          className="group block rounded-2xl bg-white shadow-xl hover:shadow-2xl transition-shadow duration-300 border border-blue-100 p-8 text-center hover:-translate-y-1"
        >
          <div className="flex flex-col items-center">
            <div className="bg-blue-100 rounded-full p-4 mb-4 shadow-inner">
              {/* Sort/Filter Icon for GovSorter using Heroicons */}
              <ListBulletIcon className="w-10 h-10 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-blue-800 mb-2 group-hover:text-blue-900 transition-colors">GovSorter</h2>
            <p className="text-gray-500 mb-4">Sort and review grouped account data efficiently.</p>
            <span className="inline-block mt-2 px-4 py-2 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600 transition-colors font-semibold">
              Go to GovSorter
            </span>
          </div>
        </Link>
        
        {/* StatusLPC Card */}
        <Link
          href="/statusLPC"
          className="group block rounded-2xl bg-white shadow-xl hover:shadow-2xl transition-shadow duration-300 border border-purple-100 p-8 text-center hover:-translate-y-1"
        >
          <div className="flex flex-col items-center">
            <div className="bg-purple-100 rounded-full p-4 mb-4 shadow-inner">
              {/* Factory Icon for StatusLPC using Heroicons */}
              <BuildingOfficeIcon className="w-10 h-10 text-purple-600" />
            </div>
            <h2 className="text-2xl font-bold text-purple-800 mb-2 group-hover:text-purple-900 transition-colors">StatusLPC</h2>
            <p className="text-gray-500 mb-4">Sort and review payment status of LPC data efficiently.</p>
            <span className="inline-block mt-2 px-4 py-2 bg-purple-500 text-white rounded-lg shadow hover:bg-purple-600 transition-colors font-semibold">
              Go to StatusLPC
            </span>
          </div>
        </Link>
      </div>
    </main>
  );
}