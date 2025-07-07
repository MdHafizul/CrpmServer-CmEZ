const cache = require('./cache'); // Import the shared cache instance

exports.getDate = () => {
    const uploadedData = cache.get('status21Data');
    if (!uploadedData) {
        console.warn('[WARN] No uploadedData found in cache. Returning default date.');
        const defaultDate = new Date();
        console.log(`Using default date: ${defaultDate.toISOString()}`);
        return defaultDate; // Fallback to the current date
    }
    
    const selectedDate = uploadedData.selectedDate;
    if (!selectedDate) {
        console.warn('[WARN] No selectedDate found in uploadedData. Returning default date.');
        const defaultDate = new Date();
        console.log(`Using default date: ${defaultDate.toISOString()}`);
        return defaultDate; // Fallback to the current date
    }

    try {
        const parsedDate = new Date(selectedDate);
        if (isNaN(parsedDate)) {
            throw new Error(`Invalid date format: ${selectedDate}`);
        }
        console.log(`Using cached date: ${parsedDate.toISOString()} (from: ${selectedDate})`);
        return parsedDate;
    } catch (error) {
        console.error(`[ERROR] Failed to parse date: ${error.message}`);
        console.log(`Falling back to current date`);
        return new Date();
    }
};