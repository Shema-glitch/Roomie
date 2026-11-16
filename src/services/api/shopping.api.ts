/**
 * Roomie Shopping & Apartment Info API (Phase 3 Real-Life Flat Tools)
 * - Windowed queries (latest 60 items with explicit projections)
 * - Idempotent offline mutations with outbox queue + localCache sync
 * - Interactive supermarket departure ping & receipt-ready cart conversion
 */

import {
  ShoppingItem,
  ShoppingItemCategory,
  ShoppingItemStatus,
  HouseholdInfoCard,
} from '../../types';
import {
  AppStore,
  makeEntityId,
  isUuid,
  createDomainLogger,
  dispatchRemoteMutation,
} from './shared';
import { OutboxActionType, outbox } from '../outbox';
import { DebugModule } from '../../utils/debugLog';
import { supabase } from '../supabase';

const logger = createDomainLogger('ShoppingAPI', 'social');

export interface ShoppingContext {
  store: AppStore;
  save: (s?: AppStore) => void;
  isDemoMode: () => boolean;
  dispatchRemoteMutation: <T>(
    householdId: string,
    module: DebugModule,
    outboxType: OutboxActionType,
    payload: T,
    summary: string,
    remoteExec: () => Promise<{ error: { message: string; code?: string } | null } | void>
  ) => void;
}

export class ShoppingApi {
  private getStoreFn: () => AppStore;
  private ctx?: ShoppingContext;

  constructor(storeOrContext: (() => AppStore) | ShoppingContext) {
    if (typeof storeOrContext === 'function') {
      this.getStoreFn = storeOrContext;
    } else {
      this.ctx = storeOrContext;
      this.getStoreFn = () => storeOrContext.store;
    }
  }

  private getStore(): AppStore {
    return this.ctx ? this.ctx.store : this.getStoreFn();
  }

  private save(store?: AppStore): void {
    if (this.ctx) {
      this.ctx.save(store);
    } else if (store) {
      Object.assign(this.getStoreFn(), store);
    }
  }

  private isDemoMode(): boolean {
    if (this.ctx) return this.ctx.isDemoMode();
    const store = this.getStore();
    return store.householdSetupMode === 'demo' || !isUuid(store.activeHouseholdId);
  }

  private dispatchShoppingOutbox<T>(
    householdId: string,
    outboxType: OutboxActionType,
    payload: T,
    summary: string,
    remoteExec: () => Promise<{ error: { message: string; code?: string } | null } | void>
  ): void {
    const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
    if (this.ctx && !this.isDemoMode() && isUuid(householdId)) {
      this.ctx.dispatchRemoteMutation(
        householdId,
        'social',
        outboxType,
        payload,
        summary,
        remoteExec
      );
      return;
    }

    if (!this.isDemoMode() && isUuid(householdId)) {
      dispatchRemoteMutation(
        false,
        householdId,
        'social',
        outboxType,
        payload,
        summary,
        remoteExec
      );
      return;
    }

    if (isOffline) {
      outbox.enqueue(householdId, outboxType, payload);
    }
  }

  // ---------------------------------------------------------------------------
  // 1. Shared Shopping List Operations
  // ---------------------------------------------------------------------------

  public async getShoppingItems(householdId?: string): Promise<ShoppingItem[]> {
    const store = this.getStore();
    const hId = householdId || store.activeHouseholdId;
    if (!store.shoppingItems) store.shoppingItems = {};
    const localList = store.shoppingItems[hId] || [];

    if (this.isDemoMode() || !supabase || !isUuid(hId)) {
      return localList;
    }

    try {
      const { data, error } = await supabase
        .from('shopping_items')
        .select(
          'id, household_id, title, category, quantity_label, is_low, status, added_by, claimed_by, created_at, updated_at'
        )
        .eq('household_id', hId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(60);

      if (error) {
        logger.warn('get_shopping_items', `Remote fetch error: ${error.message}`, { error });
        return localList;
      }

      if (data && data.length > 0) {
        const remoteMapped: ShoppingItem[] = data.map((d) => ({
          id: d.id,
          householdId: d.household_id,
          title: d.title,
          category: (d.category as ShoppingItemCategory) || 'groceries',
          quantityLabel: d.quantity_label || '',
          isLow: Boolean(d.is_low),
          status: (d.status as ShoppingItemStatus) || 'needed',
          addedBy: d.added_by,
          claimedBy: d.claimed_by,
          createdAt: d.created_at,
          updatedAt: d.updated_at,
        }));

        const remoteIds = new Set(remoteMapped.map((r) => r.id));
        const pendingOptimistic = localList.filter((l) => !remoteIds.has(l.id));
        const merged = [...pendingOptimistic, ...remoteMapped];
        store.shoppingItems[hId] = merged;
        this.save(store);
        return merged;
      }
    } catch (err: unknown) {
      logger.warn('get_shopping_items', 'Exception fetching items', {
        err: err instanceof Error ? err.message : String(err),
      });
    }

    return localList;
  }

  public async addShoppingItem(params: {
    title: string;
    category?: ShoppingItemCategory;
    quantityLabel?: string;
    isLow?: boolean;
    householdId?: string;
  }): Promise<{ success: boolean; item?: ShoppingItem; error?: string }> {
    const store = this.getStore();
    const hId = params.householdId || store.activeHouseholdId;
    const addedBy = store.currentUser.id;

    const trimmedTitle = params.title.trim();
    if (!trimmedTitle) {
      return { success: false, error: 'Item title cannot be empty.' };
    }
    if (trimmedTitle.length > 80) {
      return { success: false, error: 'Item title cannot exceed 80 characters.' };
    }

    const trimmedQty = (params.quantityLabel || '').trim();
    if (trimmedQty.length > 30) {
      return { success: false, error: 'Quantity label cannot exceed 30 characters.' };
    }

    const item: ShoppingItem = {
      id: !this.isDemoMode() && isUuid(hId) ? makeEntityId('shop', true) : `shop_${Date.now()}`,
      householdId: hId,
      title: trimmedTitle,
      category: params.category || 'groceries',
      quantityLabel: trimmedQty,
      isLow: Boolean(params.isLow),
      status: 'needed',
      addedBy,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (!store.shoppingItems) store.shoppingItems = {};
    if (!store.shoppingItems[hId]) store.shoppingItems[hId] = [];
    store.shoppingItems[hId].unshift(item);
    this.save(store);

    logger.info('add_shopping_item', `Added item: ${item.title}`, {
      itemId: item.id,
      category: item.category,
      isLow: item.isLow,
    });

    this.dispatchShoppingOutbox(
      hId,
      'add_shopping_item',
      item,
      `Added shopping item: ${item.title}`,
      async () => {
        if (!supabase) return;
        const { error } = await supabase.from('shopping_items').insert({
          id: item.id,
          household_id: item.householdId,
          title: item.title,
          category: item.category,
          quantity_label: item.quantityLabel,
          is_low: item.isLow,
          status: item.status,
          added_by: item.addedBy,
        });
        return { error: error ? { message: error.message, code: error.code } : null };
      }
    );

    return { success: true, item };
  }

  public async toggleShoppingItemStatus(
    itemId: string,
    newStatus: ShoppingItemStatus,
    householdId?: string
  ): Promise<{ success: boolean; item?: ShoppingItem }> {
    const store = this.getStore();
    const hId = householdId || store.activeHouseholdId;
    const currentUserId = store.currentUser.id;

    if (!store.shoppingItems) store.shoppingItems = {};
    if (!store.shoppingItems[hId]) store.shoppingItems[hId] = [];

    const item = store.shoppingItems[hId].find((i) => i.id === itemId);
    if (!item) {
      return { success: false };
    }

    item.status = newStatus;
    item.claimedBy = newStatus === 'in_cart' ? currentUserId : (newStatus === 'needed' ? null : item.claimedBy);
    item.updatedAt = new Date().toISOString();
    this.save(store);

    logger.info('toggle_shopping_item', `Set item ${itemId} to ${newStatus}`, {
      itemId,
      newStatus,
      claimedBy: item.claimedBy,
    });

    this.dispatchShoppingOutbox(
      hId,
      'toggle_shopping_item',
      { itemId, newStatus, claimedBy: item.claimedBy },
      `Toggled item ${item.title} to ${newStatus}`,
      async () => {
        if (!supabase) return;
        const { error } = await supabase
          .from('shopping_items')
          .update({
            status: newStatus,
            claimed_by: item.claimedBy ?? null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', itemId);
        return { error: error ? { message: error.message, code: error.code } : null };
      }
    );

    return { success: true, item };
  }

  public async convertCartToExpense(
    itemIds: string[],
    householdId?: string
  ): Promise<{ success: boolean; error?: string }> {
    const store = this.getStore();
    const hId = householdId || store.activeHouseholdId;

    if (!store.shoppingItems) store.shoppingItems = {};
    if (!store.shoppingItems[hId]) store.shoppingItems[hId] = [];

    const now = new Date().toISOString();
    store.shoppingItems[hId] = store.shoppingItems[hId].map((item) => {
      if (itemIds.includes(item.id)) {
        return { ...item, status: 'bought' as ShoppingItemStatus, updatedAt: now };
      }
      return item;
    });

    this.save(store);
    logger.info('convert_cart_to_expense', `Converted ${itemIds.length} items to bought`, {
      householdId: hId,
      itemCount: itemIds.length,
    });

    this.dispatchShoppingOutbox(
      hId,
      'toggle_shopping_item',
      { itemIds, status: 'purchased' },
      `Converted ${itemIds.length} shopping items to expense`,
      async () => {
        if (!supabase) return;
        const { error } = await supabase
          .from('shopping_items')
          .update({ status: 'purchased', updated_at: now })
          .in('id', itemIds);
        return { error: error ? { message: error.message, code: error.code } : null };
      }
    );

    return { success: true };
  }

  public async deleteShoppingItem(
    itemId: string,
    householdId?: string
  ): Promise<{ success: boolean }> {
    const store = this.getStore();
    const hId = householdId || store.activeHouseholdId;

    if (!store.shoppingItems) store.shoppingItems = {};
    if (!store.shoppingItems[hId]) store.shoppingItems[hId] = [];

    store.shoppingItems[hId] = store.shoppingItems[hId].filter((i) => i.id !== itemId);
    this.save(store);

    logger.info('delete_shopping_item', `Deleted item ${itemId}`);

    this.dispatchShoppingOutbox(
      hId,
      'delete_shopping_item',
      { itemId },
      `Deleted shopping item ${itemId}`,
      async () => {
        if (!supabase) return;
        const { error } = await supabase
          .from('shopping_items')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', itemId);
        return { error: error ? { message: error.message, code: error.code } : null };
      }
    );

    return { success: true };
  }

  public async triggerSupermarketPing(
    householdId?: string
  ): Promise<{ success: boolean; messageId: string }> {
    const store = this.getStore();
    const hId = householdId || store.activeHouseholdId;
    const user = store.currentUser;
    const userName = user.name.split(' ')[0] || 'Roommate';

    const messageId = `msg_ping_${Date.now()}`;
    const activityBody = `${userName} is heading to the supermarket! 🛒 Tap to add any last-minute items to the flat shopping list.`;

    // Post to chat activity messages
    if (!store.messages) store.messages = {};
    if (!store.messages[hId]) store.messages[hId] = [];
    store.messages[hId].push({
      id: messageId,
      householdId: hId,
      senderId: null,
      type: 'activity',
      body: activityBody,
      createdAt: new Date().toISOString(),
    });

    // Alert flatmates via notifications
    if (store.notifications) {
      store.users
        .filter((u) => u.id !== user.id)
        .forEach((u) => {
          store.notifications.unshift({
            id: `notif_shop_${Date.now()}_${u.id}`,
            userId: u.id,
            type: 'household',
            title: 'Supermarket Run! 🛒',
            body: `${userName} is heading out to shop. Check the shared list!`,
            read: false,
            createdAt: new Date().toISOString(),
            linkTarget: { screen: 'feed' },
          });
        });
    }

    this.save(store);
    logger.info('trigger_supermarket_ping', `${userName} triggered supermarket ping`, {
      userId: user.id,
      householdId: hId,
    });

    this.dispatchShoppingOutbox(
      hId,
      'trigger_supermarket_ping',
      { userId: user.id, messageId },
      `${userName} Supermarket departure ping`,
      async () => {
        if (!supabase) return;
        const { error } = await supabase.from('chat_messages').insert({
          id: !this.isDemoMode() && isUuid(hId) ? makeEntityId('msg', true) : undefined,
          household_id: hId,
          type: 'activity',
          body: activityBody,
        });
        return { error: error ? { message: error.message, code: error.code } : null };
      }
    );

    return { success: true, messageId };
  }

  // ---------------------------------------------------------------------------
  // 2. Members-Only Apartment Info & Wi-Fi Card
  // ---------------------------------------------------------------------------

  public async getHouseholdInfoCard(
    householdId?: string
  ): Promise<HouseholdInfoCard | null> {
    const store = this.getStore();
    const hId = householdId || store.activeHouseholdId;
    if (!store.infoCards) store.infoCards = {};
    const localCard = store.infoCards[hId] || null;

    if (this.isDemoMode() || !supabase || !isUuid(hId)) {
      return localCard;
    }

    try {
      const { data, error } = await supabase
        .from('household_info_cards')
        .select(
          'household_id, wifi_ssid, wifi_password, trash_schedule, delivery_address, emergency_note, updated_by, updated_at'
        )
        .eq('household_id', hId)
        .maybeSingle();

      if (error) {
        logger.warn('get_household_info_card', `Error fetching info card: ${error.message}`);
        return localCard;
      }

      if (data) {
        const mapped: HouseholdInfoCard = {
          householdId: data.household_id,
          wifiSsid: data.wifi_ssid || '',
          wifiPassword: data.wifi_password || '',
          trashSchedule: data.trash_schedule || '',
          deliveryAddress: data.delivery_address || '',
          emergencyNote: data.emergency_note || '',
          updatedBy: data.updated_by,
          updatedAt: data.updated_at,
        };
        store.infoCards[hId] = mapped;
        this.save(store);
        return mapped;
      }
    } catch (err: unknown) {
      logger.warn('get_household_info_card', 'Exception fetching info card', {
        err: err instanceof Error ? err.message : String(err),
      });
    }

    return localCard;
  }

  public async updateHouseholdInfoCard(params: {
    wifiSsid?: string;
    wifiPassword?: string;
    trashSchedule?: string;
    deliveryAddress?: string;
    emergencyNote?: string;
    householdId?: string;
  }): Promise<{ success: boolean; card?: HouseholdInfoCard; error?: string }> {
    const store = this.getStore();
    const hId = params.householdId || store.activeHouseholdId;
    const userId = store.currentUser.id;

    // Check prohibited identity documents
    const combinedText = `${params.deliveryAddress || ''} ${params.emergencyNote || ''}`.toLowerCase();
    const prohibitedKeywords = ['passport', 'national id', 'visa num', 'ssn', 'social security'];
    if (prohibitedKeywords.some((kw) => combinedText.includes(kw))) {
      return {
        success: false,
        error: 'For safety, identity document numbers (passports, national IDs) are strictly prohibited.',
      };
    }

    if (!store.infoCards) store.infoCards = {};
    const currentCard = store.infoCards[hId] || {
      householdId: hId,
      wifiSsid: '',
      wifiPassword: '',
      trashSchedule: '',
      deliveryAddress: '',
      emergencyNote: '',
      updatedAt: new Date().toISOString(),
    };

    const updatedCard: HouseholdInfoCard = {
      householdId: hId,
      wifiSsid: params.wifiSsid !== undefined ? params.wifiSsid.trim() : currentCard.wifiSsid,
      wifiPassword: params.wifiPassword !== undefined ? params.wifiPassword.trim() : currentCard.wifiPassword,
      trashSchedule: params.trashSchedule !== undefined ? params.trashSchedule.trim() : currentCard.trashSchedule,
      deliveryAddress: params.deliveryAddress !== undefined ? params.deliveryAddress.trim() : currentCard.deliveryAddress,
      emergencyNote: params.emergencyNote !== undefined ? params.emergencyNote.trim() : currentCard.emergencyNote,
      updatedBy: userId,
      updatedAt: new Date().toISOString(),
    };

    store.infoCards[hId] = updatedCard;
    this.save(store);

    logger.info('update_household_info_card', 'Updated apartment info card', {
      householdId: hId,
      userId,
    });

    this.dispatchShoppingOutbox(
      hId,
      'update_apartment_info',
      updatedCard,
      'Updated apartment info card',
      async () => {
        if (!supabase) return;
        const { error } = await supabase.from('household_info_cards').upsert({
          household_id: updatedCard.householdId,
          wifi_ssid: updatedCard.wifiSsid,
          wifi_password: updatedCard.wifiPassword,
          trash_schedule: updatedCard.trashSchedule,
          delivery_address: updatedCard.deliveryAddress,
          emergency_note: updatedCard.emergencyNote,
          updated_by: updatedCard.updatedBy,
          updated_at: updatedCard.updatedAt,
        });
        return { error: error ? { message: error.message, code: error.code } : null };
      }
    );

    return { success: true, card: updatedCard };
  }
}
