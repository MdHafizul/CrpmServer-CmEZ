import React from 'react';
import { useAppContext } from '../../context/AppContext';
import { generateDashboardExcelReport } from '../../utils/excelReport';

const ReportButton: React.FC = () => {
  const { parquetFileName, filters } = useAppContext();

  const handleDownload = async () => {
    if (!parquetFileName) {
      alert('No data file loaded.');
      return;
    }
    try {
      await generateDashboardExcelReport(parquetFileName, filters);
    } catch (err) {
      alert('Failed to generate report.');
    }
  };

  return (
    <button
      onClick={handleDownload}
      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700 transition-colors"
      title="Download Excel Report"
    >
      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
      </svg>
      Download Excel Report
    </button>
  );
};

export default ReportButton;
