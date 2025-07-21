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

// Function to build WHERE clauses based on filters
function buildWhereClauses(filters = {}) {
  const {
    viewType = "AgedDebt",
    accClassType = "ALL",
    mitType = "ALL",
    businessAreas = [],
    adids = [],
    accStatus = null,
    balanceType = null,
    accountClass = null,
    agingBucket = null,
    totalOutstandingRange = null,
    smerSegments = []
  } = filters;

  const whereClauses = ["1=1"];

  // Account Class Type
  if (accClassType === "GOVERNMENT") {
    whereClauses.push(`"Acc Class" IN ('LPCG', 'OPCG')`);
  } else if (accClassType === "NON_GOVERNMENT") {
    whereClauses.push(`"Acc Class" IN ('LPCN', 'OPCN')`);
  }

  // MIT Type (force filter if MIT)
  if (mitType === "MIT") {
    whereClauses.push(`CAST("MIT Amt" AS DOUBLE) <> 0`);
  } else if (mitType === "NON_MIT") {
    whereClauses.push(`(CAST("MIT Amt" AS DOUBLE) = 0 OR "MIT Amt" IS NULL)`);
  }
  // Business Area
  if (businessAreas.length > 0) {
    whereClauses.push(`"Buss Area" IN (${businessAreas.map(a => `'${a}'`).join(",")})`);
  }

  // ADID
  if (adids.length > 0) {
    whereClauses.push(`"ADID" IN (${adids.map(a => `'${a}'`).join(",")})`);
  }

  // Account Status
  if (accStatus) {
    whereClauses.push(`"Acc Status" = '${accStatus}'`);
  }

  // Balance Type
  if (balanceType === "Positive") {
    whereClauses.push(`CAST("TTL O/S Amt" AS DOUBLE) > 0`);
  } else if (balanceType === "Negative") {
    whereClauses.push(`CAST("TTL O/S Amt" AS DOUBLE) < 0`);
  } else if (balanceType === "Zero") {
    whereClauses.push(`CAST("TTL O/S Amt" AS DOUBLE) = 0`);
  }

  if (accountClass) {
    whereClauses.push(`"Acc Class" = '${accountClass}'`);
  }
  // Aging Bucket
  if (agingBucket) {
    const col = `CAST("No of Months Outstandings" AS DOUBLE)`;
    if (agingBucket === "0-3") whereClauses.push(`${col} >= 0 AND ${col} <= 3`);
    else if (agingBucket === "3-6") whereClauses.push(`${col} > 3 AND ${col} <= 6`);
    else if (agingBucket === "6-9") whereClauses.push(`${col} > 6 AND ${col} <= 9`);
    else if (agingBucket === "9-12") whereClauses.push(`${col} > 9 AND ${col} <= 12`);
    else if (agingBucket === ">12") whereClauses.push(`${col} > 12`);
  }

  // Total Outstanding Range
  if (totalOutstandingRange && typeof totalOutstandingRange.min === "number" && typeof totalOutstandingRange.max === "number") {
    whereClauses.push(`CAST("TTL O/S Amt" AS DOUBLE) BETWEEN ${totalOutstandingRange.min} AND ${totalOutstandingRange.max}`);
  }

  // SMER Segment
  if (smerSegments.length > 0) {
    const nonBlankSegments = smerSegments.filter(s => s !== "Blanks").map(s => `'${s}'`);
    let segmentClause = [];
    if (nonBlankSegments.length > 0) segmentClause.push(`"SMER Segment" IN (${nonBlankSegments.join(",")})`);
    if (smerSegments.includes("Blanks")) segmentClause.push(`("SMER Segment" IS NULL OR "SMER Segment" = '')`);
    if (segmentClause.length > 0) whereClauses.push(`(${segmentClause.join(" OR ")})`);
  }

  return whereClauses.join(" AND ");
}

// DuckDB initialization helper
let isInitialized = false;
async function initializeDuckDB(dbRun) {
  if (isInitialized) return;
  try {
    await dbRun("INSTALL spatial;");
    await dbRun("LOAD spatial;");
    isInitialized = true;
  } catch (err) {
    console.error("DuckDB extension load error:", err);
  }
}

// Business area mapping and helper
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

function getBusinessAreaName(code) {
  const area = businessAreas.find(b => b.code === String(code));
  return area ? area.name : "Unknown";
}

function formatPercent(numerator, denominator) {
  return denominator > 0 ? ((numerator / denominator) * 100).toFixed(2) : "0.00";
}

function sumFields(arr, fields) {
  return fields.reduce((totals, field) => {
    totals[field] = arr.reduce((sum, row) => sum + (Number(row[field]) || 0), 0);
    return totals;
  }, {});
}

// Table 1: By Station
function formatStationSummary(result, getBusinessAreaName, isAgedDebtView = false, filters = {}) {
  const totalTtlOSAmt = result.reduce((sum, row) => sum + Number(row["TTL O/S Amt"]), 0);
  const totalAccounts = result.reduce((sum, row) => sum + Number(row["Number of Accounts"]), 0);
  const totalMITAmt = result.reduce((sum, row) => sum + (Number(row["MIT Amt"]) || 0), 0);

  const data = result.map(row => {
    const base = {
      businessArea: String(row["Buss Area"]),
      station: getBusinessAreaName(row["Buss Area"]),
      numberOfAccounts: Number(row["Number of Accounts"]) || 0,
      ttlOSAmt: Number(row["TTL O/S Amt"]) || 0,
      percentOfTotal: formatPercent(Number(row["TTL O/S Amt"]), totalTtlOSAmt)
    };
    if (!isAgedDebtView) {
      base.totalUndue = Number(row["Total Undue"]) || 0;
      base.curMthUnpaid = Number(row["Cur.Mth Unpaid"]) || 0;
      base.totalUnpaid = Number(row["Total Unpaid"]) || 0;
      if (filters && filters.mitType === "MIT") {
        base.mitAmt = Number(row["MIT Amt"]) || 0;
      }
    }
    return base;
  }).sort((a, b) => Number(b.percentOfTotal) - Number(a.percentOfTotal));

  const grandTotal = {
    totalNumberOfAccounts: totalAccounts,
    totalTtlOSAmt,
    totalPercentOfTotal: "100.00"
  };
  if (!isAgedDebtView) {
    grandTotal.totalUndue = result.reduce((sum, row) => sum + Number(row["Total Undue"] || 0), 0);
    grandTotal.totalCurMthUnpaid = result.reduce((sum, row) => sum + Number(row["Cur.Mth Unpaid"] || 0), 0);
    grandTotal.totalUnpaid = result.reduce((sum, row) => sum + Number(row["Total Unpaid"] || 0), 0);
    if (filters && filters.mitType === "MIT") {
      grandTotal.totalMITAmt = totalMITAmt;
    }
  }

  return { data, grandTotal };
}

// Table 2: By Account Class
function formatAccountClassSummary(result, getBusinessAreaName, accountClassOrder, isAgedDebtView = false, filters = {}) {
  const totalAccounts = result.reduce((sum, row) => sum + Number(row["Number of Accounts"]), 0);
  const totalTtlOSAmt = result.reduce((sum, row) => sum + Number(row["TTL O/S Amt"]), 0);
  const totalMITAmt = result.reduce((sum, row) => sum + (Number(row["MIT Amt"]) || 0), 0);

  // Group by business area
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
      percentOfTotal: formatPercent(Number(row["Number of Accounts"]), totalAccounts)
    };
    if (!isAgedDebtView) {
      grouped[businessArea].classes[row["Acc Class"]].totalUndue = Number(row["Total Undue"]) || 0;
      grouped[businessArea].classes[row["Acc Class"]].curMthUnpaid = Number(row["Cur.Mth Unpaid"]) || 0;
      grouped[businessArea].classes[row["Acc Class"]].totalUnpaid = Number(row["Total Unpaid"]) || 0;
      if (filters && filters.mitType === "MIT") {
        grouped[businessArea].classes[row["Acc Class"]].mitAmt = Number(row["MIT Amt"]) || 0;
      }
    }
  });

  // Flatten to array, always in order for each station
  const data = [];
  Object.values(grouped).forEach(station => {
    accountClassOrder.forEach(accClass => {
      const cls = station.classes[accClass];
      if (cls) {
        const base = {
          businessArea: station.businessArea,
          station: station.station,
          accountClass: accClass,
          numberOfAccounts: cls.numberOfAccounts,
          ttlOSAmt: cls.ttlOSAmt,
          percentOfTotal: cls.percentOfTotal
        };
        if (!isAgedDebtView) {
          base.totalUndue = cls.totalUndue;
          base.curMthUnpaid = cls.curMthUnpaid;
          base.totalUnpaid = cls.totalUnpaid;
          if (filters && filters.mitType === "MIT") {
            base.mitAmt = cls.mitAmt || 0;
          }
        }
        data.push(base);
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
    let totalMITAmtStation = 0;
    Object.values(station.classes).forEach(cls => {
      totalNumberOfAccounts += cls.numberOfAccounts;
      totalTtlOSAmt += cls.ttlOSAmt;
      if (!isAgedDebtView) {
        totalUndue += cls.totalUndue;
        totalCurMthUnpaid += cls.curMthUnpaid;
        totalUnpaid += cls.totalUnpaid;
        if (filters && filters.mitType === "MIT") {
          totalMITAmtStation += cls.mitAmt || 0;
        }
      }
    });
    const base = {
      businessArea: station.businessArea,
      station: station.station,
      totalNumberOfAccounts,
      totalTtlOSAmt,
      totalPercentOfTotal: formatPercent(totalNumberOfAccounts, totalAccounts)
    };
    if (!isAgedDebtView) {
      base.totalUndue = totalUndue;
      base.totalCurMthUnpaid = totalCurMthUnpaid;
      base.totalUnpaid = totalUnpaid;
      if (filters && filters.mitType === "MIT") {
        base.totalMITAmt = totalMITAmtStation;
      }
    }
    return base;
  }).sort((a, b) => Number(b.totalPercentOfTotal) - Number(a.totalPercentOfTotal));

  // Grand total
  const grandTotal = {
    totalNumberOfAccounts: totalAccounts,
    totalTtlOSAmt,
    totalPercentOfTotal: "100.00"
  };
  if (!isAgedDebtView) {
    grandTotal.totalUndue = result.reduce((sum, row) => sum + Number(row["Total Undue"] || 0), 0);
    grandTotal.totalCurMthUnpaid = result.reduce((sum, row) => sum + Number(row["Cur.Mth Unpaid"] || 0), 0);
    grandTotal.totalUnpaid = result.reduce((sum, row) => sum + Number(row["Total Unpaid"] || 0), 0);
    if (filters && filters.mitType === "MIT") {
      grandTotal.totalMITAmt = totalMITAmt;
    }
  }

  return { data, stationTotals, grandTotal };
}

// Table 3: By ADID
function formatADIDSummary(result, getBusinessAreaName, adidOrder, isAgedDebtView = false, filters = {}) {
  const totalAccounts = result.reduce((sum, row) => sum + Number(row["Number of Accounts"]), 0);
  const totalTtlOSAmt = result.reduce((sum, row) => sum + Number(row["TTL O/S Amt"]), 0);
  const totalMITAmt = result.reduce((sum, row) => sum + (Number(row["MIT Amt"]) || 0), 0);

  // Group by business area
  const grouped = {};
  result.forEach(row => {
    const businessArea = String(row["Buss Area"]);
    if (!grouped[businessArea]) {
      grouped[businessArea] = {
        businessArea,
        station: getBusinessAreaName(businessArea),
        adids: {}
      };
    }
    grouped[businessArea].adids[row["ADID"]] = {
      adid: String(row["ADID"]),
      numberOfAccounts: Number(row["Number of Accounts"]) || 0,
      ttlOSAmt: Number(row["TTL O/S Amt"]) || 0,
      percentOfTotal: formatPercent(Number(row["Number of Accounts"]), totalAccounts)
    };
    if (!isAgedDebtView) {
      grouped[businessArea].adids[row["ADID"]].totalUndue = Number(row["Total Undue"]) || 0;
      grouped[businessArea].adids[row["ADID"]].curMthUnpaid = Number(row["Cur.Mth Unpaid"]) || 0;
      grouped[businessArea].adids[row["ADID"]].totalUnpaid = Number(row["Total Unpaid"]) || 0;
      if (filters && filters.mitType === "MIT") {
        grouped[businessArea].adids[row["ADID"]].mitAmt = Number(row["MIT Amt"]) || 0;
      }
    }
  });

  // Flatten to array, always in order for each station
  const data = [];
  Object.values(grouped).forEach(station => {
    adidOrder.forEach(adid => {
      const adidData = station.adids[adid];
      if (adidData) {
        const base = {
          businessArea: station.businessArea,
          station: station.station,
          adid: adid,
          numberOfAccounts: adidData.numberOfAccounts,
          ttlOSAmt: adidData.ttlOSAmt,
          percentOfTotal: adidData.percentOfTotal
        };
        if (!isAgedDebtView) {
          base.totalUndue = adidData.totalUndue;
          base.curMthUnpaid = adidData.curMthUnpaid;
          base.totalUnpaid = adidData.totalUnpaid;
          if (filters && filters.mitType === "MIT") {
            base.mitAmt = adidData.mitAmt || 0;
          }
        }
        data.push(base);
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
    let totalMITAmtStation = 0;
    adidOrder.forEach(adid => {
      const adidData = station.adids[adid];
      if (adidData) {
        totalNumberOfAccounts += adidData.numberOfAccounts;
        totalTtlOSAmt += adidData.ttlOSAmt;
        if (!isAgedDebtView) {
          totalUndue += adidData.totalUndue;
          totalCurMthUnpaid += adidData.curMthUnpaid;
          totalUnpaid += adidData.totalUnpaid;
          if (filters && filters.mitType === "MIT") {
            totalMITAmtStation += adidData.mitAmt || 0;
          }
        }
      }
    });
    const base = {
      businessArea: station.businessArea,
      station: station.station,
      totalNumberOfAccounts,
      totalTtlOSAmt,
      totalPercentOfTotal: formatPercent(totalNumberOfAccounts, totalAccounts)
    };
    if (!isAgedDebtView) {
      base.totalUndue = totalUndue;
      base.totalCurMthUnpaid = totalCurMthUnpaid;
      base.totalUnpaid = totalUnpaid;
      if (filters && filters.mitType === "MIT") {
        base.totalMITAmt = totalMITAmtStation;
      }
    }
    return base;
  }).sort((a, b) => Number(b.totalPercentOfTotal) - Number(a.totalPercentOfTotal));

  // Grand total
  const grandTotal = {
    totalNumberOfAccounts: totalAccounts,
    totalTtlOSAmt,
    totalPercentOfTotal: "100.00"
  };
  if (!isAgedDebtView) {
    grandTotal.totalUndue = result.reduce((sum, row) => sum + Number(row["Total Undue"] || 0), 0);
    grandTotal.totalCurMthUnpaid = result.reduce((sum, row) => sum + Number(row["Cur.Mth Unpaid"] || 0), 0);
    grandTotal.totalUnpaid = result.reduce((sum, row) => sum + Number(row["Total Unpaid"] || 0), 0);
    if (filters && filters.mitType === "MIT") {
      grandTotal.totalMITAmt = totalMITAmt;
    }
  }

  return { data, stationTotals, grandTotal };
}

// Table 5: By SMER Segment
function formatSMERSegmentSummary(result, getBusinessAreaName, SmerSegmentOrder, isAgedDebtView = false, filters = {}) {
  const totalAccounts = result.reduce((sum, row) => sum + Number(row["Number of Accounts"]), 0);
  const totalTtlOSAmt = result.reduce((sum, row) => sum + Number(row["TTL O/S Amt"]), 0);
  const totalMITAmt = result.reduce((sum, row) => sum + (Number(row["MIT Amt"]) || 0), 0);

  // Group by business area
  const grouped = {};
  result.forEach(row => {
    const businessArea = String(row["Buss Area"]);
    if (!grouped[businessArea]) {
      grouped[businessArea] = {
        businessArea,
        station: getBusinessAreaName(businessArea),
        segments: {}
      };
    }
    grouped[businessArea].segments[row["SMER Segment"]] = {
      segment: String(row["SMER Segment"]),
      numberOfAccounts: Number(row["Number of Accounts"]) || 0,
      ttlOSAmt: Number(row["TTL O/S Amt"]) || 0,
      percentOfTotal: formatPercent(Number(row["Number of Accounts"]), totalAccounts)
    };
    if (!isAgedDebtView) {
      grouped[businessArea].segments[row["SMER Segment"]].totalUndue = Number(row["Total Undue"]) || 0;
      grouped[businessArea].segments[row["SMER Segment"]].curMthUnpaid = Number(row["Cur.Mth Unpaid"]) || 0;
      grouped[businessArea].segments[row["SMER Segment"]].totalUnpaid = Number(row["Total Unpaid"]) || 0;
      if (filters && filters.mitType === "MIT") {
        grouped[businessArea].segments[row["SMER Segment"]].mitAmt = Number(row["MIT Amt"]) || 0;
      }
    }
  });

  // Flatten to array, always in order for each station
  const data = [];
  Object.values(grouped).forEach(station => {
    Object.values(station.segments).forEach(segment => {
      const base = {
        businessArea: station.businessArea,
        station: station.station,
        segment: segment.segment,
        numberOfAccounts: segment.numberOfAccounts,
        ttlOSAmt: segment.ttlOSAmt,
        percentOfTotal: segment.percentOfTotal
      };
      if (!isAgedDebtView) {
        base.totalUndue = segment.totalUndue;
        base.curMthUnpaid = segment.curMthUnpaid;
        base.totalUnpaid = segment.totalUnpaid;
        if (filters && filters.mitType === "MIT") {
          base.mitAmt = segment.mitAmt || 0;
        }
      }
      data.push(base);
    });
  });

  // Station totals (optional, not usually needed for SMER, but can be added like others)

  // Station totals
  const stationTotals = Object.values(grouped).map(station => {
    let totalNumberOfAccounts = 0;
    let totalTtlOSAmt = 0;
    let totalUndue = 0;
    let totalCurMthUnpaid = 0;
    let totalUnpaid = 0;
    let totalMITAmtStation = 0;
    SmerSegmentOrder.forEach(smerSegment => {
      const smerSegmentData = station.segments[smerSegment]; // <-- fix here
      if (smerSegmentData) {
        totalNumberOfAccounts += smerSegmentData.numberOfAccounts;
        totalTtlOSAmt += smerSegmentData.ttlOSAmt;
        if (!isAgedDebtView) {
          totalUndue += smerSegmentData.totalUndue;
          totalCurMthUnpaid += smerSegmentData.curMthUnpaid;
          totalUnpaid += smerSegmentData.totalUnpaid;
          if (filters && filters.mitType === "MIT") {
            totalMITAmtStation += smerSegmentData.mitAmt || 0;
          }
        }
      }
    });
    const base = {
      businessArea: station.businessArea,
      station: station.station,
      totalNumberOfAccounts,
      totalTtlOSAmt,
      totalPercentOfTotal: formatPercent(totalNumberOfAccounts, totalAccounts)
    };
    if (!isAgedDebtView) {
      base.totalUndue = totalUndue;
      base.totalCurMthUnpaid = totalCurMthUnpaid;
      base.totalUnpaid = totalUnpaid;
      if (filters && filters.mitType === "MIT") {
        base.totalMITAmt = totalMITAmtStation;
      }
    }
    return base;
  }).sort((a, b) => Number(b.totalPercentOfTotal) - Number(a.totalPercentOfTotal));

  // Grand total
  const grandTotal = {
    totalNumberOfAccounts: totalAccounts,
    totalTtlOSAmt,
    totalPercentOfTotal: "100.00"
  };
  if (!isAgedDebtView) {
    grandTotal.totalUndue = result.reduce((sum, row) => sum + Number(row["Total Undue"] || 0), 0);
    grandTotal.totalCurMthUnpaid = result.reduce((sum, row) => sum + Number(row["Cur.Mth Unpaid"] || 0), 0);
    grandTotal.totalUnpaid = result.reduce((sum, row) => sum + Number(row["Total Unpaid"] || 0), 0);
    if (filters && filters.mitType === "MIT") {
      grandTotal.totalMITAmt = totalMITAmt;
    }
  }

  return { data, stationTotals, grandTotal };
}

// Table 6: Detailed Table Summary
function formatDetailedTableSummary(result, getBusinessAreaName, isAgedDebtView = false, filters = {}) {
  const formatted = result.map(row => {
    const base = {
      businessArea: String(row["Buss Area"]),
      station: getBusinessAreaName(row["Buss Area"]),
      contractAcc: String(row["Contract Acc"]),
      contractAccountName: String(row["Contract Account Name"]),
      adid: String(row["ADID"]),
      accClass: String(row["Acc Class"]),
      accStatus: String(row["Acc Status"]),
      noOfMonthsOutstanding: Number(row["No of Months Outstanding"]),
      staffId: String(row["Staff ID"]),
      mitAmt: Number(row["MIT Amt"]),
      lastPymtDate: String(row["Last Payment Date"]),
      lastPymtAmt: Number(row["Last Payment Amount"]),
      ttlOSAmt: Number(row["TTL O/S Amt"])
    };
    if (!isAgedDebtView) {
      base.totalUndue = Number(row["Total Undue"]) || 0;
      base.curMthUnpaid = Number(row["Cur.Mth Unpaid"]) || 0;
      base.totalUnpaid = Number(row["Total Unpaid"]) || 0;
    }
    return base;
  });

  return formatted.sort((a, b) => Number(b.ttlOSAmt) - Number(a.ttlOSAmt));
}

module.exports = {
  convertBigIntToNumber,
  getFileReader,
  convertBigIntsInObject,
  buildWhereClauses,
  initializeDuckDB,
  getBusinessAreaName,
  formatStationSummary,
  formatAccountClassSummary,
  formatADIDSummary,
  formatSMERSegmentSummary,
  formatDetailedTableSummary,
  formatPercent,
  sumFields
};