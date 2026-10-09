/**
 * Rule-based extraction of decisions, action items, announcements, mentions
 * and questions.
 *
 * This always runs (it is the deterministic fallback required by the spec)
 * and is also what feeds the priority scorer. Everything is computed from the
 * actual messages at runtime - nothing here is hard-coded output.
 */

import type { CatchupItem, ItemType, Message, UserProfile } from "../types";
import { parseDeadline } from "./time";
import { compareByPriority, scorePriority } from "./priority";

export interface ExtractionResult {
  actions: CatchupItem[];
  decisions: CatchupItem[];
  announcements: CatchupItem[];
  mentions: CatchupItem[];
  questions: CatchupItem[];
}

const DECISION_RE =
  /\b(we(?:'ve| have)?\s+(?:decided|agreed|finali[sz]ed)|decision|final\s+(?:call|version|decision)|approved|confirmed|we'?ll\s+go\s+with|let'?s\s+go\s+with|we'?ll\s+use|going\s+with|locked\s+in)\b/i;

const ACTION_RE =
  /\b(i'?ll|i will|i can|can you|could you|would you|please|kindly|need(?:s)? to|has to|have to|make sure|remember to|don'?t forget|do not forget|assign(?:ed)? to|action for|action item|you should|let'?s|we should|we need to)\b/i;

const ANNOUNCEMENT_RE =
  /\b(important|announcement|notice|everyone|all of you|please note|reminder|alert|heads up|fyi)\b/i;

const UPDATE_RE =
  /\b(moved|changed|rescheduled|postponed|cancelled|canceled|extended|instead|update|shifted|pushed)\b/i;

const STOPWORDS = new Set([
  "the", "and", "for", "with", "this", "that", "from", "have", "will",
  "your", "you", "our", "are", "was", "were", "please", "make", "sure",
  "then", "than", "them", "they", "into", "over", "same", "also", "here",
]);

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function sentences(text: string): string[] {
  return text
    .split(/\n+|(?<=[.!?])\s+(?=[A-Z0-9'"@(])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1);
}

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 3 && !STOPWORDS.has(t));
}

export function profileNames(profile: UserProfile): string[] {
  return [profile.handle, profile.name]
    .filter(Boolean)
    .map((n) => n.replace(/^@/, "").toLowerCase());
}

/** Does this message reference the user (by @handle or name)? */
export function isUserMentioned(message: Message, profile: UserProfile): boolean {
  const names = profileNames(profile);
  if (names.length === 0) return false;
  if (message.mentions.some((m) => names.includes(m.toLowerCase()))) return true;
  const lower = message.text.toLowerCase();
  for (const name of names) {
    if (!name) continue;
    if (new RegExp(`@${escapeRegExp(name)}\\b`, "i").test(lower)) return true;
    // Bare name: require original capitalisation to cut false positives.
    if (new RegExp(`\\b${escapeRegExp(name)}\\b`).test(message.text)) return true;
  }
  return false;
}

function matchesUserTask(text: string, profile: UserProfile): boolean {
  if (profile.tasks.length === 0) return false;
  const textTokens = new Set(tokens(text));
  return profile.tasks.some((task) =>
    tokens(task).some((t) => textTokens.has(t)),
  );
}

function ownerIsUser(owner: string | undefined, profile: UserProfile): boolean {
  if (!owner) return false;
  const o = owner.replace(/^@/, "").toLowerCase();
  return profileNames(profile).includes(o);
}

function detectOwner(
  sentence: string,
  sender: string,
  profile: UserProfile,
): string | undefined {
  const mentionMatch = sentence.match(/@([\w.+-]{1,40})/);
  if (mentionMatch) return mentionMatch[1];

  let m = sentence.match(/action\s+(?:for|item[:\s]+)\s*([A-Z][\w]+)/i);
  if (m) return m[1];

  m = sentence.match(/assign(?:ed)?\s+to\s+([A-Z][\w]+)/i);
  if (m) return m[1];

  m = sentence.match(/\b([A-Z][\w]+)\s+can you\b/);
  if (m) return m[1];

  if (/\b(can you|could you|would you|please|kindly)\b/i.test(sentence)) {
    return profile.name || "you";
  }
  if (/\b(i'?ll|i will|i can)\b/i.test(sentence)) return sender;
  if (/\b(we should|let'?s|we need to|we'?ll)\b/i.test(sentence)) return "Team";
  return undefined;
}

function normalizeTitle(text: string): string {
  const cleaned = text.replace(/^\s*[A-Z ]*[:\-]\s*/, "").trim();
  return cleaned.length > 160 ? `${cleaned.slice(0, 157)}...` : cleaned;
}

function buildItem(
  type: ItemType,
  sentence: string,
  message: Message,
  index: number,
  profile: UserProfile,
  now: number,
  deadline: number | undefined,
): CatchupItem {
  const mentionsUser = isUserMentioned(message, profile);
  const taskMatch = matchesUserTask(sentence, profile);
  const { priority, score, reasons } = scorePriority({
    text: sentence,
    type,
    deadline,
    mentionsUser,
    matchesUserTask: taskMatch,
    now,
  });
  const owner = type === "action" ? detectOwner(sentence, message.sender, profile) : undefined;
  return {
    id: `${message.id}-${type}-${index}`,
    type,
    title: normalizeTitle(sentence),
    detail: message.text,
    owner,
    deadline,
    priority,
    score,
    reasons,
    messageId: message.id,
  };
}

function pushUnique(items: CatchupItem[], candidate: CatchupItem): void {
  const key = candidate.title.toLowerCase().replace(/\s+/g, " ").trim();
  if (items.some((i) => i.title.toLowerCase().replace(/\s+/g, " ").trim() === key)) {
    return;
  }
  items.push(candidate);
}

/**
 * Main extractor. `messages` should already be sorted oldest-first and may be
 * a filtered catch-up window.
 */
export function extractItems(
  messages: Message[],
  profile: UserProfile,
  now: number = Date.now(),
): ExtractionResult {
  const result: ExtractionResult = {
    actions: [],
    decisions: [],
    announcements: [],
    mentions: [],
    questions: [],
  };

  messages.forEach((message, messageIndex) => {
    if (message.isSystem) return;
    const messageDeadline = parseDeadline(message.text, now);

    // Message-level: mentions & questions directed at the user.
    if (isUserMentioned(message, profile) && !message.sender.match(new RegExp(`^(${profileNames(profile).map(escapeRegExp).join("|")})$`, "i"))) {
      const isQuestion = message.text.includes("?");
      const item = buildItem(
        isQuestion ? "question" : "mention",
        message.text,
        message,
        messageIndex,
        profile,
        now,
        messageDeadline,
      );
      if (isQuestion && !isAnswered(messageIndex, messages, profile)) {
        item.detail = `${message.text}\n\n[Unanswered]`;
      }
      pushUnique(result.mentions, item);
      if (isQuestion) pushUnique(result.questions, item);
    }

    sentences(message.text).forEach((sentence, sIndex) => {
      const deadline = parseDeadline(sentence, now) ?? undefined;
      if (DECISION_RE.test(sentence)) {
        const item = buildItem("decision", sentence, message, messageIndex * 100 + sIndex, profile, now, deadline);
        pushUnique(result.decisions, item);
        return;
      }
      if (ACTION_RE.test(sentence)) {
        pushUnique(
          result.actions,
          buildItem("action", sentence, message, messageIndex * 100 + sIndex, profile, now, deadline),
        );
        return;
      }
      if (ANNOUNCEMENT_RE.test(sentence)) {
        pushUnique(
          result.announcements,
          buildItem("announcement", sentence, message, messageIndex * 100 + sIndex, profile, now, deadline),
        );
      }
    });
  });

  const byPriority = (a: CatchupItem, b: CatchupItem) =>
    compareByPriority(a, b) || b.messageId.localeCompare(a.messageId);

  result.actions.sort(byPriority);
  result.decisions.sort(byPriority);
  result.announcements.sort(byPriority);
  result.mentions.sort(byPriority);
  result.questions.sort(byPriority);
  return result;
}

/** Was there a reply from the user after this message? */
function isAnswered(
  index: number,
  messages: Message[],
  profile: UserProfile,
): boolean {
  const names = profileNames(profile);
  for (let i = index + 1; i < messages.length; i++) {
    const sender = messages[i].sender.replace(/^@/, "").toLowerCase();
    if (names.includes(sender)) return true;
  }
  return false;
}

export function isUpdateText(text: string): boolean {
  return UPDATE_RE.test(text);
}

export { ownerIsUser };
