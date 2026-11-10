import Map "mo:core/Map";
import Runtime "mo:core/Runtime";
import AccessControl "mo:caffeineai-authorization/access-control";
import Common "../types/common";
import Types "../types/invoice";
import LedgerTypes "../types/ledger";
import InvoiceLib "../lib/invoice";
import LedgerLib "../lib/ledger";

/// Invoice domain: submitting a reviewed scanned invoice (which mints tokens
/// for the owner) and reading the caller's own invoices. All logic lives in
/// `lib/invoice`; this mixin owns the public endpoints and their authorization.
mixin (
  accessControlState : AccessControl.AccessControlState,
  invoices : Map.Map<Common.InvoiceId, Types.Invoice>,
  invoiceCounters : InvoiceLib.Counters,
  events : Map.Map<Common.EventId, LedgerTypes.TokenEvent>,
  ledgerCounters : LedgerLib.Counters,
) {
  /// Submit a reviewed invoice: store it as accepted and mint tokens for the
  /// owner. Signed-in callers only.
  public shared ({ caller }) func submitInvoice(
    category : Types.InvoiceCategory,
    retailerName : Text,
    vendorReference : Text,
    invoiceDate : Common.Timestamp,
    totalAmount : Nat,
    currency : Text,
    lineItems : [Types.InvoiceLineItem],
    file : Common.FileRef,
  ) : async Types.InvoiceResult<Common.InvoiceId> {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only signed-in users can submit invoices");
    };
    InvoiceLib.submitInvoice(
      invoices,
      invoiceCounters,
      events,
      ledgerCounters,
      caller,
      category,
      retailerName,
      vendorReference,
      invoiceDate,
      totalAmount,
      currency,
      lineItems,
      file,
    );
  };

  /// The caller's own invoices, newest first. Private to the caller.
  public query ({ caller }) func listMyInvoices() : async [Types.InvoiceView] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only signed-in users can view their invoices");
    };
    InvoiceLib.listMyInvoices(invoices, caller);
  };
};
