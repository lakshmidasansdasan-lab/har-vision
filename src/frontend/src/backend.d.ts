import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export class ExternalBlob {
    getBytes(): Promise<Uint8Array<ArrayBuffer>>;
    getDirectURL(): string;
    static fromURL(url: string): ExternalBlob;
    static fromBytes(blob: Uint8Array<ArrayBuffer>): ExternalBlob;
    withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob;
}
export interface ActivityResult {
    id: bigint;
    startTime: number;
    activityLabel: ActivityLabel;
    endTime: number;
    analysisId: bigint;
    confidence: number;
}
export interface VideoAnalysis {
    id: bigint;
    status: AnalysisStatus;
    duration: number;
    fileBlob: ExternalBlob;
    fileSize: bigint;
    filename: string;
    uploadDate: bigint;
}
export enum ActivityLabel {
    jumping = "jumping",
    clapping = "clapping",
    stretching = "stretching",
    walking = "walking",
    waving = "waving",
    sitting = "sitting",
    bending = "bending",
    standing = "standing",
    running = "running",
    smiling = "smiling"
}
export enum AnalysisStatus {
    pending = "pending",
    completed = "completed",
    processing = "processing",
    failed = "failed"
}
export interface backendInterface {
    deleteAnalysis(id: bigint): Promise<boolean>;
    getActivityResults(analysisId: bigint): Promise<Array<ActivityResult>>;
    getAllAnalyses(): Promise<Array<VideoAnalysis>>;
    getAnalysis(id: bigint): Promise<VideoAnalysis | null>;
    setActivityResults(analysisId: bigint, results: Array<ActivityResult>): Promise<boolean>;
    submitVideo(filename: string, fileSize: bigint, duration: number, fileBlob: ExternalBlob): Promise<bigint>;
    updateAnalysisStatus(id: bigint, status: AnalysisStatus): Promise<boolean>;
}
