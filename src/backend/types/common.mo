import Storage "mo:caffeineai-object-storage/Storage";

module {
  /// Signed Int nanoseconds since the epoch (Time.now()).
  public type Timestamp = Int;

  /// Monotonic identifier for a Trade Token.
  public type TokenId = Nat;

  /// Monotonic identifier for a funding commitment.
  public type CommitmentId = Nat;

  /// Monotonic identifier for an attached document.
  public type DocumentId = Nat;

  /// Monotonic identifier for a utility-token ledger event.
  public type EventId = Nat;

  /// Monotonic identifier for a scanned invoice.
  public type InvoiceId = Nat;

  /// A file reference held by platform object storage.
  public type FileRef = Storage.ExternalBlob;
};
