const duckdb = require('duckdb');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const {
  getFileReader,
  convertBigIntToNumber,
  buildWhereClauses,
  initializeDuckDB,
  getBusinessAreaName,
  formatStationSummary,
  formatAccountClassSummary,
  formatADIDSummary,
  formatSMERSegmentSummary,
  formatDetailedTableSummary,
  formatDriverTreeSummary,
  formatDirectedGraphSummary,
} = require('../../utils/parquetHelper');

// Initialize DuckDB connection
const db = new duckdb.Database(':memory:');
const connection = new duckdb.Connection(db);
const dbRun = promisify(connection.run.bind(connection));
const dbAll = promisify(connection.all.bind(connection));

exports.convertExcelToParquet = async (excelPath) => {
  await initializeDuckDB(dbRun);
  const parquetPath = excelPath.replace(/\.(xlsx|xlsm|xltx|xltm)$/i, '.parquet');
  const normalizedExcelPath = path.resolve(excelPath).replace(/\\/g, '/');
  const normalizedParquetPath = path.resolve(parquetPath).replace(/\\/g, '/');
  const query = `
    COPY (
      SELECT * FROM read_xlsx('${normalizedExcelPath}', ALL_VARCHAR=TRUE)
    ) TO '${normalizedParquetPath}' (FORMAT 'parquet');
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
  await initializeDuckDB(dbRun);
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
  await initializeDuckDB(dbRun);
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
  const totalNoOfAccTR = Number(row.TotalNoOfAccTR) || 0;

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
  await initializeDuckDB(dbRun);
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
*/

//Table 1 - Summary Aged Debt By Station (Trade Receivable view) with advanced filters
// TR view with filters
exports.processDebtByStationTR = async (parquetFilename, filters = {}) => {
  await initializeDuckDB(dbRun);
  const normalizedPath = path.resolve('uploads', parquetFilename).replace(/\\/g, '/');
  const whereClause = buildWhereClauses(filters);

  const query = `
    SELECT 
      CAST("Buss Area" AS VARCHAR) AS "Buss Area",
      SUM(CAST("MIT Amt" AS DOUBLE)) AS "MIT Amt",
      COUNT(DISTINCT "Contract Acc") AS "Number of Accounts",
      SUM(CAST("Total Undue" AS DOUBLE)) AS "Total Undue",
      SUM(CAST("Cur.MthUnpaid" AS DOUBLE)) AS "Cur.Mth Unpaid",
      SUM(CAST("TTL O/S Amt" AS DOUBLE)) AS "TTL O/S Amt",
      SUM(CAST("Total Unpaid" AS DOUBLE)) AS "Total Unpaid"
    FROM read_parquet('${normalizedPath}')
    WHERE ${whereClause}
    GROUP BY CAST("Buss Area" AS VARCHAR)
  `;
  const result = await dbAll(query);
  return formatStationSummary(result, getBusinessAreaName, false, filters);
};

// Aged Debt view
exports.processDebtByStationAgedDebt = async (parquetFilename, filters = {}) => {
  await initializeDuckDB(dbRun);
  const normalizedPath = path.resolve('uploads', parquetFilename).replace(/\\/g, '/');
  const whereClause = buildWhereClauses(filters);

  const query = `
    SELECT 
      CAST("Buss Area" AS VARCHAR) AS "Buss Area",
      SUM(CAST("MIT Amt" AS DOUBLE)) AS "MIT Amt",
      COUNT(DISTINCT "Contract Acc") AS "Number of Accounts",
      SUM(CAST("TTL O/S Amt" AS DOUBLE)) AS "TTL O/S Amt"
    FROM read_parquet('${normalizedPath}')
    WHERE ${whereClause}
    GROUP BY CAST("Buss Area" AS VARCHAR)
  `;

  const result = await dbAll(query);
  return formatStationSummary(result, getBusinessAreaName, true, filters);
};

//Table 2 - Summary Aged Debt By Acc Class
// TR view with filters
exports.processDebtByAccountClassTR = async (parquetFilename, filters = {}) => {
  await initializeDuckDB(dbRun);
  const normalizedPath = path.resolve('uploads', parquetFilename).replace(/\\/g, '/');
  const whereClause = buildWhereClauses(filters);

  const query = `
    SELECT 
      CAST("Buss Area" AS VARCHAR) AS "Buss Area",
      CAST("Acc Class" AS VARCHAR) AS "Acc Class",
      SUM(CAST("MIT Amt" AS DOUBLE)) AS "MIT Amt",
      COUNT(DISTINCT "Contract Acc") AS "Number of Accounts",
      SUM(CAST("Total Undue" AS DOUBLE)) AS "Total Undue",
      SUM(CAST("Cur.MthUnpaid" AS DOUBLE)) AS "Cur.Mth Unpaid",
      SUM(CAST("TTL O/S Amt" AS DOUBLE)) AS "TTL O/S Amt",
      SUM(CAST("Total Unpaid" AS DOUBLE)) AS "Total Unpaid"
    FROM read_parquet('${normalizedPath}')
    WHERE ${whereClause}
    GROUP BY CAST("Buss Area" AS VARCHAR), CAST("Acc Class" AS VARCHAR)
    ORDER BY "Buss Area", "Acc Class"
  `;

  const result = await dbAll(query);
  const accountClassOrder = ['LPCN', 'OPCN', 'LPCG', 'OPCG'];
  return formatAccountClassSummary(result, getBusinessAreaName, accountClassOrder, false, filters);
};

// Aged Debt view
exports.processDebtByAccountClassAgedDebt = async (parquetFilename, filters = {}) => {
  await initializeDuckDB(dbRun);
  const normalizedPath = path.resolve('uploads', parquetFilename).replace(/\\/g, '/');
  const whereClause = buildWhereClauses(filters);

  const query = `
    SELECT 
      CAST("Buss Area" AS VARCHAR) AS "Buss Area",
      CAST("Acc Class" AS VARCHAR) AS "Acc Class",
      SUM(CAST("MIT Amt" AS DOUBLE)) AS "MIT Amt",
      COUNT(DISTINCT "Contract Acc") AS "Number of Accounts",
      SUM(CAST("TTL O/S Amt" AS DOUBLE)) AS "TTL O/S Amt"
    FROM read_parquet('${normalizedPath}')
    WHERE ${whereClause}
    GROUP BY CAST("Buss Area" AS VARCHAR), CAST("Acc Class" AS VARCHAR)
    ORDER BY "Buss Area", "Acc Class"
  `;

  const result = await dbAll(query);
  const accountClassOrder = ['OPCN', 'LPCN', 'LPCG', 'OPCG'];
  return formatAccountClassSummary(result, getBusinessAreaName, accountClassOrder, true, filters);
};


//Table 3 - Summary Aged Debt By ADID
// Trade Receivable 
exports.processDebtByADIDTR = async (parquetFilename, filters = {}) => {
  await initializeDuckDB(dbRun);
  const normalizedPath = path.resolve('uploads', parquetFilename).replace(/\\/g, '/');
  const whereClause = buildWhereClauses(filters);

  const query = `
    SELECT 
      CAST("Buss Area" AS VARCHAR) AS "Buss Area",
      CAST("ADID" AS VARCHAR) AS "ADID",
      COUNT(DISTINCT "Contract Acc") AS "Number of Accounts",
      SUM(CAST("MIT Amt" AS DOUBLE)) AS "MIT Amt",
      SUM(CAST("Total Undue" AS DOUBLE)) AS "Total Undue",
      SUM(CAST("Cur.MthUnpaid" AS DOUBLE)) AS "Cur.Mth Unpaid",
      SUM(CAST("TTL O/S Amt" AS DOUBLE)) AS "TTL O/S Amt",
      SUM(CAST("Total Unpaid" AS DOUBLE)) AS "Total Unpaid"
    FROM read_parquet('${normalizedPath}')
    WHERE ${whereClause}
    GROUP BY CAST("Buss Area" AS VARCHAR), CAST("ADID" AS VARCHAR)
    ORDER BY "Buss Area", "ADID"
  `;

  const result = await dbAll(query);
  const adidOrder = ['AG', 'CM', 'DM', 'IN', 'MN', 'SL'];
  return formatADIDSummary(result, getBusinessAreaName, adidOrder, false, filters);
};
// Aged Debt view
exports.processDebtByADIDAgedDebt = async (parquetFilename, filters = {}) => {
  await initializeDuckDB(dbRun);
  const normalizedPath = path.resolve('uploads', parquetFilename).replace(/\\/g, '/');
  const whereClause = buildWhereClauses(filters);

  const query = `
    SELECT 
      CAST("Buss Area" AS VARCHAR) AS "Buss Area",
      CAST("ADID" AS VARCHAR) AS "ADID",
      COUNT(DISTINCT "Contract Acc") AS "Number of Accounts",
      SUM(CAST("MIT Amt" AS DOUBLE)) AS "MIT Amt",
      SUM(CAST("TTL O/S Amt" AS DOUBLE)) AS "TTL O/S Amt"
    FROM read_parquet('${normalizedPath}')
    WHERE ${whereClause}
    GROUP BY CAST("Buss Area" AS VARCHAR), CAST("ADID" AS VARCHAR)
    ORDER BY "Buss Area", "ADID"
  `;

  const result = await dbAll(query);
  const adidOrder = ['AG', 'CM', 'DM', 'IN', 'MN', 'SL'];
  return formatADIDSummary(result, getBusinessAreaName, adidOrder, true, filters); // <-- true for isAgedDebtView
};

//Table 4 - Staff Debt
// Trade Receivable view
exports.processDebtByStaffIDTR = async (parquetFilename, station = null) => {
  await initializeDuckDB(dbRun);
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
    WHERE "Staff ID" IS NOT NULL AND "Staff ID" <> ''
  `;

  if (station && Array.isArray(station) && station.length > 0) {
    const stationList = station.map(s => `'${s}'`).join(',');
    query += ` AND "Buss Area" IN (${stationList})`;
  } else if (station) {
    query += ` AND "Buss Area" = '${station}'`;
  }
  query += `GROUP BY CAST("Buss Area" AS VARCHAR)
`;

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
//aged debt view
exports.processDebtByStaffIDAgedDebt = async (parquetFilename, station = null) => {
  await initializeDuckDB(dbRun);
  const normalizedPath = path.resolve('uploads', parquetFilename).replace(/\\/g, '/');
  let query = `
    SELECT
      CAST("Buss Area" AS VARCHAR) AS "Buss Area",
      COUNT(DISTINCT "Contract Acc") AS "Number of Accounts",
      SUM(CAST("TTL O/S Amt" AS DOUBLE)) AS "TTL O/S Amt"
    FROM read_parquet('${normalizedPath}')
    WHERE "Staff ID" IS NOT NULL AND "Staff ID" <> ''
  `;

  if (station && Array.isArray(station) && station.length > 0) {
    const stationList = station.map(s => `'${s}'`).join(',');
    query += ` AND "Buss Area" IN (${stationList})`;
  } else if (station) {
    query += ` AND "Buss Area" = '${station}'`;
  }
  query += `GROUP BY CAST("Buss Area" AS VARCHAR)
`;

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

//Table 5 - Summary Aged Debt By SMER Segment
// Trade Receivable view 
exports.processDebtBySmerSegmentTR = async (parquetFilename, filters = {}) => {
  await initializeDuckDB(dbRun);
  const normalizedPath = path.resolve('uploads', parquetFilename).replace(/\\/g, '/');
  const whereClause = buildWhereClauses(filters);

  const query = `
    SELECT 
      CAST("Buss Area" AS VARCHAR) AS "Buss Area",
      CAST("SMER Segment" AS VARCHAR) AS "SMER Segment",
      COUNT(DISTINCT "Contract Acc") AS "Number of Accounts",
      SUM(CAST("MIT Amt" AS DOUBLE)) AS "MIT Amt",
      SUM(CAST("Total Undue" AS DOUBLE)) AS "Total Undue",
      SUM(CAST("Cur.MthUnpaid" AS DOUBLE)) AS "Cur.Mth Unpaid",
      SUM(CAST("TTL O/S Amt" AS DOUBLE)) AS "TTL O/S Amt",
      SUM(CAST("Total Unpaid" AS DOUBLE)) AS "Total Unpaid"
    FROM read_parquet('${normalizedPath}')
    WHERE ${whereClause}
    GROUP BY CAST("Buss Area" AS VARCHAR), CAST("SMER Segment" AS VARCHAR)
    ORDER BY "Buss Area", "SMER Segment"
  `;

  const result = await dbAll(query);
  const SmerSegmentOrder = ['MASR', 'MICB', 'GNLA', 'HRES', 'MEDB', 'SMLB', 'EMRB', 'BLANKS'];
  return formatSMERSegmentSummary(result, getBusinessAreaName, SmerSegmentOrder, false, filters);
};
// Aged Debt view
exports.processDebtBySmerSegmentAgedDebt = async (parquetFilename, filters = {}) => {
  await initializeDuckDB(dbRun);
  const normalizedPath = path.resolve('uploads', parquetFilename).replace(/\\/g, '/');
  const whereClause = buildWhereClauses(filters);

  const query = `
    SELECT 
      CAST("Buss Area" AS VARCHAR) AS "Buss Area",
      CAST("SMER Segment" AS VARCHAR) AS "SMER Segment",
      COUNT(DISTINCT "Contract Acc") AS "Number of Accounts",
      SUM(CAST("MIT Amt" AS DOUBLE)) AS "MIT Amt",
      SUM(CAST("TTL O/S Amt" AS DOUBLE)) AS "TTL O/S Amt"
    FROM read_parquet('${normalizedPath}')
    WHERE ${whereClause}
    GROUP BY CAST("Buss Area" AS VARCHAR), CAST("SMER Segment" AS VARCHAR)
    ORDER BY "Buss Area", "SMER Segment"
  `;

  const result = await dbAll(query);

  const SmerSegmentOrder = ['MASR', 'MICB', 'GNLA', 'HRES', 'MEDB', 'SMLB', 'EMRB', 'BLANKS'];
  return formatSMERSegmentSummary(result, getBusinessAreaName, SmerSegmentOrder, true, filters);
};

//Table 6 - Detailed Table for Aged Debt(FULL AND PARTIAL)
// TR View - partial
exports.processDetailedDebtTableDataTR = async (
  parquetFilename,
  filters = {},
  { cursor = null, limit = 100, sortField = "TTL O/S Amt", sortDirection = "ASC" } = {}
) => {
  await initializeDuckDB(dbRun);
  const normalizedPath = path.resolve('uploads', parquetFilename).replace(/\\/g, '/');
  const whereClause = buildWhereClauses(filters);

  let query = `
    SELECT
      CAST("Buss Area" AS VARCHAR) AS "Buss Area",
      CAST("Contract Acc" AS VARCHAR) AS "Contract Acc",
      CAST("Contract Account Name" AS VARCHAR) AS "Contract Account Name",
      CAST("ADID" AS VARCHAR) AS "ADID",
      CAST("Acc Class" AS VARCHAR) AS "Acc Class",
      CAST("Acc Status" AS VARCHAR) AS "Acc Status",
      CAST("No of Months Outstandings" AS DOUBLE) AS "No of Months Outstanding",
      CAST("Staff ID" AS VARCHAR) AS "Staff ID",
      CAST("MIT Amt" AS DOUBLE) AS "MIT Amt",
      CAST("Last PymtDate" AS VARCHAR) AS "Last Payment Date",
      CAST("Last Pymt Amt" AS DOUBLE) AS "Last Payment Amount",
      CAST("TTL O/S Amt" AS DOUBLE) AS "TTL O/S Amt",
      CAST("Total Undue" AS DOUBLE) AS "Total Undue",
      CAST("Cur.MthUnpaid" AS DOUBLE) AS "Cur.Mth Unpaid",
      CAST("Total Unpaid" AS DOUBLE) AS "Total Unpaid"
    FROM read_parquet('${normalizedPath}')
    WHERE ${whereClause}
  `;

  if (cursor) {
    const operator = sortDirection.toUpperCase() === "ASC" ? ">" : "<";
    query += ` AND "${sortField}" ${operator} '${cursor}'`;
  }

  query += ` ORDER BY "${sortField}" ${sortDirection.toUpperCase()} LIMIT ${parseInt(limit) + 1}`;

  const result = await dbAll(query);

  const hasMore = result.length > limit;
  const items = hasMore ? result.slice(0, limit) : result;
  const nextCursor = hasMore ? items[items.length - 1][sortField] : null;

  return {
    items: formatDetailedTableSummary(items, getBusinessAreaName, false, filters),
    pagination: {
      hasMore,
      nextCursor,
      limit: parseInt(limit)
    }
  };
};

// Aged Debt View - partial
exports.processDetailedDebtTableDataAgedDebt = async (
  parquetFilename,
  filters = {},
  { cursor = null, limit = 100, sortField = "Contract Acc", sortDirection = "ASC" } = {}
) => {
  await initializeDuckDB(dbRun);
  const normalizedPath = path.resolve('uploads', parquetFilename).replace(/\\/g, '/');
  const whereClause = buildWhereClauses(filters);

  let query = `
    SELECT
      CAST("Buss Area" AS VARCHAR) AS "Buss Area",
      CAST("Contract Acc" AS VARCHAR) AS "Contract Acc",
      CAST("Contract Account Name" AS VARCHAR) AS "Contract Account Name",
      CAST("ADID" AS VARCHAR) AS "ADID",
      CAST("Acc Class" AS VARCHAR) AS "Acc Class",
      CAST("Acc Status" AS VARCHAR) AS "Acc Status",
      CAST("No of Months Outstandings" AS DOUBLE) AS "No of Months Outstanding",
      CAST("Staff ID" AS VARCHAR) AS "Staff ID",
      CAST("MIT Amt" AS DOUBLE) AS "MIT Amt",
      CAST("Last PymtDate" AS VARCHAR) AS "Last Payment Date",
      CAST("Last Pymt Amt" AS DOUBLE) AS "Last Payment Amount",
      CAST("TTL O/S Amt" AS DOUBLE) AS "TTL O/S Amt"
    FROM read_parquet('${normalizedPath}')
    WHERE ${whereClause}
  `;

  if (cursor) {
    const operator = sortDirection.toUpperCase() === "ASC" ? ">" : "<";
    query += ` AND "${sortField}" ${operator} '${cursor}'`;
  }

  query += ` ORDER BY "${sortField}" ${sortDirection.toUpperCase()} LIMIT ${parseInt(limit) + 1}`;

  const result = await dbAll(query);

  const hasMore = result.length > limit;
  const items = hasMore ? result.slice(0, limit) : result;
  const nextCursor = hasMore ? items[items.length - 1][sortField] : null;

  return {
    items: formatDetailedTableSummary(items, getBusinessAreaName, true, filters),
    pagination: {
      hasMore,
      nextCursor,
      limit: parseInt(limit)
    }
  };
};

//Function to return all data
exports.getAllDataFromParquet = async (parquetFilename, { cursor = null, limit = null, sortField = "Contract Acc", sortDirection = "ASC" } = {}) => {
  await initializeDuckDB(dbRun);
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


/*
@TITLE : Functions for All Graphs
@DESC : Function to calculate and return graph data for Driver Tree and Directed Graph
@access : Public
@route : POST /api/v2/crpm/{{tableName}}/:filename
*/
exports.getDriverTreeSummary = async (parquetFilename) => {
  await initializeDuckDB(dbRun);
  const normalizedPath = path.resolve('uploads', parquetFilename).replace(/\\/g, '/');

  // Root node: Positive Balance
  const rootQuery = `
    SELECT
      SUM(CASE WHEN CAST("TTL O/S Amt" AS DOUBLE) > 0 THEN CAST("TTL O/S Amt" AS DOUBLE) ELSE 0 END) AS PositiveBalance,
      COUNT(DISTINCT CASE WHEN CAST("TTL O/S Amt" AS DOUBLE) > 0 THEN "Contract Acc" ELSE NULL END) AS TotalNoOfAccPositiveBalance
    FROM read_parquet('${normalizedPath}')
  `;
  const [root] = await dbAll(rootQuery);

  // Level 2/3: Status + Account Class (positive only)
  const statusClassQuery = `
    SELECT
      CAST("Acc Status" AS VARCHAR) AS "Acc Status",
      CAST("Acc Class" AS VARCHAR) AS "Acc Class",
      SUM(CAST("TTL O/S Amt" AS DOUBLE)) AS "TTL O/S Amt",
      COUNT(DISTINCT "Contract Acc") AS "Number of Accounts"
    FROM read_parquet('${normalizedPath}')
    WHERE CAST("TTL O/S Amt" AS DOUBLE) > 0
    GROUP BY "Acc Status", "Acc Class"
    ORDER BY "Acc Status", "Acc Class"
  `;
  const statusClassRows = await dbAll(statusClassQuery);

  // Level 4: ADID per Account Class (positive only)
  const adidQuery = `
    SELECT
      CAST("Acc Status" AS VARCHAR) AS "Acc Status",
      CAST("Acc Class" AS VARCHAR) AS "Acc Class",
      CAST("ADID" AS VARCHAR) AS "ADID",
      SUM(CAST("TTL O/S Amt" AS DOUBLE)) AS "TTL O/S Amt",
      COUNT(DISTINCT "Contract Acc") AS "Number of Accounts"
    FROM read_parquet('${normalizedPath}')
    WHERE CAST("TTL O/S Amt" AS DOUBLE) > 0
    GROUP BY "Acc Status", "Acc Class", "ADID"
    ORDER BY "Acc Status", "Acc Class", "ADID"
  `;
  const adidRows = await dbAll(adidQuery);

  // MIT Amount and Num Of Acc
  const mitQuery = `
    SELECT
      SUM(CAST("MIT Amt" AS DOUBLE)) AS mitAmount,
      COUNT(DISTINCT CASE WHEN CAST("MIT Amt" AS DOUBLE) <> 0 THEN "Contract Acc" ELSE NULL END) AS mitNumOfAcc
    FROM read_parquet('${normalizedPath}')
  `;
  const [mitRow] = await dbAll(mitQuery);

  return {
    ...formatDriverTreeSummary({ root, statusClassRows, adidRows }),
    mitAmount: Number(mitRow.mitAmount) || 0,
    mitNumOfAcc: Number(mitRow.mitNumOfAcc) || 0
  };
};

// Directed Graph summary API
exports.getDirectedGraphSummary = async (parquetFilename) => {
  await initializeDuckDB(dbRun);
  const normalizedPath = path.resolve('uploads', parquetFilename).replace(/\\/g, '/');

  // Root: Total Aged Debt and Accounts
  const rootQuery = `
    SELECT
      SUM(CAST("TTL O/S Amt" AS DOUBLE)) AS totalAgedDebt,
      COUNT(DISTINCT "Contract Acc") AS totalNumOfAcc
    FROM read_parquet('${normalizedPath}')
  `;
  const [rootRow] = await dbAll(rootQuery);
  const totalAgedDebt = Number(rootRow.totalAgedDebt) || 0;
  const totalNumOfAcc = Number(rootRow.totalNumOfAcc) || 0;

  // Level 2 & 3: Status + SMER Segment, with value and accounts
  const statusSmerQuery = `
    SELECT
      CAST("Acc Status" AS VARCHAR) AS "Acc Status",
      CAST("SMER Segment" AS VARCHAR) AS "SMER Segment",
      SUM(CAST("TTL O/S Amt" AS DOUBLE)) AS "TTL O/S Amt",
      COUNT(DISTINCT "Contract Acc") AS "Number of Accounts"
    FROM read_parquet('${normalizedPath}')
    GROUP BY "Acc Status", "SMER Segment"
  `;
  const rows = await dbAll(statusSmerQuery);

  // Order for SMER Segments
  const SmerSegmentOrder = ['MASR', 'MICB', 'GNLA', 'HRES', 'MEDB', 'SMLB', 'EMRB', 'BLANKS'];

  // Group by status
  const statusMap = {};
  rows.forEach(row => {
    const status = row["Acc Status"] || "UNKNOWN";
    const smer = row["SMER Segment"] || "BLANKS";
    const value = Number(row["TTL O/S Amt"]) || 0;
    const numOfAcc = Number(row["Number of Accounts"]) || 0;
    if (!statusMap[status]) statusMap[status] = {};
    statusMap[status][smer] = { value, numOfAcc };
  });

  // Build tree structure
  const branches = Object.keys(statusMap).map(status => {
    const childrenArr = SmerSegmentOrder.map(seg => ({
      name: seg,
      value: statusMap[status][seg]?.value || 0,
      numOfAcc: statusMap[status][seg]?.numOfAcc || 0
    }));
    const statusValue = childrenArr.reduce((a, b) => a + b.value, 0);
    const statusAcc = childrenArr.reduce((a, b) => a + b.numOfAcc, 0);

    return {
      name: status,
      value: statusValue,
      numOfAcc: statusAcc,
      children: childrenArr
    };
  });

  return {
    root: {
      name: "Total Aged Debt",
      value: totalAgedDebt,
      numOfAcc: totalNumOfAcc
    },
    branches
  };
};