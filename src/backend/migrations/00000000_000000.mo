import Map "mo:core/Map";
import AccessControl "mo:caffeineai-authorization/access-control";

module {
  type TokenKind = { #invoice; #purchaseOrder };
  type TokenStatus = { #open; #funded; #matured; #cancelled };

  type TradeToken = {
    id : Nat;
    issuer : Principal;
    kind : TokenKind;
    faceValue : Nat;
    currency : Text;
    debtorName : Text;
    issueDate : Int;
    maturityDate : Int;
    fundingTarget : Nat;
    returnTerms : Text;
    amountFunded : Nat;
    status : TokenStatus;
    createdAt : Int;
  };

  type FundingCommitment = {
    id : Nat;
    tokenId : Nat;
    investor : Principal;
    amount : Nat;
    expectedReturn : Nat;
    committedAt : Int;
  };

  type AttachedDocument = {
    id : Nat;
    tokenId : Nat;
    file : Blob;
    fileName : Text;
    contentType : Text;
    uploadedAt : Int;
  };

  type Counters = {
    var nextTokenId : Nat;
    var nextCommitmentId : Nat;
    var nextDocumentId : Nat;
  };

  public type OldActor = {};

  public type NewActor = {
    accessControlState : AccessControl.AccessControlState;
    tokens : Map.Map<Nat, TradeToken>;
    commitments : Map.Map<Nat, FundingCommitment>;
    documents : Map.Map<Nat, AttachedDocument>;
    counters : Counters;
  };

  public func migration(_ : OldActor) : NewActor {
    {
      accessControlState = AccessControl.initState();
      tokens = Map.empty();
      commitments = Map.empty();
      documents = Map.empty();
      counters = { var nextTokenId = 0; var nextCommitmentId = 0; var nextDocumentId = 0 };
    };
  };
};
