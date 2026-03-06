import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ActivityResult, VideoAnalysis } from "../backend.d.ts";
import type { AnalysisStatus } from "../backend.d.ts";
import { useActor } from "./useActor";

export function useGetAllAnalyses(page = 0n, pageSize = 20n) {
  const { actor, isFetching } = useActor();
  return useQuery<VideoAnalysis[]>({
    queryKey: ["analyses", page.toString(), pageSize.toString()],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllAnalyses(page, pageSize);
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetActivityResults(analysisId: bigint | null) {
  const { actor, isFetching } = useActor();
  return useQuery<ActivityResult[]>({
    queryKey: ["activityResults", analysisId?.toString()],
    queryFn: async () => {
      if (!actor || analysisId === null) return [];
      return actor.getActivityResults(analysisId);
    },
    enabled: !!actor && !isFetching && analysisId !== null,
  });
}

export function useDeleteAnalysis() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: bigint) => {
      if (!actor) throw new Error("Not connected");
      return actor.deleteAnalysis(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["analyses"] });
    },
  });
}

export function useUpdateStatus() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: (params: { id: bigint; status: AnalysisStatus }) => {
      if (!actor) throw new Error("Not connected");
      return actor.updateAnalysisStatus(params.id, params.status);
    },
  });
}

export function useSetActivityResults() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: (params: { analysisId: bigint; results: ActivityResult[] }) => {
      if (!actor) throw new Error("Not connected");
      return actor.setActivityResults(params.analysisId, params.results);
    },
  });
}
