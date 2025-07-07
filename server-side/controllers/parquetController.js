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

// @DESC : Count all rows from a Parquet file
// @route GET /api/v2/parquet/count-all/:filename
// @access Public
exports.countAllFromParquet =  async (req, res) => {
  try{
    const { filename } = req.params;
    const count = await parquetServices.countAllFromParquetFile(filename);
    res.json({
      success: true,
      filename,
      count: convertBigIntsInObject(count)
    });
  } catch (error) {
    console.error('Count error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// @DESC : Count active rows from a Parquet file
// @route GET /api/v2/parquet/count-active/:filename
// @access Public
exports.countActiveFromParquet = async (req, res) => {
  try {
    const { filename } = req.params;
    const { columnName = 'Acc Status', targetValue = 'Active' } = req.query;
    
    console.log(`Counting active rows from: ${filename}`);

    const activeCount = await parquetServices.countActiveFromParquetFile(
      filename,
      columnName,
      targetValue
    );
    
    res.json({
      success: true,
      filename,
      columnName,
      targetValue,
      activeCount: convertBigIntsInObject(activeCount)
    });
  } catch (error) {
    console.error('Count error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @DESC : Process debt by station data
// @route POST /api/v2/parquet/debt-by-station
// @access Public
exports.processDebtByStationData = async (req, res)=> {
  try {
    const { filename } = req.params;
    if (!filename) {
      return res.status(400).json({ 
        success: false, 
        error: 'Filename is required' 
      });
    }

    console.log(`Processing debt by station data for file: ${filename}`);

    let { station } = req.body;
    if (!station) {
      station = ""; // Default to empty string if not provided
    }

    const result = await parquetServices.processDebtByStation(filename, station);

    // Convert any BigInt values to Numbers
    const convertedResult = convertBigIntsInObject(result);
    
    res.json({
      success: true,
      message: 'Debt by station data processed successfully',
      data: convertedResult
    });
  } catch (error) {
    console.error('Processing error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

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
// @DESC : Download a converted Parquet file
// @route GET /api/v2/parquet/download/:filename
// @access Public
exports.downloadParquet = (req, res) => {
  const filePath = path.join(__dirname, '..', 'uploads', req.params.filename);
  res.download(filePath, err => {
    if (err) res.status(404).send('File not found');
  });
};