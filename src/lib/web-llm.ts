// ==================== WEB LLM ENGINE ====================
// Exploratory — not for production.
// Manages a singleton MLCEngine so the model isn't reloaded on re-renders.

export interface ModelOption {
  id: string;
  label: string;
  sizeGB: number;
  description: string;
}

export const AVAILABLE_MODELS: ModelOption[] = [
  {
    id: "Phi-3.5-mini-instruct-q4f16_1-MLC",
    label: "Phi-3.5 Mini",
    sizeGB: 2.2,
    description: "Fast — good for quick Q&A",
  },
  {
    id: "Llama-3.1-8B-Instruct-q4f16_1-MLC",
    label: "Llama 3.1 8B",
    sizeGB: 4.5,
    description: "Better reasoning — recommended for M1 Max",
  },
  {
    id: "gemma-2-9b-it-q4f16_1-MLC",
    label: "Gemma 2 9B",
    sizeGB: 5.5,
    description: "Excellent quality — needs ~8GB VRAM",
  },
];

export const DEFAULT_MODEL_ID = AVAILABLE_MODELS[1].id; // Llama 8B for M1 Max

export interface LoadProgress {
  progress: number; // 0–1
  text: string;
}

// Singleton — avoids re-downloading the model on component re-mounts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _engine: any | null = null;
let _loadedModelId: string | null = null;

export async function getEngine(
  modelId: string,
  onProgress: (p: LoadProgress) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  if (_engine && _loadedModelId === modelId) return _engine;

  // Unload previous model before loading a new one
  if (_engine) {
    await _engine.unload?.();
    _engine = null;
    _loadedModelId = null;
  }

  const { CreateMLCEngine } = await import("@mlc-ai/web-llm");

  _engine = await CreateMLCEngine(modelId, {
    initProgressCallback: (report: { progress: number; text: string }) => {
      onProgress({ progress: report.progress, text: report.text });
    },
  });

  _loadedModelId = modelId;
  return _engine;
}

export function getLoadedModelId(): string | null {
  return _loadedModelId;
}

export async function unloadEngine(): Promise<void> {
  if (_engine) {
    await _engine.unload?.();
    _engine = null;
    _loadedModelId = null;
  }
}

export function isWebGPUSupported(): boolean {
  return typeof navigator !== "undefined" && "gpu" in navigator;
}
