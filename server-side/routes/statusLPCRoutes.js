const express = require('express');
const multer = require('multer');
const statusLPCController = require('../controllers/statusLPCController');

const statusLPCRouter = express.Router();

// Configure multer for file storage
const upload = multer({
    dest: 'uploads/', // Temporary storage directory
    limits: { fileSize: 900 * 1024 * 1024 }, // 900 MB limit
    fileFilter: (req, file, cb) => {
        if (
            file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
            file.mimetype === 'application/vnd.ms-excel'
        ) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only Excel files are allowed.'));
        }
    }
});

// Define routes
statusLPCRouter.post(
    '/upload',
    upload.single('file'), // Handle single file upload
    statusLPCController.uploadFile
);
statusLPCRouter.get('/summaryCards', statusLPCController.processAndSortSummaryCards);
statusLPCRouter.get('/summaryTable', statusLPCController.processAndSortSummaryTable);
statusLPCRouter.post('/sortedTable', statusLPCController.processAndSortSortedTable);
statusLPCRouter.post('/detailedTable', statusLPCController.processAndFilterDetailedTable); 

module.exports = statusLPCRouter;