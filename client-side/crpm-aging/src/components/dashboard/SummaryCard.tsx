import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import Card from '../ui/Card';
import Skeleton from '../ui/Skeleton';
import { formatCurrency } from '../../utils/formatter';
import { getSummaryCardData } from '../../services/api';
import { useAppContext } from '../../context/AppContext';

interface PieChartData {
  name: string;
  value: number;
  numOfAcc: number;
  color: string;
  subCategories?: PieChartData[];
}

interface SummaryCardProps {
  title: string;
  data: PieChartData[];
  totalValue: number;
  totalAccounts: number;
  icon?: React.ReactNode;
  className?: string;
  extraInfo?: {
    name: string;
    value: number;
    numOfAcc: number;
    color: string;
  };
}

const SummaryCard: React.FC<SummaryCardProps> = ({
  title,
  data,
  totalValue,
  totalAccounts,
  icon,
  className = "",
  extraInfo
}) => {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0];
      const percentage = totalValue > 0 ? ((item.value / totalValue) * 100).toFixed(1) : '0';
      return (
        <div className="bg-white p-4 shadow-2xl rounded-xl border border-gray-200 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: item.payload?.color || item.color }}></div>
            <p className="font-bold text-gray-900 text-base">{item.name || label}</p>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-blue-600">
              {formatCurrency(item.value)}
            </p>
            <p className="text-sm text-gray-600 font-medium">
              {item.payload?.numOfAcc?.toLocaleString() || 'N/A'} accounts
            </p>
            <p className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
              {percentage}% of total
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  const renderCustomizedLabel = (props: any) => {
    const { cx, cy, midAngle, outerRadius, percent, index } = props;
    const RADIAN = Math.PI / 180;
    const radius = outerRadius * 1.35;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    const arrowStartRadius = outerRadius + 5;
    const arrowStartX = cx + arrowStartRadius * Math.cos(-midAngle * RADIAN);
    const arrowStartY = cy + arrowStartRadius * Math.sin(-midAngle * RADIAN);
    const arrowEndRadius = outerRadius * 1.3;
    const arrowEndX = cx + arrowEndRadius * Math.cos(-midAngle * RADIAN);
    const arrowEndY = cy + arrowEndRadius * Math.sin(-midAngle * RADIAN);
    const percentage = (percent * 100).toFixed(1);
    const textAnchor = x > cx ? 'start' : 'end';
    return (
      <g>
        <line
          x1={arrowStartX}
          y1={arrowStartY}
          x2={arrowEndX}
          y2={arrowEndY}
          stroke={data[index].color}
          strokeWidth={1.5}
        />
        <text
          x={x}
          y={y}
          fill={data[index].color}
          textAnchor={textAnchor}
          dominantBaseline="middle"
          fontSize="12"
          fontWeight="bold"
        >
          {`${percentage}%`}
        </text>
      </g>
    );
  };

  // Animation control for chart
  const [animateChart, setAnimateChart] = useState(false);

  useEffect(() => {
    // Enable animation only after first mount
    if (!animateChart) {
      const timer = setTimeout(() => setAnimateChart(true), 500);
      return () => clearTimeout(timer);
    }
  }, [animateChart]);

  const renderChart = () => {
    const chartData = data;
    if (!chartData.length) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-gray-400">
            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 01-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-sm font-medium">No data available</p>
          </div>
        </div>
      );
    }
    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <defs>
            {chartData.map((entry, index) => (
              <filter key={index} id={`shadow-${index}`}>
                <feDropShadow dx="0" dy="4" stdDeviation="8" floodOpacity="0.15" floodColor={entry.color} />
              </filter>
            ))}
          </defs>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={45}
            outerRadius={90}
            paddingAngle={3}
            dataKey="value"
            animationBegin={0}
            animationDuration={animateChart ? 1200 : 0}
            isAnimationActive={animateChart}
            stroke="white"
            strokeWidth={3}
            labelLine={false}
            label={renderCustomizedLabel}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color}
                filter={`url(#shadow-${index})`}
                style={{ cursor: 'pointer' }}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    );
  };

  const validData = data;

  return (
    <Card className={`h-auto min-h-[400px] ${className}`}>
      <div className="space-y-6">
        {/* Header with metrics */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-200">
          <div className="flex items-center gap-4">
            {icon && (
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg">
                {icon}
              </div>
            )}
            <div>
              <h3 className="text-xl font-bold text-gray-900">{title}</h3>
              <div className="flex items-center gap-6 mt-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    {formatCurrency(totalValue)}
                  </span>
                  <div className="text-sm text-gray-500">
                    <div>{totalAccounts.toLocaleString()} accounts</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Distribution Analysis */}
        <div className="space-y-4">
          <div className="h-80 bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200 p-4">
            {renderChart()}
          </div>
        </div>

        {/* Clean redesign of categories display */}
        <div className="space-y-4 pt-4 border-t border-gray-200">
          {validData.map((item, index) => {
            const percentage = totalValue > 0 ? ((item.value / totalValue) * 100).toFixed(1) : '0.0';
            const isCurrentMonth = item.name === 'Total Current Month';
            return (
              <div key={index} className={`rounded-lg overflow-hidden ${isCurrentMonth ? 'border border-blue-200' : 'border border-gray-200'}`}>
                <div className={`p-4 ${isCurrentMonth ? 'bg-blue-50' : 'bg-gray-50'}`}>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                      <h3 className="font-medium text-gray-800">{item.name}</h3>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg text-gray-900">{formatCurrency(item.value, 0, 0)}</p>
                      <p className="text-xs text-gray-500">{item.numOfAcc.toLocaleString()} accounts • {percentage}% of total</p>
                    </div>
                  </div>
                  {/* Breakdown summary for Current Month */}
                  {isCurrentMonth && item.subCategories && (
                    <div className="mt-3 flex items-center gap-4 text-xs">
                      {item.subCategories.map((sub, i) => {
                        const subPercentage = ((sub.value / item.value) * 100).toFixed(0);
                        return (
                          <div key={i} className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: sub.color }}></div>
                            <span>{sub.name}: {subPercentage}%</span>
                            <span className="text-gray-500">({formatCurrency(sub.value, 0, 0)})</span>
                            <span className="text-gray-400">({sub.numOfAcc.toLocaleString()} accounts)</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* MIT info below the chart */}
        {extraInfo && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: extraInfo.color }}></div>
              <span className="font-medium text-gray-800">{extraInfo.name}</span>
              <span className="font-bold text-lg text-gray-900 ml-2">{formatCurrency(extraInfo.value, 0, 0)}</span>
              <span className="text-xs text-gray-500 ml-2">{extraInfo.numOfAcc.toLocaleString()} accounts</span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export const SummaryCardsContainer: React.FC = () => {
  const [summaryData, setSummaryData] = useState<any>(null);
const { parquetFileName } = useAppContext(); 
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!parquetFileName) return; // Wait for filename to be available
    setLoading(true);
    getSummaryCardData(parquetFileName)
      .then(res => setSummaryData(res.data))
      .catch(() => setSummaryData(null))
      .finally(() => setLoading(false));
  }, [parquetFileName]); 

if (loading || !summaryData) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {[1, 2, 3].map(i => (
        <Card key={i} className="h-auto min-h-[400px]">
          <div className="space-y-6">
            {/* Skeleton for card header */}
            <div className="flex items-center gap-4 pb-4 border-b border-gray-200">
              <Skeleton width={48} height={48} className="rounded-xl" />
              <div>
                <Skeleton width={120} height={24} className="mb-2" />
                <Skeleton width={80} height={18} />
              </div>
            </div>
            {/* Skeleton for chart */}
            <div className="h-80 bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200 p-4 flex items-center justify-center">
              <Skeleton width="80%" height={180} className="rounded-xl mx-auto" />
            </div>
            {/* Skeleton for categories */}
            <div className="space-y-4 pt-4 border-t border-gray-200">
              {[...Array(3)].map((_, idx) => (
                <Skeleton key={idx} height={32} width="100%" className="rounded mb-2" />
              ))}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

  // Map API fields to expected variables
  const active = summaryData.Active?.["TTL O/S Amt"] ?? 0;
  const activeNumOfAccounts = summaryData.Active?.["No Of Acc"] ?? 0;
  const inactive = summaryData.Inactive?.["TTL O/S Amt"] ?? 0;
  const inactiveNumOfAccounts = summaryData.Inactive?.["No Of Acc"] ?? 0;

  const positiveBalance = summaryData.TotalByBalanceType?.PositiveBalance ?? 0;
  const positiveBalanceNumOfAccounts = summaryData.TotalByBalanceType?.TotalNoOfAccPositiveBalance ?? 0;
  const negativeBalance = summaryData.TotalByBalanceType?.NegativeBalance ?? 0;
  const negativeBalanceNumOfAccounts = summaryData.TotalByBalanceType?.TotalNoOfAccNegativeBalance ?? 0;
  const zeroBalance = summaryData.TotalByBalanceType?.ZeroBalance ?? 0;
  const zeroBalanceNumOfAccounts = summaryData.TotalByBalanceType?.TotalNoOfAccZeroBalance ?? 0;
  const mit = summaryData.TotalByBalanceType?.MIT ?? 0;
  const mitNumOfAccounts = summaryData.TotalByBalanceType?.TotalNoOfAccMIT ?? 0;

  // Trade Receivable
  const TotalTradeReceivable = summaryData.TotalTradeReceivable ?? 0;
  const TotalNoOfAccTR = summaryData.TotalNoOfAccTR ?? 0;

  // Outstanding
  const totalOutstanding = summaryData.TotalOutstanding?.Amount ?? 0;
  const totalOutstandingNumOfAcc = summaryData.TotalOutstanding?.NumOfAcc ?? 0;

  // Current Month
  const totalCurrentMonth = summaryData.TotalCurrentMonth?.Amount ?? 0;
  const totalCurrentMonthNumOfAcc = summaryData.TotalCurrentMonth?.NumOfAcc ?? 0;
  const totalUndue = summaryData.TotalCurrentMonth?.TotalUndue?.Amount ?? 0;
  const totalUndueNumOfAcc = summaryData.TotalCurrentMonth?.TotalUndue?.NumOfAcc ?? 0;
  const currentMonthUnpaid = summaryData.TotalCurrentMonth?.CurrentMonthUnpaid?.Amount ?? 0;
  const currentMonthUnpaidNumOfAcc = summaryData.TotalCurrentMonth?.CurrentMonthUnpaid?.NumOfAcc ?? 0;

  // Card 1: Trade Receivable
  const tradeReceivableData = [
    {
      name: 'Total Current Month',
      value: totalCurrentMonth,
      numOfAcc: totalCurrentMonthNumOfAcc,
      color: '#DC2626',
      subCategories: [
        {
          name: 'Total Undue',
          value: totalUndue,
          numOfAcc: totalUndueNumOfAcc,
          color: '#DC2626'
        },
        {
          name: 'Current Month Unpaid',
          value: currentMonthUnpaid,
          numOfAcc: currentMonthUnpaidNumOfAcc,
          color: '#F59E0B'
        }
      ]
    },
    {
      name: 'Total Outstanding',
      value: totalOutstanding,
      numOfAcc: totalOutstandingNumOfAcc,
      color: '#059669'
    }
  ];
  const totalTradeReceivableValue = TotalTradeReceivable;
  const totalTradeReceivableAccounts = TotalNoOfAccTR;

  // Card 2: Total Aged Debt by Status (Active + Inactive)
  const totalAgedDebt = active + inactive;
  const totalAgedDebtAccounts = activeNumOfAccounts + inactiveNumOfAccounts;
  const totalAgedDebtByStatusData = [
    {
      name: 'Active',
      value: active,
      numOfAcc: activeNumOfAccounts,
      color: '#10B981'
    },
    {
      name: 'Inactive',
      value: inactive,
      numOfAcc: inactiveNumOfAccounts,
      color: '#EF4444'
    }
  ];

  // Card 3: Total Aged Debt by Balance Type
  const balanceTypeData = [
    {
      name: 'Positive Balance',
      value: positiveBalance,
      numOfAcc: positiveBalanceNumOfAccounts,
      color: '#3B82F6'
    },
    {
      name: 'Negative Balance',
      value: Math.abs(negativeBalance),
      numOfAcc: negativeBalanceNumOfAccounts,
      color: '#EF4444'
    },
    {
      name: 'Zero Balance',
      value: zeroBalance,
      numOfAcc: zeroBalanceNumOfAccounts,
      color: '#6B7280'
    }
  ];

  const mitInfo = {
    name: 'MIT',
    value: mit,
    numOfAcc: mitNumOfAccounts,
    color: '#F59E0B'
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <SummaryCard
        title="Trade Receivable"
        data={tradeReceivableData}
        totalValue={totalTradeReceivableValue}
        totalAccounts={totalTradeReceivableAccounts}
        icon={
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        }
      />

      <SummaryCard
        title="Total Aged Debt by Status"
        data={totalAgedDebtByStatusData}
        totalValue={totalAgedDebt}
        totalAccounts={totalAgedDebtAccounts}
        icon={
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
      />

      <SummaryCard
        title="Total Aged Debt by Balance Type"
        data={balanceTypeData}
        totalValue={totalAgedDebt}
        totalAccounts={totalAgedDebtAccounts}
        icon={
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        }
        extraInfo={mitInfo}
      />
    </div>
  );
};

export default SummaryCard;