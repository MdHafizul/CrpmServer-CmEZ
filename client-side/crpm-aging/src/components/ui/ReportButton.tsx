import React from 'react';
import { useAppContext } from '../../context/AppContext';
import { generateDashboardSummaryExcelReport, generateDashboardFullExcelReport } from '../../utils/excelReport';

const ReportButton: React.FC = () => {
  const { parquetFileName, filters } = useAppContext();

  const handleDownloadSummary = async () => {
    if (!parquetFileName) {
      alert('No data file loaded.');
      return;
    }
    try {
      await generateDashboardSummaryExcelReport(parquetFileName, filters);
    } catch (err) {
      alert('Failed to generate summary report.');
    }
  };

  const handleDownloadFull = async () => {
    if (!parquetFileName) {
      alert('No data file loaded.');
      return;
    }
    try {
      await generateDashboardFullExcelReport(parquetFileName);
    } catch (err) {
      alert('Failed to generate full report.');
    }
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={handleDownloadSummary}
        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700 transition-colors"
        title="Download Summary Excel Report"
      >
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
        </svg>
        Download Summary Report
      </button>
      <button
        onClick={handleDownloadFull}
        className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded shadow hover:bg-green-700 transition-colors"
        title="Download Full Excel Report"
      >
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
        </svg>
        Download Full Data
      </button>
    </div>
  );
};

export default ReportButton;
