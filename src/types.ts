/**
 * Shared domain types for CatchUp.
 *
 * Everything here is pure data so it can be unit-tested without a DOM and
 * reused by any rendering layer.
 */

export type ChatSource = "whatsapp" | "telegram" | "slack" | "pasted" | "demo";

export interface Message {
  /** Stable synthetic id (source + index) used for lookups and deeplinks. */
  id: string;
  sender: string;
  /** Epoch milliseconds. */
  timestamp: number;
  text: string;
  source: ChatSource;
  /** True for "X joined the group" / "messages deleted" style rows. */
  isSystem?: boolean;
  /** @handles / names referenced in the message text. */
  mentions: string[];
}

export type Priority = "high" | "medium" | "low";

export type ItemType =
  | "action"
  | "decision"
  | "announcement"
  | "mention"
  | "question";

/** A human-readable justification used by the "Why?" tooltip. */
export interface PriorityReason {
  label: string;
  /** Signed contribution to the total priority score. */
  weight: number;
}

export interface CatchupItem {
  id: string;
  type: ItemType;
  title: string;
  detail?: string;
  owner?: string;
  /** Epoch ms deadline if one could be derived. */
  deadline?: number;
  priority: Priority;
  /** Total urgency + relevance score (see lib/priority.ts). */
  score: number;
  reasons: PriorityReason[];
  /** Message the item was extracted from (used by the context viewer). */
  messageId: string;
  /** Action items only: has the user ticked it off? */
  done?: boolean;
  /** Decision updates: the previous, superseded wording. */
  previousTitle?: string;
  /** Decision updates: full change history, newest first. */
  history?: string[];
  /** Decision updates: false when a newer decision supersedes this one. */
  latest?: boolean;
}

export interface Topic {
  title: string;
  summary: string;
  messageIds: string[];
}

export type EngineName = "gemini-nano" | "webllm" | "rule-based";

export interface EngineInfo {
  name: EngineName;
  label: string;
  /** True when an actual on-device neural model produced the text. */
  neural: boolean;
  detail: string;
}

export interface CatchupResult {
  tldr: string;
  topics: Topic[];
  actions: CatchupItem[];
  decisions: CatchupItem[];
  announcements: CatchupItem[];
  mentions: CatchupItem[];
  questions: CatchupItem[];
  engine: EngineInfo;
  /** Chat window this result covers. */
  windowLabel: string;
  messageCount: number;
  generatedAt: number;
}

export interface UserProfile {
  name: string;
  handle: string;
  /** Free-form list of the user's current tasks, boosts relevance. */
  tasks: string[];
}

export type SinceWindow = "1h" | "6h" | "24h" | "custom" | "all";
