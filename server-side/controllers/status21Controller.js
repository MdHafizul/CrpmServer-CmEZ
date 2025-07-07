const fs = require('fs');
const fileProcessor = require('../services/fileProcessor');
const dataProcessor = require('../services/Status21/dataProcessor');
const NodeCache = require('node-cache');
const ErrorResponse = require('../utils/errorResponse');
const cache = require('../utils/cache');

// DESC: Upload the file and convert it to JSON
// ACCESS: Public
// @route POST /api/v2/status21/upload
// METHOD: POST
// REQUEST: File
// RESPONSE: JSON
exports.uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: { message: 'No file uploaded.' } });
        }

        const uploadDate = req.uploadDate;
        console.time('File Processing Time');

        const result = await fileProcessor.uploadFile(req.file.path);

        // Remove the uploaded file after processing
        await fs.promises.unlink(req.file.path);

        // Store the result and selected date in cache
        cache.set('status21Data', { ...result, selectedDate: uploadDate.toISOString() });

        // Get the first sheet name dynamically
        const sheetNames = Object.keys(result);
        const firstSheetName = sheetNames[0];
        const data = result[firstSheetName];
        
        // Clear any previously cached results when new data is uploaded
        cache.del('disconnected_results');
        cache.del('revisit_results');
        cache.del('belumrevisit_results');

        return res.status(200).json({
            success: true,
            message: 'File uploaded and processed successfully',
            data: data,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};


// @DESC: Retrieve the days and category for  revisit ,belum revisit and disconnect dates
// @route GET /api/v2/status21/daysAndCategory
// @ACCESS: Public
exports.daysAndCategory = (req, res, next) => {
    try {
        const uploadedData = cache.get('status21Data');

        if (!uploadedData) {
            throw new ErrorResponse('No data available.', 400, 'NO_DATA');
        }

        const { type } = req.query;

        if (!type || !['revisit', 'disconnected', 'belumrevisit'].includes(type)) {
            throw new ErrorResponse(
                'Invalid or missing "type" query parameter. Must be "disconnected", "revisit", or "belumrevisit".',
                400,
                'INVALID_TYPE'
            );
        }


        // Check cache first
        const cacheKey = `${type}_results`;
        const cachedResult = cache.get(cacheKey);
        if (cachedResult) {
            return res.json(cachedResult);
        }
        const sheetNames = Object.keys(uploadedData).filter(name => name !== 'selectedDate');
        const firstSheetName = sheetNames[0];
        const data = uploadedData[firstSheetName];
        let result;

        if (type === 'belumrevisit') {
            // Calculate "disconnected" and "revisit" counts
            const disconnectedData = dataProcessor.calculateDaysAndCategory(data, 'Disconnected Date', 'disconnected');

            // For revisit, filter data first but still use Disconnected Date for categorizing
            const revisitData = dataProcessor.calculateDaysAndCategory(
                data.filter(row => row['Latest Revisit Date']),
                'Disconnected Date',
                'revisit'
            );

            // Sort by Business Area for both datasets
            const disconnectedBACount = dataProcessor.sortByBusinessArea(disconnectedData);
            const revisitBACount = dataProcessor.sortByBusinessArea(revisitData);

            // Calculate "belumrevisit" by subtracting revisit counts from disconnected counts
            const belumRevisitBACount = {};
            for (const ba in disconnectedBACount) {
                if (!belumRevisitBACount[ba]) {
                    belumRevisitBACount[ba] = { total: 0 };
                }

                // Subtract category counts
                for (const category in disconnectedBACount[ba]) {
                    if (category === 'total') {
                        belumRevisitBACount[ba].total =
                            Math.max(0, (disconnectedBACount[ba].total || 0) - (revisitBACount[ba]?.total || 0));
                    } else {
                        belumRevisitBACount[ba][category] =
                            Math.max(0, (disconnectedBACount[ba][category] || 0) - (revisitBACount[ba]?.[category] || 0));
                    }
                }
            }

            result = {
                type: 'belumrevisit',
                BACount: belumRevisitBACount
            };
        }

        // For "disconnected" or "revisit" types
        if (type === 'revisit') {
            // Filter to only include rows with revisit dates, but categorize by Disconnected Date
            const filteredData = data.filter(row => row['Latest Revisit Date']);
            const daysProcessedAndCategory = dataProcessor.calculateDaysAndCategory(filteredData, 'Disconnected Date', type);

            result = {
                type,
                daysProcessedAndCategory,
            };
        } else {
            // For disconnected, process normally using Disconnected Date
            const daysProcessedAndCategory = dataProcessor.calculateDaysAndCategory(data, 'Disconnected Date', type);

            result = {
                type,
                daysProcessedAndCategory,
            };
        }

        // Cache the result
        cache.set(cacheKey, result, 1200); // Cache for 20 minutes

        res.json(result);
    } catch (error) {
        next(error); // Pass the error to the error handler
    }
};


// @DESC: Process the uploaded file and return the number of days and category and sorted by BA
// @route GET api/v2/status21/process-file
// @ACCESS: Public
exports.processFile = (req, res, next) => {
    try {
        const uploadedData = cache.get('status21Data');

        if (!uploadedData) {
            throw new ErrorResponse('No data available.', 400, 'NO_DATA');
        }

        const type = req.headers['x-data-type'];
        if (!type || !['disconnected', 'revisit', 'belumrevisit'].includes(type)) {
            throw new ErrorResponse(
                'Invalid or missing "x-data-type" header. Must be "disconnected", "revisit", or "belumrevisit".',
                400,
                'INVALID_HEADER'
            );
        }

        // Check cache first
        const cacheKey = `${type}_results`;
        const cachedResult = cache.get(cacheKey);

        if (cachedResult) {
            return res.json(cachedResult);
        }

        const sheetNames = Object.keys(uploadedData).filter(name => name !== 'selectedDate');
        const firstSheetName = sheetNames[0];
        const data = uploadedData[firstSheetName];
        let result;

        // Process data based on type and cache the results
        if (type === 'belumrevisit') {
            // Calculate all disconnected accounts
            const disconnectedData = dataProcessor.calculateDaysAndCategory(data, 'Disconnected Date', 'disconnected');

            // Calculate accounts that have been revisited
            const revisitData = dataProcessor.calculateDaysAndCategory(
                data.filter(row => row['Latest Revisit Date']),
                'Disconnected Date',
                'revisit'
            );

            const disconnectedBACount = dataProcessor.sortByBusinessArea(disconnectedData);
            const revisitBACount = dataProcessor.sortByBusinessArea(revisitData);

            // Calculate belum revisit by subtracting revisited accounts from all disconnected accounts
            const belumRevisitBACount = {};
            for (const ba in disconnectedBACount) {
                if (!belumRevisitBACount[ba]) {
                    // Initialize with same structure as disconnectedBACount
                    belumRevisitBACount[ba] = { total: 0 };

                    // Include the Business Area Name
                    belumRevisitBACount[ba]['Business Area Name'] = disconnectedBACount[ba]['Business Area Name'] || '';

                    // Initialize all categories with 0
                    for (const category in disconnectedBACount[ba]) {
                        if (category !== 'Business Area Name') {
                            belumRevisitBACount[ba][category] = 0;
                        }
                    }
                }

                // Now subtract for each category
                for (const category in disconnectedBACount[ba]) {
                    if (category !== 'Business Area Name') {
                        // Get the disconnected count or 0 if not found
                        const disconnectedCount = disconnectedBACount[ba][category] || 0;

                        // Get the revisit count or 0 if not found
                        const revisitCount = revisitBACount[ba] ? (revisitBACount[ba][category] || 0) : 0;

                        // Subtract and ensure it's not negative
                        belumRevisitBACount[ba][category] = Math.max(0, disconnectedCount - revisitCount);
                    }
                }
            }

            result = {
                type: 'belumrevisit',
                BACount: belumRevisitBACount
            };
        } else if (type === 'revisit') {
            // Filter for rows with revisit dates but categorize using disconnected date
            const filteredData = data.filter(row => row['Latest Revisit Date']);
            const daysProcessedAndCategory = dataProcessor.calculateDaysAndCategory(filteredData, 'Disconnected Date', type);
            const areaSorted = dataProcessor.sortByBusinessArea(daysProcessedAndCategory);

            result = {
                type,
                BACount: areaSorted
            };
        } else {
            // For disconnected, continue using the same approach
            const daysProcessedAndCategory = dataProcessor.calculateDaysAndCategory(data, 'Disconnected Date', type);
            const areaSorted = dataProcessor.sortByBusinessArea(daysProcessedAndCategory);

            result = {
                type,
                BACount: areaSorted
            };
        }

        // Cache the result
        cache.set(cacheKey, result, 1200); // Cache for 20 minutes

        res.json(result);
    } catch (error) {
        next(error);
    }
};