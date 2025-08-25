const path = require('path');
const fs = require('fs');
const mime = require('mime-types');
const parquetServices = require('../services/DebtAging/parquet');
const { convertBigIntsInObject } = require('../utils/parquetHelper');
const ExcelJS = require('exceljs');

// @DESC : Upload an Excel file, convert it to Parquet, 
// @route GET /api/v2/parquet/process
// @access Public
exports.uploadAndProcess = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    console.log(`Processing uploaded file: ${req.file.originalname}`);

    // Process the Excel file: convert to parquet and count active rows
    const parquetFilename = await parquetServices.convertExcelToParquet(req.file.path);

    res.json({
      success: true,
      message: 'File processed successfully',
      parquetFilename: path.basename(parquetFilename)
    });
  } catch (error) {
    console.error('Processing error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @DESC : Get total aged debt by account status
// @route GET /api/v2/crpm/summary-card/:filename
// @access Public
exports.getSummaryCardData = async (req, res, next) => {
  try {
    const { filename } = req.params;
    if (!filename) {
      return res.status(400).json({
        success: false,
        error: 'Filename is required'
      });
    }

    const resultAccStat = await parquetServices.getTotalAgedDebtByAccStatus(filename);
    const resultTR = await parquetServices.getTotalTradeReceivable(filename);
    const resultBalanceType = await parquetServices.getTotalByBalanceType(filename);

    const data = {
      ...resultAccStat,
      ...resultTR,
      ...resultBalanceType
    };
    const convertedData = convertBigIntsInObject(data);

    res.json({
      success: true,
      filename,
      data: convertedData
    });
  } catch (err) {
    next(err);
  }
};

// @DESC : Get aged debt by station data
// @route GET /api/v2/parquet/debt-by-station
// @access Public
exports.getAgedDebtByStationData = async (req, res, next) => {
  try {
    const { filename } = req.params;
    const { viewType = 'agedDebt', ...filters } = req.body;

    let data;
    if (viewType === 'TR') {
      data = await parquetServices.processDebtByStationTR(filename, filters);
    } else {
      data = await parquetServices.processDebtByStationAgedDebt(filename, filters);
    }
    res.json({ success: true, filename, data });
  } catch (err) {
    next(err);
  }
};
// @DESC : Get aged debt by account class data
// @route GET /api/v2/parquet/debt-by-account-class
// @access Public
// @DESC : Get aged debt by account class data
// @route GET /api/v2/parquet/debt-by-account-class
// @access Public
exports.getAgedDebtByAccountClassData = async (req, res, next) => {
  try {
    const { filename } = req.params;
    const { viewType = 'agedDebt', ...filters } = req.body;

    let data;
    if (viewType === 'TR') {
      data = await parquetServices.processDebtByAccountClassTR(filename, filters);
    } else {
      data = await parquetServices.processDebtByAccountClassAgedDebt(filename, filters);
    }
    res.json({ success: true, filename, data });
  } catch (err) {
    next(err);
  }
};

// @DESC : Get Aged Debt Sumamry by ADID
// @route GET /api/v2/parquet/debt-by-adid/:filename
// @access Public
exports.getAgedDebtSummaryByADID = async (req, res, next) => {
  try {
    const { filename } = req.params; const { viewType = 'agedDebt', ...filters } = req.body;

    let data;
    if (viewType === 'TR') {
      data = await parquetServices.processDebtByADIDTR(filename, filters);
    } else {
      data = await parquetServices.processDebtByADIDAgedDebt(filename, filters);
    }
    res.json({ success: true, filename, data });
  } catch (err) {
    next(err);
  }
};

// @DESC : Get Aged Debt Summary by SMER Segment
// @route GET /api/v2/parquet/debt-by-smer-segment/:filename
exports.getAgedDebtSummaryBySmerSegment = async (req, res, next) => {
  try {
    const { filename } = req.params;
    const { viewType = 'agedDebt', ...filters } = req.body;

    let data;
    if (viewType === 'TR') {
      data = await parquetServices.processDebtBySmerSegmentTR(filename, filters);
    }
    else {
      data = await parquetServices.processDebtBySmerSegmentAgedDebt(filename, filters);
    }
    res.json({ success: true, filename, data });
  } catch (err) {
    next(err);
  }
}

// @DESC : Get Aged Debt Summary by Staff
// @route GET /api/v2/parquet/debt-by-staff/:filename
// @access Public
exports.getAgedDebtSummaryByStaffID = async (req, res, next) => {
  try {
    const { filename } = req.params;
    const { station, viewType = 'agedDebt' } = req.body;

    let data;
    if (viewType === 'TR') {
      data = await parquetServices.processDebtByStaffIDTR(filename, station);
    } else {
      data = await parquetServices.processDebtByStaffIDAgedDebt(filename, station);
    }

    res.json({ success: true, filename, data });
  } catch (err) {
    next(err);
  }
}

// @DESC : Get requested data from a Parquet file with pagination and sorting
// @route GET /api/v2/parquet/all-data/:filename
// @access Public
exports.getDetailedDebtTableData = async (req, res, next) => {
  try {
    const { filename } = req.params;
    const { cursor, limit, sortField, sortDirection } = req.query;
    const { viewType = "AgedDebt", ...filters } = req.body || {};

    let data;
    if (viewType === "TR") {
      data = await parquetServices.processDetailedDebtTableDataTR(
        filename,
        filters,
        { cursor, limit: limit ? parseInt(limit) : 100, sortField, sortDirection }
      );
    } else {
      data = await parquetServices.processDetailedDebtTableDataAgedDebt(
        filename,
        filters,
        { cursor, limit: limit ? parseInt(limit) : 100, sortField, sortDirection }
      );
    }

    res.json({ success: true, filename, ...data });
  } catch (err) {
    next(err);
  }
};

// @DESC : Get all data from a Parquet file (pagination JSON or streamed Excel)
// @route POST /api/v2/parquet/alldata/:filename
// @access Public
exports.getAllDataFromParquet = async (req, res) => {
  try {
    const { filename } = req.params;
    const { cursor = null, limit = 1000, sortField = "Contract Acc", sortDirection = "ASC" } = req.query;
    const filters = req.body || {};

    // If client requests server-side Excel conversion/download: stream using getAllDataFromParquet pages
    if (String(req.query.format || req.query.download || '').toLowerCase() === 'excel' || req.query.download === '1') {
      // Sanitize & prepare streaming export
      const pageSize = Math.min(parseInt(limit) || 2000, 10000); // cap page size
      const requestedSortField = String(sortField || 'Contract Acc');
      const requestedSortDirection = String(sortDirection || 'ASC').toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
      // Set response headers for streaming XLSX
      res.setHeader('Content-Type', mime.lookup('xlsx') || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="FULLDATA CRPM Aging - ${filename.replace(/\.parquet$/i, '.xlsx')}"`);

      // ExcelJS streaming workbook writer — writes directly to response
      const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({ stream: res, useSharedStrings: true, useStyles: false });
      const worksheet = workbook.addWorksheet('Full Data');

      // Columns list must match parquetService SELECT order.
      const columns = [
        "Customer Group", "Sector", "SMER Segment", "Buss Area", "Team", "BP No", "Contract Acc",
        "Contract Account Name", "ADID", "Acc Class", "Acc Status", "Govt Code", "Govt Sub Code",
        "Payment ID", "Rate Category", "Indicator", "MRU", "Premise Type", "Premise Type Description",
        "Cash Amt", "Non Cash Amt", "Total Amt", "GST/SST", "KWTBB", "ILP", "Invoice", "Miscellaneous",
        "CW Rating", "No of Months Outstandings", "Total Undue", "Cur.MthUnpaid", "1 to 30", "31 to 60",
        "61 to 90", "91 to 120", "121 to 150", "151 to 180", "181 to 210", "211 to 240", "241 to 270",
        "271 to 300", "301 to 330", "331 to 360", ">361", "TTL O/S Amt", "Total Unpaid", "DebtsExposure",
        "Debt Exposure Unpaid", "Customer Indi", "Staff ID", "Move Out Date", "MIT Date", "MIT Amt",
        "No. of IP", "Total IP Amt", "Unpaid Due IP", "Sub.to CollAg", "Coll AgentAmt", "Legal Date",
        "Legal Amt", "Last PymtDate", "Last Pymt Amt", "Original Business Area"
      ];

      // Write header row
      worksheet.addRow(columns).commit();

      // Page through data using service (cursor-based)
      let pageCursor = (cursor && cursor !== 'null') ? cursor : null;
      while (true) {
        // Use service to fetch a page respecting filters and cursor
        const page = await parquetServices.getAllDataFromParquet(
          filename,
          filters,
          {
            cursor: pageCursor,
            limit: pageSize,
            sortField: requestedSortField,
            sortDirection: requestedSortDirection
          }
        );

        const items = Array.isArray(page.items) ? page.items : [];
        for (const row of items) {
          // Map row object into ordered array corresponding to 'columns'
          const values = columns.map(key => {
            // keep null/undefined as empty cell; convert BigInt if any conversion missed
            const v = row[key];
            return v === undefined ? null : v;
          });
          worksheet.addRow(values).commit();
        }

        // handle pagination continuation
        if (!page.pagination || !page.pagination.hasMore) {
          break;
        }
        pageCursor = page.pagination.nextCursor;
        if (!pageCursor) break;
      }

      // Finalize worksheet and workbook — this will end the HTTP response
      await worksheet.commit();
      await workbook.commit();
      return; // response already streamed
    }

    // Otherwise return paginated JSON data using parquetServices.getAllDataFromParquet
    const pageLimit = limit ? parseInt(limit) : 1000;
    // IMPORTANT: forward the client-sent filters (req.body) into the parquet service
    // so pages are returned according to the UI filters.
    const data = await parquetServices.getAllDataFromParquet(
      filename,
      filters,
      {
        cursor,
        limit: pageLimit,
        sortField,
        sortDirection
      }
    );

    res.json({
      success: true,
      filename,
      items: data.items,
      pagination: data.pagination
    });
  } catch (error) {
    console.error('Get all data error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @DESC : Get Driver Tree summary for frontend
// @route POST /api/v2/crpm/driver-tree-summary/:filename
exports.getDriverTreeSummary = async (req, res, next) => {
  try {
    const { filename } = req.params;
    const result = await parquetServices.getDriverTreeSummary(filename);
    // result contains: { root, branches, mitAmount, mitNumOfAcc }
    res.json({ success: true, filename, data: result });
  } catch (err) {
    next(err);
  }
};


// @DESC : Get Directed Graph summary for frontend
// @route POST /api/v2/crpm/directed-graph-summary/:filename
exports.getDirectedGraphSummary = async (req, res, next) => {
  try {
    const { filename } = req.params;
    const data = await parquetServices.getDirectedGraphSummary(filename); // No filters
    res.json({ success: true, filename, data });
  } catch (err) {
    next(err);
  }
};

// @DESC : Download a converted Parquet file
// @route GET /api/v2/parquet/download/:filename
// @access Public
exports.downloadParquet = (req, res) => {
  const filePath = path.join(__dirname, '..', 'uploads', req.params.filename);
  res.download(filePath, err => {
    if (err) res.status(404).send('File not found');
  });
};