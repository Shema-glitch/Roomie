import { addIcon } from '@iconify/react';

/**
 * Pre-registers the 3 gamified fluent-emoji-flat icons locally so they render
 * synchronously on first paint with zero network latency and 100% offline support.
 */
export function registerOfflineIcons(): void {
  // fluent-emoji-flat:fire (32x32 viewBox)
  addIcon('fluent-emoji-flat:fire', {
    width: 32,
    height: 32,
    body: `<path fill="#FF6B4A" d="M18.67 2.22c-.45-.32-1.08-.04-1.13.51c-.28 3.12-2.31 5.34-4.54 7.77c-2.61 2.85-5.3 5.79-5.3 10.25C7.7 26.41 12.29 30 17.5 30c5.69 0 9.8-4.22 9.8-9.85c0-4.43-2.54-7.92-4.63-10.02c-.39-.39-1.05-.15-1.1.4c-.15 1.56-.88 2.75-1.82 3.42c-.41.29-.97-.02-.95-.52c.13-3.71-1.36-7.79-4.13-9.71Z"/><path fill="#FFB02E" d="M16.58 12.38c-.36-.34-.96-.11-1.01.38c-.21 2.13-1.58 3.63-3.09 5.28c-1.69 1.84-3.43 3.74-3.43 6.66C9.05 27.95 12.18 30 16 30c3.95 0 6.95-2.68 6.95-6.45c0-2.92-1.68-5.18-3.07-6.56c-.31-.31-.84-.1-.88.33c-.1 1.01-.58 1.79-1.2 2.23c-.32.23-.77-.02-.75-.41c.09-2.46-.9-5.15-2.47-6.76Z"/><path fill="#FFD646" d="M15.8 19.65c-.26-.28-.72-.1-.76.28c-.13 1.38-.98 2.35-1.91 3.42c-1.04 1.19-2.12 2.42-2.12 4.31C11.01 29.15 13.02 30 15.5 30s4.49-.85 4.49-2.99c0-1.89-.98-3.35-1.84-4.25c-.23-.24-.63-.08-.66.25c-.06.65-.36 1.16-.74 1.44c-.24.18-.58-.01-.56-.31c.05-1.59-.56-3.33-1.39-4.49Z"/>`,
  });

  // fluent-emoji-flat:trophy (32x32 viewBox)
  addIcon('fluent-emoji-flat:trophy', {
    width: 32,
    height: 32,
    body: `<path fill="#F59E0B" d="M6 6h4v9H6a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3Zm16 0h4a3 3 0 0 1 3 3v3a3 3 0 0 1-3 3h-4V6Z"/><path fill="#FBBF24" d="M6 8h2v5H6a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Zm18 0h2a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-2V8Z"/><path fill="#D97706" d="M13 19h6v6h-6z"/><path fill="#FFC93C" d="M8 4h16a1 1 0 0 1 1 1v8a9 9 0 0 1-18 0V5a1 1 0 0 1 1-1Z"/><path fill="#FEF08A" d="M11 6h2v7a5 5 0 0 0 1.5 3.5l-1.4 1.4A7 7 0 0 1 11 13V6Z"/><path fill="#B45309" d="M10 24h12a2 2 0 0 1 2 2v2H8v-2a2 2 0 0 1 2-2Z"/><path fill="#78350F" d="M7 27h18a1 1 0 0 1 1 1v2H6v-2a1 1 0 0 1 1-1Z"/>`,
  });

  // fluent-emoji-flat:broom (32x32 viewBox)
  addIcon('fluent-emoji-flat:broom', {
    width: 32,
    height: 32,
    body: `<path fill="#9A5B25" d="M26.2 3.2a1.8 1.8 0 0 1 2.6 2.5L17.5 17l-2.5-2.5L26.2 3.2Z"/><path fill="#FFC93C" d="m12.8 14.3l4.9 4.9l-2.1 2.1c-1.8 1.8-4.5 2.1-6.6.8l-4.2 4.2a1 1 0 0 1-1.4 0l-.8-.8l3.5-3.5l-1.4-1.4l-3.5 3.5l-1-1a1 1 0 0 1 0-1.4l4.2-4.2c-1.3-2.1-1-4.8.8-6.6l2.1-2.1l5.5 5.5Z"/><path fill="#D97706" d="m11.5 13l7.5 7.5l-1.3 1.3c-1.9 1.9-4.9 2.2-7.1.7L6 27.1a1.5 1.5 0 0 1-2.1 0L2.9 26l4-4l-1.2-1.2l-4 4l-1-1a1.5 1.5 0 0 1 0-2.1l4.6-4.6c-1.5-2.2-1.2-5.2.7-7.1L7.3 8.8L11.5 13Z"/><path fill="#EF4444" d="m12.2 12.3l7.5 7.5l1.4-1.4l-7.5-7.5l-1.4 1.4Z"/>`,
  });
}

registerOfflineIcons();
