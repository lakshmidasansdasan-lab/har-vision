import Array "mo:core/Array";
import Iter "mo:core/Iter";
import Map "mo:core/Map";
import Order "mo:core/Order";
import Text "mo:core/Text";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import Nat "mo:core/Nat";
import Nat64 "mo:core/Nat64";
import Float "mo:core/Float";
import List "mo:core/List";
import MixinStorage "blob-storage/Mixin";
import Storage "blob-storage/Storage";
import Principal "mo:core/Principal";

actor {
  include MixinStorage();

  type ActivityLabel = {
    #clapping;
    #standing;
    #smiling;
    #walking;
    #running;
    #waving;
    #jumping;
    #sitting;
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
    activityLabel : ActivityLabel;
    confidence : Float;
    startTime : Float;
    endTime : Float;
  };

  type VideoAnalysis = {
    id : Nat;
    filename : Text;
    fileSize : Nat64;
    duration : Float;
    status : AnalysisStatus;
    submittedBy : Principal;
    submittedAt : Time.Time;
    video : Storage.ExternalBlob;
  };

  var nextAnalysisId = 0;
  let videoAnalyses = Map.empty<Nat, VideoAnalysis>();
  let activityResults = Map.empty<Nat, List.List<ActivityResult>>();

  module VideoAnalysis {
    public func compare(a : VideoAnalysis, b : VideoAnalysis) : Order.Order {
      Nat.compare(b.id, a.id);
    };
  };

  public shared ({ caller }) func submitVideo(filename : Text, fileSize : Nat64, duration : Float, video : Storage.ExternalBlob) : async Nat {
    let analysis : VideoAnalysis = {
      id = nextAnalysisId;
      filename;
      fileSize;
      duration;
      status = #pending;
      submittedBy = caller;
      submittedAt = Time.now();
      video;
    };

    videoAnalyses.add(nextAnalysisId, analysis);
    let resultsList = List.empty<ActivityResult>();
    activityResults.add(nextAnalysisId, resultsList);

    nextAnalysisId += 1;
    analysis.id;
  };

  public query ({ caller }) func getAnalysis(id : Nat) : async VideoAnalysis {
    switch (videoAnalyses.get(id)) {
      case (null) { Runtime.trap("Analysis not found") };
      case (?analysis) { analysis };
    };
  };

  public query ({ caller }) func getAllAnalyses(page : Nat, pageSize : Nat) : async [VideoAnalysis] {
    let analyses = videoAnalyses.values().toArray();
    let analysesArray = analyses.sort();

    let start = page * pageSize;
    let end = Nat.min(start + pageSize, analysesArray.size());

    analysesArray.sliceToArray(start, end);
  };

  public shared ({ caller }) func deleteAnalysis(id : Nat) : async () {
    if (not videoAnalyses.containsKey(id)) {
      Runtime.trap("Analysis not found");
    };
    videoAnalyses.remove(id);
    activityResults.remove(id);
  };

  public shared ({ caller }) func updateAnalysisStatus(id : Nat, status : AnalysisStatus) : async () {
    switch (videoAnalyses.get(id)) {
      case (null) { Runtime.trap("Analysis not found") };
      case (?analysis) {
        let updatedAnalysis : VideoAnalysis = {
          id = analysis.id;
          filename = analysis.filename;
          fileSize = analysis.fileSize;
          duration = analysis.duration;
          status;
          submittedBy = analysis.submittedBy;
          submittedAt = analysis.submittedAt;
          video = analysis.video;
        };
        videoAnalyses.add(id, updatedAnalysis);
      };
    };
  };

  public query ({ caller }) func getActivityResults(analysisId : Nat) : async [ActivityResult] {
    switch (activityResults.get(analysisId)) {
      case (null) { Runtime.trap("Analysis not found") };
      case (?results) { results.toArray() };
    };
  };

  public shared ({ caller }) func setActivityResults(analysisId : Nat, results : [ActivityResult]) : async () {
    if (not videoAnalyses.containsKey(analysisId)) {
      Runtime.trap("Analysis not found");
    };

    let resultsList = List.fromArray<ActivityResult>(results);
    activityResults.add(analysisId, resultsList);
  };
};
