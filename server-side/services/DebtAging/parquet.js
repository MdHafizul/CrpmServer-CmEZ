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

/**
 * Maps DuckDB grouped debt-by-station results to include business area names.
 * @param {Array} duckDbResults - Array of objects from DuckDB query.
 * @returns {Array} - Array with business area code, name, account count, and debt.
 */
function mapBusinessAreas(duckDbResults) {
  return duckDbResults.map(row => {
    const code = String(row["Buss Area"]);
    const area = businessAreas.find(b => b.code === code);
    return {
      code,
      name: area ? area.name : "Unknown",
      noOfAccount: row["No Of Account"],
      debt: row["Debt"]
    };
  });
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

// Function to count all rows from parquet file
exports.countAllFromParquetFile = async (parquetFilename) => {
  await initializeDuckDB();
  const normalizedPath = path.resolve('uploads', parquetFilename).replace(/\\/g, '/');
  const query = `SELECT COUNT(*) AS count FROM read_parquet('${normalizedPath}')`;
  const result = await dbAll(query);
  return result[0].count;
};

// Function to count active rows from parquet file
exports.countActiveFromParquetFile = async (parquetFilename, columnName = 'Acc Status', targetValue = 'Active') => {
  await initializeDuckDB();
  const normalizedPath = path.resolve('uploads', parquetFilename).replace(/\\/g, '/');
  const query = `
    SELECT COUNT(*) AS count 
    FROM read_parquet('${normalizedPath}') 
    WHERE "${columnName}" = '${targetValue}'
  `;
  const result = await dbAll(query);
  return result[0].count;
};

// Function to process debt by station (all or specific)
exports.processDebtByStation = async (parquetFilename, station = null) => {
  await initializeDuckDB();
  const normalizedPath = path.resolve('uploads', parquetFilename).replace(/\\/g, '/');
  let query;
  if (station && station !== '') {
    // Specific station
    query = `
      SELECT 
        CAST("Buss Area" AS VARCHAR) AS "Buss Area",
        COUNT(*) AS "No Of Account",
        SUM(CAST("TTL O/S Amt" AS DOUBLE)) AS "Debt"
      FROM read_parquet('${normalizedPath}')
      WHERE "Buss Area" = '${station}'
      GROUP BY "Buss Area"
    `;
  } else {
    // All stations
    query = `
      SELECT 
        CAST("Buss Area" AS VARCHAR) AS "Buss Area",
        COUNT(*) AS "No Of Account",
        SUM(CAST("TTL O/S Amt" AS DOUBLE)) AS "Debt"
      FROM read_parquet('${normalizedPath}')
      GROUP BY "Buss Area"
      ORDER BY "Buss Area"
    `;
  }
  const result = await dbAll(query);
  return mapBusinessAreas(result);
};

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