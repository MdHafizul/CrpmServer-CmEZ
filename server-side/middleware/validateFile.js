const ErrorResponse = require('../utils/errorResponse');

const allowedMimeTypes = process.env.ALLOWED_MIME_TYPES?.split(',') || [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
];

module.exports = (req, res, next) => {
    try {
        if (!req.file) {
            throw new ErrorResponse('No file uploaded.', 400, 'NO_FILE');
        }

        if (!allowedMimeTypes.includes(req.file.mimetype)) {
            throw new ErrorResponse(
                'Invalid file type. Only Excel files are allowed.',
                400,
                'INVALID_FILE_TYPE',
                { allowedMimeTypes }
            );
        }

        next();
    } catch (error) {
        next(error); // Pass the error to the error handler
    }
};