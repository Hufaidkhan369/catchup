/**
 * Smart reply drafts.
 *
 * Produces 2-3 short, copyable replies for a question or request aimed at the
 * user. Uses the on-device model when one is active and otherwise falls back
 * to context-aware templates. Nothing is sent anywhere.
 */

import type { CatchupItem, UserProfile } from "../types";
import type { AiEngine } from "./aiEngine";
import { formatDeadline } from "./time";

export function draftReplies(
  item: CatchupItem,
  profile: UserProfile,
  now: number = Date.now(),
): string[] {
  const replies: string[] = [];
  const deadline = item.deadline ? formatDeadline(item.deadline, now) : undefined;
  const name = profile.name || "you";
  const text = item.title.toLowerCase();

  if (item.type === "action" || item.type === "question") {
    if (deadline) {
      replies.push(`Yes, I'll have it ready by ${deadline}.`);
      replies.push(`On it - I'll share an update before ${deadline}.`);
      replies.push(`That timing is tight for me, can we push it slightly later?`);
    } else {
      replies.push(`Sure, I'm on it 👍`);
      replies.push(`Yep, will do and confirm once done.`);
      replies.push(`Can't get to it right now - can we do it a bit later?`);
    }
  }

  if (/\b(who|where|when|how many|how much|which)\b/.test(text)) {
    replies.push(`Let me check and confirm shortly.`);
    replies.push(`Good question - I'll find out and get back to you.`);
  }

  if (/\b(confirm|ok|okay|agree|available|coming|joining)\b/.test(` ${text} `)) {
    replies.push(`Confirmed ✅`);
    replies.push(`Yes, that works for me.`);
  }

  replies.push(`Got it, thanks for the update!`);
  replies.push(`Noted 👍`);
  replies.push(`${name} here - got it, will follow up.`);

  const unique: string[] = [];
  for (const reply of replies) {
    if (!unique.includes(reply)) unique.push(reply);
    if (unique.length >= 3) break;
  }
  return unique;
}

/** Prefer the model when available, otherwise use the templates. */
export async function generateReplyDrafts(
  item: CatchupItem,
  profile: UserProfile,
  engine: AiEngine,
  now: number = Date.now(),
): Promise<string[]> {
  if (!engine.info.neural) return draftReplies(item, profile, now);
  try {
    const prompt =
      `A message in a group chat needs a reply from "${profile.name || "me"}".\n` +
      `Message: "${item.title}"\n` +
      (item.owner ? `Requested by: ${item.owner}\n` : "") +
      `Write 3 short, friendly, natural replies (max 12 words each), each on its own line, starting with "- ". ` +
      `Do not add commentary.`;
    const raw = await engine.generate(prompt, "You draft short chat replies. Be brief and natural.");
    const lines = raw
      .split("\n")
      .map((line) => line.replace(/^[-*\d.\s]+/, "").trim().replace(/^"|"$/g, ""))
      .filter((line) => line.length > 1 && line.length < 160);
    if (lines.length >= 2) return lines.slice(0, 3);
  } catch {
    // fall through to templates
  }
  return draftReplies(item, profile, now);
}
