import { ChatMessage } from '../../types';

const EMOJI_STRIP_REGEX = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\uFE0F]/gu;

export interface ChatTimelineEntry {
  kind: 'activity' | 'message';
  msg: ChatMessage;
  displayBody: string;
}

export function normalizeSystemActivityText(rawBody: string): string {
  const cleaned = rawBody
    .replace(EMOJI_STRIP_REGEX, '')
    .trim()
    .replace(/^Privacy Notice:\s*/i, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  const joinMatch = cleaned.match(
    /^(.+?)\s+(?:was approved and\s+|has\s+(?:officially\s+)?)?joined(?:\s+.+)?\.?$/i
  );
  if (joinMatch) {
    const memberName = joinMatch[1].trim();
    if (memberName) {
      return `${memberName} joined the flat`;
    }
  }

  return cleaned;
}

function getActivityDedupKey(normalizedBody: string): string {
  const joinMatch = normalizedBody.match(/^(.+?)\s+joined the flat$/i);
  if (joinMatch) {
    return `joined:${joinMatch[1].trim().toLowerCase()}`;
  }
  return `text:${normalizedBody.toLowerCase()}`;
}

/**
 * Normalizes activity whisper copy (stripping raw Unicode emojis and legacy privacy prefixes)
 * and deduplicates consecutive or back-to-back identical/member-join events at render time.
 */
export function buildChatTimeline(messages: ChatMessage[]): ChatTimelineEntry[] {
  const result: ChatTimelineEntry[] = [];
  let lastActivityKey: string | null = null;

  for (const msg of messages) {
    const isActivity = msg.type === 'activity' || !msg.senderId;

    if (!isActivity) {
      lastActivityKey = null;
      result.push({
        kind: 'message',
        msg,
        displayBody: msg.body,
      });
      continue;
    }

    const displayBody = normalizeSystemActivityText(msg.body);
    if (!displayBody) continue;

    const dedupKey = getActivityDedupKey(displayBody);
    const ts = Date.parse(msg.createdAt) || 0;
    const isNearDuplicate =
      lastActivityKey === dedupKey ||
      (dedupKey.startsWith('joined:') &&
        result.some(
          (entry) =>
            entry.kind === 'activity' &&
            getActivityDedupKey(entry.displayBody) === dedupKey &&
            Math.abs(ts - (Date.parse(entry.msg.createdAt) || 0)) <= 5 * 60 * 1000
        ));

    if (isNearDuplicate) {
      continue;
    }

    lastActivityKey = dedupKey;

    result.push({
      kind: 'activity',
      msg,
      displayBody,
    });
  }

  return result;
}
