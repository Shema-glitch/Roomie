import type { ChoreDraftStateInfo } from '../utils/stateTable';
import type { TranslationKey, LocaleParams } from './index';

type TranslateFn = (key: TranslationKey, params?: LocaleParams) => string;

export function getLocalizedGreeting(
  hour: number,
  firstName: string,
  t: TranslateFn
): string {
  if (hour < 12) return t('home.morning', { name: firstName });
  if (hour < 17) return t('home.afternoon', { name: firstName });
  return t('home.evening', { name: firstName });
}

export function localizeChoreDraftState(
  draft: ChoreDraftStateInfo,
  t: TranslateFn
): ChoreDraftStateInfo {
  switch (draft.state) {
    case 'draft_open':
      return {
        state: draft.state,
        badgeLabel: t('draft.openBadge'),
        bannerTitle: t('draft.openTitle'),
        bannerSubtitle: t('draft.openSubtitle'),
        actionLabel: t('draft.openAction'),
      };
    case 'waiting_others':
      return {
        state: draft.state,
        badgeLabel: t('draft.waitingBadge'),
        bannerTitle: t('draft.waitingTitle'),
        bannerSubtitle: t('draft.waitingSubtitle'),
        actionLabel: t('draft.waitingAction'),
      };
    case 'reveal_ready':
      return {
        state: draft.state,
        badgeLabel: t('draft.revealBadge'),
        bannerTitle: t('draft.revealTitle'),
        bannerSubtitle: t('draft.revealSubtitle'),
        actionLabel: t('draft.revealAction'),
      };
    case 'reveal_done':
    default:
      return {
        state: draft.state,
        badgeLabel: t('draft.doneBadge'),
        bannerTitle: t('draft.doneTitle'),
        bannerSubtitle: t('draft.doneSubtitle'),
        actionLabel: t('draft.doneAction'),
      };
  }
}
