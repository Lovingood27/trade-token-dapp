import Map "mo:core/Map";
import Runtime "mo:core/Runtime";
import AccessControl "mo:caffeineai-authorization/access-control";
import Common "../types/common";
import Types "../types/trade";
import TradeLib "../lib/trade";

mixin (
  accessControlState : AccessControl.AccessControlState,
  tokens : Map.Map<Common.TokenId, Types.TradeToken>,
  commitments : Map.Map<Common.CommitmentId, Types.FundingCommitment>,
  documents : Map.Map<Common.DocumentId, Types.AttachedDocument>,
  counters : TradeLib.Counters,
) {
  /// Create a tokenized invoice or purchase order. Signed-in callers only.
  public shared ({ caller }) func createToken(
    kind : Types.TokenKind,
    faceValue : Nat,
    currency : Text,
    debtorName : Text,
    issueDate : Common.Timestamp,
    maturityDate : Common.Timestamp,
    fundingTarget : Nat,
    returnTerms : Text,
  ) : async Types.TradeResult<Common.TokenId> {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only signed-in users can create tokens");
    };
    TradeLib.createToken(tokens, counters, caller, kind, faceValue, currency, debtorName, issueDate, maturityDate, fundingTarget, returnTerms);
  };

  /// Update an open token the caller issued. Signed-in callers only.
  public shared ({ caller }) func updateToken(
    tokenId : Common.TokenId,
    faceValue : Nat,
    currency : Text,
    debtorName : Text,
    issueDate : Common.Timestamp,
    maturityDate : Common.Timestamp,
    fundingTarget : Nat,
    returnTerms : Text,
  ) : async Types.TradeResult<()> {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only signed-in users can update tokens");
    };
    TradeLib.updateToken(tokens, caller, tokenId, faceValue, currency, debtorName, issueDate, maturityDate, fundingTarget, returnTerms);
  };

  /// Cancel an open token the caller issued. Signed-in callers only.
  public shared ({ caller }) func cancelToken(tokenId : Common.TokenId) : async Types.TradeResult<()> {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only signed-in users can cancel tokens");
    };
    TradeLib.cancelToken(tokens, caller, tokenId);
  };

  /// Attach a document to a token the caller issued. Signed-in callers only.
  public shared ({ caller }) func attachDocument(
    tokenId : Common.TokenId,
    file : Common.FileRef,
    fileName : Text,
    contentType : Text,
  ) : async Types.TradeResult<Common.DocumentId> {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only signed-in users can attach documents");
    };
    TradeLib.attachDocument(tokens, documents, counters, caller, tokenId, file, fileName, contentType);
  };

  /// Public marketplace listing. Anyone may read.
  public query func listMarketplace(statusFilter : ?Types.TokenStatus, sortBy : Types.TokenSort) : async [Types.TokenSummary] {
    TradeLib.listMarketplace(tokens, statusFilter, sortBy);
  };

  /// Public token detail. Anyone may read.
  public query func getToken(tokenId : Common.TokenId) : async ?Types.TradeToken {
    TradeLib.getToken(tokens, tokenId);
  };

  /// Public list of documents attached to a token. Anyone may read.
  public query func listTokenDocuments(tokenId : Common.TokenId) : async [Types.AttachedDocument] {
    TradeLib.listTokenDocuments(documents, tokenId);
  };

  /// Tokens the caller issued. Private to the caller.
  public query ({ caller }) func listIssuedTokens() : async [Types.IssuedTokenView] {
    TradeLib.listIssuedTokens(tokens, commitments, caller);
  };
};
