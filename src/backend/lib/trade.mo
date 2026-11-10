import Map "mo:core/Map";
import Float "mo:core/Float";
import Int "mo:core/Int";
import List "mo:core/List";
import Nat "mo:core/Nat";
import Order "mo:core/Order";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import Common "../types/common";
import Types "../types/trade";

module {
  public type TokenId = Common.TokenId;
  public type CommitmentId = Common.CommitmentId;
  public type DocumentId = Common.DocumentId;
  public type TradeToken = Types.TradeToken;
  public type FundingCommitment = Types.FundingCommitment;
  public type AttachedDocument = Types.AttachedDocument;
  public type TokenSummary = Types.TokenSummary;
  public type TokenSort = Types.TokenSort;
  public type IssuedTokenView = Types.IssuedTokenView;
  public type FundedTokenView = Types.FundedTokenView;
  public type TradeError = Types.TradeError;
  public type TradeResult<T> = Types.TradeResult<T>;

  /// Shared mutable counters for the trade domain.
  public type Counters = {
    var nextTokenId : Nat;
    var nextCommitmentId : Nat;
    var nextDocumentId : Nat;
  };

  /// Validate the common terms shared by create and update.
  func validateTerms(
    faceValue : Nat,
    currency : Text,
    debtorName : Text,
    issueDate : Common.Timestamp,
    maturityDate : Common.Timestamp,
    fundingTarget : Nat,
    returnTerms : Text,
  ) : ?TradeError {
    if (faceValue == 0) {
      return ?#invalidTerms("Face value must be greater than zero");
    };
    if (fundingTarget == 0) {
      return ?#invalidTerms("Funding target must be greater than zero");
    };
    if (fundingTarget > faceValue) {
      return ?#invalidTerms("Funding target cannot exceed face value");
    };
    if (currency.size() == 0) {
      return ?#invalidTerms("Currency is required");
    };
    if (debtorName.size() == 0) {
      return ?#invalidTerms("Buyer or debtor name is required");
    };
    if (returnTerms.size() == 0) {
      return ?#invalidTerms("Return terms are required");
    };
    if (maturityDate <= issueDate) {
      return ?#invalidTerms("Maturity date must be after the issue date");
    };
    null;
  };

  /// Funding progress as a fraction of the funding target (0.0 when target is 0).
  func progressOf(token : TradeToken) : Float {
    if (token.fundingTarget == 0) {
      return 0.0;
    };
    token.amountFunded.toFloat() / token.fundingTarget.toFloat();
  };

  /// Remaining funding capacity, saturating at zero.
  func remainingFunding(token : TradeToken) : Nat {
    if (token.amountFunded >= token.fundingTarget) {
      return 0;
    };
    token.fundingTarget - token.amountFunded;
  };

  /// Return owed to a commitment under the token's return terms: the
  /// investor's proportional share of the token's face value.
  public func returnFor(token : TradeToken, amount : Nat) : Nat {
    if (token.fundingTarget == 0) {
      return 0;
    };
    (amount * token.faceValue) / token.fundingTarget;
  };

  func toSummary(token : TradeToken) : TokenSummary {
    {
      id = token.id;
      issuer = token.issuer;
      kind = token.kind;
      faceValue = token.faceValue;
      currency = token.currency;
      fundingTarget = token.fundingTarget;
      amountFunded = token.amountFunded;
      fundingProgress = progressOf(token);
      returnTerms = token.returnTerms;
      maturityDate = token.maturityDate;
      status = token.status;
    };
  };

  /// Create a tokenized invoice or purchase order for the caller.
  public func createToken(
    tokens : Map.Map<TokenId, TradeToken>,
    counters : Counters,
    caller : Principal,
    kind : Types.TokenKind,
    faceValue : Nat,
    currency : Text,
    debtorName : Text,
    issueDate : Common.Timestamp,
    maturityDate : Common.Timestamp,
    fundingTarget : Nat,
    returnTerms : Text,
  ) : TradeResult<TokenId> {
    switch (validateTerms(faceValue, currency, debtorName, issueDate, maturityDate, fundingTarget, returnTerms)) {
      case (?err) { return #err(err) };
      case null {};
    };
    let id = counters.nextTokenId;
    counters.nextTokenId := id + 1;
    let token : TradeToken = {
      id;
      issuer = caller;
      kind;
      faceValue;
      currency;
      debtorName;
      issueDate;
      maturityDate;
      fundingTarget;
      returnTerms;
      amountFunded = 0;
      status = #open;
      createdAt = Time.now();
    };
    tokens.add(id, token);
    #ok(id);
  };

  /// Update the terms of a token the caller issued while it is still open.
  public func updateToken(
    tokens : Map.Map<TokenId, TradeToken>,
    caller : Principal,
    tokenId : TokenId,
    faceValue : Nat,
    currency : Text,
    debtorName : Text,
    issueDate : Common.Timestamp,
    maturityDate : Common.Timestamp,
    fundingTarget : Nat,
    returnTerms : Text,
  ) : TradeResult<()> {
    let token = switch (tokens.get(tokenId)) {
      case (?t) { t };
      case null { return #err(#tokenNotFound(tokenId)) };
    };
    if (token.issuer != caller) {
      return #err(#notIssuer);
    };
    switch (token.status) {
      case (#cancelled) { return #err(#tokenCancelled) };
      case (#matured) { return #err(#tokenMatured) };
      case (#funded) { return #err(#tokenNotOpen) };
      case (#open) {};
    };
    switch (validateTerms(faceValue, currency, debtorName, issueDate, maturityDate, fundingTarget, returnTerms)) {
      case (?err) { return #err(err) };
      case null {};
    };
    let updated : TradeToken = {
      id = token.id;
      issuer = token.issuer;
      kind = token.kind;
      faceValue;
      currency;
      debtorName;
      issueDate;
      maturityDate;
      fundingTarget;
      returnTerms;
      amountFunded = token.amountFunded;
      status = token.status;
      createdAt = token.createdAt;
    };
    tokens.add(tokenId, updated);
    #ok(());
  };

  /// Cancel a token the caller issued while it is still open.
  public func cancelToken(
    tokens : Map.Map<TokenId, TradeToken>,
    caller : Principal,
    tokenId : TokenId,
  ) : TradeResult<()> {
    let token = switch (tokens.get(tokenId)) {
      case (?t) { t };
      case null { return #err(#tokenNotFound(tokenId)) };
    };
    if (token.issuer != caller) {
      return #err(#notIssuer);
    };
    switch (token.status) {
      case (#cancelled) { return #err(#tokenCancelled) };
      case (#matured) { return #err(#tokenMatured) };
      case (#funded) { return #err(#tokenNotOpen) };
      case (#open) {};
    };
    tokens.add(tokenId, { token with status = #cancelled });
    #ok(());
  };

  /// Commit funds to an open token.
  public func fundToken(
    tokens : Map.Map<TokenId, TradeToken>,
    commitments : Map.Map<CommitmentId, FundingCommitment>,
    counters : Counters,
    caller : Principal,
    tokenId : TokenId,
    amount : Nat,
  ) : TradeResult<CommitmentId> {
    let token = switch (tokens.get(tokenId)) {
      case (?t) { t };
      case null { return #err(#tokenNotFound(tokenId)) };
    };
    switch (token.status) {
      case (#cancelled) { return #err(#tokenCancelled) };
      case (#matured) { return #err(#tokenMatured) };
      case (#funded) { return #err(#tokenNotOpen) };
      case (#open) {};
    };
    if (amount == 0) {
      return #err(#invalidTerms("Commitment amount must be greater than zero"));
    };
    if (token.amountFunded + amount > token.fundingTarget) {
      let remaining = remainingFunding(token);
      return #err(#exceedsFundingTarget({ remaining }));
    };
    let id = counters.nextCommitmentId;
    counters.nextCommitmentId := id + 1;
    let commitment : FundingCommitment = {
      id;
      tokenId;
      investor = caller;
      amount;
      expectedReturn = returnFor(token, amount);
      committedAt = Time.now();
    };
    commitments.add(id, commitment);
    let newFunded = token.amountFunded + amount;
    let newStatus : Types.TokenStatus = if (newFunded >= token.fundingTarget) { #funded } else { #open };
    tokens.add(tokenId, { token with amountFunded = newFunded; status = newStatus });
    #ok(id);
  };

  /// Attach a document reference to a token the caller issued.
  public func attachDocument(
    tokens : Map.Map<TokenId, TradeToken>,
    documents : Map.Map<DocumentId, AttachedDocument>,
    counters : Counters,
    caller : Principal,
    tokenId : TokenId,
    file : Common.FileRef,
    fileName : Text,
    contentType : Text,
  ) : TradeResult<DocumentId> {
    let token = switch (tokens.get(tokenId)) {
      case (?t) { t };
      case null { return #err(#tokenNotFound(tokenId)) };
    };
    if (token.issuer != caller) {
      return #err(#notIssuer);
    };
    switch (token.status) {
      case (#cancelled) { return #err(#tokenCancelled) };
      case (#matured) { return #err(#tokenMatured) };
      case (#open) {};
      case (#funded) {};
    };
    let id = counters.nextDocumentId;
    counters.nextDocumentId := id + 1;
    let doc : AttachedDocument = {
      id;
      tokenId;
      file;
      fileName;
      contentType;
      uploadedAt = Time.now();
    };
    documents.add(id, doc);
    #ok(id);
  };

  /// Public marketplace listing with optional status filter and sort.
  public func listMarketplace(
    tokens : Map.Map<TokenId, TradeToken>,
    statusFilter : ?Types.TokenStatus,
    sortBy : TokenSort,
  ) : [TokenSummary] {
    let all = tokens.values().toArray();
    let filtered = switch (statusFilter) {
      case (?status) { all.filter(func t = t.status == status) };
      case null { all };
    };
    let summaries = filtered.map(func t = toSummary(t));
    summaries.sort(func (a, b) = compareSummaries(a, b, sortBy));
  };

  func compareSummaries(a : TokenSummary, b : TokenSummary, sortBy : TokenSort) : Order.Order {
    switch (sortBy) {
      case (#fundingProgress) { Float.compare(b.fundingProgress, a.fundingProgress) };
      case (#faceValue) { Nat.compare(b.faceValue, a.faceValue) };
      case (#maturityDate) { Int.compare(a.maturityDate, b.maturityDate) };
    };
  };

  /// Public detail view of a single token.
  public func getToken(
    tokens : Map.Map<TokenId, TradeToken>,
    tokenId : TokenId,
  ) : ?TradeToken {
    tokens.get(tokenId);
  };

  /// Documents attached to a token.
  public func listTokenDocuments(
    documents : Map.Map<DocumentId, AttachedDocument>,
    tokenId : TokenId,
  ) : [AttachedDocument] {
    documents.values().toArray().filter(func d = d.tokenId == tokenId);
  };

  /// Tokens the caller issued, with their funding status.
  public func listIssuedTokens(
    tokens : Map.Map<TokenId, TradeToken>,
    commitments : Map.Map<CommitmentId, FundingCommitment>,
    caller : Principal,
  ) : [IssuedTokenView] {
    let commitmentArray = commitments.values().toArray();
    tokens.values().toArray()
      .filter(func t = t.issuer == caller)
      .map(func t = {
        token = t;
        commitmentCount = commitmentArray.filter(func c = c.tokenId == t.id).size();
      });
  };

  /// Tokens the caller funded, with the caller's commitment.
  public func listFundedTokens(
    tokens : Map.Map<TokenId, TradeToken>,
    commitments : Map.Map<CommitmentId, FundingCommitment>,
    caller : Principal,
  ) : [FundedTokenView] {
    let mine = commitments.values().toArray().filter(func c = c.investor == caller);
    let views = mine.map(func c = {
      token = tokens.get(c.tokenId) ?? Runtime.trap("Commitment references a missing token");
      commitment = c;
    });
    views;
  };

  /// Move a token to funded once its funding target is reached.
  public func settleFunding(
    tokens : Map.Map<TokenId, TradeToken>,
    tokenId : TokenId,
  ) : TradeResult<()> {
    let token = switch (tokens.get(tokenId)) {
      case (?t) { t };
      case null { return #err(#tokenNotFound(tokenId)) };
    };
    switch (token.status) {
      case (#cancelled) { return #err(#tokenCancelled) };
      case (#matured) { return #err(#tokenMatured) };
      case (#funded) { return #err(#tokenNotOpen) };
      case (#open) {};
    };
    if (token.amountFunded < token.fundingTarget) {
      return #err(#invalidTerms("Funding target not yet reached"));
    };
    tokens.add(tokenId, { token with status = #funded });
    #ok(());
  };

  /// Move a funded token that has reached its maturity date to matured and
  /// distribute returns to its funders per the token's return terms. The
  /// distribution is recorded per commitment on each commitment's expected
  /// return.
  public func settleMaturity(
    tokens : Map.Map<TokenId, TradeToken>,
    commitments : Map.Map<CommitmentId, FundingCommitment>,
    tokenId : TokenId,
  ) : TradeResult<()> {
    let token = switch (tokens.get(tokenId)) {
      case (?t) { t };
      case null { return #err(#tokenNotFound(tokenId)) };
    };
    switch (token.status) {
      case (#cancelled) { return #err(#tokenCancelled) };
      case (#matured) { return #err(#tokenMatured) };
      case (#open) { return #err(#tokenNotOpen) };
      case (#funded) {};
    };
    if (Time.now() < token.maturityDate) {
      return #err(#invalidTerms("Token has not reached maturity"));
    };
    // Distribute returns: record the owed return on each commitment.
    // Collect first, then apply, so the map is not mutated mid-iteration.
    let updates = List.empty<(CommitmentId, FundingCommitment)>();
    for ((id, commitment) in commitments.entries()) {
      if (commitment.tokenId == tokenId) {
        updates.add((id, { commitment with expectedReturn = returnFor(token, commitment.amount) }));
      };
    };
    for ((id, updated) in updates.values()) {
      commitments.add(id, updated);
    };
    tokens.add(tokenId, { token with status = #matured });
    #ok(());
  };
};
