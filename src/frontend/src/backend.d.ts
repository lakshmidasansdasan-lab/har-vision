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
export type Time = bigint;
export interface ActivityResult {
    startTime: number;
    activityLabel: ActivityLabel;
    endTime: number;
    confidence: number;
}
export interface VideoAnalysis {
    id: bigint;
    status: AnalysisStatus;
    duration: number;
    video: ExternalBlob;
    submittedAt: Time;
    submittedBy: Principal;
    fileSize: bigint;
    filename: string;
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
    deleteAnalysis(id: bigint): Promise<void>;
    getActivityResults(analysisId: bigint): Promise<Array<ActivityResult>>;
    getAllAnalyses(page: bigint, pageSize: bigint): Promise<Array<VideoAnalysis>>;
    getAnalysis(id: bigint): Promise<VideoAnalysis>;
    setActivityResults(analysisId: bigint, results: Array<ActivityResult>): Promise<void>;
    submitVideo(filename: string, fileSize: bigint, duration: number, video: ExternalBlob): Promise<bigint>;
    updateAnalysisStatus(id: bigint, status: AnalysisStatus): Promise<void>;
}
