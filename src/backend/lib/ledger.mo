import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Set "mo:core/Set";
import Time "mo:core/Time";
import Common "../types/common";
import Types "../types/ledger";

module {
  public type EventId = Common.EventId;
  public type TokenEvent = Types.TokenEvent;
  public type TokenEventKind = Types.TokenEventKind;
  public type BalanceView = Types.BalanceView;
  public type LedgerSummary = Types.LedgerSummary;
  public type PublicEventView = Types.PublicEventView;
  public type LedgerError = Types.LedgerError;
  public type LedgerResult<T> = Types.LedgerResult<T>;

  /// Shared mutable counters for the ledger domain.
  public type Counters = {
    var nextEventId : Nat;
  };

  /// Append an immutable ledger event for an owner and return its id.
  public func appendEvent(
    events : Map.Map<EventId, TokenEvent>,
    counters : Counters,
    owner : Principal,
    kind : TokenEventKind,
    amount : Nat,
    reason : Text,
    reference : ?Text,
  ) : EventId {
    let id = counters.nextEventId;
    counters.nextEventId := id + 1;
    let event : TokenEvent = {
      id;
      owner;
      kind;
      amount;
      reason;
      reference;
      createdAt = Time.now();
    };
    events.add(id, event);
    id;
  };

  /// The caller's balance and lifetime totals, derived from the ledger.
  public func getBalance(
    events : Map.Map<EventId, TokenEvent>,
    caller : Principal,
  ) : BalanceView {
    var earned = 0;
    var used = 0;
    var burned = 0;
    for (event in events.values()) {
      if (event.owner == caller) {
        switch (event.kind) {
          case (#mint) { earned += event.amount };
          case (#use) { used += event.amount };
          case (#burn) { burned += event.amount };
        };
      };
    };
    let balance = if (earned >= used + burned) { earned - used - burned } else { 0 };
    { balance; earned; used; burned };
  };

  /// The caller's own events, newest first, optionally filtered by kind.
  public func listMyEvents(
    events : Map.Map<EventId, TokenEvent>,
    caller : Principal,
    kindFilter : ?TokenEventKind,
  ) : [TokenEvent] {
    let mine = events.values().toArray().filter(func e = e.owner == caller);
    let filtered = switch (kindFilter) {
      case (?kind) { mine.filter(func e = e.kind == kind) };
      case null { mine };
    };
    filtered.sort(func (a, b) = Nat.compare(b.id, a.id));
  };

  /// Public aggregate totals for the explorer dashboard.
  public func getSummary(
    events : Map.Map<EventId, TokenEvent>,
    invoiceCount : Nat,
  ) : LedgerSummary {
    var totalMinted = 0;
    var totalUsed = 0;
    var totalBurned = 0;
    let participants = Set.empty<Principal>();
    for (event in events.values()) {
      participants.add(event.owner);
      switch (event.kind) {
        case (#mint) { totalMinted += event.amount };
        case (#use) { totalUsed += event.amount };
        case (#burn) { totalBurned += event.amount };
      };
    };
    {
      totalMinted;
      totalUsed;
      totalBurned;
      invoiceCount;
      participantCount = participants.size();
    };
  };

  /// Shorten a principal for the public feed: first 5 and last 3 characters.
  func shorten(p : Principal) : Text {
    let full = p.toText();
    let chars = full.toArray();
    if (chars.size() <= 10) {
      return full;
    };
    let head = chars.sliceToArray(0, 5).toText();
    let tail = chars.sliceToArray(chars.size().toInt() - 3, chars.size().toInt()).toText();
    head # "…" # tail;
  };

  /// Public feed of recent events with the owner principal shortened.
  public func listRecentEvents(
    events : Map.Map<EventId, TokenEvent>,
    limit : Nat,
  ) : [PublicEventView] {
    let all = events.values().toArray();
    let sorted = all.sort(func (a, b) = Nat.compare(b.id, a.id));
    let capped = if (sorted.size() > limit) { sorted.sliceToArray(0, limit) } else { sorted };
    capped.map(func e = {
      id = e.id;
      ownerShort = shorten(e.owner);
      kind = e.kind;
      amount = e.amount;
      reason = e.reason;
      reference = e.reference;
      createdAt = e.createdAt;
    });
  };
};
