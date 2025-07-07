
const dateUtils = require('../../utils/dateUtils');

// Generic function to calculate the number of days and categorize data
exports.calculateDaysAndCategory = (data, dateColumn, type, selectedDate) => {
    // Ensure data is valid
    if (!Array.isArray(data) || data.length === 0) {
        console.warn('[WARN] No data or invalid data provided to calculateDaysAndCategory');
        return [];
    }
    
    // Ensure selectedDate is passed; fallback to current date if not provided
    selectedDate = selectedDate ? new Date(selectedDate) : dateUtils.getDate();

    return data.map(row => {
        if (!row) return null; // Skip null rows
        
        const dateStr = row[dateColumn];
        const businessArea = row['Business Area'];
        const CA = row[`Contract Account`];
        const namaKawasan = row['Business Area Name'];
        let category = null;
        
        // Skip rows without business area
        if (!businessArea) {
            return null;
        }

        if (type === 'disconnected' || type === 'revisit') {
            // Skip if date is missing or not a string
            if (!dateStr) {
                return null;
            }
            
            let parsedDate = null;
            
            // Try to parse the date in different formats
            if (typeof dateStr === 'string') {
                // Try DD.MM.YYYY format (original expected format)
                if (dateStr.includes('.')) {
                    try {
                        const [day, month, year] = dateStr.split('.').map(Number);
                        parsedDate = new Date(year, month - 1, day);
                    } catch (e) {
                        console.debug(`Error parsing date with split: ${e.message}`);
                    }
                } 
                // Try ISO format (YYYY-MM-DD)
                else if (dateStr.includes('-')) {
                    try {
                        parsedDate = new Date(dateStr);
                    } catch (e) {
                        console.debug(`Error parsing ISO date: ${e.message}`);
                    }
                } 
                // Try slash format (MM/DD/YYYY or DD/MM/YYYY)
                else if (dateStr.includes('/')) {
                    try {
                        // Assume MM/DD/YYYY first (JavaScript default)
                        parsedDate = new Date(dateStr);
                        
                        // If that gives an unreasonable date, try DD/MM/YYYY
                        if (parsedDate.getFullYear() < 2000) {
                            const [day, month, year] = dateStr.split('/').map(Number);
                            parsedDate = new Date(year, month - 1, day);
                        }
                    } catch (e) {
                        console.debug(`Error parsing slash date: ${e.message}`);
                    }
                } 
                // Try direct Date parsing as last resort
                else {
                    try {
                        parsedDate = new Date(dateStr);
                    } catch (e) {
                        console.debug(`Error with direct date parsing: ${e.message}`);
                    }
                }
            } 
            // Handle if dateStr is already a Date object
            else if (dateStr instanceof Date) {
                parsedDate = dateStr;
            } 
            
            // Skip if we couldn't parse the date
            if (!parsedDate || isNaN(parsedDate.getTime())) {
                console.debug(`Invalid date after parsing: ${dateStr}, for CA: ${CA}`);
                return null;
            }

            const timeDifference = selectedDate - parsedDate;
            const daysDifference = Math.floor(timeDifference / (1000 * 60 * 60 * 24));
            
            // Skip if the day difference calculation resulted in an invalid number
            if (isNaN(daysDifference)) {
                console.debug(`Invalid days difference for date: ${dateStr}, CA: ${CA}`);
                return null;
            }

            // Categorize based on days difference
            if (daysDifference <= 30) {
                category = '0-1Months';
            } else if (daysDifference <= 90) {
                category = '<3Months';
            } else if (daysDifference <= 180) {
                category = '<6Months';
            } else if (daysDifference <= 365) {
                category = '<12Months';
            } else if (daysDifference <= 730) {
                category = '<2Years';
            } else {
                category = '>2Years';
            }

            return {
                CA,
                daysSince: daysDifference,
                category,
                BusinessArea: String(businessArea),
                'Business Area Name': namaKawasan,
            };
        } else if (type === 'belumrevisit') {
            // For belumrevisit, this will be calculated in the controller
            return {
                category: 'Belum Revisit',
                BusinessArea: String(businessArea),
                'Business Area Name': namaKawasan,
            };
        }

        return null; // Default case
    }).filter(row => row !== null); // Filter out null rows
};

// Function to sort data by Business Area
exports.sortByBusinessArea = (data) => {
    const categories = ['0-1Months', '<3Months', '<6Months', '<12Months', '<2Years', '>2Years'];
    const BACount = {};

    // Initialize the structure for each business area
    data.forEach(row => {
        const businessArea = String(row['BusinessArea']);
        const category = row['category'];
        const namaKawasan = row['Business Area Name'];

        // Skip rows without a business area or category
        if (!businessArea || !category) return;
        
        // Initialize the business area entry if it doesn't exist
        if (!BACount[businessArea]) {
            BACount[businessArea] = { total: 0 };
            categories.forEach(cat => (BACount[businessArea][cat] = 0));
        }

        // Increment the total and the specific category count
        BACount[businessArea].total++;
        BACount[businessArea][category]++;
        BACount[businessArea]['Business Area Name'] = namaKawasan;

    });

    return BACount;
};

