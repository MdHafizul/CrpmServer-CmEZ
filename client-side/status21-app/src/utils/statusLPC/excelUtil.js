import ExcelJS from 'exceljs';
import html2canvas from 'html2canvas';
import { toPng } from 'html-to-image';
import { apiFetch } from '@/utils/api';

/**
 * Generate StatusLPC Excel Report with 4 sheets:
 * 1. SUMMARY: Dashboard summary cards image + summary table
 * 2. PRIME: Sorted table + detailed table (Prime only)
 * 3. CURRENT: Sorted table + detailed table (Current only)
 * 4. DEBT: Sorted table + detailed table (Debt only)
 */
export async function generateStatusLPCReport() {
    // Show loading indicator
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    loadingIndicator.innerHTML = `
        <div class="bg-white p-6 rounded-lg shadow-lg text-center">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
            <p class="text-lg font-semibold">Generating Excel Report...</p>
            <p class="text-sm text-gray-500" id="progress-text-lpc">Fetching data...</p>
        </div>
    `;
    document.body.appendChild(loadingIndicator);

    const updateProgress = (text) => {
        const el = document.getElementById('progress-text-lpc');
        if (el) el.textContent = text;
    };

    try {
        updateProgress("Fetching summary dashboard data...");
        // 1. Fetch summary dashboard data (summary cards)
        const summaryCardsRes = await apiFetch('/api/v2/statusLPC/summaryCards');
        if (!summaryCardsRes.ok) throw new Error('Failed to fetch summary dashboard data');
        const summaryCards = (await summaryCardsRes.json()).data || {};

        updateProgress("Fetching summary table data...");
        // 2. Fetch summary table data
        const summaryTableRes = await apiFetch('/api/v2/statusLPC/summaryTable');
        if (!summaryTableRes.ok) throw new Error('Failed to fetch summary table data');
        const summaryTableData = (await summaryTableRes.json()).data || [];

        // Helper to fetch sorted and detailed table for a filter
        const fetchSortedAndDetailed = async (filter) => {
            updateProgress(`Fetching sorted table for ${filter}...`);
            const sortedRes = await apiFetch('/api/v2/statusLPC/sortedTable', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filter })
            });
            if (!sortedRes.ok) throw new Error(`Failed to fetch sorted table for ${filter}`);
            const sortedData = (await sortedRes.json()).data || [];

            updateProgress(`Fetching detailed table for ${filter}...`);
            const detailedRes = await apiFetch('/api/v2/statusLPC/detailedTable', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ teamFilter: filter, businessAreaFilter: 'ALL' })
            });
            if (!detailedRes.ok) throw new Error(`Failed to fetch detailed table for ${filter}`);
            const detailedData = (await detailedRes.json()).data || [];

            return { sortedData, detailedData };
        };

        // Fetch for PRIME, CURRENT, DEBT
        const [prime, current, debt, all] = await Promise.all([
            fetchSortedAndDetailed('PRIME'),
            fetchSortedAndDetailed('CURRENT'),
            fetchSortedAndDetailed('DEBT'),
            fetchSortedAndDetailed('ALL')
        ]);

        updateProgress("Capturing dashboard image...");
        // 3. Capture summary dashboard as image using html-to-image (toPng)
        let dashboardImageBase64 = null;
        const dashboardContainer = document.querySelector('.bg-white.rounded-lg.border.border-gray-200.p-6.mb-6');
        if (dashboardContainer) {
            dashboardImageBase64 = await toPng(dashboardContainer, { cacheBust: true, backgroundColor: '#fff', pixelRatio: 2 });
        }

        updateProgress("Building Excel workbook...");

        // ExcelJS workbook setup
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'StatusLPC System';
        workbook.created = new Date();
        workbook.modified = new Date();

        // Theme colors
        const theme = {
            summary: 'A084E8', // Purple
            prime: 'FFB84C',   // Orange
            current: '4FC3F7', // Blue
            debt: 'F55050',    // Red
            header: '6C3483',  // Dark purple
            border: 'D1C4E9',
            white: 'FFFFFF',
            totalRow: 'E1BEE7', // Light purple for total rows
            jumlahRow: 'FFF9C4', // Light yellow for jumlah/total rows
        };

        // Helper: Auto fit columns based on data
        function autoFitColumns(ws, dataRows, headerRow) {
            const colWidths = headerRow.map((header, i) => {
                let maxLen = header.toString().length;
                dataRows.forEach(row => {
                    const val = row[i] !== undefined && row[i] !== null ? row[i].toString() : '';
                    if (val.length > maxLen) maxLen = val.length;
                });
                return maxLen + 2;
            });
            ws.columns.forEach((col, i) => {
                col.width = colWidths[i] || 10;
            });
        }

        // Helper: Add summary dashboard image to worksheet
        async function addSummaryDashboardImage(ws, imageBase64, startRow = 1) {
            if (!imageBase64) return;
            const imageId = workbook.addImage({
                base64: imageBase64,
                extension: 'png'
            });
            ws.addImage(imageId, {
                tl: { col: 0, row: Math.max(0, startRow) },
                ext: { width: 700, height: 250 }
            });
        }

        // Helper: Add summary table to worksheet
        function addSummaryTable(ws, data, startRow = ws.lastRow ? ws.lastRow.number + 2 : 10) {
            // Merge 3 rows for the header
            ws.mergeCells(`A${startRow}:F${startRow + 2}`);
            const headerCell = ws.getCell(`A${startRow}`);
            headerCell.value = "Summary Table";
            headerCell.font = { bold: true, size: 14, color: { argb: theme.header } };
            headerCell.alignment = { horizontal: 'center', vertical: 'middle' };

            // Table headers (start after merged header)
            const headers = [
                'Kategori', 'Bil Akaun', 'Total Unpaid (RM)', 'Bil Akaun Buat Bayaran', 'Total Payment (RM)', 'Balance to Collect (RM)'
            ];
            const headerRow = ws.addRow(headers);
            headerRow.eachCell(cell => {
                cell.font = { bold: true, color: { argb: theme.white } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: theme.header } };
                cell.alignment = { horizontal: 'center' };
            });

            // Prepare data for autofit
            const dataRows = [];
            data.forEach(row => {
                const arr = [
                    row.kategori,
                    row.bilAkaun,
                    row.totalUnpaid,
                    row.bilAkaunBuatBayaran,
                    row.totalPayment,
                    row.balanceToCollect
                ];
                dataRows.push(arr);
                const excelRow = ws.addRow(arr);
                excelRow.eachCell((cell, colNumber) => {
                    if (colNumber > 1) cell.numFmt = '#,##0.00';
                    cell.alignment = { horizontal: 'center' };
                });
                // Highlight JUMLAH row
                if (row.kategori && row.kategori.toUpperCase() === 'JUMLAH') {
                    excelRow.eachCell(cell => {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: theme.jumlahRow } };
                        cell.font = { bold: true, color: { argb: theme.header } };
                    });
                }
            });

            autoFitColumns(ws, dataRows, headers);
            ws.addRow([]);
        }



        // Helper: Add sorted table to worksheet
        function addSortedTable(ws, data, color, startRow = ws.lastRow ? ws.lastRow.number + 2 : 2) {
            ws.mergeCells(`A${startRow}:G${startRow}`);
            ws.getCell(`A${startRow}`).value = "Sorted Table";
            ws.getCell(`A${startRow}`).font = { bold: true, size: 14, color: { argb: color } };
            ws.getCell(`A${startRow}`).alignment = { horizontal: 'center' };

            ws.addRow([]);
            const headers = [
                'Business Area', 'Bil Akaun', 'Total Unpaid (RM)', 'Bil Akaun Buat Bayaran',
                'Total Payment (RM)', 'Balance to Collect (RM)', '% Collection'
            ];
            const headerRow = ws.addRow(headers);
            headerRow.eachCell(cell => {
                cell.font = { bold: true, color: { argb: theme.white } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
                cell.alignment = { horizontal: 'center' };
            });

            // Set columns explicitly for ExcelJS auto width to work better
            ws.columns = headers.map(() => ({ width: 10 }));

            const dataRows = [];
            data.forEach(row => {
                const arr = [
                    row.businessArea,
                    row.bilAkaun,
                    row.totalUnpaid,
                    row.bilAkaunBuatBayaran,
                    row.totalPayment,
                    row.balanceToCollect,
                    row.percentCollection
                ];
                dataRows.push(arr);
                const excelRow = ws.addRow(arr);
                excelRow.eachCell((cell, colNumber) => {
                    if (colNumber === 2) { // Bil Akaun (contract account) as integer
                        cell.numFmt = '0';
                    } else if (colNumber > 2 && colNumber < 7) {
                        cell.numFmt = '#,##0.00';
                    } else if (colNumber === 7) {
                        cell.numFmt = '0"%"';
                    }
                    cell.alignment = { horizontal: 'center' };
                });
                // Highlight JUMLAH row
                if (
                    typeof row.businessArea === 'string' &&
                    ['JUMLAH'].includes(row.businessArea.trim().toUpperCase())
                ) {
                    excelRow.eachCell(cell => {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: theme.jumlahRow } };
                        cell.font = { bold: true, color: { argb: theme.header } };
                    });
                }
            });

            // Auto-fit columns after adding all rows
            autoFitColumns(ws, dataRows, headers);

            ws.addRow([]);
        }

        // Helper: Add detailed table to worksheet
        function addDetailedTable(ws, data, color, startRow = ws.lastRow ? ws.lastRow.number + 2 : 2) {
            ws.mergeCells(`A${startRow}:${String.fromCharCode(65 + (data.length > 0 ? Object.keys(data[0]).length - 1 : 5))}${startRow}`);
            ws.getCell(`A${startRow}`).value = "Detailed Table";
            ws.getCell(`A${startRow}`).font = { bold: true, size: 14, color: { argb: color } };
            ws.getCell(`A${startRow}`).alignment = { horizontal: 'center' };

            ws.addRow([]);
            if (data.length === 0) {
                ws.addRow(['No detailed data available']);
                return;
            }
            const headers = Object.keys(data[0]);
            const headerRow = ws.addRow(headers);
            headerRow.eachCell(cell => {
                cell.font = { bold: true, color: { argb: theme.white } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
                cell.alignment = { horizontal: 'center' };
            });

            const dataRows = [];
            data.forEach(row => {
                const arr = headers.map(h => {
                    // Contract account column: integer, no decimal
                    if (h.toLowerCase().includes('contract') && typeof row[h] === 'number') {
                        return Math.round(row[h]);
                    }
                    return row[h];
                });
                dataRows.push(arr);
                const excelRow = ws.addRow(arr);
                excelRow.eachCell((cell, colNumber) => {
                    // Contract account column: integer, no decimal
                    if (headers[colNumber - 1].toLowerCase().includes('contract')) {
                        cell.numFmt = '0';
                    }
                    cell.alignment = { horizontal: 'center' };
                });
                // Highlight JUMLAH row
                if (row[headers[0]] && row[headers[0]].toUpperCase && row[headers[0]].toUpperCase() === 'JUMLAH') {
                    excelRow.eachCell(cell => {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: theme.jumlahRow } };
                        cell.font = { bold: true, color: { argb: theme.header } };
                    });
                }
            });

            autoFitColumns(ws, dataRows, headers);
            ws.addRow([]);
        }

        // 1. SUMMARY SHEET
        const summarySheet = workbook.addWorksheet('SUMMARY', { properties: { tabColor: { argb: theme.summary } } });

        // Add summary table first
        addSummaryTable(summarySheet, summaryTableData, summarySheet.lastRow ? summarySheet.lastRow.number + 2 : 2);

        // Add sorted table for filter "ALL" to the summary sheet
        addSortedTable(summarySheet, all.sortedData, theme.summary, summarySheet.lastRow ? summarySheet.lastRow.number + 2 : 2);

        // Add image below the table
        if (dashboardImageBase64) {
            const imageRow = summarySheet.lastRow ? summarySheet.lastRow.number + 2 : 20;
            await addSummaryDashboardImage(summarySheet, dashboardImageBase64, 32);
        }

        // 2. PRIME SHEET
        const primeSheet = workbook.addWorksheet('PRIME', { properties: { tabColor: { argb: theme.prime } } });
        addSortedTable(primeSheet, prime.sortedData, theme.prime, 2);
        addDetailedTable(primeSheet, prime.detailedData, theme.prime, primeSheet.lastRow ? primeSheet.lastRow.number + 2 : 2);

        // 3. CURRENT SHEET
        const currentSheet = workbook.addWorksheet('CURRENT', { properties: { tabColor: { argb: theme.current } } });
        addSortedTable(currentSheet, current.sortedData, theme.current, 2);
        addDetailedTable(currentSheet, current.detailedData, theme.current, currentSheet.lastRow ? currentSheet.lastRow.number + 2 : 2);

        // 4. DEBT SHEET
        const debtSheet = workbook.addWorksheet('DEBT', { properties: { tabColor: { argb: theme.debt } } });
        addSortedTable(debtSheet, debt.sortedData, theme.debt, 2);
        addDetailedTable(debtSheet, debt.detailedData, theme.debt, debtSheet.lastRow ? debtSheet.lastRow.number + 2 : 2);

        // Set first sheet as active
        workbook.views = [{ activeTab: 0 }];

        updateProgress("Saving Excel file...");
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `StatusLPC_Report_${new Date().toISOString().replace(/[:.]/g, '-')}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        document.body.removeChild(loadingIndicator);

        // Show success message
        const successMessage = document.createElement('div');
        successMessage.className = 'fixed bottom-4 right-4 bg-green-500 text-white p-4 rounded-lg shadow-lg z-50';
        successMessage.innerHTML = `
            <div class="flex items-center">
                <svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <p>StatusLPC Report generated successfully!</p>
            </div>
        `;
        document.body.appendChild(successMessage);
        setTimeout(() => {
            document.body.removeChild(successMessage);
        }, 3000);

    } catch (error) {
        console.error('Error generating StatusLPC Excel report:', error);
        if (loadingIndicator && loadingIndicator.parentNode) {
            document.body.removeChild(loadingIndicator);
        }
        const errorMessage = document.createElement('div');
        errorMessage.className = 'fixed bottom-4 right-4 bg-red-500 text-white p-4 rounded-lg shadow-lg z-50';
        errorMessage.innerHTML = `
            <div class="flex items-center">
                <svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
                <p>Error generating StatusLPC report: ${error.message}</p>
            </div>
        `;
        document.body.appendChild(errorMessage);
        setTimeout(() => {
            document.body.removeChild(errorMessage);
        }, 5000);
    }
}