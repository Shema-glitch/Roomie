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

/**
 * Calculates net debt for each user from agreed expenses and settlements.
 */
export function calculateBalances(
  expenses: Expense[],
  settlements: Settlement[],
  allUserIds: string[]
): {
  userSummaries: Record<string, number>;
  simplifiedDebts: NetBalance[];
} {
  const net: Record<string, number> = {};
  allUserIds.forEach(id => {
    net[id] = 0;
  });

  // Calculate from agreed expenses
  for (const exp of expenses) {
    if (exp.status !== 'agreed' && exp.status !== 'pending') continue; // only count agreed or pending active
    
    // Check which shares are active (not disputed or cancelled)
    const validShares = exp.shares.filter(s => s.response !== 'disputed');
    for (const share of validShares) {
      if (share.userId === exp.paidBy) continue;
      // share.userId owes exp.paidBy share.shareAmount
      net[share.userId] = (net[share.userId] || 0) - share.shareAmount;
      net[exp.paidBy] = (net[exp.paidBy] || 0) + share.shareAmount;
    }
  }

  // Factor in settlements (marked_paid or confirmed)
  for (const set of settlements) {
    if (set.status === 'confirmed' || set.status === 'marked_paid') {
      // fromUser paid toUser amount
      net[set.fromUser] = (net[set.fromUser] || 0) + set.amount;
      net[set.toUser] = (net[set.toUser] || 0) - set.amount;
    }
  }

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
  };
}
