const fs = require('fs');
const fileProcessor = require('../services/fileProcessor');
const lpcProcessor = require('../services/statusLPC/lpcProcessor');
const ErrorResponse = require('../utils/errorResponse');
const cache = require('../utils/cache');


// @DESC : Upload the file and convert it to JSON
// @route POST /api/v2/statusLPC/upload
// @access Public
// @Request: file(xlsx)
exports.uploadFile = async (req, res, next) => {
    try {
        if (!req.file) {
            return next(new ErrorResponse('No file uploaded', 400));
        }

        // Convert the uploaded file to JSON
        const result = await fileProcessor.uploadFile(req.file.path);

        // Remove the uploaded file after processing
        await fs.promises.unlink(req.file.path);

        // Get the first sheet name dynamically
        const sheetNames = Object.keys(result);
        const firstSheetName = sheetNames[0];
        const data = result[firstSheetName];
        // Store the result and data
        cache.set('statusLPCData', result);
        cache.set('results', data, 1200);


        res.status(200).json({
            success: true,
            message: 'File uploaded and processed successfully',
            data: data
        });
    } catch (error) {
        return next(new ErrorResponse('Server Error: ' + error.message, 500));
    }
}

// @DESC : Process and sort the data for summaryCards
// @route GET /api/v2/statusLPC/summaryCards
// @access Public

exports.processAndSortSummaryCards = async (req, res, next) => {
    try {
        const uploadedData = cache.get('statusLPCData');

        if (!uploadedData) {
            return next(new ErrorResponse('No data found. Please upload a file first.', 404));
        }
        const sheetNames = Object.keys(uploadedData);
        const firstSheetName = sheetNames[0];
        const data = uploadedData[firstSheetName] || [];

        const processedData = lpcProcessor.summaryCards(data);

        // Send the processed summary data
        res.status(200).json({
            success: true,
            message: 'Data processed successfully',
            data: processedData
        });
    } catch (error) {
        return next(new ErrorResponse('Server Error: ' + error.message, 500));
    }
};

// @DESC : Process and sort the data for summaryTable
// @route GET /api/v2/statusLPC/summaryTable
// @access Public

exports.processAndSortSummaryTable = async (req, res, next) => {
    try {
        const uploadedData = cache.get('statusLPCData');

        if (!uploadedData) {
            return next(new ErrorResponse('No data found. Please upload a file first.', 404));
        }

        const sheetNames = Object.keys(uploadedData);
        const firstSheetName = sheetNames[0];
        const data = uploadedData[firstSheetName] || [];
        const processedData = lpcProcessor.summaryTable(data);

        // Send the processed summary data
        res.status(200).json({
            success: true,
            message: 'Data processed successfully',
            data: processedData
        });

    } catch (error) {
        return next(new ErrorResponse('Server Error: ' + error.message, 500));
    }
}

// @DESC : Process and sort the data for sortedTable
// @route POST /api/v2/statusLPC/sortedTable
// @access Public

exports.processAndSortSortedTable = async (req, res, next) => {
    try {
        const uploadedData = cache.get('statusLPCData');

        if (!uploadedData) {
            return next(new ErrorResponse('No data found. Please upload a file first.', 404));
        }

        // Ensure the data is passed as an array
        const sheetNames = Object.keys(uploadedData);
        const firstSheetName = sheetNames[0];
        const data = uploadedData[firstSheetName] || [];

        // Get the filter from the request body
        const { filter = 'ALL' } = req.body;

        // Process the data with the filter
        const processedData = lpcProcessor.sortedTable(data, filter);

        // Send the processed summary data
        res.status(200).json({
            success: true,
            message: 'Data processed successfully',
            data: processedData
        });
    } catch (error) {
        return next(new ErrorResponse('Server Error: ' + error.message, 500));
    }
};

// @DESC : Process and filter the data for detailedTable
// @route POST /api/v2/statusLPC/detailedTable
// @access Public

exports.processAndFilterDetailedTable = async (req, res, next) => {
    try {
        const uploadedData = cache.get('statusLPCData');

        if (!uploadedData) {
            return next(new ErrorResponse('No data found. Please upload a file first.', 404));
        }

        // Ensure the data is passed as an array
        const sheetNames = Object.keys(uploadedData);
        const firstSheetName = sheetNames[0];
        const data = uploadedData[firstSheetName] || [];

        // Get the filter from the request body
        const { teamFilter = 'ALL', businessAreaFilter = 'ALL' } = req.body;

        // Process the data with the filter
        const processedData = lpcProcessor.detailedTable(data, teamFilter, businessAreaFilter);

        // Send the processed summary data
        res.status(200).json({
            success: true,
            message: 'Data processed successfully',
            data: processedData
        });
    } catch (error) {
        return next(new ErrorResponse('Server Error: ' + error.message, 500));
    }
}