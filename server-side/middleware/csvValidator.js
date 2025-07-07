const fs = require('fs');
const path = require('path');

module.exports = (req, res, next) => {
    const fileId = req.params.fileId;
    const filePath = path.join(__dirname, '..', 'data', 'uploads', `${fileId}.csv`);
    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            return res.status(404).json({ error: 'File not found' });
        }
        req.csvFilePath = filePath;
        next();
    });
};