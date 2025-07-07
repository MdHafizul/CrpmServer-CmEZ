//Generic Function to process, count and sum data for summary cards
exports.summaryCards = (data) => {
    //create a variable for summary cards
    if (!Array.isArray(data) || data.length === 0) {
        return {
            bilAkaun: 0,
            totalUnpaid: 0,
            totalPayment: 0,
            balanceToCollect: 0
        };
    }

    const summary = data.reduce((acc, row) => {
        // Increment account count
        acc.bilAkaun += 1;

        // Get the unpaid value - using the field from your sample data
        const unpaidField = Object.keys(row).find(key => key.includes('Total Unpaid'));
        const unpaidValue = Number(row[unpaidField] || 0);
        acc.totalUnpaid += unpaidValue;

        // Get the payment value
        const paymentValue = Number(row['Total Payment'] || 0);
        acc.totalPayment += paymentValue;

        // Get balance 
        acc.balanceToCollect = acc.totalUnpaid - acc.totalPayment;

        return acc;
    }, {
        bilAkaun: 0,
        totalUnpaid: 0,
        totalPayment: 0,
        balanceToCollect: 0
    });

    return summary;
}

//Generic function to process, count and sum data for summary table
exports.summaryTable = (data) => {
    if (!Array.isArray(data) || data.length === 0) {
        return [];
    }

    const categories = {};

    data.forEach(row => {
        const category = row['Team'];
        const payment = Number(row['Total Payment'] || 0);
        const unpaidField = Object.keys(row).find(key => key.includes('Total Unpaid'));
        const unpaidValue = Number(row[unpaidField] || 0);

        // Initialize category if first encounter
        if (!categories[category]) {
            categories[category] = {
                kategori: category,
                bilAkaun: 0,
                bilAkaunBuatBayaran: 0,
                totalUnpaid: 0,
                totalPayment: 0,
                balanceToCollect: 0
            };
        }

        //update count and sum
        categories[category].bilAkaun += 1;
        if (payment > 0) {
            categories[category].bilAkaunBuatBayaran += 1;
        }

        categories[category].totalUnpaid += unpaidValue;
        categories[category].totalPayment += payment;
    });

    Object.values(categories).forEach(category => {
        category.balanceToCollect = category.totalUnpaid - category.totalPayment;
    });

    // Convert to array for easier consumption
    const result = Object.values(categories);

    // Add JUMLAH row (total)
    if (result.length > 0) {
        const total = {
            kategori: 'JUMLAH', // Changed from jumlah: to kategori: for consistency
            bilAkaun: 0,
            bilAkaunBuatBayaran: 0,
            totalUnpaid: 0,
            totalPayment: 0,
            balanceToCollect: 0
        };

        // Calculate totals
        result.forEach(ba => {
            total.bilAkaun += ba.bilAkaun;
            total.bilAkaunBuatBayaran += ba.bilAkaunBuatBayaran;
            total.totalUnpaid += ba.totalUnpaid;
            total.totalPayment += ba.totalPayment;
        });

        // Calculate derived totals
        total.balanceToCollect = total.totalUnpaid - total.totalPayment;

        // Add the total row to the results array
        result.push(total);
    }
    return result;
};

//Generic function to sort data by BA for sorted table 
exports.sortedTable = (data, filter = 'ALL') => {
    if (!Array.isArray(data) || data.length === 0) {
        return [];
    }

    // Filter data by category (Team) if needed
    const filteredData = filter === 'ALL'
        ? data
        : data.filter(row => row['Team'] === filter);

    // Group data by Business Area
    const businessAreas = {};

    filteredData.forEach(row => {
        const businessArea = row['Buss Area'] || 'Unknown';
        const payment = Number(row['Total Payment'] || 0);
        const unpaidField = Object.keys(row).find(key => key.includes('Total Unpaid'));
        const unpaidValue = Number(row[unpaidField] || 0);

        // Initialize business area if first encounter
        if (!businessAreas[businessArea]) {
            businessAreas[businessArea] = {
                businessArea: businessArea,
                bilAkaun: 0,
                bilAkaunBuatBayaran: 0,
                totalUnpaid: 0,
                totalPayment: 0,
                balanceToCollect: 0,
                percentCollection: 0
            };
        }

        // Update counts and sums
        businessAreas[businessArea].bilAkaun += 1;
        if (payment > 0) {
            businessAreas[businessArea].bilAkaunBuatBayaran += 1;
        }

        businessAreas[businessArea].totalUnpaid += unpaidValue;
        businessAreas[businessArea].totalPayment += payment;
    });

    // Calculate derived values for each business area
    Object.values(businessAreas).forEach(ba => {
        ba.balanceToCollect = ba.totalUnpaid - ba.totalPayment;

        // Calculate percentage collection (avoid division by zero)
        if (ba.totalUnpaid > 0) {
            ba.percentCollection = Math.round((ba.totalPayment / ba.totalUnpaid) * 100);
        } else {
            ba.percentCollection = 0;
        }
    });

    // Sort by percentCollection in descending order (higher percentage first)
    const result = Object.values(businessAreas).sort((a, b) =>
        b.percentCollection - a.percentCollection
    );

    // Add JUMLAH row (total)
    if (result.length > 0) {
        const total = {
            businessArea: 'JUMLAH',
            bilAkaun: 0,
            bilAkaunBuatBayaran: 0,
            totalUnpaid: 0,
            totalPayment: 0,
            balanceToCollect: 0,
            percentCollection: 0
        };

        // Calculate totals
        result.forEach(ba => {
            total.bilAkaun += ba.bilAkaun;
            total.bilAkaunBuatBayaran += ba.bilAkaunBuatBayaran;
            total.totalUnpaid += ba.totalUnpaid;
            total.totalPayment += ba.totalPayment;
        });

        // Calculate derived totals
        total.balanceToCollect = total.totalUnpaid - total.totalPayment;
        if (total.totalUnpaid > 0) {
            total.percentCollection = Math.round((total.totalPayment / total.totalUnpaid) * 100);
        }

        result.push(total);
    }

    return result;
};

//Genereic function to return for detailed table
exports.detailedTable = (data, teamFilter = 'ALL', businessAreaFilter = 'ALL') => {
    if (!Array.isArray(data) || data.length === 0) {
        return [];
    }

    // If both filters are 'ALL', return all data
    if (teamFilter === 'ALL' && businessAreaFilter === 'ALL') {
        return data;
    }

    const dataMap = new Map();

    data.forEach((row) => {
        const team = row['Team'] || 'ALL';
        const businessArea = row['Buss Area'] || 'ALL';
        const key = `${team}-${businessArea}`;

        if (!dataMap.has(key)) {
            dataMap.set(key, []);
        }
        dataMap.get(key).push(row);
    });

    // If only one filter is 'ALL', match the other filter
    if (teamFilter === 'ALL') {
        const filteredData = [];
        dataMap.forEach((rows, key) => {
            if (key.endsWith(`-${businessAreaFilter}`)) {
                filteredData.push(...rows);
            }
        });
        return filteredData;
    }

    if (businessAreaFilter === 'ALL') {
        const filteredData = [];
        dataMap.forEach((rows, key) => {
            if (key.startsWith(`${teamFilter}-`)) {
                filteredData.push(...rows);
            }
        });
        return filteredData;
    }

    // If both filters are specific, return the filtered data
    const key = `${teamFilter}-${businessAreaFilter}`;
    return dataMap.get(key) || [];
};