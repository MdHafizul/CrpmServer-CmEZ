// Helper function to determine file type and use appropriate reader
function getFileReader(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const normalizedPath = path.resolve(filePath).replace(/\\/g, '/');
    
    if (ext === '.parquet') {
        return `read_parquet('${normalizedPath}')`;
    } else if (['.xlsx', '.xlsm', '.xltx', '.xltm'].includes(ext)) {
        return `st_read('${normalizedPath}', open_options=['read_only=true'], sequential_layer_scan=true)`;
    } else {
        throw new Error(`Unsupported file format: ${ext}`);
    }
}

// Helper function to convert BigInt to Number
function convertBigIntToNumber(value) {
    if (typeof value === 'bigint') {
        return Number(value);
    }
    return value;
}

// Helper function to convert BigInt values in objects
function convertBigIntsInObject(obj) {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'bigint') {
    return Number(obj);
  }
  
  if (typeof obj === 'object') {
    const converted = {};
    for (const [key, value] of Object.entries(obj)) {
      converted[key] = convertBigIntsInObject(value);
    }
    return converted;
  }
  
  return obj;
}

module.exports = {
    convertBigIntToNumber,
    getFileReader,
    convertBigIntsInObject
};  