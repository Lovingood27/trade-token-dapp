import Common "common";

module {
  public type Timestamp = Common.Timestamp;
  public type TokenId = Common.TokenId;
  public type CommitmentId = Common.CommitmentId;
  public type DocumentId = Common.DocumentId;
  public type FileRef = Common.FileRef;

  /// Whether the tokenized obligation is an invoice or a purchase order.
  public type TokenKind = {
    #invoice;
    #purchaseOrder;
  };

  /// Lifecycle of a Trade Token.
  public type TokenStatus = {
    #open;
    #funded;
    #matured;
    #cancelled;
  };

  /// A tokenized invoice or purchase order offered for funding.
  public type TradeToken = {
    id : TokenId;
    issuer : Principal;
    kind : TokenKind;
    faceValue : Nat;
    currency : Text;
    debtorName : Text;
    issueDate : Timestamp;
    maturityDate : Timestamp;
    fundingTarget : Nat;
    returnTerms : Text;
    amountFunded : Nat;
    status : TokenStatus;
    createdAt : Timestamp;
  };

  /// An investor's commitment to fund a Trade Token.
  public type FundingCommitment = {
    id : CommitmentId;
    tokenId : TokenId;
    investor : Principal;
    amount : Nat;
    expectedReturn : Nat;
    committedAt : Timestamp;
  };

  /// A document attached to a Trade Token.
  public type AttachedDocument = {
    id : DocumentId;
    tokenId : TokenId;
    file : FileRef;
    fileName : Text;
    contentType : Text;
    uploadedAt : Timestamp;
  };

  /// Public listing row for the marketplace.
  public type TokenSummary = {
    id : TokenId;
    issuer : Principal;
    kind : TokenKind;
    faceValue : Nat;
    currency : Text;
    fundingTarget : Nat;
    amountFunded : Nat;
    fundingProgress : Float;
    returnTerms : Text;
    maturityDate : Timestamp;
    status : TokenStatus;
  };

  /// Sort order for marketplace listings.
  public type TokenSort = {
    #fundingProgress;
    #faceValue;
    #maturityDate;
  };

  /// A token the caller issued, with its funding status.
  public type IssuedTokenView = {
    token : TradeToken;
    commitmentCount : Nat;
  };

  /// A token the caller funded, with the caller's commitment.
  public type FundedTokenView = {
    token : TradeToken;
    commitment : FundingCommitment;
  };

  /// Errors returned by token and funding operations.
  public type TradeError = {
    #invalidTerms : Text;
    #unauthorizedIssuer;
    #tokenNotOpen;
    #exceedsFundingTarget : { remaining : Nat };
    #tokenCancelled;
    #tokenMatured;
    #tokenNotFound : TokenId;
    #notIssuer;
  };

  /// Result of a trade operation: either a success value or a TradeError.
  public type TradeResult<T> = {
    #ok : T;
    #err : TradeError;
  };
};
