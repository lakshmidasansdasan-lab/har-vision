/**
 * useActor — provides a simulated backend actor for the HAR Vision app.
 *
 * Since the backend canister currently has an empty service interface,
 * this hook implements all HAR methods using localStorage for persistence.
 * The interface mirrors what useQueries.ts and the rest of the app expects.
 */
import { useRef } from "react";
import type { ExternalBlob } from "../backend";
import { AnalysisStatus } from "../types/har";
import type { ActivityResult, VideoAnalysis } from "../types/har";

const STORAGE_ANALYSES = "har_vision_analyses";
const STORAGE_RESULTS = "har_vision_results";

function loadAnalyses(): VideoAnalysis[] {
  try {
    const raw = localStorage.getItem(STORAGE_ANALYSES);
    if (!raw) return [];
    // Revive bigint fields serialized as strings
    const parsed = JSON.parse(raw) as Array<Record<string, unknown>>;
    return parsed.map((a) => ({
      ...a,
      id: BigInt(a.id as string),
      fileSize: BigInt(a.fileSize as string),
      duration: Number(a.duration),
      submittedAt: BigInt(a.submittedAt as string),
      status: a.status as AnalysisStatus,
    })) as VideoAnalysis[];
  } catch {
    return [];
  }
}

function saveAnalyses(analyses: VideoAnalysis[]): void {
  try {
    const serialisable = analyses.map((a) => ({
      ...a,
      id: a.id.toString(),
      fileSize: a.fileSize.toString(),
      submittedAt: a.submittedAt.toString(),
    }));
    localStorage.setItem(STORAGE_ANALYSES, JSON.stringify(serialisable));
  } catch {
    // storage quota — silently ignore
  }
}

function loadResults(): Record<string, ActivityResult[]> {
  try {
    const raw = localStorage.getItem(STORAGE_RESULTS);
    return raw ? (JSON.parse(raw) as Record<string, ActivityResult[]>) : {};
  } catch {
    return {};
  }
}

function saveResults(results: Record<string, ActivityResult[]>): void {
  try {
    localStorage.setItem(STORAGE_RESULTS, JSON.stringify(results));
  } catch {
    // ignore
  }
}

let nextId = BigInt(Date.now());
function generateId(): bigint {
  nextId += 1n;
  return nextId;
}

/** Simulated backend actor implementing all HAR methods */
function createLocalActor() {
  return {
    async submitVideo(
      filename: string,
      fileSize: bigint,
      duration: number,
      _blob: ExternalBlob,
    ): Promise<bigint> {
      const id = generateId();
      const analysis: VideoAnalysis = {
        id,
        filename,
        fileSize,
        duration,
        submittedAt: BigInt(Date.now()) * 1_000_000n, // nanoseconds
        status: AnalysisStatus.pending,
      };
      const all = loadAnalyses();
      all.unshift(analysis);
      saveAnalyses(all);
      return id;
    },

    async getAnalysis(id: bigint): Promise<VideoAnalysis | null> {
      const all = loadAnalyses();
      return all.find((a) => a.id === id) ?? null;
    },

    async getAllAnalyses(
      _page: bigint,
      _pageSize: bigint,
    ): Promise<VideoAnalysis[]> {
      return loadAnalyses();
    },

    async deleteAnalysis(id: bigint): Promise<void> {
      const all = loadAnalyses().filter((a) => a.id !== id);
      saveAnalyses(all);
      const results = loadResults();
      delete results[id.toString()];
      saveResults(results);
    },

    async updateAnalysisStatus(
      id: bigint,
      status: AnalysisStatus,
    ): Promise<void> {
      const all = loadAnalyses().map((a) =>
        a.id === id ? { ...a, status } : a,
      );
      saveAnalyses(all);
    },

    async getActivityResults(analysisId: bigint): Promise<ActivityResult[]> {
      const results = loadResults();
      return results[analysisId.toString()] ?? [];
    },

    async setActivityResults(
      analysisId: bigint,
      results: ActivityResult[],
    ): Promise<void> {
      const all = loadResults();
      all[analysisId.toString()] = results;
      saveResults(all);
    },
  };
}

export type LocalActor = ReturnType<typeof createLocalActor>;

interface UseActorReturn {
  actor: LocalActor | null;
  isFetching: boolean;
}

export function useActor(): UseActorReturn {
  const actorRef = useRef<LocalActor | null>(null);

  if (!actorRef.current) {
    actorRef.current = createLocalActor();
  }

  return {
    actor: actorRef.current,
    isFetching: false,
  };
}
