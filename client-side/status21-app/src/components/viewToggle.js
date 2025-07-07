'use client';

import { useEffect, useRef } from 'react';
import { Chart } from 'chart.js/auto';

export default function ChartView() {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  
  useEffect(() => {
    // Initialize chart
    const ctx = chartRef.current.getContext('2d');
    
    // Destroy existing chart instance if it exists
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }
    
    // Create new chart
    chartInstance.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['0-1 Months', '1-3 Months', '3-6 Months', '>6 Months'],
        datasets: [
          {
            label: 'Area A',
            data: [145, 167, 54, 23],
            backgroundColor: '#60a5fa',
          },
          {
            label: 'Area B',
            data: [98, 132, 45, 31],
            backgroundColor: '#4fd1c5',
          },
          {
            label: 'Area C',
            data: [112, 143, 67, 29],
            backgroundColor: '#f6ad55',
          },
          {
            label: 'Area D',
            data: [68, 79, 32, 20],
            backgroundColor: '#c084fc',
          }
        ]
      },
      options: {
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 20
            }
          },
          tooltip: {
            mode: 'index',
            intersect: false
          }
        },
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            stacked: true,
            grid: {
              display: true
            }
          },
          y: {
            stacked: true,
            beginAtZero: true,
            grid: {
              display: true
            }
          }
        }
      }
    });
    
    // Cleanup on component unmount
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, []);
  
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
      <canvas ref={chartRef} height="300"></canvas>
    </div>
  );
}