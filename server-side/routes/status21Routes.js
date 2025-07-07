const express = require('express');
const multer = require('multer');
const status21Controller = require('../controllers/status21Controller');

const status21Router = express.Router();

// Configure multer for file storage
const upload = multer({
    dest: 'uploads/', // Temporary storage directory
    limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB limit
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
status21Router.post(
    '/upload',
    upload.single('file'), // Handle single file upload
    (req, res, next) => {

        const { uploadDate } = req.body;

        if (!uploadDate) {
            return res.status(400).json({ error: { message: 'No date provided.' } });
        }

        const parsedDate = new Date(uploadDate);
        if (isNaN(parsedDate)) {
            return res.status(400).json({ error: { message: 'Invalid date format.' } });
        }

        // Attach parsed date to the request object for the controller
        req.uploadDate = parsedDate;
        next();
    },
    status21Controller.uploadFile // Pass control to the uploadFile controller
);

status21Router.get('/days-category', status21Controller.daysAndCategory);
status21Router.get('/process-file', status21Controller.processFile);

module.exports = status21Router;