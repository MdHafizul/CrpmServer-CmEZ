export interface SummaryCardApiResponse {
  success: boolean;
  filename: string;
  data: {
    TotalAccStatus: {
      "TTL O/S Amt": number;
      "No Of Acc": number;
    };
    Active: {
      "TTL O/S Amt": number;
      "No Of Acc": number;
      "% Of Total": string;
    };
    Inactive: {
      "TTL O/S Amt": number;
      "No Of Acc": number;
      "% Of Total": string;
    };
    TotalTradeReceivable: number;
    TotalNoOfAccTR: number;
    TotalOutstanding: {
      Amount: number;
      NumOfAcc: number;
    };
    TotalCurrentMonth: {
      Amount: number;
      NumOfAcc: number;
      TotalUndue: {
        Amount: number;
        NumOfAcc: number;
      };
      CurrentMonthUnpaid: {
        Amount: number;
        NumOfAcc: number;
      };
    };
    TotalByBalanceType: {
      TotalAgedDebtByBalanceType: number;
      TotalNoOfAccByBalanceType: number;
      PositiveBalance: number;
      TotalNoOfAccPositiveBalance: number;
      NegativeBalance: number;
      TotalNoOfAccNegativeBalance: number;
      ZeroBalance: number;
      TotalNoOfAccZeroBalance: number;
      MIT: number;
      TotalNoOfAccMIT: number;
    };
  };
}

// Filter option interface
export interface FilterOptions {
  value: string;
  label: string;
}

export interface UploadResponse {
  filename: string;
  success: boolean;
  message?: string;
}

export interface DebtByStationApiResponse {
  success: boolean;
  filename: string;
  data: {
    data: DebtByStationRow[];
    grandTotal: {
      totalNumberOfAccounts: number;
      totalTtlOSAmt: number;
      totalPercentOfTotal: string;
      totalUndue: number;
      totalCurMthUnpaid: number;
      totalUnpaid: number;
      totalMITAmt: number;
    };
  };
}

export interface DebtByStationRow {
  businessArea: string;
  station: string;
  numberOfAccounts: number;
  ttlOSAmt: number;
  percentOfTotal: string;
  totalUndue: number;
  curMthUnpaid: number;
  totalUnpaid: number;
  mitAmt: number;
}

export interface DebtByAccountClassRow {
  businessArea: string;
  station: string;
  accountClass: string;
  numberOfAccounts: number;
  ttlOSAmt: number;
  percentOfTotal: string;
  totalUndue: number;
  curMthUnpaid: number;
  totalUnpaid: number;
  mitAmt: number;
}

export interface DebtByAccountClassApiResponse {
  success: boolean;
  filename: string;
  data: {
    data: DebtByAccountClassRow[];
    stationTotals: Array<{
      businessArea: string;
      station: string;
      totalNumberOfAccounts: number;
      totalTtlOSAmt: number;
      totalPercentOfTotal: string;
      totalUndue: number;
      totalCurMthUnpaid: number;
      totalUnpaid: number;
      totalMITAmt: number;
    }>;
    grandTotal: {
      totalNumberOfAccounts: number;
      totalTtlOSAmt: number;
      totalPercentOfTotal: string;
      totalUndue: number;
      totalCurMthUnpaid: number;
      totalUnpaid: number;
      totalMITAmt: number;
    };
  };
}


export interface DebtByAccountByADIDRow {
  businessArea: string;
  station: string;
  adid: string;
  numberOfAccounts: number;
  ttlOSAmt: number;
  percentOfTotal: string;
  totalUndue: number;
  curMthUnpaid: number;
  totalUnpaid: number;
  mitAmt: number;
}

export interface DebtByAccountByADIDApiResponse {
  success: boolean;
  filename: string;
  data: {
    data: DebtByAccountByADIDRow[];
    stationTotals: Array<{
      businessArea: string;
      station: string;
      totalNumberOfAccounts: number;
      totalTtlOSAmt: number;
      totalPercentOfTotal: string;
      totalUndue: number;
      totalCurMthUnpaid: number;
      totalUnpaid: number;
      totalMITAmt: number;
    }>;
    grandTotal: {
      totalNumberOfAccounts: number;
      totalTtlOSAmt: number;
      totalPercentOfTotal: string;
      totalUndue: number;
      totalCurMthUnpaid: number;
      totalUnpaid: number;
      totalMITAmt: number;
    };
  };
}

export interface DebtByStaffRow {
  businessArea: string;
  station: string;
  numberOfAccounts: number;
  ttlOSAmt: number;
  percentOfTotal: string;
  totalUndue: number;
  curMthUnpaid: number;
  totalUnpaid: number;
}

export interface DebtByStaffApiResponse {
  success: boolean;
  filename: string;
  data: {
    data: DebtByStaffRow[];
    grandTotal: {
      totalNumberOfAccounts: number;
      totalTtlOSAmt: number;
      totalPercentOfTotal: string;
      totalUndue: number;
      totalCurMthUnpaid: number;
      totalUnpaid: number;
    };
  };
}

export interface DebtBySmerSegmentRow {
  businessArea: string;
  station: string;
  segment: string;
  numberOfAccounts: number;
  ttlOSAmt: number;
  percentOfTotal: string;
  totalUndue: number;
  curMthUnpaid: number;
  totalUnpaid: number;
  mitAmt: number;
}

export interface DebtBySmerSegmentApiResponse {
  success: boolean;
  filename: string;
  data: {
    data: DebtBySmerSegmentRow[];
    grandTotal: {
      totalNumberOfAccounts: number;
      totalTtlOSAmt: number;
      totalPercentOfTotal: string;
      totalUndue: number;
      totalCurMthUnpaid: number;
      totalUnpaid: number;
      totalMITAmt: number;
    };
  };
}