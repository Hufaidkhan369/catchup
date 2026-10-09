/**
 * On-device AI runtime.
 *
 * Two real neural back-ends are supported, plus a deterministic rule-based
 * fallback:
 *
 *  1. Chrome's built-in Gemini Nano via the Prompt API (`LanguageModel`).
 *     Runs fully on-device; nothing is sent anywhere.
 *  2. WebLLM (optional, user-initiated). Downloads open model weights once
 *     and runs them in WebGPU. Model files are fetched, but the conversation
 *     itself never leaves the browser.
 *  3. Rule-based fallback - always available, deterministic, no model.
 *
 * `chooseEngine()` picks the best available and the UI shows which one is
 * active, so the "real AI" claim is always verifiable.
 */

import type { EngineInfo } from "../types";

export interface AiEngine {
  info: EngineInfo;
  generate(prompt: string, system?: string): Promise<string>;
}

export interface EngineProbe {
  info: EngineInfo;
  available: boolean;
  note: string;
}

const GEMINI_INFO: EngineInfo = {
  name: "gemini-nano",
  label: "Gemini Nano (Chrome, on-device)",
  neural: true,
  detail: "Prompt API running locally in Chrome. No network calls.",
};

const WEBLLM_INFO: EngineInfo = {
  name: "webllm",
  label: "WebLLM (WebGPU, on-device)",
  neural: true,
  detail: "Open model weights running in your browser via WebGPU.",
};

const RULE_INFO: EngineInfo = {
  name: "rule-based",
  label: "Rule-based (on-device)",
  neural: false,
  detail: "Deterministic regex + heuristic engine. No model required.",
};

// ---- Gemini Nano Prompt API typing -------------------------------------

interface LanguageModelSession {
  prompt(input: string): Promise<string>;
  destroy?: () => void;
}

interface LanguageModelStatic {
  availability(options?: unknown): Promise<string>;
  create(options?: unknown): Promise<LanguageModelSession>;
}

function geminiStatic(): LanguageModelStatic | undefined {
  const g = globalThis as unknown as {
    LanguageModel?: LanguageModelStatic;
    ai?: { languageModel?: LanguageModelStatic };
  };
  return g.LanguageModel ?? g.ai?.languageModel;
}

export function hasGemini(): boolean {
  return typeof geminiStatic() !== "undefined";
}

export async function geminiAvailability(): Promise<string> {
  const lm = geminiStatic();
  if (!lm) return "unavailable";
  try {
    const state = await lm.availability();
    return state ?? "unknown";
  } catch {
    try {
      const state = await lm.availability({
        expectedInputs: [{ type: "text", languages: ["en"] }],
      });
      return state ?? "unknown";
    } catch {
      return "unknown";
    }
  }
}

function createGeminiEngine(): AiEngine {
  return {
    info: GEMINI_INFO,
    async generate(prompt: string, system?: string): Promise<string> {
      const lm = geminiStatic();
      if (!lm) throw new Error("Gemini Nano is not available");
      const session = await lm.create({
        initialPrompts: system
          ? [{ role: "system", content: system }]
          : undefined,
      });
      try {
        return (await session.prompt(prompt)).trim();
      } finally {
        session.destroy?.();
      }
    },
  };
}

// ---- WebLLM (optional) --------------------------------------------------

const WEBLLM_MODEL = "Llama-3.2-1B-Instruct-q4f16_1-MLC";
const WEBLLM_CDN = "https://esm.run/@mlc-ai/web-llm";

let webllmEngine: AiEngine | null = null;
let webllmLoading: Promise<AiEngine> | null = null;

type ProgressFn = (progress: { text?: string; progress?: number }) => void;

export function getWebllmEngine(): AiEngine | null {
  return webllmEngine;
}

/**
 * Download + initialise the WebLLM engine. Must be triggered by a user
 * gesture because it downloads model weights over the network.
 */
export function enableWebllm(onProgress?: ProgressFn): Promise<AiEngine> {
  if (webllmEngine) return Promise.resolve(webllmEngine);
  if (webllmLoading) return webllmLoading;

  webllmLoading = (async () => {
    const module = (await import(/* @vite-ignore */ WEBLLM_CDN)) as {
      CreateMLCEngine: (
        model: string,
        options?: { initProgressCallback?: ProgressFn },
      ) => Promise<{
        chat: {
          completions: {
            create: (body: {
              messages: Array<{ role: string; content: string }>;
              temperature?: number;
              max_tokens?: number;
            }) => Promise<{ choices: Array<{ message: { content: string } }> }>;
          };
        };
      }>;
    };
    const engine = await module.CreateMLCEngine(WEBLLM_MODEL, {
      initProgressCallback: (p) => onProgress?.(p),
    });
    const wrapped: AiEngine = {
      info: WEBLLM_INFO,
      async generate(prompt: string, system?: string): Promise<string> {
        const messages = [
          ...(system ? [{ role: "system", content: system }] : []),
          { role: "user", content: prompt },
        ];
        const res = await engine.chat.completions.create({
          messages,
          temperature: 0.3,
          max_tokens: 512,
        });
        return (res.choices[0]?.message?.content ?? "").trim();
      },
    };
    webllmEngine = wrapped;
    return wrapped;
  })();

  return webllmLoading;
}

// ---- Rule-based fallback ------------------------------------------------

export function ruleBasedEngine(): AiEngine {
  return {
    info: RULE_INFO,
    async generate(): Promise<string> {
      // Not a neural model: callers detect `info.neural === false` and use the
      // deterministic extractive summariser instead.
      return "";
    },
  };
}

// ---- Selection ----------------------------------------------------------

export interface ChooseOptions {
  /** Prefer WebLLM when the user has enabled it, even if Gemini exists. */
  preferWebllm?: boolean;
}

export async function chooseEngine(
  options: ChooseOptions = {},
): Promise<AiEngine> {
  if (options.preferWebllm && webllmEngine) return webllmEngine;

  if (hasGemini()) {
    const availability = await geminiAvailability();
    if (
      availability === "available" ||
      availability === "readily" ||
      availability === "downloadable" ||
      availability === "downloading"
    ) {
      return createGeminiEngine();
    }
  }

  if (webllmEngine) return webllmEngine;
  return ruleBasedEngine();
}

/** Describe every engine for the "engine status" panel. */
export async function probeEngines(): Promise<EngineProbe[]> {
  const probes: EngineProbe[] = [];
  const geminiState = hasGemini()
    ? await geminiAvailability()
    : "unavailable";
  probes.push({
    info: GEMINI_INFO,
    available:
      geminiState === "available" ||
      geminiState === "readily" ||
      geminiState === "downloadable",
    note: hasGemini()
      ? `Chrome reports: ${geminiState}`
      : "Not exposed by this browser (needs Chrome 138+ with Gemini Nano)",
  });
  probes.push({
    info: WEBLLM_INFO,
    available: !!webllmEngine,
    note: webllmEngine
      ? "Model loaded and ready"
      : "Optional: download an open model to run without Gemini Nano",
  });
  probes.push({
    info: RULE_INFO,
    available: true,
    note: "Always available - deterministic regex + heuristics",
  });
  return probes;
}
