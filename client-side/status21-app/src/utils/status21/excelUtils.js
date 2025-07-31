import ExcelJS from 'exceljs';
import { toPng } from 'html-to-image';
import { apiFetch } from '@/utils/api';

export async function generateStatus21Report(filter, setFilter, selectedDate) {
    try {

        if (!filter) {

            setFilter("Overall");
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

        const filterTypes = {
            "Overall": "disconnected",
            "Revisited": "revisit",
            "Pending Revisit": "belumrevisit"
        };

        // Create a new workbook using ExcelJS
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Status21 System';
        workbook.lastModifiedBy = 'Status21 System';
        workbook.created = new Date();
        workbook.modified = new Date();

        // Set professional theme colors
        const themeColors = {
            primary: '2F5597',    // Dark blue
            secondary: 'D6DCE5',  // Light blue-gray
            accent: 'E7EBF3',     // Very light blue-gray
            text: '333333',       // Dark gray
            border: 'B4C7E7',     // Medium blue-gray
            chartColors: [
                '4CAF50',  // Green (0-1Months)
                '2196F3',  // Blue (<3Months)
                'FF9800',  // Orange (<6Months)
                'F44336',  // Red (<12Months)
                '9C27B0',  // Purple (<2Years)
                '607D8B'   // Gray-Blue (>2Years)
            ]
        };

        // Improved changeFilter function
        const changeFilter = async (filterName) => {
            updateProgress(`Setting filter to ${filterName}...`);

            // Store the original filter value to restore later
            const originalFilter = filter;

            // Try multiple approaches to update the filter
            try {
                // 1. Find the filter dropdown and change its value
                const filterDropdown = document.querySelector('select[name="filter"]');
                if (filterDropdown) {
                    // Set the value
                    filterDropdown.value = filterName;

                    // Trigger change event to update the chart
                    const event = new Event('change', { bubbles: true });
                    filterDropdown.dispatchEvent(event);
                }

                // 2. Also try direct state update
                setFilter(filterName);

                // 3. Wait for React to update the UI
                await new Promise(resolve => setTimeout(resolve, 500));

                // 4. Try to access any global handlers
                if (window.handleFilterChange && typeof window.handleFilterChange === 'function') {
                    window.handleFilterChange(filterName);
                }

                // Wait for the filter change to propagate to components
                await new Promise(resolve => setTimeout(resolve, 3000));

                // Force a re-render if possible by toggling a class
                const chartContainer = document.querySelector('.chart-container');
                if (chartContainer) {
                    chartContainer.classList.add('updating');
                    setTimeout(() => chartContainer.classList.remove('updating'), 100);
                }

                // Wait more time for the chart to fully update
                await new Promise(resolve => setTimeout(resolve, 5000));

                // Check if we need to wait for any loading indicators to disappear
                const checkForLoadingComplete = async (startTime = Date.now()) => {
                    // If waited too long, proceed anyway
                    if (Date.now() - startTime > 10000) {
                        return;
                    }

                    const loadingElements = document.querySelectorAll('.loading, .chart-loading, .spinner');
                    if (loadingElements.length > 0) {
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        return checkForLoadingComplete(startTime);
                    }

                };

                await checkForLoadingComplete();

            } catch (error) {
                console.error(`Error changing filter to ${filterName}:`, error);
            }

            // Final wait to ensure chart is fully rendered
            await new Promise(resolve => setTimeout(resolve, 2000));
        };

        //chart capture function
        const captureChartImage = async (filterName) => {
            updateProgress(`Capturing ${filterName} chart...`);

            // Ensure any hidden elements are shown briefly for capture
            const toggleHiddenElements = () => {
                const hiddenElements = document.querySelectorAll('.chart-container [hidden], .chart-container .hidden');
                hiddenElements.forEach(el => {
                    el.dataset.wasHidden = 'true';
                    if (el.hasAttribute('hidden')) el.removeAttribute('hidden');
                    if (el.classList.contains('hidden')) el.classList.remove('hidden');
                });

                return () => {
                    document.querySelectorAll('[data-was-hidden="true"]').forEach(el => {
                        el.removeAttribute('data-was-hidden');
                        el.setAttribute('hidden', '');
                        if (!el.classList.contains('hidden')) el.classList.add('hidden');
                    });
                };
            };

            try {
                // Wait a bit more to ensure chart is fully rendered
                await new Promise(resolve => setTimeout(resolve, 2000));

                const chartElement = document.querySelector('.chart-container');
                if (!chartElement) {
                    throw new Error('Chart element not found');
                }

                // Temporarily show any hidden elements for capture
                const restoreHiddenElements = toggleHiddenElements();

                // Use html-to-image with improved options
                const chartImage = await toPng(chartElement, {
                    quality: 1.0,
                    cacheBust: true,
                    pixelRatio: 2,
                    backgroundColor: '#ffffff',
                    width: chartElement.offsetWidth || 800,
                    height: chartElement.offsetHeight || 400,
                    style: {
                        overflow: 'visible'
                    },
                    // Increase timeout for complex charts
                    timeout: 5000
                });

                // Restore hidden elements
                restoreHiddenElements();
                return chartImage;
            } catch (error) {
                console.error(`Error capturing chart for ${filterName}:`, error);
                throw error;
            }
        };

        // Process each filter type
        for (const [filterName, filterValue] of Object.entries(filterTypes)) {
            updateProgress(`Processing ${filterName} data...`);

            // Change the filter in the UI
            await changeFilter(filterName);

            // Fetch data for this filter type
            updateProgress(`Fetching ${filterName} data...`);
            const response = await apiFetch("/api/v2/status21/process-file", {
                method: "GET",
                headers: {
                    "x-data-type": filterValue,
                },
            });
            const data = await response.json();

            // Create worksheet for this filter
            const worksheet = workbook.addWorksheet(`${filterName}`, {
                properties: {
                    tabColor: {
                        argb: filterName === 'Overall' ? 'F44336' :
                            filterName === 'Revisited' ? '4CAF50' : '2196F3'
                    }
                }
            });

            // Transform data for Excel with column headers
            const tableData = Object.entries(data.BACount).map(([key, value]) => ({
                "Business Area": key,
                "Station": value["Business Area Name"],
                "No. Of CA": value.total,
                "> 2 Years": value[">2Years"],
                "< 2 Years": value["<2Years"],
                "< 12 Months": value["<12Months"],
                "< 6 Months": value["<6Months"],
                "< 3 Months": value["<3Months"],
                "0-1 Month": value["0-1Months"],
            }));

            // Add title
            worksheet.mergeCells('A1:I1');
            const titleCell = worksheet.getCell('A1');
            titleCell.value = filterName === "Overall"
                ? `Status 21 Report - ${filterName} Performance`
                : `Status 21 Report - ${filterName}`;
            titleCell.font = {
                name: 'Calibri',
                size: 16,
                bold: true,
                color: { argb: themeColors.primary }
            };
            titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
            worksheet.getRow(1).height = 30;

            // Add subtitle with date
            worksheet.mergeCells('A2:I2');
            const subtitleCell = worksheet.getCell('A2'); 
            const reportDate = selectedDate ? new Date(selectedDate) : new Date();
            const formattedDate = `${reportDate.getDate().toString().padStart(2, '0')}/${(reportDate.getMonth() + 1).toString().padStart(2, '0')}/${reportDate.getFullYear()}`;
            subtitleCell.value = `Report As Of ${formattedDate} `;
            subtitleCell.font = {
                name: 'Calibri',
                size: 10,
                italic: true,
                color: { argb: '777777' }
            };
            subtitleCell.alignment = { vertical: 'middle', horizontal: 'center' };
            worksheet.getRow(2).height = 20;

            // Define columns with headers
            const headers = [
                'Business Area', 'Station', 'No. Of CA', '> 2 Years',
                '< 2 Years', '< 12 Months', '< 6 Months', '< 3 Months', '0-1 Month'
            ];

            // Add header row at row 3
            const headerRow = worksheet.getRow(3);
            headers.forEach((header, index) => {
                const cell = headerRow.getCell(index + 1);
                cell.value = header;
                cell.font = {
                    name: 'Calibri',
                    bold: true,
                    size: 11,
                    color: { argb: 'FFFFFF' }
                };
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: themeColors.primary }
                };
                cell.alignment = {
                    vertical: 'middle',
                    horizontal: 'center'
                };
                cell.border = {
                    top: { style: 'thin', color: { argb: themeColors.border } },
                    bottom: { style: 'thin', color: { argb: themeColors.border } },
                    left: { style: 'thin', color: { argb: themeColors.border } },
                    right: { style: 'thin', color: { argb: themeColors.border } }
                };
            });
            headerRow.height = 24;
            headerRow.commit(); // Commit changes to the row

            // Set column widths
            worksheet.columns = [
                { key: 'BusinessArea', width: 18 },
                { key: 'Station', width: 32 },
                { key: 'No.OfCa', width: 14 },
                { key: 'gt2Years', width: 14 },
                { key: 'lt2Years', width: 14 },
                { key: 'lt12Months', width: 14 },
                { key: 'lt6Months', width: 14 },
                { key: 'lt3Months', width: 14 },
                { key: 'zeroTo1Month', width: 14 },
            ];

            // Add data rows starting from row 4
            tableData.forEach((row, rowIndex) => {
                const dataRow = worksheet.getRow(rowIndex + 4);
                dataRow.getCell(1).value = row["Business Area"];
                dataRow.getCell(2).value = row["Station"];
                dataRow.getCell(3).value = row["No. Of CA"];
                dataRow.getCell(4).value = row["> 2 Years"];
                dataRow.getCell(5).value = row["< 2 Years"];
                dataRow.getCell(6).value = row["< 12 Months"];
                dataRow.getCell(7).value = row["< 6 Months"];
                dataRow.getCell(8).value = row["< 3 Months"];
                dataRow.getCell(9).value = row["0-1 Month"];

                // Apply row styling
                dataRow.eachCell((cell, colNumber) => {
                    cell.font = {
                        name: 'Calibri',
                        size: 11
                    };
                    cell.alignment = {
                        vertical: 'middle',
                        horizontal: colNumber === 2 ? 'left' : 'center'
                    };
                    cell.border = {
                        top: { style: 'thin', color: { argb: themeColors.border } },
                        bottom: { style: 'thin', color: { argb: themeColors.border } },
                        left: { style: 'thin', color: { argb: themeColors.border } },
                        right: { style: 'thin', color: { argb: themeColors.border } }
                    };
                });
                dataRow.commit();
            });

            // Calculate the position for the totals row
            const totalsRowIndex = tableData.length + 4;
            const totalsRow = worksheet.getRow(totalsRowIndex);

            // Add totals row
            totalsRow.getCell(1).value = 'Total';
            totalsRow.getCell(2).value = '';
            totalsRow.getCell(3).value = tableData.reduce((sum, row) => sum + row["No. Of CA"], 0);
            totalsRow.getCell(4).value = tableData.reduce((sum, row) => sum + row["> 2 Years"], 0);
            totalsRow.getCell(5).value = tableData.reduce((sum, row) => sum + row["< 2 Years"], 0);
            totalsRow.getCell(6).value = tableData.reduce((sum, row) => sum + row["< 12 Months"], 0);
            totalsRow.getCell(7).value = tableData.reduce((sum, row) => sum + row["< 6 Months"], 0);
            totalsRow.getCell(8).value = tableData.reduce((sum, row) => sum + row["< 3 Months"], 0);
            totalsRow.getCell(9).value = tableData.reduce((sum, row) => sum + row["0-1 Month"], 0);

            // Style the totals row
            totalsRow.eachCell((cell, colNumber) => {
                cell.font = {
                    name: 'Calibri',
                    size: 11,
                    bold: true,
                    color: { argb: themeColors.primary }
                };
                cell.border = {
                    top: { style: 'thin', color: { argb: themeColors.border } },
                    bottom: { style: 'double', color: { argb: themeColors.border } },
                    left: { style: 'thin', color: { argb: themeColors.border } },
                    right: { style: 'thin', color: { argb: themeColors.border } }
                };

                if (colNumber > 2) {
                    cell.alignment = { horizontal: 'center' };
                    cell.numFmt = '#,##0';
                } else if (colNumber === 1) {
                    cell.alignment = { horizontal: 'center' };
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: themeColors.accent }
                    };
                }
            });
            totalsRow.commit();

            // Add space before chart
            worksheet.addRow([]);

            // Capture chart as an image for the CURRENT filter
            try {
                // Make sure the chart has been updated for this filter by calling
                // our improved chart capture function
                const chartImage = await captureChartImage(filterName);

                // Add chart title
                const chartTitleRow = worksheet.lastRow.number + 1;
                worksheet.mergeCells(`A${chartTitleRow}:I${chartTitleRow}`);
                const chartTitle = worksheet.getCell(`A${chartTitleRow}`);
                chartTitle.value = filterName === "Overall"
                    ? `${filterName} Performance by Business Area`
                    : `${filterName}  by Business Area`;
                chartTitle.font = {
                    name: 'Calibri',
                    size: 14,
                    bold: true,
                    color: { argb: themeColors.primary }
                };
                chartTitle.alignment = { vertical: 'middle', horizontal: 'center' };

                // Add chart image
                const imageRow = chartTitleRow + 1;
                const imageId = workbook.addImage({
                    base64: chartImage,
                    extension: 'png',
                });

                worksheet.addImage(imageId, {
                    tl: { col: 0, row: imageRow },
                    ext: { width: 800, height: 400 }
                });

                // Add rows to account for the image height
                for (let i = 0; i < 20; i++) {
                    worksheet.addRow([]);
                }

                // Add a note about which filter this chart represents
                const noteRow = worksheet.lastRow.number + 1;
                worksheet.mergeCells(`A${noteRow}:I${noteRow}`);
                const noteCell = worksheet.getCell(`A${noteRow}`);
                noteCell.value = `This chart represents data filtered by: ${filterName}`;
                noteCell.font = {
                    name: 'Calibri',
                    size: 10,
                    italic: true,
                    color: { argb: '777777' }
                };
                noteCell.alignment = { vertical: 'middle', horizontal: 'center' };

            } catch (error) {
                console.error(`Error adding chart for ${filterName}:`, error);

                // Add error message
                const errorRow = worksheet.lastRow.number + 1;
                worksheet.mergeCells(`A${errorRow}:I${errorRow}`);
                const errorCell = worksheet.getCell(`A${errorRow}`);
                errorCell.value = `Error capturing chart: ${error.message}`;
                errorCell.font = {
                    name: 'Calibri',
                    size: 12,
                    italic: true,
                    color: { argb: 'FF0000' }
                };
                errorCell.alignment = { vertical: 'middle', horizontal: 'center' };
            }

            // Add a visual separator at the end of each sheet
            worksheet.addRow([]);
            const separatorRow = worksheet.lastRow.number + 1;
            worksheet.mergeCells(`A${separatorRow}:I${separatorRow}`);
            const separatorCell = worksheet.getCell(`A${separatorRow}`);
            separatorCell.value = `--- End of ${filterName} Report ---`;
            separatorCell.font = {
                name: 'Calibri',
                size: 12,
                italic: true,
                color: { argb: themeColors.primary }
            };
            separatorCell.alignment = { vertical: 'middle', horizontal: 'center' };

            // Always restore original filter at the end of each iteration
            updateProgress(`Completed processing ${filterName}`);
        }

        // Set first sheet as active when opening
        workbook.getWorksheet('Overall').state = 'visible';
        workbook.views = [
            { activeTab: 0 }
        ];

        updateProgress('Finalizing report...');

        // Export the workbook
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'Status21_Report.xlsx';
        link.click();

        // Restore original filter if needed
        if (filter !== 'Overall') {
            setFilter('Overall');

            // Find the filter dropdown and change its value back
            const filterDropdown = document.querySelector('select[name="filter"]');
            if (filterDropdown) {
                filterDropdown.value = 'Overall';
                filterDropdown.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }

        // Remove loading indicator
        document.body.removeChild(loadingIndicator);

        // Show success message
        const successMessage = document.createElement('div');
        successMessage.className = 'fixed bottom-4 right-4 bg-green-500 text-white p-4 rounded-lg shadow-lg z-50';
        successMessage.innerHTML = `
                <div class="flex items-center">
                    <svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    <p>Report generated successfully!</p>
                </div>
            `;
        document.body.appendChild(successMessage);

        // Remove success message after 3 seconds
        setTimeout(() => {
            document.body.removeChild(successMessage);
        }, 3000);
    } catch (error) {
        console.error('Error generating Excel report:', error);

        // Remove loading indicator if it exists
        const loadingIndicator = document.querySelector('.fixed.inset-0.bg-black.bg-opacity-50');
        if (loadingIndicator) {
            document.body.removeChild(loadingIndicator);
        }

        // Show error message
        const errorMessage = document.createElement('div');
        errorMessage.className = 'fixed bottom-4 right-4 bg-red-500 text-white p-4 rounded-lg shadow-lg z-50';
        errorMessage.innerHTML = `
                <div class="flex items-center">
                    <svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                    <p>Error generating report: ${error.message}</p>
                </div>
            `;
        document.body.appendChild(errorMessage);

        // Remove error message after 5 seconds
        setTimeout(() => {
            document.body.removeChild(errorMessage);
        }, 5000);
    }
};
