import React, { useState, useMemo } from 'react';
import { Expense, ExpenseCategory } from '../../types';
import { Card } from '../../components/common/Card';
import { ShoppingCart, Zap, Home, Building2, MoreHorizontal, PieChart as PieChartIcon } from 'lucide-react';

interface SpendingBreakdownChartProps {
  expenses: Expense[];
  currencySymbol?: string;
  className?: string;
}

interface CategoryData {
  category: ExpenseCategory;
  name: string;
  value: number;
  color: string;
  icon: React.ReactNode;
}

const CATEGORY_CONFIG: Record<
  ExpenseCategory,
  { name: string; color: string; icon: React.ReactNode }
> = {
  rent: {
    name: 'Rent',
    color: '#FF6B4A', // Coral
    icon: <Building2 className="w-4 h-4" />,
  },
  groceries: {
    name: 'Groceries',
    color: '#8B5CF6', // Violet
    icon: <ShoppingCart className="w-4 h-4" />,
  },
  utilities: {
    name: 'Utilities',
    color: '#14B8A6', // Teal
    icon: <Zap className="w-4 h-4" />,
  },
  household: {
    name: 'Household',
    color: '#3B82F6', // Blue
    icon: <Home className="w-4 h-4" />,
  },
  other: {
    name: 'Other',
    color: '#64748B', // Slate
    icon: <MoreHorizontal className="w-4 h-4" />,
  },
};

export const SpendingBreakdownChart: React.FC<SpendingBreakdownChartProps> = ({
  expenses,
  currencySymbol = '₺',
  className = '',
}) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // Filter expenses (active, agreed or pending; ignore cancelled)
  const chartData = useMemo(() => {
    const totals: Partial<Record<ExpenseCategory, number>> = {};

    expenses.forEach((exp) => {
      if (exp.status === 'cancelled') return;
      const cat = exp.category || 'other';
      totals[cat] = (totals[cat] || 0) + exp.amount;
    });

    const data: CategoryData[] = (Object.keys(CATEGORY_CONFIG) as ExpenseCategory[])
      .map((cat) => {
        const val = totals[cat] || 0;
        return {
          category: cat,
          name: CATEGORY_CONFIG[cat].name,
          value: Math.round(val * 100) / 100,
          color: CATEGORY_CONFIG[cat].color,
          icon: CATEGORY_CONFIG[cat].icon,
        };
      })
      .filter((item) => item.value > 0);

    // Sort largest first
    data.sort((a, b) => b.value - a.value);
    return data;
  }, [expenses]);

  const totalSpending = useMemo(() => {
    return chartData.reduce((sum, item) => sum + item.value, 0);
  }, [chartData]);

  if (chartData.length === 0 || totalSpending === 0) {
    return null;
  }

  const activeCategory = activeIndex !== null ? chartData[activeIndex] : null;

  // SVG Donut geometry
  const size = 180;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Compute slice offsets
  let cumulativePercent = 0;
  const slices = chartData.map((item, index) => {
    const fraction = item.value / totalSpending;
    const strokeDasharray = `${fraction * circumference} ${circumference}`;
    const strokeDashoffset = -cumulativePercent * circumference;
    cumulativePercent += fraction;
    return {
      ...item,
      strokeDasharray,
      strokeDashoffset,
      index,
    };
  });

  return (
    <Card
      padding="md"
      variant="calm"
      className={`bg-white border-2 border-[#E6E8EE] shadow-xs space-y-3 select-none ${className}`}
    >
      <div className="flex items-center justify-between pb-1 border-b border-[#E6E8EE]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-[#FFF0ED] text-[#FF6B4A] flex items-center justify-center">
            <PieChartIcon className="w-4 h-4" />
          </div>
          <div>
            <h4 className="type-section-heading">Spending breakdown</h4>
            <p className="type-secondary">Category distribution across shared purchases</p>
          </div>
        </div>
        <div className="text-right shrink-0 whitespace-nowrap pl-3">
          <span className="type-label block mb-0.5 whitespace-nowrap">Total logged</span>
          <span className="type-section-heading whitespace-nowrap">
            {currencySymbol}
            {totalSpending.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Lightweight Custom SVG Donut Chart */}
      <div className="relative h-48 w-full flex items-center justify-center">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="transform -rotate-90 overflow-visible"
        >
          {slices.map((slice) => {
            const isSelected = activeIndex === slice.index;
            const isDimmed = activeIndex !== null && !isSelected;
            return (
              <circle
                key={slice.category}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke={slice.color}
                strokeWidth={isSelected ? strokeWidth + 4 : strokeWidth}
                strokeDasharray={slice.strokeDasharray}
                strokeDashoffset={slice.strokeDashoffset}
                strokeLinecap="round"
                opacity={isDimmed ? 0.45 : 1}
                className="cursor-pointer transition-all duration-200"
                onMouseEnter={() => setActiveIndex(slice.index)}
                onMouseLeave={() => setActiveIndex(null)}
                onClick={() => setActiveIndex(activeIndex === slice.index ? null : slice.index)}
              />
            );
          })}
        </svg>

        {/* Center label inside donut */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
          <span className="type-section-heading leading-tight text-[#1F2430]">
            {activeCategory
              ? `${currencySymbol}${Math.round(activeCategory.value).toLocaleString('en-US')}`
              : `${currencySymbol}${Math.round(totalSpending).toLocaleString('en-US')}`}
          </span>
          <span className="type-secondary mt-0.5 text-[13px] text-[#475569]">
            {activeCategory
              ? `${((activeCategory.value / totalSpending) * 100).toFixed(0)}% • ${activeCategory.name}`
              : `${chartData.length} categories`}
          </span>
        </div>
      </div>

      {/* Category Breakdown Chips / Legend */}
      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#E6E8EE]">
        {chartData.map((item, idx) => {
          const pct = ((item.value / totalSpending) * 100).toFixed(0);
          const isSelected = activeIndex === idx;

          return (
            <div
              key={item.category}
              onMouseEnter={() => setActiveIndex(idx)}
              onMouseLeave={() => setActiveIndex(null)}
              onClick={() => setActiveIndex(activeIndex === idx ? null : idx)}
              className={`p-2 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                isSelected
                  ? 'border-[#1F2430] bg-[#F7F8FB] shadow-2xs'
                  : 'border-[#E6E8EE] bg-white hover:bg-[#F7F8FB]'
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-[14px] font-bold text-[#1F2430] truncate">
                  {item.name}
                </span>
              </div>
              <div className="text-right shrink-0 pl-1">
                <span className="type-section-heading block leading-none">
                  {currencySymbol}
                  {item.value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
                <span className="type-secondary">{pct}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
