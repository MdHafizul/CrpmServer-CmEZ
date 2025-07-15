const duckdb = require('duckdb');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const { getFileReader, convertBigIntToNumber } = require('../../utils/parquetHelper');

// Initialize DuckDB connection
const db = new duckdb.Database(':memory:');
const connection = new duckdb.Connection(db);
const dbRun = promisify(connection.run.bind(connection));
const dbAll = promisify(connection.all.bind(connection));

// Preload extensions (if needed)
async function initializeDuckDB() {
  if (isInitialized) return;
  try {
    await dbRun("INSTALL spatial;");
    await dbRun("LOAD spatial;");
    isInitialized = true;
  } catch (err) {
    console.error("DuckDB extension load error:", err);
  }
}
let isInitialized = false;

// Business area mapping
const businessAreas = [
  { code: '6210', name: 'TNB IPOH' },
  { code: '6211', name: 'TNB KAMPAR' },
  { code: '6212', name: 'TNB BIDOR' },
  { code: '6213', name: 'TNB TANJONG MALIM' },
  { code: '6218', name: 'TNB SERI ISKANDAR' },
  { code: '6219', name: 'TNB ULU KINTA' },
  { code: '6220', name: 'TNB TAIPING' },
  { code: '6221', name: 'TNB BATU GAJAH' },
  { code: '6222', name: 'TNB KUALA KANGSAR' },
  { code: '6223', name: 'TNB GERIK' },
  { code: '6224', name: 'TNB BAGAN SERAI' },
  { code: '6225', name: 'TNB SG. SIPUT' },
  { code: '6227', name: 'TNB SRI MANJUNG' },
  { code: '6250', name: 'TNB TELUK INTAN' },
  { code: '6252', name: 'TNB HUTAN MELINTANG' }
];

// Helper to get business area name
function getBusinessAreaName(code) {
  const area = businessAreas.find(b => b.code === String(code));
  return area ? area.name : "Unknown";
}

// Function to convert Excel file to PARQUET format
exports.convertExcelToParquet = async (excelPath) => {
  await initializeDuckDB();
  const parquetPath = excelPath.replace(/\.(xlsx|xlsm|xltx|xltm)$/i, '.parquet');
  const normalizedExcelPath = path.resolve(excelPath).replace(/\\/g, '/');
  const normalizedParquetPath = path.resolve(parquetPath).replace(/\\/g, '/');
  const query = `
    COPY (SELECT * FROM read_excel('${normalizedExcelPath}')) TO '${normalizedParquetPath}' (FORMAT 'parquet');
  `;
  await dbRun(query);
  return parquetPath;
};

/*
@TITLE : Three Function for Summary Cards
@DESC : Function to calculate and return Total Aged Debt By Acc Status/ Trade Receivable / By Balance Type 
@access : Public
@route : GET /api/v2/crpm/summary-card/:filename
*/

//Function to calculate and return Total Aged Debt By Acc Status Card
exports.getTotalAgedDebtByAccStatus = async (parquetFilename) => {
  await initializeDuckDB();
  const normalizedPath = path.resolve('uploads', parquetFilename).replace(/\\/g, '/');

  const statusQuery = `
    SELECT
      "Acc Status",
      COUNT(*) AS "No Of Account",
      SUM(CAST("TTL O/S Amt" AS DOUBLE)) AS "Debt"
    FROM read_parquet('${normalizedPath}')
    GROUP BY "Acc Status"
  `;

  const totalQuery = `
    SELECT
      COUNT(*) AS "No Of Account",
      SUM(CAST("TTL O/S Amt" AS DOUBLE)) AS "TTL O/S Amt"
    FROM read_parquet('${normalizedPath}')
  `;

  const byStatus = await dbAll(statusQuery);
  const total = await dbAll(totalQuery);

  // Convert BigInt to Number
  const totalAccounts = Number(total[0]["No Of Account"]);
  const totalOutstanding = Number(total[0]["TTL O/S Amt"]);

  const result = {
    TotalAccStatus: {
      "TTL O/S Amt": totalOutstanding,
      "No Of Acc": totalAccounts
    }
  };

  byStatus.forEach(row => {
    const noOfAcc = Number(row["No Of Account"]);
    const debt = Number(row["Debt"]);
    result[row["Acc Status"]] = {
      "TTL O/S Amt": debt,
      "No Of Acc": noOfAcc,
      "% Of Total": totalAccounts > 0
        ? ((noOfAcc / totalAccounts) * 100).toFixed(2)
        : "0.00"
    };
  });

  return result;
};

// Function to calculate and return Total Trade Receivable
exports.getTotalTradeReceivable = async (parquetFilename) => {
  await initializeDuckDB();
  const normalizedPath = path.resolve('uploads', parquetFilename).replace(/\\/g, '/');

  // Query for all required fields and counts, plus unique account count
  const query = `
    SELECT
      COUNT(DISTINCT "Contract Acc") AS "TotalNoOfAccTR",
      SUM(CAST("TTL O/S Amt" AS DOUBLE)) AS "TotalOutstanding",
      COUNT(*) FILTER (WHERE CAST("TTL O/S Amt" AS DOUBLE) <> 0) AS "NumOfAccOutstanding",
      SUM(CAST("Total Undue" AS DOUBLE)) AS "TotalUndue",
      COUNT(*) FILTER (WHERE CAST("Total Undue" AS DOUBLE) <> 0) AS "NumOfAccUndue",
      SUM(CAST("Cur.MthUnpaid" AS DOUBLE)) AS "CurrentMonthUnpaid",
      COUNT(*) FILTER (WHERE CAST("Cur.MthUnpaid" AS DOUBLE) <> 0) AS "NumOfAccCurMthUnpaid"
    FROM read_parquet('${normalizedPath}')
  `;

  const result = await dbAll(query);
  const row = result[0];

  const totalOutstanding = Number(row.TotalOutstanding) || 0;
  const numOfAccOutstanding = Number(row.NumOfAccOutstanding) || 0;
  const totalUndue = Number(row.TotalUndue) || 0;
  const numOfAccUndue = Number(row.NumOfAccUndue) || 0;
  const currentMonthUnpaid = Number(row.CurrentMonthUnpaid) || 0;
  const numOfAccCurMthUnpaid = Number(row.NumOfAccCurMthUnpaid) || 0;
  const totalNoOfAccTR = Number(row.TotalTRNoOfAcc) || 0;

  const totalCurrentMonth = totalUndue + currentMonthUnpaid;
  const totalTradeReceivable = totalOutstanding + totalCurrentMonth;

  return {
    TotalTradeReceivable: totalTradeReceivable,
    TotalNoOfAccTR: totalNoOfAccTR,
    TotalOutstanding: {
      Amount: totalOutstanding,
      NumOfAcc: numOfAccOutstanding
    },
    TotalCurrentMonth: {
      Amount: totalCurrentMonth,
      NumOfAcc: numOfAccUndue + numOfAccCurMthUnpaid,
      TotalUndue: {
        Amount: totalUndue,
        NumOfAcc: numOfAccUndue
      },
      CurrentMonthUnpaid: {
        Amount: currentMonthUnpaid,
        NumOfAcc: numOfAccCurMthUnpaid
      }
    }
  };
}

// Function to get total aged debt by balance type
exports.getTotalByBalanceType = async (parquetFilename) => {
  await initializeDuckDB();
  const normalizedPath = path.resolve('uploads', parquetFilename).replace(/\\/g, '/');

  // Query for all balance types and MIT
  const query = `
    SELECT
      -- Positive Balance
      SUM(CASE WHEN CAST("TTL O/S Amt" AS DOUBLE) > 0.00 THEN CAST("TTL O/S Amt" AS DOUBLE) ELSE 0 END) AS "PositiveBalance",
      COUNT(DISTINCT CASE WHEN CAST("TTL O/S Amt" AS DOUBLE) > 0.00 THEN "Contract Acc" ELSE NULL END) AS "TotalNoOfAccPositiveBalance",

      -- Negative Balance
      SUM(CASE WHEN CAST("TTL O/S Amt" AS DOUBLE) < 0 THEN CAST("TTL O/S Amt" AS DOUBLE) ELSE 0 END) AS "NegativeBalance",
      COUNT(DISTINCT CASE WHEN CAST("TTL O/S Amt" AS DOUBLE) < 0 THEN "Contract Acc" ELSE NULL END) AS "TotalNoOfAccNegativeBalance",

      -- Zero Balance
      SUM(CASE WHEN CAST("TTL O/S Amt" AS DOUBLE) = 0 THEN CAST("TTL O/S Amt" AS DOUBLE) ELSE 0 END) AS "ZeroBalance",
      COUNT(DISTINCT CASE WHEN CAST("TTL O/S Amt" AS DOUBLE) = 0 THEN "Contract Acc" ELSE NULL END) AS "TotalNoOfAccZeroBalance",

      -- MIT
      SUM(CASE WHEN CAST("MIT Amt" AS DOUBLE) <> 0 THEN CAST("MIT Amt" AS DOUBLE) ELSE 0 END) AS "MIT",
      COUNT(DISTINCT CASE WHEN CAST("MIT Amt" AS DOUBLE) <> 0 THEN "Contract Acc" ELSE NULL END) AS "TotalNoOfAccMIT"
    FROM read_parquet('${normalizedPath}')
  `;

  const result = await dbAll(query);
  const row = result[0];

  return {
    TotalByBalanceType: {
      TotalAgedDebtByBalanceType: Number(row.PositiveBalance + row.NegativeBalance + row.ZeroBalance) || 0,
      TotalNoOfAccByBalanceType: Number(row.TotalNoOfAccPositiveBalance + row.TotalNoOfAccNegativeBalance + row.TotalNoOfAccZeroBalance) || 0,
      PositiveBalance: Number(row.PositiveBalance) || 0,
      TotalNoOfAccPositiveBalance: Number(row.TotalNoOfAccPositiveBalance) || 0,
      NegativeBalance: Number(row.NegativeBalance) || 0,
      TotalNoOfAccNegativeBalance: Number(row.TotalNoOfAccNegativeBalance) || 0,
      ZeroBalance: Number(row.ZeroBalance) || 0,
      TotalNoOfAccZeroBalance: Number(row.TotalNoOfAccZeroBalance) || 0,
      MIT: Number(row.MIT) || 0,
      TotalNoOfAccMIT: Number(row.TotalNoOfAccMIT) || 0
    }
  };
}

/*
@TITLE : Functions for All tables
@DESC : Function to calculate and return Total Summary Aged Debt By Station/ Acc Class /ADID / Staff Debt
@access : Public
@route : GET /api/v2/crpm/{{tableName}}/:filename
@body : { Filter by station, acc class, ADID, staff debt }
*/

//Table 1 - Summary Aged Debt By Station
// Trade Receivable view
exports.processDebtByStationTR = async (parquetFilename, station = null) => {
  await initializeDuckDB();
  const normalizedPath = path.resolve('uploads', parquetFilename).replace(/\\/g, '/');
  let query = `
    SELECT 
      CAST("Buss Area" AS VARCHAR) AS "Buss Area",
      COUNT(DISTINCT "Contract Acc") AS "Number of Accounts",
      SUM(CAST("Total Undue" AS DOUBLE)) AS "Total Undue",
      SUM(CAST("Cur.MthUnpaid" AS DOUBLE)) AS "Cur.Mth Unpaid",
      SUM(CAST("TTL O/S Amt" AS DOUBLE)) AS "TTL O/S Amt",
      SUM(CAST("Total Unpaid" AS DOUBLE)) AS "Total Unpaid"
    FROM read_parquet('${normalizedPath}')
    WHERE 1=1
  `;
  if (station && Array.isArray(station) && station.length > 0) {
    const stationList = station.map(s => `'${s}'`).join(',');
    query += ` AND "Buss Area" IN (${stationList})`;
  } else if (station) {
    query += ` AND "Buss Area" = '${station}'`;
  }
  query += ` GROUP BY CAST("Buss Area" AS VARCHAR)`;

  const result = await dbAll(query);

  // Calculate total accounts for % of Total
  const totalAccounts = result.reduce((sum, row) => sum + Number(row["Number of Accounts"]), 0);
  const totalTtlOSAmt = result.reduce((sum, row) => sum + Number(row["TTL O/S Amt"]), 0);
  const totalUndue = result.reduce((sum, row) => sum + Number(row["Total Undue"] || 0), 0);
  const totalCurMthUnpaid = result.reduce((sum, row) => sum + Number(row["Cur.Mth Unpaid"] || 0), 0);
  const totalUnpaid = result.reduce((sum, row) => sum + Number(row["Total Unpaid"] || 0), 0);

  // Main data
  const data = result.map(row => ({
    businessArea: String(row["Buss Area"]),
    station: getBusinessAreaName(row["Buss Area"]),
    numberOfAccounts: Number(row["Number of Accounts"]) || 0,
    totalUndue: Number(row["Total Undue"]) || 0,
    curMthUnpaid: Number(row["Cur.Mth Unpaid"]) || 0,
    ttlOSAmt: Number(row["TTL O/S Amt"]) || 0,
    percentOfTotal: totalTtlOSAmt > 0 ? ((Number(row["TTL O/S Amt"]) / totalTtlOSAmt) * 100).toFixed(2) : "0.00",
    totalUnpaid: Number(row["Total Unpaid"]) || 0
  })).sort((a, b) => Number(b.percentOfTotal) - Number(a.percentOfTotal));

  // Grand total
  const grandTotal = {
    totalNumberOfAccounts: totalAccounts,
    totalUndue: totalUndue,
    totalCurMthUnpaid: totalCurMthUnpaid,
    totalTtlOSAmt: totalTtlOSAmt,
    totalPercentOfTotal: "100.00",
    totalUnpaid: totalUnpaid
  };

  return { data, grandTotal };
};

// Aged Debt view
exports.processDebtByStationAgedDebt = async (parquetFilename, station = null) => {
  await initializeDuckDB();
  const normalizedPath = path.resolve('uploads', parquetFilename).replace(/\\/g, '/');
  let query = `
    SELECT 
      CAST("Buss Area" AS VARCHAR) AS "Buss Area",
      COUNT(DISTINCT "Contract Acc") AS "Number of Accounts",
      SUM(CAST("TTL O/S Amt" AS DOUBLE)) AS "TTL O/S Amt"
    FROM read_parquet('${normalizedPath}')
    WHERE 1=1
  `;
  if (station && Array.isArray(station) && station.length > 0) {
    const stationList = station.map(s => `'${s}'`).join(',');
    query += ` AND "Buss Area" IN (${stationList})`;
  } else if (station) {
    query += ` AND "Buss Area" = '${station}'`;
  }
  query += ` GROUP BY CAST("Buss Area" AS VARCHAR)`;

  const result = await dbAll(query);

  // Calculate total accounts for % of Total
  const totalAccounts = result.reduce((sum, row) => sum + Number(row["Number of Accounts"]), 0);
  const totalTtlOSAmt = result.reduce((sum, row) => sum + Number(row["TTL O/S Amt"]), 0);

  // Main data
  const data = result.map(row => ({
    businessArea: String(row["Buss Area"]),
    station: getBusinessAreaName(row["Buss Area"]),
    numberOfAccounts: Number(row["Number of Accounts"]) || 0,
    ttlOSAmt: Number(row["TTL O/S Amt"]) || 0,
    percentOfTotal: totalTtlOSAmt > 0 ? ((Number(row["TTL O/S Amt"]) / totalTtlOSAmt) * 100).toFixed(2) : "0.00",
  })).sort((a, b) => Number(b.percentOfTotal) - Number(a.percentOfTotal));

  // Grand total
  const grandTotal = {
    totalNumberOfAccounts: totalAccounts,
    totalTtlOSAmt: totalTtlOSAmt,
    totalPercentOfTotal: "100.00",
  };

  return { data, grandTotal };
};

//Table 2 - Summary Aged Debt By Acc Class
// Trade Receivable view
exports.processDebtByAccountClassTR = async (parquetFilename, accClass = null, station = null) => {
  await initializeDuckDB();
  const normalizedPath = path.resolve('uploads', parquetFilename).replace(/\\/g, '/');

  let query = `
    SELECT 
      CAST("Buss Area" AS VARCHAR) AS "Buss Area",
      CAST("Acc Class" AS VARCHAR) AS "Acc Class",
      COUNT(DISTINCT "Contract Acc") AS "Number of Accounts",
      SUM(CAST("Total Undue" AS DOUBLE)) AS "Total Undue",
      SUM(CAST("Cur.MthUnpaid" AS DOUBLE)) AS "Cur.Mth Unpaid",
      SUM(CAST("TTL O/S Amt" AS DOUBLE)) AS "TTL O/S Amt",
      SUM(CAST("Total Unpaid" AS DOUBLE)) AS "Total Unpaid"
    FROM read_parquet('${normalizedPath}')
    WHERE "Acc Class" IN ('LPCN', 'OPCN', 'LPCG', 'OPCG')
  `;

  if (accClass) {
    query += ` AND "Acc Class" = '${accClass}'`;
  }
  if (station && Array.isArray(station) && station.length > 0) {
    const stationList = station.map(s => `'${s}'`).join(',');
    query += ` AND "Buss Area" IN (${stationList})`;
  } else if (station) {
    query += ` AND "Buss Area" = '${station}'`;
  }
  query += ` GROUP BY CAST("Buss Area" AS VARCHAR), CAST("Acc Class" AS VARCHAR) ORDER BY "Buss Area", "Acc Class"`;

  const result = await dbAll(query);

  // Calculate grand totals
  const totalAccounts = result.reduce((sum, row) => sum + Number(row["Number of Accounts"]), 0);
  const totalTtlOSAmt = result.reduce((sum, row) => sum + Number(row["TTL O/S Amt"]), 0);
  const totalUndue = result.reduce((sum, row) => sum + Number(row["Total Undue"] || 0), 0);
  const totalCurMthUnpaid = result.reduce((sum, row) => sum + Number(row["Cur.Mth Unpaid"] || 0), 0);
  const totalUnpaid = result.reduce((sum, row) => sum + Number(row["Total Unpaid"] || 0), 0);

  // Group by station and always order account classes as OPCN, LPCN, LPCG, OPCG
  const accountClassOrder = ['OPCN', 'LPCN', 'LPCG', 'OPCG'];
  const grouped = {};

  result.forEach(row => {
    const businessArea = String(row["Buss Area"]);
    if (!grouped[businessArea]) {
      grouped[businessArea] = {
        businessArea,
        station: getBusinessAreaName(businessArea),
        classes: {}
      };
    }
    grouped[businessArea].classes[row["Acc Class"]] = {
      accountClass: String(row["Acc Class"]),
      numberOfAccounts: Number(row["Number of Accounts"]) || 0,
      totalUndue: Number(row["Total Undue"]) || 0,
      curMthUnpaid: Number(row["Cur.Mth Unpaid"]) || 0,
      ttlOSAmt: Number(row["TTL O/S Amt"]) || 0,
      totalUnpaid: Number(row["Total Unpaid"]) || 0,
      percentOfTotal: totalAccounts > 0 ? ((Number(row["Number of Accounts"]) / totalAccounts) * 100).toFixed(2) : "0.00"
    };
  });

  // Flatten to array, always in order OPCN, LPCN, LPCG, OPCG for each station
  const data = [];
  Object.values(grouped).forEach(station => {
    accountClassOrder.forEach(accClass => {
      if (station.classes[accClass]) {
        data.push({
          businessArea: station.businessArea,
          station: station.station,
          accountClass: accClass,
          numberOfAccounts: station.classes[accClass].numberOfAccounts,
          totalUndue: station.classes[accClass].totalUndue,
          curMthUnpaid: station.classes[accClass].curMthUnpaid,
          ttlOSAmt: station.classes[accClass].ttlOSAmt,
          totalUnpaid: station.classes[accClass].totalUnpaid,
          percentOfTotal: station.classes[accClass].percentOfTotal
        });
      }
    });
  });

  // Station totals
  const stationTotals = Object.values(grouped).map(station => {
    let totalNumberOfAccounts = 0;
    let totalTtlOSAmt = 0;
    let totalUndue = 0;
    let totalCurMthUnpaid = 0;
    let totalUnpaid = 0;
    accountClassOrder.forEach(accClass => {
      const cls = station.classes[accClass];
      if (cls) {
        totalNumberOfAccounts += cls.numberOfAccounts;
        totalTtlOSAmt += cls.ttlOSAmt;
        totalUndue += cls.totalUndue;
        totalCurMthUnpaid += cls.curMthUnpaid;
        totalUnpaid += cls.totalUnpaid;
      }
    });
    return {
      businessArea: station.businessArea,
      station: station.station,
      totalNumberOfAccounts,
      totalTtlOSAmt,
      totalUndue,
      totalCurMthUnpaid,
      totalUnpaid,
      totalPercentOfTotal: totalAccounts > 0 ? ((totalNumberOfAccounts / totalAccounts) * 100).toFixed(2) : "0.00"
    };
  }).sort((a, b) => Number(b.totalPercentOfTotal) - Number(a.totalPercentOfTotal));

  // Grand total
  const grandTotal = {
    totalNumberOfAccounts: totalAccounts,
    totalTtlOSAmt,
    totalUndue,
    totalCurMthUnpaid,
    totalUnpaid,
    totalPercentOfTotal: "100.00"
  };

  return { data, stationTotals, grandTotal };
};

// Aged Debt view
exports.processDebtByAccountClassAgedDebt = async (parquetFilename, accClass = null, station = null) => {
  await initializeDuckDB();
  const normalizedPath = path.resolve('uploads', parquetFilename).replace(/\\/g, '/');

  let query = `
    SELECT 
      CAST("Buss Area" AS VARCHAR) AS "Buss Area",
      CAST("Acc Class" AS VARCHAR) AS "Acc Class",
      COUNT(DISTINCT "Contract Acc") AS "Number of Accounts",
      SUM(CAST("TTL O/S Amt" AS DOUBLE)) AS "TTL O/S Amt"
    FROM read_parquet('${normalizedPath}')
    WHERE "Acc Class" IN ('LPCN', 'OPCN', 'LPCG', 'OPCG')
  `;

  if (accClass) {
    query += ` AND "Acc Class" = '${accClass}'`;
  }
  if (station && Array.isArray(station) && station.length > 0) {
    const stationList = station.map(s => `'${s}'`).join(',');
    query += ` AND "Buss Area" IN (${stationList})`;
  } else if (station) {
    query += ` AND "Buss Area" = '${station}'`;
  }
  query += ` GROUP BY CAST("Buss Area" AS VARCHAR), CAST("Acc Class" AS VARCHAR) ORDER BY "Buss Area", "Acc Class"`;

  const result = await dbAll(query);

  // Calculate grand totals
  const totalAccounts = result.reduce((sum, row) => sum + Number(row["Number of Accounts"]), 0);
  const totalTtlOSAmt = result.reduce((sum, row) => sum + Number(row["TTL O/S Amt"]), 0);

  // Group by station and always order account classes as OPCN, LPCN, LPCG, OPCG
  const accountClassOrder = ['OPCN', 'LPCN', 'LPCG', 'OPCG'];
  const grouped = {};

  result.forEach(row => {
    const businessArea = String(row["Buss Area"]);
    if (!grouped[businessArea]) {
      grouped[businessArea] = {
        businessArea,
        station: getBusinessAreaName(businessArea),
        classes: {}
      };
    }
    grouped[businessArea].classes[row["Acc Class"]] = {
      accountClass: String(row["Acc Class"]),
      numberOfAccounts: Number(row["Number of Accounts"]) || 0,
      ttlOSAmt: Number(row["TTL O/S Amt"]) || 0,
      percentOfTotal: totalAccounts > 0 ? ((Number(row["Number of Accounts"]) / totalAccounts) * 100).toFixed(2) : "0.00"
    };
  });

  // Flatten to array, always in order OPCN, LPCN, LPCG, OPCG for each station
  const data = [];
  Object.values(grouped).forEach(station => {
    accountClassOrder.forEach(accClass => {
      if (station.classes[accClass]) {
        data.push({
          businessArea: station.businessArea,
          station: station.station,
          accountClass: accClass,
          numberOfAccounts: station.classes[accClass].numberOfAccounts,
          ttlOSAmt: station.classes[accClass].ttlOSAmt,
          percentOfTotal: station.classes[accClass].percentOfTotal
        });
      }
    });
  });

  // Station totals
  const stationTotals = Object.values(grouped).map(station => {
    let totalNumberOfAccounts = 0;
    let totalTtlOSAmt = 0;
    accountClassOrder.forEach(accClass => {
      const cls = station.classes[accClass];
      if (cls) {
        totalNumberOfAccounts += cls.numberOfAccounts;
        totalTtlOSAmt += cls.ttlOSAmt;
      }
    });
    return {
      businessArea: station.businessArea,
      station: station.station,
      totalNumberOfAccounts,
      totalTtlOSAmt,
      totalPercentOfTotal: totalAccounts > 0 ? ((totalNumberOfAccounts / totalAccounts) * 100).toFixed(2) : "0.00"
    };
  }).sort((a, b) => Number(b.totalPercentOfTotal) - Number(a.totalPercentOfTotal));

  // Grand total
  const grandTotal = {
    totalNumberOfAccounts: totalAccounts,
    totalTtlOSAmt,
    totalPercentOfTotal: "100.00"
  };

  return { data, stationTotals, grandTotal };
};

//Table 2 - Summary Aged Debt By ADID
// Trade Receivable view

exports.processDebtByADIDTR = async (parquetFilename, adid = null, station = null) => {
  await initializeDuckDB();
  const normalizedPath = path.resolve('uploads', parquetFilename).replace(/\\/g, '/');

  let query = `
    SELECT 
      CAST("Buss Area" AS VARCHAR) AS "Buss Area",
      CAST("ADID" AS VARCHAR) AS "ADID",
      COUNT(DISTINCT "Contract Acc") AS "Number of Accounts",
      SUM(CAST("Total Undue" AS DOUBLE)) AS "Total Undue",
      SUM(CAST("Cur.MthUnpaid" AS DOUBLE)) AS "Cur.Mth Unpaid",
      SUM(CAST("TTL O/S Amt" AS DOUBLE)) AS "TTL O/S Amt",
      SUM(CAST("Total Unpaid" AS DOUBLE)) AS "Total Unpaid"
    FROM read_parquet('${normalizedPath}')
    WHERE "ADID" IN ('AG','CM','DM','IN','MN','SL')
  `;

  if(adid && Array.isArray(adid) && adid.length > 0) {
    const adidList = adid.map (a => `'${a}'`).join(',');
    query += ` AND "ADID" IN (${adidList})`;
  }
  if(station && Array.isArray(station) && station.length > 0) {
    const stationList = station.map(s => `'${s}'`).join(',');
    query += ` AND "Buss Area" IN (${stationList})`;
  }else if(station) {
    query += ` AND "Buss Area" = '${station}'`;
  }
  query += ` GROUP BY CAST("Buss Area" AS VARCHAR), CAST("ADID" AS VARCHAR) ORDER BY "Buss Area", "ADID"`;

  const result = await dbAll(query);

  // Calculate grand totals
  const totalAccounts = result.reduce((sum, row) => sum + Number(row["Number of Accounts"]), 0);
  const totalTtlOSAmt = result.reduce((sum, row) => sum + Number(row["TTL O/S Amt"]), 0);
  const totalUndue = result.reduce((sum, row) => sum + Number(row["Total Undue"] || 0), 0);
  const totalCurMthUnpaid = result.reduce((sum, row) => sum + Number(row["Cur.Mth Unpaid"] || 0), 0);
  const totalUnpaid = result.reduce((sum, row) => sum + Number(row["Total Unpaid"] || 0), 0);

  // Group by station and always order ADID as AG, CM, DM, IN, MN, SL
  const adidOrder = ['AG', 'CM', 'DM', 'IN', 'MN', 'SL'];
  const grouped = {};

  result.forEach(row => {
    const businessArea = String(row["Buss Area"]);
    if(!grouped[businessArea]){
      grouped[businessArea] = {
        businessArea,
        station: getBusinessAreaName(businessArea),
        adids: {}
      };
    }

    grouped[businessArea].adids[row["ADID"]] = {
      adid: String(row["ADID"]),
      numberOfAccounts: Number(row["Number of Accounts"]) || 0,
      totalUndue: Number(row["Total Undue"]) || 0,
      curMthUnpaid: Number(row["Cur.Mth Unpaid"]) || 0,
      ttlOSAmt: Number(row["TTL O/S Amt"]) || 0,
      totalUnpaid: Number(row["Total Unpaid"]) || 0,
      percentOfTotal: totalAccounts > 0 ? ((Number(row["Number of Accounts"]) / totalAccounts) * 100).toFixed(2) : "0.00"
    };
  });

  // Flatten to array, always in order AG, CM, DM, IN, MN, SL for each station
  const data = [];
  Object.values(grouped).forEach(station => {
    adidOrder.forEach(adid => {
      if (station.adids[adid]) {
        data.push({
          businessArea: station.businessArea,
          station: station.station,
          adid: adid,
          numberOfAccounts: station.adids[adid].numberOfAccounts,
          totalUndue: station.adids[adid].totalUndue,
          curMthUnpaid: station.adids[adid].curMthUnpaid,
          ttlOSAmt: station.adids[adid].ttlOSAmt,
          totalUnpaid: station.adids[adid].totalUnpaid,
          percentOfTotal: station.adids[adid].percentOfTotal
        });
      }
    });
  });

  //station totals
  const stationTotals = Object.values(grouped).map(station => {
    let totalNumberOfAccounts = 0;
    let totalTtlOSAmt = 0;
    let totalUndue = 0;
    let totalCurMthUnpaid = 0;
    let totalUnpaid = 0;
    adidOrder.forEach(adid => {
      const adidData = station.adids[adid];
      if (adidData) {
        totalNumberOfAccounts += adidData.numberOfAccounts;
        totalTtlOSAmt += adidData.ttlOSAmt;
        totalUndue += adidData.totalUndue;
        totalCurMthUnpaid += adidData.curMthUnpaid;
        totalUnpaid += adidData.totalUnpaid;
      }
    });
    return {
      businessArea: station.businessArea,
      station: station.station,
      totalNumberOfAccounts,
      totalTtlOSAmt,
      totalUndue,
      totalCurMthUnpaid,
      totalUnpaid,
      totalPercentOfTotal: totalAccounts > 0 ? ((totalNumberOfAccounts / totalAccounts) * 100).toFixed(2) : "0.00"
    };
  }).sort((a, b) => Number(b.totalPercentOfTotal) - Number(a.totalPercentOfTotal));

  // Grand total
  const grandTotal = {
    totalNumberOfAccounts: totalAccounts,
    totalTtlOSAmt,
    totalUndue,
    totalCurMthUnpaid,
    totalUnpaid,
    totalPercentOfTotal: "100.00"
  };

  return { data, stationTotals, grandTotal };
}

// Aged Debt view
exports.processDebtByADIDAgedDebt = async (parquetFilename, adid = null, station = null) => {
  await initializeDuckDB();
  const normalizedPath = path.resolve('uploads', parquetFilename).replace(/\\/g, '/');

  let query = `
    SELECT 
      CAST("Buss Area" AS VARCHAR) AS "Buss Area",
      CAST("ADID" AS VARCHAR) AS "ADID",
      COUNT(DISTINCT "Contract Acc") AS "Number of Accounts",
      SUM(CAST("TTL O/S Amt" AS DOUBLE)) AS "TTL O/S Amt"
    FROM read_parquet('${normalizedPath}')
    WHERE "ADID" IN ('AG','CM','DM','IN','MN','SL')
  `;

  if(adid && Array.isArray(adid) && adid.length > 0) {
    const adidList = adid.map (a => `'${a}'`).join(',');
    query += ` AND "ADID" IN (${adidList})`;
  }
  if(station && Array.isArray(station) && station.length > 0) {
    const stationList = station.map(s => `'${s}'`).join(',');
    query += ` AND "Buss Area" IN (${stationList})`;
  }else if(station) {
    query += ` AND "Buss Area" = '${station}'`;
  }
  query += ` GROUP BY CAST("Buss Area" AS VARCHAR), CAST("ADID" AS VARCHAR) ORDER BY "Buss Area", "ADID"`;

  const result = await dbAll(query);

  // Calculate grand totals
  const totalAccounts = result.reduce((sum, row) => sum + Number(row["Number of Accounts"]), 0);
  const totalTtlOSAmt = result.reduce((sum, row) => sum + Number(row["TTL O/S Amt"]), 0);

  // Group by station and always order ADID as AG, CM, DM, IN, MN, SL
  const adidOrder = ['AG', 'CM', 'DM', 'IN', 'MN', 'SL'];
  const grouped = {};

  result.forEach(row => {
    const businessArea = String(row["Buss Area"]);
    if(!grouped[businessArea]){
      grouped[businessArea] = {
        businessArea,
        station: getBusinessAreaName(businessArea),
        adids: {}
      };
    }

    grouped[businessArea].adids[row["ADID"]] = {
      adid: String(row["ADID"]),
      numberOfAccounts: Number(row["Number of Accounts"]) || 0,
      totalUndue: Number(row["TTL O/S Amt"]) || 0,
      curMthUnpaid: Number(row["Cur.MthUnpaid"]) || 0,
      ttlOSAmt: Number(row["TTL O/S Amt"]) || 0,
      totalUnpaid: Number(row["Total Unpaid"]) || 0,
      percentOfTotal: totalAccounts > 0 ? ((Number(row["Number of Accounts"]) / totalAccounts) * 100).toFixed(2) : "0.00"
    };
  });

    // Flatten to array, always in order AG, CM, DM, IN, MN, SL for each station
  const data = [];
  Object.values(grouped).forEach(station => {
    adidOrder.forEach(adid => {
      if (station.adids[adid]) {
        data.push({
          businessArea: station.businessArea,
          station: station.station,
          adid: adid,
          numberOfAccounts: station.adids[adid].numberOfAccounts,
          ttlOSAmt: station.adids[adid].ttlOSAmt,
          percentOfTotal: station.adids[adid].percentOfTotal
        });
      }
    });
  });

  //station totals
  const stationTotals = Object.values(grouped).map(station => {
    let totalNumberOfAccounts = 0;
    let totalTtlOSAmt = 0;
    adidOrder.forEach(adid => {
      const adidData = station.adids[adid];
      if (adidData) {
        totalNumberOfAccounts += adidData.numberOfAccounts;
        totalTtlOSAmt += adidData.ttlOSAmt;
      }
    });
    return {
      businessArea: station.businessArea,
      station: station.station,
      totalNumberOfAccounts,
      totalTtlOSAmt,
      totalPercentOfTotal: totalAccounts > 0 ? ((totalNumberOfAccounts / totalAccounts) * 100).toFixed(2) : "0.00"
    };
  }).sort((a, b) => Number(b.totalPercentOfTotal) - Number(a.totalPercentOfTotal));

  // Grand total
  const grandTotal = {
    totalNumberOfAccounts: totalAccounts,
    totalTtlOSAmt,
    totalPercentOfTotal: "100.00"
  };

  return { data, stationTotals, grandTotal };
}





























//Function to return all data
exports.getAllDataFromParquet = async (parquetFilename, { cursor = null, limit = null, sortField = "Contract Acc", sortDirection = "ASC" } = {}) => {
  await initializeDuckDB();
  const normalizedPath = path.resolve('uploads', parquetFilename).replace(/\\/g, '/');
  let query = `
    SELECT
      "Customer Group",
      "Sector",
      "SMER Segment",
      "Buss Area",
      "Team",
      "BP No",
      "Contract Acc",
      "Contract Account Name",
      "ADID",
      "Acc Class",
      "Acc Status",
      "Govt Code",
      "Govt Sub Code",
      "Payment ID",
      "Rate Category",
      "Indicator",
      "MRU",
      "Premise Type",
      "Premise Type Description",
      "Cash Amt",
      "Non Cash Amt",
      "Total Amt",
      "GST/SST",
      "KWTBB",
      "ILP",
      "Invoice",
      "Miscellaneous",
      "CW Rating",
      "No of Months Outstandings",
      "Total Undue",
      "Cur.MthUnpaid",
      "1 to 30",
      "31 to 60",
      "61 to 90",
      "91 to 120",
      "121 to 150",
      "151 to 180",
      "181 to 210",
      "211 to 240",
      "241 to 270",
      "271 to 300",
      "301 to 330",
      "331 to 360",
      ">361",
      "TTL O/S Amt",
      "Total Unpaid",
      "DebtsExposure",
      "Debt Exposure Unpaid",
      "Customer Indi",
      "Staff ID",
      "Move Out Date",
      "MIT Date",
      "MIT Amt",
      "No. of IP",
      "Total IP Amt",
      "Unpaid Due IP",
      "Sub.to CollAg",
      "Coll AgentAmt",
      "Legal Date",
      "Legal Amt",
      "Last PymtDate",
      "Last Pymt Amt",
      "Original Business Area"
    FROM read_parquet('${normalizedPath}')
  `;

  if (cursor) {
    const operator = sortDirection.toUpperCase() === "ASC" ? ">" : "<";
    query += ` WHERE "${sortField}" ${operator} '${cursor}'`;
  }

  query += ` ORDER BY "${sortField}" ${sortDirection.toUpperCase()} LIMIT ${parseInt(limit) + 1}`;

  const result = await dbAll(query);

  const hasMore = result.length > limit;
  const items = hasMore ? result.slice(0, limit) : result;

  const nextCursor = hasMore ? items[items.length - 1][sortField] : null;

  // Convert BigInt to Number for all values
  const convertedItems = items.map(row => {
    const convertedRow = {};
    for (const key in row) {
      convertedRow[key] = convertBigIntToNumber(row[key]);
    }
    return convertedRow;
  });

  return {
    items: convertedItems,
    pagination: {
      hasMore,
      nextCursor,
      limit: parseInt(limit)
    }
  };
}