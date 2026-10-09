/**
 * Explainable priority scoring.
 *
 * Every item gets a numeric score built from explicit, human-readable
 * reasons so the UI can show a "Why?" tooltip that is grounded in real
 * signals rather than a black box.
 */

import type { ItemType, Priority, PriorityReason } from "../types";
import { HOUR } from "./time";

export interface PriorityInput {
  text: string;
  type: ItemType;
  deadline?: number;
  mentionsUser: boolean;
  matchesUserTask: boolean;
  now: number;
}

export interface PriorityResult {
  priority: Priority;
  score: number;
  reasons: PriorityReason[];
}

const URGENT_WORDS = [
  "urgent",
  "asap",
  "immediately",
  "important",
  "deadline",
  "today",
  "tonight",
  "eod",
  "final",
  "last chance",
  "critical",
  "blocker",
  "reminder",
  "don't forget",
  "do not forget",
];

const TYPE_WEIGHT: Record<ItemType, number> = {
  action: 10,
  decision: 8,
  announcement: 6,
  question: 8,
  mention: 6,
};

export function scorePriority(input: PriorityInput): PriorityResult {
  const reasons: PriorityReason[] = [];
  let score = TYPE_WEIGHT[input.type] ?? 0;
  reasons.push({
    label: `Type: ${labelForType(input.type)}`,
    weight: score,
  });

  const lower = input.text.toLowerCase();

  // ---- Urgency: deadline proximity ----
  if (input.deadline !== undefined) {
    const delta = input.deadline - input.now;
    let weight = 0;
    let label = "";
    if (delta < 0) {
      weight = 35;
      label = "Deadline has already passed";
    } else if (delta <= 2 * HOUR) {
      weight = 40;
      label = "Deadline in under 2 hours";
    } else if (delta <= 6 * HOUR) {
      weight = 30;
      label = `Deadline in ${Math.round(delta / HOUR)} hours`;
    } else if (delta <= 24 * HOUR) {
      weight = 20;
      label = "Deadline within 24 hours";
    } else if (delta <= 72 * HOUR) {
      weight = 10;
      label = "Deadline within 3 days";
    } else {
      weight = 3;
      label = "Future deadline";
    }
    score += weight;
    reasons.push({ label, weight });
  }

  // ---- Urgency: urgent wording ----
  const urgentHit = URGENT_WORDS.find((w) => lower.includes(w));
  if (urgentHit) {
    score += 18;
    reasons.push({ label: `Urgent wording ("${urgentHit}")`, weight: 18 });
  }

  // ---- Urgency: addressed as a question ----
  if (input.text.trim().endsWith("?")) {
    score += 6;
    reasons.push({ label: "Phrased as a question", weight: 6 });
  }

  // ---- Relevance: you were mentioned ----
  if (input.mentionsUser) {
    score += 35;
    reasons.push({ label: "You were mentioned", weight: 35 });
  }

  // ---- Relevance: matches one of your tasks ----
  if (input.matchesUserTask) {
    score += 20;
    reasons.push({ label: "Matches one of your tasks", weight: 20 });
  }

  let priority: Priority = "low";
  if (score >= 60) priority = "high";
  else if (score >= 30) priority = "medium";

  reasons.sort((a, b) => b.weight - a.weight);
  return { priority, score, reasons };
}

export function labelForType(type: ItemType): string {
  switch (type) {
    case "action":
      return "action item";
    case "decision":
      return "decision";
    case "announcement":
      return "announcement";
    case "question":
      return "question to you";
    case "mention":
      return "mention";
  }
}

export const PRIORITY_ORDER: Record<Priority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export function compareByPriority(
  a: { priority: Priority; score: number },
  b: { priority: Priority; score: number },
): number {
  const p = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
  if (p !== 0) return p;
  return b.score - a.score;
}
