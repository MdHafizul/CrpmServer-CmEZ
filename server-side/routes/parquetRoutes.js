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
// Count all rows from Parquet file
router.get('/count-all/:filename', dataController.countAllFromParquet);
// Count active rows from already converted parquet file
router.get('/count-active/:filename', dataController.countActiveFromParquet);
// Process debt by station
router.get('/debt-by-station/:filename', dataController.processDebtByStationData);
// Get all data from Parquet file
router.get('/all-data/:filename', dataController.getAllDataFromParquet);



// Download converted Parquet
router.get('/download/:filename', dataController.downloadParquet);

module.exports = router;