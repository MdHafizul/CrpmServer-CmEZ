import { useState, useEffect, useCallback } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { apiFetch } from '@/utils/api';


// Register Chart.js components and the datalabels plugin
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartDataLabels
);

export default function ChartView({ filter }) {
  const [isLoading, setIsLoading] = useState(false);
  const [chartData, setChartData] = useState(null);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Transform API data into Chart.js format
  const transformDataForChart = useCallback((BACount) => {
    const labels = Object.keys(BACount).map(
      (key) => BACount[key]["Business Area Name"]
    );
    const categories = [
      "0-1Months",
      "<3Months",
      "<6Months",
      "<12Months",
      "<2Years",
      ">2Years",
    ];

    const datasets = categories.map((category) => ({
      label: category,
      data: Object.keys(BACount).map((key) => BACount[key][category] || 0),
      backgroundColor: getCategoryColor(category),
    }));

    setChartData({
      labels,
      datasets,
    });
  }, []); // Memoize transformDataForChart

  // Fetch file data from the API
  const fetchFileData = useCallback(async () => {
    setIsLoading(true);
    try {
      const typeMap = {
        Overall: "disconnected",
        Revisited: "revisit",
        "Pending Revisit": "belumrevisit",
      };

      const dataType = typeMap[filter] || "disconnected";

     const response = await apiFetch('/api/v2/status21/process-file', {
        method: "GET",
        headers: {
          "x-data-type": dataType,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch table data: ${response.statusText}`);
      }

      const result = await response.json();
      transformDataForChart(result.BACount);
    } catch (error) {
      console.error("Error fetching file data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [filter, transformDataForChart]); // Memoize fetchFileData

  const getCategoryColor = (category) => {
    const colors = {
      "0-1Months": "#4caf50", // Green
      "<3Months": "#2196f3", // Blue
      "<6Months": "#ff9800", // Orange
      "<12Months": "#f44336", // Red
      "<2Years": "#9c27b0", // Purple
      ">2Years": "#607d8b", // Gray
    };
    return colors[category] || "#000000";
  };

  useEffect(() => {
    fetchFileData();
  }, [fetchFileData]); // Only run when fetchFileData changes

  // Chart options with datalabels configured to display inside the bars.
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false, // Ensures the chart does not maintain a fixed aspect ratio
    plugins: {
      legend: {
        position: "top",
      },
      title: {
        display: true,
        text:
          filter === "Overall"
            ? `Status 21 Report - ${filter} Performance`
            : `Status 21 Report - ${filter}`,
        font: {
          weight: "bold",
          size: 16,
        }
      },
      datalabels: {
        anchor: "center",
        align: "center",
        color: "#000000",
        font: {
          weight: "bold",
          size: 12,
        },
        formatter: (value) => (value !== 0 ? value : ""),
      },
    },
    scales: {
      x: {
        stacked: false, // Ensure bars are not stacked
      },
      y: {
        stacked: false, // Ensure bars are not stacked
        beginAtZero: true,
        grid: {
          display: false,
        }
      },
    },
    elements: {
      bar: {
        minBarLength: 50, // Ensures each bar has a minimum length of 20 pixels
      },
    },
  };

  return (
    <div
      className={`bg-white rounded-lg border border-gray-200 p-6 mb-6 ${isFullScreen ? "fixed inset-0 z-50 bg-white" : ""
        }`}
    >
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={() => setIsFullScreen(!isFullScreen)}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg"
        >
          {isFullScreen ? "Exit Full Screen" : "Full Screen"}
        </button>
      </div>
      {isLoading ? (
        <div className="flex justify-center items-center h-64 border border-gray-300 rounded-lg">
          <p className="text-gray-400">Loading...</p>
        </div>
      ) : chartData ? (
        <div style={{ width: "100%", height: isFullScreen ? "90vh" : "400px" }}>
          <Bar data={chartData} options={chartOptions} />
        </div>
      ) : (
        <div className="flex justify-center items-center h-64 border border-gray-300 rounded-lg">
          <p className="text-gray-400">No data available</p>
        </div>
      )}
    </div>
  );
}
