import { Expense, Settlement } from '../types';

export interface NetBalance {
  fromUserId: string;
  toUserId: string;
  amount: number; // positive amount fromUser owes toUser
}

export interface UserBalanceSummary {
  userId: string;
  net: number; // positive = others owe user, negative = user owes others
}

export interface UserCalculationBreakdown {
  userId: string;
  totalPaidAgreed: number;
  ownShareOfOwnExpenses: number;
  owedByRoomiesToUser: number;
  owedByMeToOtherPayers: number;
  settlementsPaid: number;
  settlementsReceived: number;
  net: number;
}

/**
 * Calculates net debt for each user from agreed expenses and confirmed settlements.
 */
export function calculateBalances(
  expenses: Expense[],
  settlements: Settlement[],
  allUserIds: string[]
): {
  userSummaries: Record<string, number>;
  simplifiedDebts: NetBalance[];
  calculationBreakdowns: Record<string, UserCalculationBreakdown>;
} {
  const net: Record<string, number> = {};
  const breakdowns: Record<string, UserCalculationBreakdown> = {};

  allUserIds.forEach((id) => {
    net[id] = 0;
    breakdowns[id] = {
      userId: id,
      totalPaidAgreed: 0,
      ownShareOfOwnExpenses: 0,
      owedByRoomiesToUser: 0,
      owedByMeToOtherPayers: 0,
      settlementsPaid: 0,
      settlementsReceived: 0,
      net: 0,
    };
  });

  // Calculate ONLY from agreed expenses
  for (const exp of expenses) {
    if (exp.status !== 'agreed') continue;

    // Track total paid by payer
    if (breakdowns[exp.paidBy]) {
      breakdowns[exp.paidBy].totalPaidAgreed += exp.amount;
    }

    for (const share of exp.shares) {
      if (share.userId === exp.paidBy) {
        if (breakdowns[exp.paidBy]) {
          breakdowns[exp.paidBy].ownShareOfOwnExpenses += share.shareAmount;
        }
      } else {
        // share.userId owes exp.paidBy share.shareAmount
        net[share.userId] = (net[share.userId] || 0) - share.shareAmount;
        net[exp.paidBy] = (net[exp.paidBy] || 0) + share.shareAmount;

        if (breakdowns[share.userId]) {
          breakdowns[share.userId].owedByMeToOtherPayers += share.shareAmount;
        }
        if (breakdowns[exp.paidBy]) {
          breakdowns[exp.paidBy].owedByRoomiesToUser += share.shareAmount;
        }
      }
    }
  }

  // Factor in ONLY confirmed settlements
  for (const set of settlements) {
    if (set.status === 'confirmed') {
      // fromUser paid toUser amount -> fromUser's debt decreases, toUser's debt increases/balance decreases
      net[set.fromUser] = (net[set.fromUser] || 0) + set.amount;
      net[set.toUser] = (net[set.toUser] || 0) - set.amount;

      if (breakdowns[set.fromUser]) {
        breakdowns[set.fromUser].settlementsPaid += set.amount;
      }
      if (breakdowns[set.toUser]) {
        breakdowns[set.toUser].settlementsReceived += set.amount;
      }
    }
  }

  // Finalize net breakdown
  allUserIds.forEach((id) => {
    if (breakdowns[id]) {
      breakdowns[id].net = Math.round((net[id] || 0) * 100) / 100;
    }
  });

  // Simplify debts using greedy algorithm
  const debtors: { id: string; amount: number }[] = [];
  const creditors: { id: string; amount: number }[] = [];

  for (const id of allUserIds) {
    const val = Math.round((net[id] || 0) * 100) / 100;
    if (val < -0.01) {
      debtors.push({ id, amount: -val });
    } else if (val > 0.01) {
      creditors.push({ id, amount: val });
    }
  }

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const simplified: NetBalance[] = [];
  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];
    const settledAmount = Math.min(debtor.amount, creditor.amount);

    if (settledAmount > 0.01) {
      simplified.push({
        fromUserId: debtor.id,
        toUserId: creditor.id,
        amount: Math.round(settledAmount * 100) / 100,
      });
    }

    debtor.amount -= settledAmount;
    creditor.amount -= settledAmount;

    if (debtor.amount <= 0.01) dIdx++;
    if (creditor.amount <= 0.01) cIdx++;
  }

  return {
    userSummaries: net,
    simplifiedDebts: simplified,
    calculationBreakdowns: breakdowns,
  };
}
