const excelToJson = require('convert-excel-to-json');
const fs = require('fs');
const dateUtils = require('../utils/dateUtils');


// Function to upload and process the file
exports.uploadFile = async (filePath) => {
    return new Promise((resolve, reject) => {
        const chunks = [];
        const readStream = fs.createReadStream(filePath);
        readStream.on('data', chunk => chunks.push(chunk));
        readStream.on('end', () => {
            const buffer = Buffer.concat(chunks);
            const result = excelToJson({
                source: buffer,
                header: {
                    rows: 1
                },
                columnToKey: {
                    '*': '{{columnHeader}}'
                }
            });
            resolve(result);
        });
        readStream.on('error', reject);
    });
};
