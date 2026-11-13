/**
 * Auth & User Profiles Domain API
 */

import { User, UserSettings, Household } from '../../types';
import { hashLocalPassword, validateEmail, validatePassword } from '../../utils/authValidation';
import { getPendingInviteCode } from '../../utils/inviteLink';
import {
  getSavedAccounts,
  isAccountSaved,
  removeSavedAccount,
  SavedLoginAccount,
  updateSavedAccountTokens,
  upsertSavedAccount,
} from '../../utils/savedAccounts';
import { clearLocalSupabaseSessionStorage, supabase } from '../supabase';
import { AppStore, createDomainLogger, getInitialStore, mapProfileToUser } from './shared';

const logger = createDomainLogger('AuthAPI', 'auth');

export interface AuthContext {
  store: AppStore;
  save: () => void;
  getHouseholds: () => Promise<Household[]>;
}

export class AuthApi {
  constructor(private ctx: AuthContext) {}

  private get store(): AppStore {
    return this.ctx.store;
  }

  public hasLocalSession(): boolean {
    const isDemo = this.store.householdSetupMode === 'demo';
    if (supabase && !isDemo) return false;
    const sess = this.store.localSession;
    if (sess && sess.expiresAt > Date.now()) {
      return true;
    }
    // Smooth migration if localSessionActive was set prior to structured sessions
    if (this.store.localSessionActive) {
      this.store.localSession = {
        userId: this.store.currentUser.id,
        email: this.store.currentUser.email,
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
      };
      this.ctx.save();
      return true;
    }
    return false;
  }

  public isDemoMode(): boolean {
    if (this.store.householdSetupMode === 'demo') return true;
    return !supabase && this.store.currentUser.id === 'u_curr' && !this.store.householdSetupMode;
  }

  public getScopedLocalHouseholds(): Household[] {
    if (this.isDemoMode()) {
      return [...this.store.households];
    }
    const memberIds = new Set(
      this.store.memberships
        .filter((m) => m.userId === this.store.currentUser.id && m.status === 'active')
        .map((m) => m.householdId)
    );
    return this.store.households.filter((h) => memberIds.has(h.id));
  }

  private syncAccountSetupMode(mode: 'pending' | 'configured' | 'demo'): void {
    const cleanEmail = this.store.currentUser.email.trim().toLowerCase();
    if (this.store.localAccounts && this.store.localAccounts[cleanEmail]) {
      this.store.localAccounts[cleanEmail].setupMode = mode;
    }
  }

  public needsHouseholdSetup(): boolean {
    const mode = this.store.householdSetupMode;
    if (mode === 'demo') return false;

    const myFlats = this.getScopedLocalHouseholds();
    if (myFlats.length > 0) {
      if (mode === 'pending') return true;
      if (mode !== 'configured') {
        this.store.householdSetupMode = 'configured';
        this.syncAccountSetupMode('configured');
        this.ctx.save();
      }
      return false;
    }

    if (mode === 'pending') return true;

    const hasCustomProfile = this.store.currentUser.email !== 'kai.tanaka@student.emu.edu.tr';
    if (supabase || hasCustomProfile) {
      this.store.householdSetupMode = 'pending';
      this.syncAccountSetupMode('pending');
      this.ctx.save();
      return true;
    }
    return false;
  }

  public markDemoMode(useSampleProfile = false): void {
    const seed = getInitialStore();
    if (!this.store.households.some((h) => h.id === 'h_main')) {
      this.store.households = seed.households;
      this.store.memberships = seed.memberships;
      this.store.users = seed.users;
      this.store.expenses = seed.expenses;
      this.store.settlements = seed.settlements;
      this.store.personalExpenses = seed.personalExpenses;
      this.store.chores = seed.chores;
      this.store.draftRounds = seed.draftRounds;
      this.store.messages = seed.messages;
      this.store.meetingTopics = seed.meetingTopics;
      this.store.agreements = seed.agreements;
      this.store.notifications = seed.notifications;
    }
    if (useSampleProfile) {
      const kai = this.store.users.find((u) => u.id === 'u_curr') || seed.currentUser;
      this.store.currentUser = { ...kai };
      this.store.activeHouseholdId = 'h_main';
    }
    this.store.householdSetupMode = 'demo';
    this.store.localSessionActive = true;
    this.store.localSession = {
      userId: this.store.currentUser.id,
      email: this.store.currentUser.email,
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
    };
    this.ctx.save();
    logger.info('mark_demo_mode', 'Marked app in demo mode', { useSampleProfile });
  }

  public markHouseholdSetupPending(): void {
    this.store.householdSetupMode = 'pending';
    this.syncAccountSetupMode('pending');
    this.ctx.save();
  }

  public markHouseholdConfigured(): void {
    this.store.householdSetupMode = 'configured';
    this.syncAccountSetupMode('configured');
    this.ctx.save();
  }

  public async getSession() {
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    return data.session;
  }

  public onAuthStateChange(callback: (event: string, hasSession: boolean) => void): () => void {
    if (!supabase) return () => {};
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN')) {
        const uidOrEmail = session.user?.id || session.user?.email;
        if (uidOrEmail && isAccountSaved(uidOrEmail)) {
          updateSavedAccountTokens(uidOrEmail, {
            accessToken: session.access_token,
            refreshToken: session.refresh_token,
          });
        }
      }
      callback(event, Boolean(session));
    });
    return () => {
      data.subscription.unsubscribe();
    };
  }

  private formatSupabaseAuthError(rawMessage: string): string {
    const msg = rawMessage.toLowerCase();
    if (msg.includes('invalid login credentials') || msg.includes('invalid_credentials')) {
      return 'Invalid login credentials. Double-check your password, or if this account was created before live Supabase was connected, tap Get Started to register it.';
    }
    if (msg.includes('email not confirmed')) {
      return 'Email not confirmed yet. Check your inbox (and spam folder) for the verification link before signing in.';
    }
    if (msg.includes('rate limit') || msg.includes('too many requests') || msg.includes('429')) {
      return 'Supabase built-in email limit reached (2 emails/hour). Wait an hour, or turn off "Confirm email" / add custom SMTP in Supabase Dashboard → Authentication.';
    }
    if (msg.includes('already registered') || msg.includes('already exists')) {
      return 'An account with this email already exists on Roomie. Tap Log in instead.';
    }
    return rawMessage;
  }

  public getSavedLoginAccounts(): SavedLoginAccount[] {
    const targetMode = supabase ? 'supabase' : 'local';
    return getSavedAccounts().filter((a) => a.mode === targetMode);
  }

  public isCurrentUserLoginSaved(): boolean {
    if (this.isDemoMode()) return false;
    return isAccountSaved(this.store.currentUser?.id) || isAccountSaved(this.store.currentUser?.email);
  }

  public async setCurrentUserLoginSaved(save: boolean): Promise<boolean> {
    if (this.isDemoMode()) return false;
    const u = this.store.currentUser;
    if (!save) {
      removeSavedAccount(u.id || u.email);
      if (u.email) removeSavedAccount(u.email);
      return false;
    }

    let sessionTokens: { accessToken: string; refreshToken: string } | undefined;
    if (supabase) {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        sessionTokens = {
          accessToken: data.session.access_token,
          refreshToken: data.session.refresh_token,
        };
      }
    }

    upsertSavedAccount({
      userId: u.id,
      email: u.email,
      name: u.name,
      avatar: u.avatar,
      flag: u.flag,
      mode: supabase ? 'supabase' : 'local',
      sessionTokens,
    });
    return true;
  }

  public removeSavedLoginAccount(userIdOrEmail: string): SavedLoginAccount[] {
    removeSavedAccount(userIdOrEmail);
    return this.getSavedLoginAccounts();
  }

  public async quickSignInSavedAccount(
    userIdOrEmail: string
  ): Promise<{ success: boolean; message: string; requiresPassword?: boolean; email?: string }> {
    const saved = this.getSavedLoginAccounts().find(
      (a) =>
        a.userId === userIdOrEmail ||
        a.email.toLowerCase() === userIdOrEmail.trim().toLowerCase()
    );
    if (!saved) {
      return { success: false, message: 'Saved login was not found on this device.' };
    }

    if (supabase) {
      if (!saved.sessionTokens?.refreshToken) {
        return {
          success: false,
          requiresPassword: true,
          email: saved.email,
          message: 'Enter your password once to activate 1-tap quick login for this account.',
        };
      }

      const { data, error } = await supabase.auth.setSession({
        access_token: saved.sessionTokens.accessToken,
        refresh_token: saved.sessionTokens.refreshToken,
      });

      if (error || !data.session) {
        updateSavedAccountTokens(saved.email, undefined);
        return {
          success: false,
          requiresPassword: true,
          email: saved.email,
          message: 'Saved login session expired. Enter your password to sign back in.',
        };
      }

      await supabase.auth.startAutoRefresh();
      if (this.store.householdSetupMode === 'demo') {
        this.store.householdSetupMode = undefined;
      }
      this.store.localSessionActive = false;
      this.store.localSession = null;

      const user = await this.getCurrentUser();
      await this.ctx.getHouseholds();
      upsertSavedAccount({
        userId: user.id,
        email: user.email || saved.email,
        name: user.name || saved.name,
        avatar: user.avatar || saved.avatar,
        flag: user.flag || saved.flag,
        mode: 'supabase',
        sessionTokens: {
          accessToken: data.session.access_token,
          refreshToken: data.session.refresh_token,
        },
      });
      this.ctx.save();
      logger.info('quick_signin', `Quick sign-in succeeded as ${user.name || saved.name}`);
      return { success: true, message: `Signed back in as ${user.name || saved.name}!` };
    }

    // Local/offline account 1-tap restore
    const cleanEmail = saved.email.trim().toLowerCase();
    const account = this.store.localAccounts?.[cleanEmail];
    if (!account) {
      return {
        success: false,
        requiresPassword: true,
        email: saved.email,
        message: 'Could not restore local account automatically. Please sign in.',
      };
    }

    const existingProfile = this.store.users.find((u) => u.id === account.id);
    if (existingProfile) {
      this.store.currentUser = { ...existingProfile };
    }
    this.store.householdSetupMode = account.setupMode;
    this.store.localSessionActive = true;
    this.store.localSession = {
      userId: account.id,
      email: cleanEmail,
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
    };
    upsertSavedAccount({
      userId: account.id,
      email: cleanEmail,
      name: this.store.currentUser.name || account.name,
      avatar: this.store.currentUser.avatar,
      flag: this.store.currentUser.flag,
      mode: 'local',
    });
    this.ctx.save();
    logger.info('quick_signin_local', `Restored local account for ${this.store.currentUser.name}`);
    return { success: true, message: `Signed back in as ${this.store.currentUser.name}!` };
  }

  private getAuthRedirectUrl(): string | undefined {
    if (typeof window === 'undefined' || !/^https?:$/.test(window.location.protocol)) {
      return undefined;
    }
    const pendingCode = getPendingInviteCode();
    return pendingCode
      ? `${window.location.origin}/?code=${encodeURIComponent(pendingCode)}`
      : window.location.origin;
  }

  public async signUpWithSupabase(
    email: string,
    password?: string,
    name?: string,
    options?: { rememberMe?: boolean }
  ): Promise<{ success: boolean; message: string; requiresEmailVerification?: boolean }> {
    const cleanEmail = email.trim().toLowerCase();
    const emailCheck = validateEmail(cleanEmail);
    if (!emailCheck.valid) {
      return { success: false, message: emailCheck.error || 'Please enter a valid email address.' };
    }
    const passCheck = validatePassword(password || '');
    if (!passCheck.valid) {
      return { success: false, message: passCheck.error || 'Password does not meet security rules.' };
    }
    const cleanName = (name || cleanEmail.split('@')[0]).trim();
    const shouldSave = options?.rememberMe !== false;

    if (!supabase) {
      if (!this.store.localAccounts) this.store.localAccounts = {};
      if (this.store.localAccounts[cleanEmail]) {
        return { success: false, message: 'An account with this email already exists. Please log in instead.' };
      }

      const newUserId = 'u_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 5);
      const newUser: User = {
        id: newUserId,
        name: cleanName,
        email: cleanEmail,
        avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
        country: 'Cyprus',
        countryCode: 'CY',
        flag: '🏠',
        isHome: true,
        streakDays: 0,
        points: 0,
        awayUntil: null,
      };

      this.store.users.push(newUser);
      this.store.currentUser = newUser;
      this.store.localAccounts[cleanEmail] = {
        id: newUserId,
        name: cleanName,
        email: cleanEmail,
        passwordHash: hashLocalPassword(cleanEmail, password!),
        setupMode: 'pending',
        createdAt: new Date().toISOString(),
      };
      this.store.householdSetupMode = 'pending';
      this.store.localSessionActive = true;
      this.store.localSession = {
        userId: newUserId,
        email: cleanEmail,
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
      };
      if (shouldSave) {
        upsertSavedAccount({
          userId: newUserId,
          email: cleanEmail,
          name: cleanName,
          avatar: newUser.avatar,
          flag: newUser.flag,
          mode: 'local',
        });
      }
      this.ctx.save();
      logger.info('signup_local', `Registered local user ${cleanEmail}`);
      return { success: true, message: 'Account created! Let’s set up your flat.' };
    }

    const emailRedirectTo = this.getAuthRedirectUrl();
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password: password!,
      options: {
        data: { name: cleanName },
        emailRedirectTo,
      },
    });
    if (error) {
      logger.warn('signup_error', error.message, { email: cleanEmail });
      return { success: false, message: this.formatSupabaseAuthError(error.message) };
    }
    this.store.localSessionActive = false;
    this.store.localSession = null;
    this.store.householdSetupMode = 'pending';

    if (!data.session) {
      this.ctx.save();
      return {
        success: true,
        requiresEmailVerification: true,
        message: 'Confirmation email sent! Check your inbox, tap the verification link, then sign in.',
      };
    }

    if (data.user) {
      const profile = await this.getCurrentUser();
      if (shouldSave) {
        upsertSavedAccount({
          userId: profile.id || data.user.id,
          email: profile.email || cleanEmail,
          name: profile.name || cleanName,
          avatar: profile.avatar,
          flag: profile.flag,
          mode: 'supabase',
          sessionTokens: {
            accessToken: data.session.access_token,
            refreshToken: data.session.refresh_token,
          },
        });
      }
    }
    this.ctx.save();
    logger.info('signup_supabase', `Supabase account created for ${cleanEmail}`);
    return { success: true, requiresEmailVerification: false, message: 'Account created! Welcome to Roomie.' };
  }

  public async signInWithSupabase(
    email: string,
    password?: string,
    options?: { rememberMe?: boolean }
  ): Promise<{ success: boolean; message: string }> {
    const cleanEmail = email.trim().toLowerCase();
    const emailCheck = validateEmail(cleanEmail);
    if (!emailCheck.valid) {
      return { success: false, message: emailCheck.error || 'Please enter a valid email address.' };
    }
    const shouldSave = options?.rememberMe !== false;

    if (!supabase) {
      if (!this.store.localAccounts) this.store.localAccounts = {};
      let account = this.store.localAccounts[cleanEmail];

      if (
        !account &&
        password &&
        this.store.currentUser.email.toLowerCase() === cleanEmail &&
        cleanEmail !== 'kai.tanaka@student.emu.edu.tr'
      ) {
        const passCheck = validatePassword(password);
        if (!passCheck.valid) {
          return { success: false, message: passCheck.error || 'Please use a valid password.' };
        }
        account = {
          id: this.store.currentUser.id === 'u_curr' ? 'u_' + Date.now().toString(36) : this.store.currentUser.id,
          name: this.store.currentUser.name,
          email: cleanEmail,
          passwordHash: hashLocalPassword(cleanEmail, password),
          setupMode: 'pending',
          createdAt: new Date().toISOString(),
        };
        if (this.store.currentUser.id === 'u_curr') {
          this.store.currentUser = { ...this.store.currentUser, id: account.id };
          this.store.users.push(this.store.currentUser);
        }
        this.store.localAccounts[cleanEmail] = account;
      }

      if (!account) {
        return { success: false, message: 'No account found for this email. Check spelling or tap Get Started.' };
      }

      if (password && hashLocalPassword(cleanEmail, password) !== account.passwordHash) {
        return { success: false, message: 'Incorrect password. Please try again.' };
      }

      const existingProfile = this.store.users.find((u) => u.id === account.id);
      if (existingProfile) {
        this.store.currentUser = { ...existingProfile };
      }
      this.store.householdSetupMode = account.setupMode;
      this.store.localSessionActive = true;
      this.store.localSession = {
        userId: account.id,
        email: cleanEmail,
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
      };

      if (shouldSave) {
        upsertSavedAccount({
          userId: account.id,
          email: cleanEmail,
          name: this.store.currentUser.name || account.name,
          avatar: this.store.currentUser.avatar,
          flag: this.store.currentUser.flag,
          mode: 'local',
        });
      }
      this.ctx.save();
      logger.info('signin_local', `Local login success for ${cleanEmail}`);
      return { success: true, message: 'Welcome back!' };
    }

    if (password) {
      const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
      if (error) {
        logger.warn('signin_error', error.message, { email: cleanEmail });
        return { success: false, message: this.formatSupabaseAuthError(error.message) };
      }
      if (this.store.householdSetupMode === 'demo') {
        this.store.householdSetupMode = undefined;
      }
      this.store.localSessionActive = false;
      this.store.localSession = null;
      await supabase.auth.startAutoRefresh();
      const user = await this.getCurrentUser();
      await this.ctx.getHouseholds();
      if (shouldSave && data.session) {
        upsertSavedAccount({
          userId: user.id || data.user?.id || cleanEmail,
          email: user.email || cleanEmail,
          name: user.name,
          avatar: user.avatar,
          flag: user.flag,
          mode: 'supabase',
          sessionTokens: {
            accessToken: data.session.access_token,
            refreshToken: data.session.refresh_token,
          },
        });
      }
      this.ctx.save();
      logger.info('signin_supabase', `Supabase login success for ${cleanEmail}`);
      return { success: true, message: 'Welcome back!' };
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: { emailRedirectTo: this.getAuthRedirectUrl() },
    });
    if (error) {
      logger.warn('signin_otp_error', error.message, { email: cleanEmail });
      return { success: false, message: this.formatSupabaseAuthError(error.message) };
    }
    return { success: true, message: 'Magic link sent to your email!' };
  }

  public async signOut(options?: { keepSavedLogin?: boolean }): Promise<void> {
    const keepSaved =
      !this.isDemoMode() &&
      (options?.keepSavedLogin ?? this.isCurrentUserLoginSaved());

    if (supabase && !this.isDemoMode()) {
      if (keepSaved) {
        await this.setCurrentUserLoginSaved(true);
        await supabase.auth.stopAutoRefresh();
        clearLocalSupabaseSessionStorage();
      } else {
        if (options?.keepSavedLogin === false) {
          removeSavedAccount(this.store.currentUser?.id || this.store.currentUser?.email || '');
          if (this.store.currentUser?.email) {
            removeSavedAccount(this.store.currentUser.email);
          }
        }
        await supabase.auth.signOut({ scope: 'local' });
      }
    } else if (!this.isDemoMode() && options?.keepSavedLogin === false) {
      removeSavedAccount(this.store.currentUser?.email || '');
    } else if (!this.isDemoMode() && keepSaved) {
      await this.setCurrentUserLoginSaved(true);
    }

    this.store.localSessionActive = false;
    this.store.localSession = null;
    if (this.store.householdSetupMode === 'demo') {
      this.store.householdSetupMode = undefined;
    }
    this.ctx.save();
    logger.info('signout', 'User signed out', { keepSaved });
  }

  public async getCurrentUser(): Promise<User> {
    if (supabase && !this.isDemoMode()) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();

          if (profile) {
            const mapped = mapProfileToUser(profile);
            this.store.currentUser = mapped;
            return mapped;
          }
        }
      } catch (err: any) {
        logger.warn('get_current_user_fallback', err?.message || 'Error fetching user profile');
      }
    }
    return { ...this.store.currentUser };
  }

  public async updateCurrentUser(updates: Partial<User>): Promise<User> {
    this.store.currentUser = { ...this.store.currentUser, ...updates };
    this.store.users = this.store.users.map(u => (u.id === this.store.currentUser.id ? this.store.currentUser : u));
    this.ctx.save();

    if (supabase && !this.isDemoMode()) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('profiles').update({
            name: updates.name,
            avatar: updates.avatar,
            country: updates.country,
            country_code: updates.countryCode,
            flag: updates.flag,
            is_home: updates.isHome,
            away_until: updates.awayUntil,
            points: updates.points,
            streak_days: updates.streakDays,
          }).eq('id', user.id);
        }
      } catch (err) {
        logger.warn('update_current_user_error', 'Profile sync error', { err });
      }
    }
    return this.store.currentUser;
  }

  public async toggleHomeStatus(): Promise<boolean> {
    const next = !this.store.currentUser.isHome;
    await this.updateCurrentUser({ isHome: next });
    return next;
  }

  public async setAwayMode(daysUntil: number | null): Promise<void> {
    const awayUntil = daysUntil ? new Date(Date.now() + daysUntil * 86400000).toISOString() : null;
    await this.updateCurrentUser({ awayUntil });
  }

  public async updateUserProfile(updates: Partial<User>): Promise<User> {
    return this.updateCurrentUser(updates);
  }

  public async getSettings(): Promise<UserSettings> {
    return { ...this.store.settings };
  }

  public async updateSettings(updates: Partial<UserSettings>): Promise<UserSettings> {
    this.store.settings = { ...this.store.settings, ...updates };
    this.ctx.save();
    return this.store.settings;
  }
}
