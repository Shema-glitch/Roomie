/**
 * Roomie Favor Tokens Engine (Social Ledger & Chore Swaps)
 * Facilitates flexible chore trades without guilt or awkwardness.
 * Enforces MAX_FAVOR_TOKENS = 10 anti-hoarding cap per ROADMAP.md, converting
 * excess streak/award/swap tokens into celebratory kudos instead of exceeding 10.
 */

import { FavorTokenTransaction, ChoreSwapRequest, KudosItem } from '../types';

export const INITIAL_FAVOR_TOKENS = 5;
export const MAX_FAVOR_TOKENS = 10;
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
  celebratoryKudos: KudosItem[];
}

export function resolveChoreSwapRequest(
  request: ChoreSwapRequest,
  action: 'accept' | 'decline',
  targetCurrentBalance?: number
): ResolveSwapResult {
  if (action === 'decline') {
    return {
      updatedRequest: {
        ...request,
        status: 'declined',
      },
      transactions: [],
      transferred: false,
      celebratoryKudos: [],
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

  const baseBalance = targetCurrentBalance ?? INITIAL_FAVOR_TOKENS;
  const headroom = Math.max(0, MAX_FAVOR_TOKENS - baseBalance);
  const creditedTokens = Math.min(request.tokenCost, headroom);
  const overflowTokens = Math.max(0, request.tokenCost - creditedTokens);

  // Earn transaction for target (capped at MAX_FAVOR_TOKENS headroom when target balance is known)
  const targetTx: FavorTokenTransaction = {
    id: `tx_${Date.now()}_earn`,
    householdId: request.householdId,
    userId: request.targetUserId,
    type: 'earn',
    amount: targetCurrentBalance !== undefined ? creditedTokens : request.tokenCost,
    reason: 'chore_swap',
    note:
      overflowTokens > 0
        ? `Covered "${request.requesterChoreName}" (capped at ${MAX_FAVOR_TOKENS} tokens; +${overflowTokens} converted to celebratory kudos)`
        : `Covered "${request.requesterChoreName}" in swap with flatmate`,
    createdAt: now,
  };

  const celebratoryKudos: KudosItem[] = Array.from({ length: overflowTokens }, (_, idx) => ({
    id: `kudos_cap_${Date.now()}_${idx}`,
    fromUser: request.requesterUserId,
    type: 'great_job',
    note: `Token ceiling (${MAX_FAVOR_TOKENS}/${MAX_FAVOR_TOKENS}) reached — converted excess Favor Token into celebratory kudos!`,
    createdAt: now,
  }));

  return {
    updatedRequest: {
      ...request,
      status: 'accepted',
    },
    transactions: [requesterTx, targetTx],
    transferred: true,
    celebratoryKudos,
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
  return Math.min(MAX_FAVOR_TOKENS, Math.max(0, balance));
}

export interface AwardTokensParams {
  currentBalance: number;
  amount: number;
  householdId: string;
  userId: string;
  reason: FavorTokenTransaction['reason'];
  fromUserId?: string;
  note?: string;
}

export interface AwardTokensOutcome {
  newBalance: number;
  tokensAdded: number;
  overflowConvertedToKudos: number;
  celebratoryKudos: KudosItem[];
  transaction: FavorTokenTransaction | null;
}

/**
 * Awards streak, weekly honor, or helpfulness tokens while strictly enforcing
 * MAX_FAVOR_TOKENS = 10. Any excess tokens beyond 10 are converted into
 * celebratory kudos items to prevent token hoarding.
 */
export function awardFavorTokensWithCap(params: AwardTokensParams): AwardTokensOutcome {
  const {
    currentBalance,
    amount,
    householdId,
    userId,
    reason,
    fromUserId = 'system_honors',
    note,
  } = params;

  const safeCurrent = Math.min(MAX_FAVOR_TOKENS, Math.max(0, currentBalance));
  const safeAmount = Math.max(0, amount);
  const headroom = Math.max(0, MAX_FAVOR_TOKENS - safeCurrent);
  const tokensAdded = Math.min(safeAmount, headroom);
  const overflowConvertedToKudos = Math.max(0, safeAmount - tokensAdded);
  const newBalance = safeCurrent + tokensAdded;
  const now = new Date().toISOString();

  const transaction: FavorTokenTransaction | null =
    tokensAdded > 0
      ? {
          id: `tx_${Date.now()}_${reason}`,
          householdId,
          userId,
          type: 'earn',
          amount: tokensAdded,
          reason,
          note: note || `Earned +${tokensAdded} Favor Token (${reason.replace('_', ' ')})`,
          createdAt: now,
        }
      : null;

  const celebratoryKudos: KudosItem[] = Array.from(
    { length: overflowConvertedToKudos },
    (_, idx) => ({
      id: `kudos_overflow_${Date.now()}_${idx}`,
      fromUser: fromUserId,
      type: 'great_job',
      note:
        note ||
        `Max ${MAX_FAVOR_TOKENS} Favor Tokens held — excess ${reason.replace('_', ' ')} reward converted to celebratory kudos!`,
      createdAt: now,
    })
  );

  return {
    newBalance,
    tokensAdded,
    overflowConvertedToKudos,
    celebratoryKudos,
    transaction,
  };
}
