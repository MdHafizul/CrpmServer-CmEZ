import type { SummaryData, DebtData } from '../types/dashboard.type.ts';

// Generate a random number between min and max
const randomNumber = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Generate a random currency amount with decimal places
const randomAmount = (min: number, max: number) => {
  return Number((Math.random() * (max - min) + min).toFixed(2));
};

// Generate mock summary data
export const mockSummaryData: SummaryData = {
  totalOutstandingAmt: randomAmount(5000000, 8000000),
  totalOutstandingAmtChange: randomNumber(-5, 10),
  totalOutstandingNumOfAccounts: randomNumber(8000, 12000),
  active: randomAmount(3000000, 5000000),
  activeNumOfAccounts: randomNumber(5000, 8000),
  inactive: randomAmount(1000000, 2000000),
  inactiveNumOfAccounts: randomNumber(2000, 4000),
  netProfit: randomAmount(800000, 1500000),
  netProfitChange: randomNumber(1, 15),
  netProfitNumOfAccounts: randomNumber(3000, 6000),
  positiveBalance: randomAmount(2000000, 3500000),
  positiveBalanceNumOfAccounts: randomNumber(1500, 3000),
  negativeBalance: randomAmount(500000, 1200000),
  negativeBalanceNumOfAccounts: randomNumber(800, 1800),
  zeroBalance: randomAmount(100000, 300000),
  zeroBalanceNumOfAccounts: randomNumber(200, 600),
  mit: randomAmount(300000, 600000),
  mitNumOfAccounts: randomNumber(800, 1500),
  totalUnpaid: randomAmount(3500000, 5600000),
  totalUnpaidNumOfAccounts: randomNumber(4000, 7000),
  currentMonthUnpaid: randomAmount(800000, 1600000),
  currentMonthUnpaidNumOfAccounts: randomNumber(1200, 2500),
  totalUndue: randomAmount(2000000, 3000000),
  totalUndueNumOfAccounts: randomNumber(2000, 4000)
};

// Mock data for business areas and stations
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

// Generate debt by station data
const generateDebtByStationData = () => {
  return businessAreas.map(area => {
    const numOfAccounts = randomNumber(100, 2000);
    const debtAmount = randomAmount(100000, 800000);
    
    // Generate Trade Receivable view amounts
    const totalUndue = randomAmount(20000, 200000);
    const curMthUnpaid = randomAmount(10000, 150000);
    const ttlOsAmt = debtAmount; // Use debt amount as TTL O/S
    const totalUnpaid = totalUndue + curMthUnpaid;
    
    return {
      businessArea: area.code,
      station: area.name,
      numOfAccounts: numOfAccounts,
      debtAmount: debtAmount,
      // Trade Receivable view fields
      totalUndue: totalUndue,
      curMthUnpaid: curMthUnpaid,
      ttlOsAmt: ttlOsAmt,
      totalUnpaid: totalUnpaid
    };
  });
};

// Generate account class data
const generateAccClassDebtSummary = () => {
  const accClasses = ['LPCG', 'LPCN', 'OPCG', 'OPCN'];
  const result = [];

  // For each business area, create entries for all account classes
  for (const area of businessAreas) {
    for (const accClass of accClasses) {
      // Randomize if this entry should have data or not (90% chance to have data)
      if (Math.random() > 0.1) {
        result.push({
          businessArea: area.code,
          station: area.name,
          accClass: accClass,
          numOfAccounts: randomNumber(20, 500),
          debtAmount: randomAmount(10000, 200000),
          // Determine if government or non-government based on account class
          type: accClass.endsWith('G') ? 'government' : 'non-government'
        });
      }
    }
  }

  return result;
}

// Generate account definition debt with aggregation
const generateAccDefinitionDebt = () => {
  const accDefinitions = ['AG', 'CM', 'DM', 'IN', 'SL', 'MN'];
  const aggregatedData = new Map();
  
  // Generate data for each combination
  for (const area of businessAreas) {
    let totalAccounts = 0;
    let totalDebt = 0;
    
    // Aggregate across all account definitions for this station
    for (const def of accDefinitions) {
      if (Math.random() > 0.4) {
        totalAccounts += randomNumber(3, 67);
        totalDebt += randomAmount(1333, 25000);
      }
    }
    
    aggregatedData.set(area.code, {
      businessArea: area.code,
      station: area.name,
      numOfAccounts: totalAccounts,
      debtAmount: totalDebt
    });
  }
  
  return Array.from(aggregatedData.values());
};

// Generate staff debt data
const generateStaffDebt = () => {
  return businessAreas.map(area => {
    const ttlOsAmt = randomAmount(5000, 100000);
    return {
      businessArea: area.code,
      station: area.name,
      numOfAccounts: randomNumber(10, 100),
      ttlOsAmt: ttlOsAmt,
      debtAmount: ttlOsAmt // Add debtAmount as required by StaffDebtData
    };
  });
};

// Generate detailed customer data
const generateDetailedCustomerData = () => {
  const result = [];
  const accClasses = ['LPCG', 'LPCN', 'OPCG', 'OPCN'];
  const accDefinitions = ['AG', 'CM', 'DM', 'IN', 'SL', 'MN'];
  const accStatuses = ['Active', 'Inactive'];
  const smerSegments = ['EMRB', 'GNLA', 'HRES', 'MASR', 'MEDB', 'MICB', 'SMLB', ''];
  
  // Generate 150 random detailed records for better filtering
  for (let i = 0; i < 150; i++) {
    const area = businessAreas[randomNumber(0, businessAreas.length - 1)];
    const lastPaymentDate = Math.random() > 0.2 ? 
      new Date(Date.now() - randomNumber(1, 365) * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : 
      null;
    
    // Generate months outstanding (0.0 to 15.9 months)
    const monthsOutstanding = randomNumber(0, 159) / 10;
    
    // Generate staff ID
    const staffId = `STF${randomNumber(1000, 9999)}`;
    
    // Generate MIT amount (0 to 5000)
    const mitAmount = randomAmount(0, 5000);
    
    // Generate main outstanding amount with better distribution
    const totalOutstandingAmt = Math.random() > 0.8 ? 
      randomAmount(-10000, -100) : 
      randomAmount(100, 150000); // Increased max amount for debt range filter
    
    // Generate Trade Receivable view amounts
    const totalUndue = randomAmount(0, 5000);
    const curMthUnpaid = randomAmount(0, 3000);
    const ttlOsAmt = Math.abs(totalOutstandingAmt);
    const totalUnpaid = totalUndue + curMthUnpaid;
    
    // Generate SMER segment
    const smerSegment = Math.random() > 0.1 ? 
      smerSegments[randomNumber(0, smerSegments.length - 1)] : 
      ''; // 10% chance of blank
    
    result.push({
      bpNo: `BP${randomNumber(10000, 99999)}`,
      contractAcc: `CA${randomNumber(100000, 999999)}`,
      contractAccountName: `Customer ${i + 1}`,
      businessArea: area.code,
      station: area.name,
      accStatus: accStatuses[randomNumber(0, 1)],
      accClass: accClasses[randomNumber(0, accClasses.length - 1)],
      accDefinition: accDefinitions[randomNumber(0, accDefinitions.length - 1)],
      totalOutstandingAmt: totalOutstandingAmt,
      lastPymtDate: lastPaymentDate,
      lastPymtAmt: lastPaymentDate ? randomAmount(50, 5000) : 0,
      monthsOutstanding: monthsOutstanding,
      staffId: staffId,
      mit: mitAmount,
      smerSegment: smerSegment, // Add SMER segment
      // Trade Receivable view fields
      totalUndue: totalUndue,
      curMthUnpaid: curMthUnpaid,
      ttlOsAmt: ttlOsAmt,
      totalUnpaid: totalUnpaid
    });
  }
  
  return result;
};

// Create mock debt data
export const mockDebtData: DebtData = {
  debtByStation: generateDebtByStationData(),
  accClassDebtSummary: generateAccClassDebtSummary(),
  accDefinitionDebt: generateAccDefinitionDebt(),
  staffDebt: generateStaffDebt(),
  detailedCustomerData: generateDetailedCustomerData()
};