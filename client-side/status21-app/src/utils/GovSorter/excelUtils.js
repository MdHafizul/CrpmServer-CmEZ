'use client'

import ExcelJS from 'exceljs';
import { apiFetch } from '@/utils/api';

export async function generateGovSorterReport(filter, setFilter) {
    try {
        if (!filter) {
            return;
        }

        // Show loading indicator
        const loadingIndicator = document.createElement('div');
        loadingIndicator.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        loadingIndicator.innerHTML = `
            <div class="bg-white p-6 rounded-lg shadow-lg text-center">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p class="text-lg font-semibold">Generating Excel Report...</p>
                <p class="text-sm text-gray-500" id="progress-text">Fetching data...</p>
            </div>
        `;
        document.body.appendChild(loadingIndicator);

        const updateProgress = (text) => {
            document.getElementById('progress-text').textContent = text;
        };

        // Create a new workbook using excelJS
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'GovSorter System';
        workbook.lastModifiedBy = 'GovSorter System';
        workbook.created = new Date();
        workbook.modified = new Date();

        // Format for date display
        const dateFormat = new Intl.DateTimeFormat('ms-MY', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });

        const currentDateTime = dateFormat.format(new Date());

        // Define common styles
        const headerStyle = {
            font: { bold: true, color: { argb: 'FFFFFFFF' } },
            fill: {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF2563EB' }
            },
            alignment: { horizontal: 'center', vertical: 'middle' },
            border: {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            }
        };

        const titleStyle = {
            font: { bold: true, size: 16, color: { argb: 'FF000000' } },
            alignment: { horizontal: 'center' }
        };

        const subtitleStyle = {
            font: { bold: true, size: 12, color: { argb: 'FF555555' } },
            alignment: { horizontal: 'center' }
        };

        const totalRowStyle = {
            font: { bold: true },
            fill: {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFDBEAFE' }
            },
            alignment: { horizontal: 'center', vertical: 'middle' }, // Added center alignment
            border: {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'double' },
                right: { style: 'thin' }
            }
        };

        // Modify the alternateRowStyle to include center alignment
        const alternateRowStyle = {
            fill: {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFF3F4F6' }
            },
            alignment: { horizontal: 'center', vertical: 'middle' } // Added center alignment
        };

        // Add one default style for all regular cells
        const defaultCellStyle = {
            alignment: { horizontal: 'center', vertical: 'middle' }
        };

        // Then add other sheets in the desired order
        const summarySheet = workbook.addWorksheet("Summary Data");
        const agensiSummarySheet = workbook.addWorksheet("Agensi Summary Data");
        const detailedSheet = workbook.addWorksheet("Detailed Data");

        // Phase 1: Create report structure function
        function createReportStructure(sheet, title, columns, options = {}) {
            // Set column widths without headers 
            columns.forEach((col, index) => {
                const column = sheet.getColumn(index + 1);
                if (col.width) column.width = col.width;
                if (col.key) column.key = col.key;
            });

            // Add title section
            sheet.addRow([]); // Blank row
            sheet.addRow([]); // Blank row
            const titleRow = sheet.addRow([title]);
            titleRow.font = { bold: true, size: 16 };
            titleRow.alignment = { horizontal: 'center' };
            sheet.mergeCells(`A3:${String.fromCharCode(64 + columns.length)}3`);
            sheet.addRow([]); // Blank row after title

            // Add header row at row 5
            const headerRow = sheet.getRow(5);
            columns.forEach((col, index) => {
                const cell = headerRow.getCell(index + 1);
                cell.value = col.header;
                Object.assign(cell, headerStyle);
            });

            // Apply auto-filter to headers
            sheet.autoFilter = {
                from: { row: 5, column: 1 },
                to: { row: 5, column: columns.length }
            };

            return {
                sheet,
                dataStartRow: 6 // Row where data starts (after header)
            };
        }

        // Phase 2: Populate data function
        function populateReportData(reportInfo, data, options = {}) {
            const { sheet, dataStartRow } = reportInfo;
            const { columns, formatters = {} } = options;

            if (!Array.isArray(data) || data.length === 0) return;

            // Split regular rows from total row
            const regularRows = data.filter(row => {
                // Check for common total row identifiers
                const totalKey = Object.keys(row).find(k =>
                    row[k] === 'JUMLAH' ||
                    row[k] === 'Total' ||
                    row[k] === 'TOTAL'
                );
                return !totalKey;
            });

            const totalRow = data.find(row => {
                // Find the total row
                const totalKey = Object.keys(row).find(k =>
                    row[k] === 'JUMLAH' ||
                    row[k] === 'Total' ||
                    row[k] === 'TOTAL'
                );
                return !!totalKey;
            });

            // Add regular data rows
            let currentRow = dataStartRow;
            regularRows.forEach((item, idx) => {
                const rowValues = columns.map(col => {
                    let value = item[col.key];
                    if (Array.isArray(value)) {
                        return value.join(", ");
                    }
                    return value;
                });

                const excelRow = sheet.getRow(currentRow);

                // Set values for regular rows
                rowValues.forEach((value, colIdx) => {
                    const cell = excelRow.getCell(colIdx + 1);
                    cell.value = value;
                    Object.assign(cell, defaultCellStyle); // Apply default style with center alignment
                });

                // Apply formatters
                if (formatters && Object.keys(formatters).length > 0) {
                    Object.entries(formatters).forEach(([colIndex, formatter]) => {
                        if (formatter && formatter.numFmt) {
                            excelRow.getCell(parseInt(colIndex)).numFmt = formatter.numFmt;
                        }
                    });
                }

                // Apply alternate row styling
                if (idx % 2 === 1) {
                    excelRow.eachCell(cell => {
                        Object.assign(cell, alternateRowStyle);
                    });
                }

                currentRow++;
            });

            // Add total row at the end if it exists
            if (totalRow) {
                const rowValues = columns.map(col => {
                    let value = totalRow[col.key];
                    if (Array.isArray(value)) {
                        return value.join(", ");
                    }
                    return value;
                });

                const excelRow = sheet.getRow(currentRow);

                // Set values
                rowValues.forEach((value, colIdx) => {
                    excelRow.getCell(colIdx + 1).value = value;
                });

                // Apply formatters
                if (formatters && Object.keys(formatters).length > 0) {
                    Object.entries(formatters).forEach(([colIndex, formatter]) => {
                        if (formatter && formatter.numFmt) {
                            excelRow.getCell(parseInt(colIndex)).numFmt = formatter.numFmt;
                        }
                    });
                }

                // Apply total row styling
                excelRow.eachCell(cell => {
                    Object.assign(cell, totalRowStyle);
                });

                currentRow++;
            }

            return currentRow;
        }


        // Fetch data using the user's filter
        let summaryData, agensiSummaryData, detailedData;
        try {
            updateProgress("Fetching summary data...");

            const [summaryRes, agensiSummaryRes, detailedRes] = await Promise.all([
                apiFetch("/api/v2/govSorter/summary", { method: "GET" }),
                apiFetch("/api/v2/govSorter/agensiSummary", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(filter)
                }),
                apiFetch("/api/v2/govSorter/detailedData", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(filter)
                })
            ]);

            if (!summaryRes.ok || !agensiSummaryRes.ok || !detailedRes.ok) {
                document.body.removeChild(loadingIndicator);
                throw new Error("Failed to fetch data from API");
            }

            summaryData = await summaryRes.json();
            if (summaryData.data) summaryData = summaryData.data;

            agensiSummaryData = await agensiSummaryRes.json();
            if (agensiSummaryData.data) agensiSummaryData = agensiSummaryData.data;

            detailedData = await detailedRes.json();
            if (detailedData.data) detailedData = detailedData.data;

            updateProgress("Data fetched successfully. Generating report...");

            // ===== Sheet 1: Summary =====
            const summaryHeaders = [
                { header: "Category", key: "Category", width: 30 },
                { header: "Bil Akaun", key: "BilAkaun", width: 15 },
                { header: "Jumlah Tunggakan", key: "JumlahTunggakan", width: 20 }
            ];

            // Phase 1: Create summary sheet structure
            const summaryReport = createReportStructure(
                summarySheet,
                "GovSorter Summary Report",
                summaryHeaders
            );

            // Phase 2: Populate summary data
            populateReportData(summaryReport, summaryData, {
                columns: summaryHeaders,
                formatters: {
                    3: { numFmt: '#,##0.00' } // Format for Jumlah Tunggakan column
                }
            });

            // ===== Sheet 2: Agensi Summary =====
            const agensiHeaders = [
                { header: "Buss Area", key: "Buss Area", width: 15 },
                { header: "Acc Status", key: "Acc Status", width: 20 },
                { header: "Acc Class", key: "Acc Class", width: 20 },
                { header: "Status Pukal", key: "Status Pukal", width: 20 },
                { header: "ADID", key: "ADID", width: 15 },
                { header: "Bil Akaun", key: "Bil Akaun", width: 15 },
                { header: "TTL O/S AMT", key: "TTL O/S AMT", width: 20 },
                { header: "Total Unpaid", key: "Total Unpaid", width: 20 }
            ];

            // Phase 1: Create agensi summary sheet structure
            const agensiReport = createReportStructure(
                agensiSummarySheet,
                "GovSorter Agensi Summary Report",
                agensiHeaders
            );

            // Phase 2: Populate agensi summary data
            populateReportData(agensiReport, agensiSummaryData, {
                columns: agensiHeaders,
                formatters: {
                    7: { numFmt: '#,##0.00' }, // Format for TTL O/S AMT column
                    8: { numFmt: '#,##0.00' }  // Format for Total Unpaid column
                }
            });

            // ===== Sheet 3: Detailed Table =====
            const detailedHeaders = [
                { header: "Customer Group", key: "Customer Group", width: 20 },
                { header: "Sector", key: "Sector", width: 10 },
                { header: "SMER Segment", key: "SMER Segment", width: 15 },
                { header: "Business Area", key: "Business Area", width: 15 },
                { header: "Contract Account", key: "Contract Account", width: 20 },
                { header: "Contract Account Name", key: "Contract Account Name", width: 30 },
                { header: "ADID", key: "ADID", width: 10 },
                { header: "Acc Class", key: "Acc Class", width: 10 },
                { header: "Acc Status", key: "Acc Status", width: 10 },
                { header: "Status Pukal", key: "Status Pukal", width: 15 },
                { header: "No of Months Outstanding", key: "No of Months Outstanding", width: 22 },
                { header: "Current Month Unpaid", key: "Current Month Unpaid", width: 20 },
                { header: "TTL O/S AMT", key: "TTL O/S AMT", width: 15 },
                { header: "Total Unpaid", key: "Total Unpaid", width: 15 },
                { header: "Move Out Date", key: "Move Out Date", width: 15 }
            ];

            // Phase 1: Create detailed sheet structure
            const detailedReport = createReportStructure(
                detailedSheet,
                "GovSorter Detailed Report",
                detailedHeaders
            );

            // Phase 2: Populate detailed data with special formatters
            populateReportData(detailedReport, detailedData, {
                columns: detailedHeaders,
                formatters: {
                    11: { numFmt: '#,##0.00' }, // No of Months Outstanding
                    12: { numFmt: '#,##0.00' }, // Current Month Unpaid
                    13: { numFmt: '#,##0.00' }, // TTL O/S AMT
                    14: { numFmt: '#,##0.00' }, // Total Unpaid
                    15: { numFmt: 'dd.mm.yyyy' } // Move Out Date
                }
            });

            // Save and download
            updateProgress("Saving Excel file...");
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;

            // Add timestamp to filename
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
            a.download = `GovSorter_Report_${timestamp}.xlsx`;

            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            updateProgress("Excel report generated!");
            setTimeout(() => {
                document.body.removeChild(loadingIndicator);
            }, 1000);

        } catch (error) {
            console.error("Error fetching data:", error);
            updateProgress("Error fetching data. Please try again.");
            setTimeout(() => {
                document.body.removeChild(loadingIndicator);
            }, 2000);
            return;
        }

    } catch (error) {
        console.error("Error generating report:", error);
        const errorIndicator = document.createElement('div');
        errorIndicator.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        errorIndicator.innerHTML = `
            <div class="bg-white p-6 rounded-lg shadow-lg text-center">
                <div class="text-red-600 mb-3">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <p class="text-lg font-semibold">Error Generating Report</p>
                <p class="text-sm text-red-500">${error.message}</p>
                <button class="mt-4 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded" onclick="this.parentElement.parentElement.remove()">
                    Close
                </button>
            </div>
        `;
        document.body.appendChild(errorIndicator);
        setTimeout(() => {
            document.body.removeChild(errorIndicator);
        }, 5000);
    }
}