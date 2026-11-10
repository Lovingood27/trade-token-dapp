import Map "mo:core/Map";
import Runtime "mo:core/Runtime";
import AccessControl "mo:caffeineai-authorization/access-control";
import Common "../types/common";
import Types "../types/ledger";
import InvoiceTypes "../types/invoice";
import LedgerLib "../lib/ledger";
import InvoiceLib "../lib/invoice";

/// Utility-token ledger domain: the caller's balance and event history, plus
/// the public explorer summary and recent-event feed. All logic lives in
/// `lib/ledger`; this mixin owns the public endpoints and their authorization.
mixin (
  accessControlState : AccessControl.AccessControlState,
  events : Map.Map<Common.EventId, Types.TokenEvent>,
  counters : LedgerLib.Counters,
  invoices : Map.Map<Common.InvoiceId, InvoiceTypes.Invoice>,
) {
  /// The caller's balance and lifetime totals. Signed-in callers only.
  public query ({ caller }) func getMyBalance() : async Types.BalanceView {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only signed-in users can view their balance");
    };
    LedgerLib.getBalance(events, caller);
  };

  /// The caller's own events, newest first, optionally filtered by kind.
  /// Signed-in callers only.
  public query ({ caller }) func listMyEvents(kindFilter : ?Types.TokenEventKind) : async [Types.TokenEvent] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only signed-in users can view their events");
    };
    LedgerLib.listMyEvents(events, caller, kindFilter);
  };

  /// Public aggregate network totals. Anyone may read.
  public query func getLedgerSummary() : async Types.LedgerSummary {
    LedgerLib.getSummary(events, InvoiceLib.countInvoices(invoices));
  };

  /// Public feed of recent token events with the owner principal shortened.
  /// Anyone may read.
  public query func listRecentEvents(limit : Nat) : async [Types.PublicEventView] {
    LedgerLib.listRecentEvents(events, limit);
  };
};
