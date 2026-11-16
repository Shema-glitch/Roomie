/**
 * Roomie Phase 2: Favor Tokens Engine (Social Ledger & Chore Swaps)
 * Facilitates flexible chore trades without guilt or awkwardness.
 */

import { FavorTokenTransaction, ChoreSwapRequest } from '../types';

export const INITIAL_FAVOR_TOKENS = 5;
export const DEFAULT_SWAP_COST = 1;

export function canAffordSwap(userBalance: number, cost: number = DEFAULT_SWAP_COST): boolean {
  return userBalance >= cost;
}

export interface CreateSwapParams {
  householdId: string;
  requesterUserId: string;
  targetUserId: string;
  requesterChoreName: string;
  targetChoreName: string;
  tokenCost?: number;
  note?: string;
}

export function createChoreSwapRequest(params: CreateSwapParams): ChoreSwapRequest {
  const {
    householdId,
    requesterUserId,
    targetUserId,
    requesterChoreName,
    targetChoreName,
    tokenCost = DEFAULT_SWAP_COST,
    note,
  } = params;

  return {
    id: `swap_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    householdId,
    requesterUserId,
    targetUserId,
    requesterChoreName,
    targetChoreName,
    tokenCost,
    status: 'pending',
    note,
    createdAt: new Date().toISOString(),
  };
}

export interface ResolveSwapResult {
  updatedRequest: ChoreSwapRequest;
  transactions: FavorTokenTransaction[];
  transferred: boolean;
}

export function resolveChoreSwapRequest(
  request: ChoreSwapRequest,
  action: 'accept' | 'decline'
): ResolveSwapResult {
  if (action === 'decline') {
    return {
      updatedRequest: {
        ...request,
        status: 'declined',
      },
      transactions: [],
      transferred: false,
    };
  }

  const now = new Date().toISOString();

  // Spend transaction for requester
  const requesterTx: FavorTokenTransaction = {
    id: `tx_${Date.now()}_spend`,
    householdId: request.householdId,
    userId: request.requesterUserId,
    type: 'spend',
    amount: request.tokenCost,
    reason: 'chore_swap',
    note: `Swapped "${request.requesterChoreName}" for "${request.targetChoreName}"`,
    createdAt: now,
  };

  // Earn transaction for target
  const targetTx: FavorTokenTransaction = {
    id: `tx_${Date.now()}_earn`,
    householdId: request.householdId,
    userId: request.targetUserId,
    type: 'earn',
    amount: request.tokenCost,
    reason: 'chore_swap',
    note: `Covered "${request.requesterChoreName}" in swap with flatmate`,
    createdAt: now,
  };

  return {
    updatedRequest: {
      ...request,
      status: 'accepted',
    },
    transactions: [requesterTx, targetTx],
    transferred: true,
  };
}

export function applyTokenTransactions(
  currentBalance: number,
  transactions: FavorTokenTransaction[],
  userId: string
): number {
  let balance = currentBalance;
  for (const tx of transactions) {
    if (tx.userId === userId) {
      if (tx.type === 'earn') balance += tx.amount;
      else if (tx.type === 'spend') balance -= tx.amount;
    }
  }
  return Math.max(0, balance);
}
