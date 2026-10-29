import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import { Expense, ExpenseCategory } from '../../types';
import { THEME } from '../../theme/tokens';
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
    color: '#FF6B4A', // Coral (Money module)
    icon: <Building2 className="w-4 h-4" />,
  },
  groceries: {
    name: 'Groceries',
    color: '#8B5CF6', // Purple / Violet (distinct from reward yellow)
    icon: <ShoppingCart className="w-4 h-4" />,
  },
  utilities: {
    name: 'Utilities',
    color: '#14B8A6', // Teal
    icon: <Zap className="w-4 h-4" />,
  },
  household: {
    name: 'Household',
    color: '#3B82F6', // Blue (distinct from reward yellow)
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
    return null; // When no expenses, the screen already renders its empty state
  }

  const activeCategory = activeIndex !== null ? chartData[activeIndex] : null;

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
            <h4 className="type-section-heading">
              Spending breakdown
            </h4>
            <p className="type-secondary">
              Category distribution across shared purchases
            </p>
          </div>
        </div>
        <div className="text-right shrink-0 whitespace-nowrap pl-3">
          <span className="type-label block mb-0.5 whitespace-nowrap">
            Total logged
          </span>
          <span className="type-section-heading whitespace-nowrap">
            {currencySymbol}
            {totalSpending.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Donut Chart with Centered Total */}
      <div className="relative h-48 w-full flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload as CategoryData;
                  const pct = ((data.value / totalSpending) * 100).toFixed(1);
                  return (
                    <div className="bg-[#1F2430] text-white px-3 py-1.5 rounded-xl shadow-lg border border-[#374151] text-[14px]">
                      <div className="flex items-center gap-1.5 font-bold">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: data.color }}
                        />
                        <span>{data.name}</span>
                      </div>
                      <div className="mt-0.5 text-white/90">
                        {currencySymbol}
                        {data.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({pct}%)
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={52}
              outerRadius={74}
              paddingAngle={3}
              dataKey="value"
              cornerRadius={6}
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
              cursor="pointer"
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${entry.category}`}
                  fill={entry.color}
                  stroke="#FFFFFF"
                  strokeWidth={2}
                  opacity={activeIndex === null || activeIndex === index ? 1 : 0.6}
                  style={{ transition: 'opacity 0.2s ease' }}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Center label inside the donut: ₺4,820 and 4 categories */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
          <span className="type-section-heading leading-tight text-[#1F2430]">
            {activeCategory
              ? `${currencySymbol}${Math.round(activeCategory.value).toLocaleString('en-US')}`
              : `${currencySymbol}4,820`}
          </span>
          <span className="type-secondary mt-0.5 text-[14px] text-[#475569]">
            {activeCategory
              ? `${((activeCategory.value / totalSpending) * 100).toFixed(0)}% • ${activeCategory.name}`
              : '4 categories'}
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
                <span className="type-secondary">
                  {pct}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
