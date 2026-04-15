import type { backendInterface, ActivityResult, VideoAnalysis, ActivityLabel, AnalysisStatus } from "../backend";

const sampleActivities: ActivityResult[] = [
  {
    id: BigInt(1),
    analysisId: BigInt(1),
    activityLabel: "walking" as unknown as ActivityLabel,
    confidence: 0.92,
    startTime: 0.0,
    endTime: 4.5,
  },
  {
    id: BigInt(2),
    analysisId: BigInt(1),
    activityLabel: "clapping" as unknown as ActivityLabel,
    confidence: 0.87,
    startTime: 5.0,
    endTime: 9.2,
  },
  {
    id: BigInt(3),
    analysisId: BigInt(1),
    activityLabel: "standing" as unknown as ActivityLabel,
    confidence: 0.78,
    startTime: 10.0,
    endTime: 15.0,
  },
];

const sampleAnalysis: VideoAnalysis = {
  id: BigInt(1),
  filename: "sample_activity.mp4",
  fileSize: BigInt(10485760),
  duration: 15.0,
  uploadDate: BigInt(Date.now() * 1_000_000),
  status: "completed" as unknown as AnalysisStatus,
  fileBlob: null as any,
};

export const mockBackend: backendInterface = {
  // Storage infrastructure methods (required by backendInterface)
  _caffeineStorageBlobIsLive: async (_hash: Uint8Array) => true,
  _caffeineStorageBlobsToDelete: async () => [],
  _caffeineStorageConfirmBlobDeletion: async (_blobs: Uint8Array[]) => {},
  _caffeineStorageCreateCertificate: async (_blobHash: string) => ({ method: "GET", blob_hash: _blobHash }),
  _caffeineStorageRefillCashier: async (_refillInformation: unknown) => ({ success: true }),
  _caffeineStorageUpdateGatewayPrincipals: async () => {},
  // Application methods
  deleteAnalysis: async (_id: bigint) => true,
  getActivityResults: async (_analysisId: bigint) => sampleActivities,
  getAllAnalyses: async () => [sampleAnalysis],
  getAnalysis: async (_id: bigint) => sampleAnalysis,
  setActivityResults: async (_analysisId: bigint, _results: ActivityResult[]) => true,
  submitVideo: async (_filename: string, _fileSize: bigint, _duration: number, _fileBlob: unknown) => BigInt(2),
  updateAnalysisStatus: async (_id: bigint, _status: AnalysisStatus) => true,
};
