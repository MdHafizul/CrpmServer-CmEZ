const { findCategoryByName } = require('../../utils/categoryHelper');

//Generic function to categorize data based on the contract account name
// and add a category field to each row
exports.processAndSortByCategory = (data) => {
    return data.map(row => {
        const kategori = findCategoryByName(row['Contract Account Name']);
        return {
            'Customer Group': row['Customer Group'],
            'Sector': row['Sector'],
            'SMER Segment': row['SMER Segment'],
            'Business Area': row['Buss Area'],
            'Contract Account': row['Contract Acc'],
            'Contract Account Name': row['Contract Account Name'],
            'ADID': row['ADID'],
            'Acc Class': row['Acc Class'],
            'Acc Status': row['Acc Status'],
            'Status Pukal': row['Status Pukal'],
            'No of Months Outstanding': row['No of Months Outstandings'],
            'Cur.MthUnpaid': row['Cur.MthUnpaid'],
            'TTL O/S AMT': row['TTL O/S Amt'],
            'Total Unpaid': row['Total Unpaid'],
            'Move Out Date': row['Move Out Date'],
            'Category': kategori,
        };
    })
}

// Generic function to calculate, sort data for summary table
exports.summaryTable = (data) => {
    // Group and sum using reduce
    const summary = data.reduce((acc, row) => {
        const category = row['Category'];
        const jumlahTunggakan = parseFloat(row['TTL O/S AMT']) || 0;
        if (!category) return acc;
        if (!acc[category]) {
            acc[category] = { count: 0, total: 0 };
        }
        acc[category].count += 1;
        acc[category].total += jumlahTunggakan;
        return acc;
    }, {});

    // Convert to array and sort descending by JumlahTunggakan
    const result = Object.entries(summary)
        .map(([Category, stats]) => ({
            Category,
            BilAkaun: stats.count,
            JumlahTunggakan: Number(stats.total.toFixed(2)),
        }))
        .sort((a, b) => b.JumlahTunggakan - a.JumlahTunggakan);

    // Calculate totals
    const totalBilAkaun = result.reduce((sum, row) => sum + row.BilAkaun, 0);
    const totalJumlahTunggakan = result.reduce((sum, row) => sum + row.JumlahTunggakan, 0);

    // Add total row
    result.push({
        Category: 'JUMLAH',
        BilAkaun: totalBilAkaun,
        JumlahTunggakan: Number(totalJumlahTunggakan.toFixed(2)),
    });

    return result;
}
//Generic function to calculate sort for AgensiSummarisedTable

exports.agensiSummarisedTable = (data, filters) => {
    const { category = 'ALL', AccClass = 'ALL', AccStatus = 'ALL', ADID = 'ALL', StatusPukal = 'ALL' } = filters;

    // Filter the data based on the filters
    const filteredData = data.filter(row => {
        if (category !== 'ALL' && row['Category'] !== category) return false;
        if (AccClass !== 'ALL' && row['Acc Class'] !== AccClass) return false;
        if (AccStatus !== 'ALL' && row['Acc Status'] !== AccStatus) return false;
        if (ADID !== 'ALL' && row['ADID'] !== ADID) return false;
        if (StatusPukal !== 'ALL' && row['Status Pukal'] !== StatusPukal) return false;
        return true;
    });

    // Group by only 'Business Area'
    const groupedData = {};
    filteredData.forEach(row => {
        const groupKey = row['Business Area'];
        if (!groupedData[groupKey]) {
            groupedData[groupKey] = {
                'Buss Area': row['Business Area'],
                'Acc Status': new Set(),
                'Acc Class': new Set(),
                'Status Pukal': new Set(),
                'ADID': new Set(),
                'Bil Akaun': 0,
                'TTL O/S AMT': 0,
                'Total Unpaid': 0
            };
        }
        groupedData[groupKey]['Acc Status'].add(row['Acc Status']);
        groupedData[groupKey]['Acc Class'].add(row['Acc Class']);
        groupedData[groupKey]['Status Pukal'].add(row['Status Pukal']);
        groupedData[groupKey]['ADID'].add(row['ADID']);
        groupedData[groupKey]['Bil Akaun'] += 1;
        groupedData[groupKey]['TTL O/S AMT'] += Number(row['TTL O/S AMT']) || 0;
        groupedData[groupKey]['Total Unpaid'] += Number(row['Total Unpaid']) || 0;
    });

    // Convert sets to arrays or strings
    const result = Object.values(groupedData).map(group => {
        const formatField = (set) => {
            const arr = Array.from(set);
            return arr.length === 1 ? arr[0] : arr;
        };
        return {
            'Buss Area': group['Buss Area'],
            'Acc Status': formatField(group['Acc Status']),
            'Acc Class': formatField(group['Acc Class']),
            'Status Pukal': formatField(group['Status Pukal']),
            'ADID': formatField(group['ADID']),
            'Bil Akaun': group['Bil Akaun'],
            'TTL O/S AMT': Number(group['TTL O/S AMT'].toFixed(2)),
            'Total Unpaid': Number(group['Total Unpaid'].toFixed(2))
        };
    });

    const totalBilAkaun = result.reduce((sum, row) => sum + row['Bil Akaun'], 0);
    const totalTTL = result.reduce((sum, row) => sum + row['TTL O/S AMT'], 0);
    const totalUnpaid = result.reduce((sum, row) => sum + row['Total Unpaid'], 0);

    result.push({
        'Buss Area': 'JUMLAH',
        'Acc Status': '',
        'Acc Class': '',
        'Status Pukal': '',
        'ADID': '',
        'Bil Akaun': totalBilAkaun,
        'TTL O/S AMT': Number(totalTTL.toFixed(2)),
        'Total Unpaid': Number(totalUnpaid.toFixed(2))
    })
    return result;
}
//Generic function to display detailed table

exports.detailedTable = (data, filters) => {

    //default filter    
    const { category = 'ALL', AccStatus = 'ALL', AccClass = 'ALL', ADID = 'ALL', StatusPukal = 'ALL' } = filters;

    //filter data based on its filter
    const filteredData = data.filter(row => {
        if (category !== 'ALL' && row['Category'] !== category) return false;
        if (AccStatus !== 'ALL' && row['Acc Status'] !== AccStatus) return false;
        if (AccClass !== 'ALL' && row['Acc Class'] !== AccClass) return false;
        if (ADID !== 'ALL' && row['ADID'] !== ADID) return false;
        if (StatusPukal !== 'ALL' && row['Status Pukal'] !== StatusPukal) return false;
        return true;
    });

    const mapped = filteredData.map(row => ({
        'Customer Group': row['Customer Group'],
        'Sector': row['Sector'],
        'SMER Segment': row['SMER Segment'],
        'Business Area': row['Business Area'],
        'Contract Account': row['Contract Account'],
        'Contract Account Name': row['Contract Account Name'],
        'ADID': row['ADID'],
        'Acc Class': row['Acc Class'],
        'Acc Status': row['Acc Status'],
        'Status Pukal': row['Status Pukal'],
        'No of Months Outstanding': row['No of Months Outstanding'],
        'Current Month Unpaid': Number(row['Cur.MthUnpaid']) || 0,
        'TTL O/S AMT': Number(row['TTL O/S AMT']) || 0,
        'Total Unpaid': Number(row['Total Unpaid']) || 0,
        'Move Out Date': row['Move Out Date'],
    }));

    // Calculate totals
    const totalCurrentMonthUnpaid = mapped.reduce((sum, row) => sum + (row['Current Month Unpaid'] || 0), 0);
    const totalTTL = mapped.reduce((sum, row) => sum + (row['TTL O/S AMT'] || 0), 0);
    const totalUnpaid = mapped.reduce((sum, row) => sum + (row['Total Unpaid'] || 0), 0);

    // Add total row
    mapped.push({
        'Customer Group': 'JUMLAH',
        'Sector': '',
        'SMER Segment': '',
        'Business Area': '',
        'Contract Account': '',
        'Contract Account Name': '',
        'ADID': '',
        'Acc Class': '',
        'Acc Status': '',
        'Status Pukal': '',
        'No of Months Outstanding': '',
        'Current Month Unpaid': Number(totalCurrentMonthUnpaid.toFixed(2)),
        'TTL O/S AMT': Number(totalTTL.toFixed(2)),
        'Total Unpaid': Number(totalUnpaid.toFixed(2)),
        'Move Out Date': '',
    });

    return mapped;
}