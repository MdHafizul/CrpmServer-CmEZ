const express = require('express');
const multer = require('multer');
const dataController = require('../controllers/parquetController');

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 900 * 1024 * 1024 } // 900MB limit
});

const router = express.Router();

// Process Excel → Parquet → Count
router.post('/process', upload.single('file'), dataController.uploadAndProcess);
// Return Summary Card Data
router.get('/summary-card/:filename', dataController.getSummaryCardData);
// Process debt by station
router.post('/debt-by-station/:filename', dataController.getAgedDebtByStationData);
// Process debt by account class
router.post('/debt-by-account-class/:filename', dataController.getAgedDebtByAccountClassData);
// Process debt by ADID
router.post('/debt-by-adid/:filename', dataController.getAgedDebtSummaryByADID);
// Process debt by staffID
router.post('/debt-by-staff/:filename', dataController.getAgedDebtSummaryByStaffID);
// Process debt by SMER Segment
router.post('/debt-by-smer-segment/:filename', dataController.getAgedDebtSummaryBySmerSegment);
// Process debt detailed table - partial
router.get('/detailed-table/:filename', dataController.getDetailedDebtTableData);



// Get all data from Parquet file
router.get('/all-data/:filename', dataController.getAllDataFromParquet);
// Download converted Parquet
router.get('/download/:filename', dataController.downloadParquet);

module.exports = router;