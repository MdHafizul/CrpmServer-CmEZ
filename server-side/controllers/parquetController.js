const path = require('path');
const fs = require('fs');
const parquetServices = require('../services/DebtAging/parquet');
const { convertBigIntsInObject } = require('../utils/parquetHelper');

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
    const result = await parquetServices.convertExcelToParquet(req.file.path);

    // Convert any BigInt values to Numbers
    const convertedResult = convertBigIntsInObject(result);

    res.json({
      success: true,
      message: 'File processed successfully',
      originalFileName: req.file.originalname,
      activeCount: convertedResult.activeCount,
      parquetFilename: convertedResult.parquetFilename,
      downloadUrl: `/api/v2/parquet/download/${convertedResult.parquetFilename}`
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

// @DESC : Get all data from a Parquet file
// @route GET /api/v2/parquet/all-data/:filename
// @access Public
exports.getAllDataFromParquet = async (req, res) => {
  try {
    const { filename } = req.params;
    const { cursor, limit, sortField, sortDirection } = req.query;

    const data = await parquetServices.getAllDataFromParquet(filename, {
      cursor,
      limit: limit ? parseInt(limit) : undefined,
      sortField,
      sortDirection
    });

    // Convert BigInt values before sending response
    const convertedData = convertBigIntsInObject(data);

    res.json({
      success: true,
      filename,
      ...convertedData
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