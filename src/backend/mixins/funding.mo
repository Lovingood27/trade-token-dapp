import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Runtime "mo:core/Runtime";
import AccessControl "mo:caffeineai-authorization/access-control";
import Common "../types/common";
import Types "../types/trade";
import TradeLib "../lib/trade";

/// Funding domain: investor commitments, automated funding settlement,
/// maturity settlement with per-commitment return distribution, and the
/// caller-private investor portfolio. All logic lives in `lib/trade`; this
/// mixin owns the public endpoints and their authorization.
mixin (
  accessControlState : AccessControl.AccessControlState,
  tokens : Map.Map<Common.TokenId, Types.TradeToken>,
  commitments : Map.Map<Common.CommitmentId, Types.FundingCommitment>,
  counters : TradeLib.Counters,
) {
  /// Commit funds to an open token. Signed-in callers only.
  /// Rejects a token that is not open, a cancelled or matured token, and an
  /// amount that exceeds the remaining funding target. Funding progress is
  /// updated automatically and the token moves to funded the moment
  /// commitments reach its funding target, locking further commitments.
  public shared ({ caller }) func fundToken(tokenId : Common.TokenId, amount : Nat) : async Types.TradeResult<Common.CommitmentId> {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only signed-in users can fund tokens");
    };
    TradeLib.fundToken(tokens, commitments, counters, caller, tokenId, amount);
  };

  /// Move an open token to funded once its funding target is reached.
  /// Signed-in callers only.
  public shared ({ caller }) func settleFunding(tokenId : Common.TokenId) : async Types.TradeResult<()> {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only signed-in users can settle funding");
    };
    TradeLib.settleFunding(tokens, tokenId);
  };

  /// Move a funded token that has reached its maturity date to matured and
  /// distribute returns to its funders per the token's return terms. The
  /// distribution is recorded per commitment on each commitment's expected
  /// return. Signed-in callers only.
  public shared ({ caller }) func settleMaturity(tokenId : Common.TokenId) : async Types.TradeResult<()> {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only signed-in users can settle maturity");
    };
    TradeLib.settleMaturity(tokens, commitments, tokenId);
  };

  /// Tokens the caller funded, with the caller's commitment, current status and
  /// expected return. Private to the caller.
  public query ({ caller }) func listFundedTokens() : async [Types.FundedTokenView] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only signed-in users can view their portfolio");
    };
    TradeLib.listFundedTokens(tokens, commitments, caller);
  };
};
