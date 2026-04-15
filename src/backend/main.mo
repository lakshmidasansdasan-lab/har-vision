import Map "mo:core/Map";

import Time "mo:core/Time";
import Nat "mo:core/Nat";
import Order "mo:core/Order";
import List "mo:core/List";
import Cycles "mo:core/Cycles";
import Prim "mo:prim";


actor {
  type ExternalBlob = Blob;

  type ActivityLabel = {
    #walking;
    #running;
    #clapping;
    #waving;
    #jumping;
    #sitting;
    #standing;
    #smiling;
    #bending;
    #stretching;
  };

  type AnalysisStatus = {
    #pending;
    #processing;
    #completed;
    #failed;
  };

  type ActivityResult = {
    id : Nat;
    analysisId : Nat;
    activityLabel : ActivityLabel;
    confidence : Float;
    startTime : Float;
    endTime : Float;
  };

  type VideoAnalysis = {
    id : Nat;
    filename : Text;
    fileSize : Nat;
    duration : Float;
    uploadDate : Int;
    status : AnalysisStatus;
    fileBlob : ExternalBlob;
  };

  var nextAnalysisId = 0;
  let videoAnalyses = Map.empty<Nat, VideoAnalysis>();
  let activityResultsMap = Map.empty<Nat, List.List<ActivityResult>>();

  public shared ({ caller = _ }) func submitVideo(
    filename : Text,
    fileSize : Nat,
    duration : Float,
    fileBlob : ExternalBlob,
  ) : async Nat {
    let id = nextAnalysisId;
    let analysis : VideoAnalysis = {
      id;
      filename;
      fileSize;
      duration;
      uploadDate = Time.now();
      status = #pending;
      fileBlob;
    };
    videoAnalyses.add(id, analysis);
    activityResultsMap.add(id, List.empty<ActivityResult>());
    nextAnalysisId += 1;
    id;
  };

  public query ({ caller = _ }) func getAnalysis(id : Nat) : async ?VideoAnalysis {
    videoAnalyses.get(id);
  };

  public query ({ caller = _ }) func getAllAnalyses() : async [VideoAnalysis] {
    videoAnalyses.reverseEntries().map<(Nat, VideoAnalysis), VideoAnalysis>(func((_, v)) = v).toArray();
  };

  public shared ({ caller = _ }) func deleteAnalysis(id : Nat) : async Bool {
    if (not videoAnalyses.containsKey(id)) {
      return false;
    };
    videoAnalyses.remove(id);
    activityResultsMap.remove(id);
    true;
  };

  public shared ({ caller = _ }) func updateAnalysisStatus(id : Nat, status : AnalysisStatus) : async Bool {
    switch (videoAnalyses.get(id)) {
      case (null) { false };
      case (?analysis) {
        videoAnalyses.add(id, { analysis with status });
        true;
      };
    };
  };

  public query ({ caller = _ }) func getActivityResults(analysisId : Nat) : async [ActivityResult] {
    switch (activityResultsMap.get(analysisId)) {
      case (null) { [] };
      case (?results) { results.toArray() };
    };
  };

  public shared ({ caller = _ }) func setActivityResults(analysisId : Nat, results : [ActivityResult]) : async Bool {
    if (not videoAnalyses.containsKey(analysisId)) {
      return false;
    };
    activityResultsMap.add(analysisId, List.fromArray<ActivityResult>(results));
    true;
  };

  // Object storage support functions
  type _CaffeineStorageRefillInformation = {
    proposed_top_up_amount : ?Nat;
  };

  type _CaffeineStorageRefillResult = {
    success : ?Bool;
    topped_up_amount : ?Nat;
  };

  type _CaffeineStorageCreateCertificateResult = {
    method : Text;
    blob_hash : Text;
  };

  public shared ({ caller }) func _caffeineStorageRefillCashier(refillInformation : ?_CaffeineStorageRefillInformation) : async _CaffeineStorageRefillResult {
    let currentBalance = Cycles.balance();
    let reservedCycles : Nat = 400_000_000_000;
    let currentFreeCycles : Nat = if (currentBalance > reservedCycles) { currentBalance - reservedCycles } else { 0 };

    let cyclesToSend : Nat = switch (refillInformation) {
      case (null) { currentFreeCycles };
      case (?info) {
        switch (info.proposed_top_up_amount) {
          case (null) { currentFreeCycles };
          case (?proposed) { Nat.min(proposed, currentFreeCycles) };
        };
      };
    };

    let cashierActor = actor (caller.toText()) : actor {
      account_top_up_v1 : ({ account : Principal }) -> async ();
    };

    await (with cycles = cyclesToSend) cashierActor.account_top_up_v1({
      account = Prim.getSelfPrincipal<system>();
    });

    { success = ?true; topped_up_amount = ?cyclesToSend };
  };

  public shared ({ caller = _ }) func _caffeineStorageUpdateGatewayPrincipals() : async () {
    // No-op: gateway principals managed externally
  };

  public query ({ caller = _ }) func _caffeineStorageBlobIsLive(hash : Blob) : async Bool {
    Prim.isStorageBlobLive(hash);
  };

  public query ({ caller = _ }) func _caffeineStorageBlobsToDelete() : async [Blob] {
    let deadBlobs = Prim.getDeadBlobs();
    switch (deadBlobs) {
      case (null) { [] };
      case (?blobs) { blobs.sliceToArray(0, 10000) };
    };
  };

  public shared ({ caller = _ }) func _caffeineStorageConfirmBlobDeletion(blobs : [Blob]) : async () {
    Prim.pruneConfirmedDeadBlobs(blobs);
    type GC = actor { __motoko_gc_trigger : () -> async () };
    let myGC = actor (debug_show (Prim.getSelfPrincipal<system>())) : GC;
    await myGC.__motoko_gc_trigger();
  };

  public shared ({ caller = _ }) func _caffeineStorageCreateCertificate(blobHash : Text) : async _CaffeineStorageCreateCertificateResult {
    { method = "upload"; blob_hash = blobHash };
  };
};
