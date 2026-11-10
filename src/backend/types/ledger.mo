import Common "common";

module {
  public type Timestamp = Common.Timestamp;
  public type EventId = Common.EventId;
  public type InvoiceId = Common.InvoiceId;

  /// The kind of balance change recorded in the utility-token ledger.
  public type TokenEventKind = {
    #mint;
    #use;
    #burn;
  };

  /// An immutable ledger entry recording one balance change for an owner.
  public type TokenEvent = {
    id : EventId;
    owner : Principal;
    kind : TokenEventKind;
    amount : Nat;
    reason : Text;
    /// Optional link to the invoice or action that caused the event.
    reference : ?Text;
    createdAt : Timestamp;
  };

  /// The caller's current utility-token balance and lifetime totals.
  public type BalanceView = {
    balance : Nat;
    earned : Nat;
    used : Nat;
    burned : Nat;
  };

  /// Public aggregate totals for the explorer dashboard.
  public type LedgerSummary = {
    totalMinted : Nat;
    totalUsed : Nat;
    totalBurned : Nat;
    invoiceCount : Nat;
    participantCount : Nat;
  };

  /// A public feed row with the owner principal shortened for browsing.
  public type PublicEventView = {
    id : EventId;
    ownerShort : Text;
    kind : TokenEventKind;
    amount : Nat;
    reason : Text;
    reference : ?Text;
    createdAt : Timestamp;
  };

  /// Errors returned by ledger operations.
  public type LedgerError = {
    #insufficientBalance : { available : Nat };
    #invalidAmount : Text;
    #eventNotFound : EventId;
  };

  /// Result of a ledger operation: either a success value or a LedgerError.
  public type LedgerResult<T> = {
    #ok : T;
    #err : LedgerError;
  };
};
