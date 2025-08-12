import ExcelJS from 'exceljs';
import { toPng } from 'html-to-image';
import { getSummaryCardData, getDriverTreeSummary, getDirectedGraphSummary, getDebtByStationData, getDebtByAccountClassData, getDebtByAdidData, getDebtByStaffData, getDebtBySmerSegmentData, getAllDataFromParquet} from '../services/api';

// Extend the Window interface to include __fitDriverTreeView
declare global {
  interface Window {
    __fitDriverTreeView?: () => void;
  }
}

// Helper to scroll an element into view and wait for rendering
async function scrollIntoViewAndWait(el: HTMLElement, delayMs = 500) {
  if (el && typeof el.scrollIntoView === 'function') {
    el.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'center' });
    await new Promise(res => setTimeout(res, delayMs));
  }
}

// Helper to capture a DOM node as PNG (returns base64)
async function captureDomAsPng(
  selector: string,
  opts?: { directedGraphTitle?: string; summaryCards?: boolean; driverTree?: boolean }
): Promise<string | null> {
  let el: HTMLElement | null = null;
  // Use direct selectors as requested
  if (opts?.summaryCards) {
    el = document.querySelector('div.grid.grid-cols-1.lg\\:grid-cols-3.gap-6') as HTMLElement;
  } else if (opts?.driverTree) {
    el = document.querySelector('div.relative.min-h-\\[600px\\].bg-gradient-to-r.from-gray-50.to-white.rounded-lg') as HTMLElement;
  } else if (opts?.directedGraphTitle) {
    // Find <div class="bg-white rounded-lg shadow-lg p-6"> with <h3>Driver Tree By Smer Segment</h3>
    const candidates = Array.from(document.querySelectorAll('div.bg-white.rounded-lg.shadow-lg.p-6'));
    el = candidates.find(div => {
      const h3 = div.querySelector('h3');
      return h3 && h3.textContent?.trim() === opts.directedGraphTitle;
    }) as HTMLElement | undefined || null;
  } else {
    el = document.querySelector(selector) as HTMLElement;
  }
  if (!el) return null;
  await scrollIntoViewAndWait(el, 700); // Ensure element is visible and rendered
  try {
    return await toPng(el, { quality: 1.0, cacheBust: true, pixelRatio: 2, backgroundColor: '#fff' });
  } catch (err) {
    console.error('[excelReport] Error capturing PNG for selector:', selector, err);
    return null;
  }
}

// Helper to reset DirectedGraph zoom/pan before capture
async function resetDirectedGraphView(title: string) {
  // Find the DirectedGraph container by h3 title
  const candidates = Array.from(document.querySelectorAll('div.bg-white.rounded-lg.shadow-lg.p-6'));
  const container = candidates.find(div => {
    const h3 = div.querySelector('h3');
    return h3 && h3.textContent?.trim() === title;
  }) as HTMLElement | undefined;
  if (!container) return;
  // Find the zoom reset button (FiRefreshCw)
  const resetBtn = Array.from(container.querySelectorAll('button')).find(btn =>
    btn.title?.toLowerCase().includes('reset')
  ) as HTMLButtonElement | undefined;
  if (resetBtn) {
    resetBtn.click();
    await new Promise(res => setTimeout(res, 400));
  }
}

// Helper to scroll and fit DriverTree before capture
async function prepareDriverTreeForCapture() {
  // Fit view
  if (typeof window !== 'undefined' && typeof window.__fitDriverTreeView === 'function') {
    window.__fitDriverTreeView();
    await new Promise(res => setTimeout(res, 700)); // Wait longer for fitView animation/render
  }
  // Scroll into view
  const el = document.querySelector('div.relative.min-h-\\[600px\\].bg-gradient-to-r.from-gray-50.to-white.rounded-lg') as HTMLElement;
  if (el && typeof el.scrollIntoView === 'function') {
    el.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'center' });
    await new Promise(res => setTimeout(res, 300));
  }
}

// Helper to capture the React Flow chart directly (DriverTree)
async function captureDriverTreeReactFlow(): Promise<string | null> {
  // Wait for fitView and scroll as before
  if (typeof window !== 'undefined' && typeof window.__fitDriverTreeView === 'function') {
    window.__fitDriverTreeView();
    await new Promise(res => setTimeout(res, 700));
  }
  // Find the full React Flow wrapper (not just renderer)
  const rfWrapper = document.querySelector('.react-flow') as HTMLElement;
  if (!rfWrapper) return null;
  rfWrapper.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'center' });
  await new Promise(res => setTimeout(res, 200));
  try {
    return await toPng(rfWrapper, { quality: 1.0, cacheBust: true, pixelRatio: 2, backgroundColor: '#fff' });
  } catch (err) {
    console.error('[excelReport] Error capturing DriverTree React Flow:', err);
    return null;
  }
}

export async function generateDashboardSummaryExcelReport(parquetFileName: string, filters: any) {
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

  const updateProgress = (text: string) => {
    const el = document.getElementById('progress-text');
    if (el) el.textContent = text;
  };

  try {
    // --- SUMMARY REPORT LOGIC ---
    // Prepare filter params for API
    const getDebtRangeObj = (range: string) => {
      if (!range || range === 'all') return null;
      if (range.endsWith('+')) {
        const min = parseFloat(range.replace('+', ''));
        return { min, max: null };
      }
      const [min, max] = range.split('-').map(Number);
      return { min, max };
    };
    const apiParams = {
      viewType: filters.viewType === 'tradeReceivable' ? 'TR' : 'agedDebt',
      accClassType: filters.governmentType === 'government'
        ? 'GOVERNMENT'
        : filters.governmentType === 'non-government'
        ? 'NON_GOVERNMENT'
        : 'ALL',
      mitType: filters.mitFilter === 'mit'
        ? 'MIT'
        : filters.mitFilter === 'non-mit'
        ? 'NON_MIT'
        : 'ALL',
      businessAreas: filters.businessAreas,
      adids: filters.accDefinitions,
      accStatus: filters.accStatus !== 'all' ? filters.accStatus : null,
      balanceType: filters.netPositiveBalance !== 'all' ? filters.netPositiveBalance : null,
      accountClass: filters.accClass !== 'all' ? filters.accClass : '',
      agingBucket: filters.monthsOutstandingBracket !== 'all' ? filters.monthsOutstandingBracket : null,
      totalOutstandingRange: getDebtRangeObj(filters.debtRange),
      smerSegments: filters.smerSegments,
    };

    // Fetch all dashboard data in parallel
    updateProgress('Fetching dashboard data...');
    const [
      summaryCardRes,
      driverTreeRes,
      directedGraphRes,
      debtByStationRes,
      accClassRes,
      accDefRes,
      smerSegmentRes,
    ] = await Promise.all([
      getSummaryCardData(parquetFileName),
      getDriverTreeSummary(parquetFileName),
      getDirectedGraphSummary(parquetFileName),
      getDebtByStationData(parquetFileName, apiParams),
      getDebtByAccountClassData(parquetFileName, apiParams),
      getDebtByAdidData(parquetFileName, apiParams),
      getDebtBySmerSegmentData(parquetFileName, apiParams),
      getDebtByStaffData(parquetFileName, { viewType: apiParams.viewType, businessAreas: apiParams.businessAreas }),
    ]);

    updateProgress('Preparing Excel workbook...');
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'DebtSentry Dashboard';
    workbook.created = new Date();
    workbook.modified = new Date();

    // Styles
    const headerStyle = {
      font: { bold: true, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } },
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: {
        top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }
      }
    };
    // Station total row style (light yellow)
    const stationTotalRowStyle = {
      font: { bold: true },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF9C4' } },
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: {
        top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }
      }
    };
    // Grand total row style (light green)
    const grandTotalRowStyle = {
      font: { bold: true },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC8E6C9' } },
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: {
        top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'double' }, right: { style: 'thin' }
      }
    };
    const defaultCellStyle = { alignment: { horizontal: 'center', vertical: 'middle' } };

    // Helper to add a sheet with title and headers
    function addSheetWithHeaders(sheetName: string, title: string, columns: any[]) {
      const sheet = workbook.addWorksheet(sheetName);
      sheet.addRow([]);
      sheet.addRow([]);
      const titleRow = sheet.addRow([title]);
      titleRow.font = { bold: true, size: 16 };
      titleRow.alignment = { horizontal: 'center' };
      sheet.mergeCells(`A3:${String.fromCharCode(64 + columns.length)}3`);
      sheet.addRow([]);
      const headerRow = sheet.addRow(columns.map(col => col.header));
      headerRow.eachCell(cell => Object.assign(cell, headerStyle));
      columns.forEach((col, idx) => { if (col.width) sheet.getColumn(idx + 1).width = col.width; });
      return sheet;
    }
    
    // Helper to add data rows with support for custom row styles
    function addDataRows(sheet: ExcelJS.Worksheet, columns: any[], data: any[], formatters: Record<number, any> = {}, rowStyleFn?: (row: any) => any) {
      data.forEach((row) => {
        const values = columns.map(col => row[col.key]);
        const excelRow = sheet.addRow(values);
        excelRow.eachCell(cell => Object.assign(cell, defaultCellStyle));
        Object.entries(formatters).forEach(([colIdx, fmt]) => {
          if (fmt && fmt.numFmt) excelRow.getCell(Number(colIdx)).numFmt = fmt.numFmt;
        });
        // Apply custom row style if provided
        if (rowStyleFn) {
          const style = rowStyleFn(row);
          if (style) excelRow.eachCell(cell => Object.assign(cell, style));
        }
      });
    }

    // --- CAPTURE IMAGES FROM DOM ---
    // Wait for DOM to be ready and capture images for summary cards and charts
    updateProgress('Capturing dashboard images...');
    // Summary Cards grid
    const summaryCardsPng = await captureDomAsPng('', { summaryCards: true });

    // DriverTree chart: capture the React Flow chart directly
    const driverTreePng = await captureDriverTreeReactFlow();

    // DirectedGraph chart: find by h3 title
    await resetDirectedGraphView('Driver Tree By Smer Segment');
    await new Promise(res => setTimeout(res, 400)); // Wait for zoom reset
    const directedGraphPng = await captureDomAsPng('', { directedGraphTitle: 'Driver Tree By Smer Segment' });
    console.debug('[excelReport] directedGraphPng:', !!directedGraphPng);

    // --- SHEET 1: Summary Card Data + Image ---
    updateProgress('Adding Summary Card data...');
    const summarySheet = addSheetWithHeaders('Summary Card', 'Summary Card Data', [
      { header: 'Category', key: 'category', width: 30 },
      { header: 'Amount', key: 'amount', width: 20 },
      { header: 'No of Accounts', key: 'numOfAcc', width: 20 }
    ]);
    // Insert image if captured
    if (summaryCardsPng) {
      const imgId = workbook.addImage({ base64: summaryCardsPng, extension: 'png' });
      summarySheet.addImage(imgId, {
        tl: { col: 0, row: 0 },
        ext: { width: 700, height: 300 }
      });
      summarySheet.addRow([]); // Add a blank row after image
    }
    const summaryRows = [
      { category: 'Total Trade Receivable', amount: summaryCardRes.data.TotalTradeReceivable, numOfAcc: summaryCardRes.data.TotalNoOfAccTR },
      { category: 'Total Outstanding', amount: summaryCardRes.data.TotalOutstanding.Amount, numOfAcc: summaryCardRes.data.TotalOutstanding.NumOfAcc },
      { category: 'Active', amount: summaryCardRes.data.Active['TTL O/S Amt'], numOfAcc: summaryCardRes.data.Active['No Of Acc'] },
      { category: 'Inactive', amount: summaryCardRes.data.Inactive['TTL O/S Amt'], numOfAcc: summaryCardRes.data.Inactive['No Of Acc'] },
      { category: 'Positive Balance', amount: summaryCardRes.data.TotalByBalanceType.PositiveBalance, numOfAcc: summaryCardRes.data.TotalByBalanceType.TotalNoOfAccPositiveBalance },
      { category: 'Negative Balance', amount: summaryCardRes.data.TotalByBalanceType.NegativeBalance, numOfAcc: summaryCardRes.data.TotalByBalanceType.TotalNoOfAccNegativeBalance },
      { category: 'Zero Balance', amount: summaryCardRes.data.TotalByBalanceType.ZeroBalance, numOfAcc: summaryCardRes.data.TotalByBalanceType.TotalNoOfAccZeroBalance },
      { category: 'MIT', amount: summaryCardRes.data.TotalByBalanceType.MIT, numOfAcc: summaryCardRes.data.TotalByBalanceType.TotalNoOfAccMIT }
    ];
    addDataRows(summarySheet, [
      { key: 'category' }, { key: 'amount' }, { key: 'numOfAcc' }
    ], summaryRows, { 2: { numFmt: '#,##0.00' } });

    // --- SHEET 2: Driver Tree Chart as Image ---
    updateProgress('Adding Driver Tree data...');
    const driverTreeSheet = addSheetWithHeaders('Driver Tree', 'Driver Tree Data', [
      { header: 'Name', key: 'name', width: 30 },
      { header: 'Value', key: 'value', width: 20 },
      { header: 'Num of Accounts', key: 'numOfAcc', width: 20 },
      { header: 'Level', key: 'level', width: 10 }
    ]);
    if (driverTreePng) {
      const imgId = workbook.addImage({ base64: driverTreePng, extension: 'png' });
      driverTreeSheet.addImage(imgId, {
        tl: { col: 0, row: 0 },
        ext: { width: 900, height: 400 }
      });
      driverTreeSheet.addRow([]);
    }
    function flattenTree(node: any, arr: any[] = []) {
      arr.push({ name: node.name, value: node.value, numOfAcc: node.numOfAcc, level: node.level });
      if (node.children) node.children.forEach((child: any) => flattenTree(child, arr));
      return arr;
    }
    const driverTreeRows = flattenTree(driverTreeRes.data.root);
    addDataRows(driverTreeSheet, [
      { key: 'name' }, { key: 'value' }, { key: 'numOfAcc' }, { key: 'level' }
    ], driverTreeRows, { 2: { numFmt: '#,##0.00' } });

    // --- SHEET 3: Directed Graph Chart as Image ---
    updateProgress('Adding Directed Graph data...');
    const directedGraphSheet = addSheetWithHeaders('Directed Graph', 'Directed Graph Data', [
      { header: 'Name', key: 'name', width: 30 },
      { header: 'Value', key: 'value', width: 20 },
      { header: 'Num of Accounts', key: 'numOfAcc', width: 20 }
    ]);
    if (directedGraphPng) {
      const imgId = workbook.addImage({ base64: directedGraphPng, extension: 'png' });
      directedGraphSheet.addImage(imgId, {
        tl: { col: 0, row: 0 },
        ext: { width: 900, height: 400 }
      });
      directedGraphSheet.addRow([]);
    }
    function flattenGraph(node: any, arr: any[] = []) {
      arr.push({ name: node.name, value: node.value, numOfAcc: node.numOfAcc });
      if (node.children) node.children.forEach((child: any) => flattenGraph(child, arr));
      return arr;
    }
    const directedGraphRows = flattenGraph(directedGraphRes.data.root);
    addDataRows(directedGraphSheet, [
      { key: 'name' }, { key: 'value' }, { key: 'numOfAcc' }
    ], directedGraphRows, { 2: { numFmt: '#,##0.00' } });

    // Sheet 4: Debt By Station
    updateProgress('Adding Debt By Station data...');
    const stationSheet = addSheetWithHeaders('By Station', 'Debt By Station', [
      { header: 'Business Area', key: 'businessArea', width: 20 },
      { header: 'Station', key: 'station', width: 20 },
      { header: 'Number of Accounts', key: 'numberOfAccounts', width: 20 },
      { header: 'TTL O/S Amt', key: 'ttlOSAmt', width: 20 },
      { header: '% of Total', key: 'percentOfTotal', width: 15 },
      { header: 'Total Undue', key: 'totalUndue', width: 20 },
      { header: 'Cur.Mth Unpaid', key: 'curMthUnpaid', width: 20 },
      { header: 'Total Unpaid', key: 'totalUnpaid', width: 20 }
    ]);
    addDataRows(stationSheet, [
      { key: 'businessArea' }, { key: 'station' }, { key: 'numberOfAccounts' }, { key: 'ttlOSAmt' },
      { key: 'percentOfTotal' }, { key: 'totalUndue' }, { key: 'curMthUnpaid' }, { key: 'totalUnpaid' }
    ], debtByStationRes.data.data, { 4: { numFmt: '#,##0.00' }, 6: { numFmt: '#,##0.00' }, 7: { numFmt: '#,##0.00' }, 8: { numFmt: '#,##0.00' } });

    // Sheet 5: By Account Class
    updateProgress('Adding By Account Class data...');
    const accClassSheet = addSheetWithHeaders('By Acc Class', 'Debt By Account Class', [
      { header: 'Business Area', key: 'businessArea', width: 20 },
      { header: 'Station', key: 'station', width: 20 },
      { header: 'Account Class', key: 'accountClass', width: 15 },
      { header: 'Number of Accounts', key: 'numberOfAccounts', width: 20 },
      { header: 'TTL O/S Amt', key: 'ttlOSAmt', width: 20 },
      { header: '% of Total', key: 'percentOfTotal', width: 15 },
      { header: 'Total Undue', key: 'totalUndue', width: 20 },
      { header: 'Cur.Mth Unpaid', key: 'curMthUnpaid', width: 20 },
      { header: 'Total Unpaid', key: 'totalUnpaid', width: 20 },
      { header: 'MIT Amt', key: 'mitAmt', width: 15 }
    ]);
    const accClassData = accClassRes.data.data;
    let accClassRowsWithTotals: any[] = [];
    let stationRows: any[] = [];
    accClassData.forEach((row, idx) => {
      accClassRowsWithTotals.push(row);
      stationRows.push(row);
      const nextRow = accClassData[idx + 1];
      if (!nextRow || nextRow.station !== row.station) {
        // Calculate station total for required fields
        const totalNumberOfAccounts = stationRows.reduce((sum, r) => sum + (Number(r.numberOfAccounts) || 0), 0);
        const totalTtlOSAmt = stationRows.reduce((sum, r) => sum + (Number(r.ttlOSAmt) || 0), 0);
        const totalCurMthUnpaid = stationRows.reduce((sum, r) => sum + (Number(r.curMthUnpaid) || 0), 0);
        const totalPercentOfTotal = stationRows.reduce((sum, r) => sum + (parseFloat(r.percentOfTotal) || 0), 0);
        const totalTotalUndue = stationRows.reduce((sum, r) => sum + (Number(r.totalUndue) || 0), 0);
        const totalTotalUnpaid = stationRows.reduce((sum, r) => sum + (Number(r.totalUnpaid) || 0), 0);
        accClassRowsWithTotals.push({
          businessArea: row.businessArea,
          station: row.station,
          accountClass: 'STATION TOTAL',
          numberOfAccounts: totalNumberOfAccounts,
          ttlOSAmt: totalTtlOSAmt,
          percentOfTotal: totalPercentOfTotal.toFixed(2),
          totalUndue: totalTotalUndue,
          curMthUnpaid: totalCurMthUnpaid,
          totalUnpaid: totalTotalUnpaid,
          mitAmt: '',
          isStationTotal: true
        });
        stationRows = [];
      }
    });
    // Grand total for required fields
    if (accClassData.length > 0) {
      const totalNumberOfAccounts = accClassData.reduce((sum, r) => sum + (Number(r.numberOfAccounts) || 0), 0);
      const totalTtlOSAmt = accClassData.reduce((sum, r) => sum + (Number(r.ttlOSAmt) || 0), 0);
      const totalCurMthUnpaid = accClassData.reduce((sum, r) => sum + (Number(r.curMthUnpaid) || 0), 0);
      const totalPercentOfTotal = accClassData.reduce((sum, r) => sum + (parseFloat(r.percentOfTotal) || 0), 0);
      const totalTotalUndue = accClassData.reduce((sum, r) => sum + (Number(r.totalUndue) || 0), 0);
      const totalTotalUnpaid = accClassData.reduce((sum, r) => sum + (Number(r.totalUnpaid) || 0), 0);
      accClassRowsWithTotals.push({
        businessArea: '',
        station: '',
        accountClass: 'GRAND TOTAL',
        numberOfAccounts: totalNumberOfAccounts,
        ttlOSAmt: totalTtlOSAmt,
        percentOfTotal: totalPercentOfTotal.toFixed(2),
        totalUndue: totalTotalUndue,
        curMthUnpaid: totalCurMthUnpaid,
        totalUnpaid: totalTotalUnpaid,
        mitAmt: '',
        isGrandTotal: true
      });
    }
    addDataRows(
      accClassSheet,
      [
        { key: 'businessArea' }, { key: 'station' }, { key: 'accountClass' }, { key: 'numberOfAccounts' },
        { key: 'ttlOSAmt' }, { key: 'percentOfTotal' }, { key: 'totalUndue' }, { key: 'curMthUnpaid' }, { key: 'totalUnpaid' }, { key: 'mitAmt' }
      ],
      accClassRowsWithTotals,
      { 5: { numFmt: '#,##0.00' }, 7: { numFmt: '#,##0.00' }, 8: { numFmt: '#,##0.00' }, 9: { numFmt: '#,##0.00' }, 10: { numFmt: '#,##0.00' } },
      (row) => row.isGrandTotal ? grandTotalRowStyle : row.isStationTotal ? stationTotalRowStyle : undefined
    );

    // Sheet 6: By ADID
    updateProgress('Adding By ADID data...');
    const adidSheet = addSheetWithHeaders('By ADID', 'Debt By ADID', [
      { header: 'Business Area', key: 'businessArea', width: 20 },
      { header: 'Station', key: 'station', width: 20 },
      { header: 'ADID', key: 'adid', width: 10 },
      { header: 'Number of Accounts', key: 'numberOfAccounts', width: 20 },
      { header: 'TTL O/S Amt', key: 'ttlOSAmt', width: 20 },
      { header: '% of Total', key: 'percentOfTotal', width: 15 },
      { header: 'Total Undue', key: 'totalUndue', width: 20 },
      { header: 'Cur.Mth Unpaid', key: 'curMthUnpaid', width: 20 },
      { header: 'Total Unpaid', key: 'totalUnpaid', width: 20 },
      { header: 'MIT Amt', key: 'mitAmt', width: 15 }
    ]);
    // #sym:adidSheet
    const adidData = accDefRes.data.data;
    let adidRowsWithTotals: any[] = [];
    let adidStationRows: any[] = [];
    adidData.forEach((row, idx) => {
      adidRowsWithTotals.push(row);
      adidStationRows.push(row);
      const nextRow = adidData[idx + 1];
      if (!nextRow || nextRow.station !== row.station) {
        const totalNumberOfAccounts = adidStationRows.reduce((sum, r) => sum + (Number(r.numberOfAccounts) || 0), 0);
        const totalTtlOSAmt = adidStationRows.reduce((sum, r) => sum + (Number(r.ttlOSAmt) || 0), 0);
        const totalCurMthUnpaid = adidStationRows.reduce((sum, r) => sum + (Number(r.curMthUnpaid) || 0), 0);
        const totalPercentOfTotal = adidStationRows.reduce((sum, r) => sum + (parseFloat(r.percentOfTotal) || 0), 0);
        const totalTotalUndue = adidStationRows.reduce((sum, r) => sum + (Number(r.totalUndue) || 0), 0);
        const totalTotalUnpaid = adidStationRows.reduce((sum, r) => sum + (Number(r.totalUnpaid) || 0), 0);
        adidRowsWithTotals.push({
          businessArea: row.businessArea,
          station: row.station,
          adid: 'STATION TOTAL',
          numberOfAccounts: totalNumberOfAccounts,
          ttlOSAmt: totalTtlOSAmt,
          percentOfTotal: totalPercentOfTotal.toFixed(2),
          totalUndue: totalTotalUndue,
          curMthUnpaid: totalCurMthUnpaid,
          totalUnpaid: totalTotalUnpaid,
          mitAmt: '',
          isStationTotal: true
        });
        adidStationRows = [];
      }
    });
    // Grand total for required fields
    if (adidData.length > 0) {
      const totalNumberOfAccounts = adidData.reduce((sum, r) => sum + (Number(r.numberOfAccounts) || 0), 0);
      const totalTtlOSAmt = adidData.reduce((sum, r) => sum + (Number(r.ttlOSAmt) || 0), 0);
      const totalCurMthUnpaid = adidData.reduce((sum, r) => sum + (Number(r.curMthUnpaid) || 0), 0);
      const totalPercentOfTotal = adidData.reduce((sum, r) => sum + (parseFloat(r.percentOfTotal) || 0), 0);
      const totalTotalUndue = adidData.reduce((sum, r) => sum + (Number(r.totalUndue) || 0), 0);
      const totalTotalUnpaid = adidData.reduce((sum, r) => sum + (Number(r.totalUnpaid) || 0), 0);
      adidRowsWithTotals.push({
        businessArea: '',
        station: '',
        adid: 'GRAND TOTAL',
        numberOfAccounts: totalNumberOfAccounts,
        ttlOSAmt: totalTtlOSAmt,
        percentOfTotal: totalPercentOfTotal.toFixed(2),
        totalUndue: totalTotalUndue,
        curMthUnpaid: totalCurMthUnpaid,
        totalUnpaid: totalTotalUnpaid,
        mitAmt: '',
        isGrandTotal: true
      });
    }
    addDataRows(
      adidSheet,
      [
        { key: 'businessArea' }, { key: 'station' }, { key: 'adid' }, { key: 'numberOfAccounts' },
        { key: 'ttlOSAmt' }, { key: 'percentOfTotal' }, { key: 'totalUndue' }, { key: 'curMthUnpaid' }, { key: 'totalUnpaid' }, { key: 'mitAmt' }
      ],
      adidRowsWithTotals,
      { 5: { numFmt: '#,##0.00' }, 7: { numFmt: '#,##0.00' }, 8: { numFmt: '#,##0.00' }, 9: { numFmt: '#,##0.00' }, 10: { numFmt: '#,##0.00' } },
      (row) => row.isGrandTotal ? grandTotalRowStyle : row.isStationTotal ? stationTotalRowStyle : undefined
    );

    // Sheet 7: By SMER Segment
    updateProgress('Adding By SMER Segment data...');
    const smerSheet = addSheetWithHeaders('By SMER Segment', 'Debt By SMER Segment', [
      { header: 'Business Area', key: 'businessArea', width: 20 },
      { header: 'Station', key: 'station', width: 20 },
      { header: 'Segment', key: 'segment', width: 15 },
      { header: 'Number of Accounts', key: 'numberOfAccounts', width: 20 },
      { header: 'TTL O/S Amt', key: 'ttlOSAmt', width: 20 },
      { header: '% of Total', key: 'percentOfTotal', width: 15 },
      { header: 'Total Undue', key: 'totalUndue', width: 20 },
      { header: 'Cur.Mth Unpaid', key: 'curMthUnpaid', width: 20 },
      { header: 'Total Unpaid', key: 'totalUnpaid', width: 20 },
      { header: 'MIT Amt', key: 'mitAmt', width: 15 }
    ]);
    // #sym:smerSheet
    const smerData = smerSegmentRes.data.data;
    let smerRowsWithTotals: any[] = [];
    let smerStationRows: any[] = [];
    smerData.forEach((row, idx) => {
      smerRowsWithTotals.push(row);
      smerStationRows.push(row);
      const nextRow = smerData[idx + 1];
      if (!nextRow || nextRow.station !== row.station) {
        const totalNumberOfAccounts = smerStationRows.reduce((sum, r) => sum + (Number(r.numberOfAccounts) || 0), 0);
        const totalTtlOSAmt = smerStationRows.reduce((sum, r) => sum + (Number(r.ttlOSAmt) || 0), 0);
        const totalCurMthUnpaid = smerStationRows.reduce((sum, r) => sum + (Number(r.curMthUnpaid) || 0), 0);
        const totalPercentOfTotal = smerStationRows.reduce((sum, r) => sum + (parseFloat(r.percentOfTotal) || 0), 0);
        const totalTotalUndue = smerStationRows.reduce((sum, r) => sum + (Number(r.totalUndue) || 0), 0);
        const totalTotalUnpaid = smerStationRows.reduce((sum, r) => sum + (Number(r.totalUnpaid) || 0), 0);
        smerRowsWithTotals.push({
          businessArea: row.businessArea,
          station: row.station,
          segment: 'STATION TOTAL',
          numberOfAccounts: totalNumberOfAccounts,
          ttlOSAmt: totalTtlOSAmt,
          percentOfTotal: totalPercentOfTotal.toFixed(2),
          totalUndue: totalTotalUndue,
          curMthUnpaid: totalCurMthUnpaid,
          totalUnpaid: totalTotalUnpaid,
          mitAmt: '',
          isStationTotal: true
        });
        smerStationRows = [];
      }
    });
    // Grand total for required fields
    if (smerData.length > 0) {
      const totalNumberOfAccounts = smerData.reduce((sum, r) => sum + (Number(r.numberOfAccounts) || 0), 0);
      const totalTtlOSAmt = smerData.reduce((sum, r) => sum + (Number(r.ttlOSAmt) || 0), 0);
      const totalCurMthUnpaid = smerData.reduce((sum, r) => sum + (Number(r.curMthUnpaid) || 0), 0);
      const totalPercentOfTotal = smerData.reduce((sum, r) => sum + (parseFloat(r.percentOfTotal) || 0), 0);
      const totalTotalUndue = smerData.reduce((sum, r) => sum + (Number(r.totalUndue) || 0), 0);
      const totalTotalUnpaid = smerData.reduce((sum, r) => sum + (Number(r.totalUnpaid) || 0), 0);
      smerRowsWithTotals.push({
        businessArea: '',
        station: '',
        segment: 'GRAND TOTAL',
        numberOfAccounts: totalNumberOfAccounts,
        ttlOSAmt: totalTtlOSAmt,
        percentOfTotal: totalPercentOfTotal.toFixed(2),
        totalUndue: totalTotalUndue,
        curMthUnpaid: totalCurMthUnpaid,
        totalUnpaid: totalTotalUnpaid,
        mitAmt: '',
        isGrandTotal: true
      });
    }
    addDataRows(
      smerSheet,
      [
        { key: 'businessArea' }, { key: 'station' }, { key: 'segment' }, { key: 'numberOfAccounts' },
        { key: 'ttlOSAmt' }, { key: 'percentOfTotal' }, { key: 'totalUndue' }, { key: 'curMthUnpaid' }, { key: 'totalUnpaid' }, { key: 'mitAmt' }
      ],
      smerRowsWithTotals,
      { 5: { numFmt: '#,##0.00' }, 7: { numFmt: '#,##0.00' }, 8: { numFmt: '#,##0.00' }, 9: { numFmt: '#,##0.00' }, 10: { numFmt: '#,##0.00' } },
      (row) => row.isGrandTotal ? grandTotalRowStyle : row.isStationTotal ? stationTotalRowStyle : undefined
    );

    // Save and download the main Excel report (dashboard)
    updateProgress('Saving Excel file...');
        setTimeout(() => {
      document.body.removeChild(loadingIndicator);
    }, 2000);
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    a.download = `Summary CRPM Aging - ${timestamp}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  } catch (error: any) {
    updateProgress('Error generating report. Please try again.');
    setTimeout(() => {
      document.body.removeChild(loadingIndicator);
    }, 2000);
    console.error('[excelReport] Report generation failed:', error);
    throw error;
  }
}

export async function generateDashboardFullExcelReport(parquetFileName: string,) {
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

  const updateProgress = (text: string) => {
    const el = document.getElementById('progress-text');
    if (el) el.textContent = text;
  };

  try {
    // --- Download converted parquet-to-xlsx file ---
    updateProgress('Downloading full Excel file (converted from parquet)...');
    try {
      await getAllDataFromParquet(parquetFileName);
      // Add a delay to ensure the browser download dialog appears before removing the loading indicator
      setTimeout(() => {
        updateProgress('Excel reports generated!');
        setTimeout(() => {
          document.body.removeChild(loadingIndicator);
        }, 1000);
      }, 1000);
    } catch (err) {
      updateProgress('Failed to download converted Excel file.');
      setTimeout(() => {
        document.body.removeChild(loadingIndicator);
      }, 2000);
    }
  } catch (error: any) {
    updateProgress('Error generating report. Please try again.');
    setTimeout(() => {
      document.body.removeChild(loadingIndicator);
    }, 2000);
    console.error('[excelReport] Report generation failed:', error);
    throw error;
  }
}