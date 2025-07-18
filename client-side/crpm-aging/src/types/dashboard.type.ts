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