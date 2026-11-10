import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Time "mo:core/Time";
import Common "../types/common";
import Types "../types/invoice";
import LedgerTypes "../types/ledger";
import LedgerLib "./ledger";

module {
  public type InvoiceId = Common.InvoiceId;
  public type Invoice = Types.Invoice;
  public type InvoiceCategory = Types.InvoiceCategory;
  public type InvoiceStatus = Types.InvoiceStatus;
  public type InvoiceLineItem = Types.InvoiceLineItem;
  public type InvoiceView = Types.InvoiceView;
  public type InvoiceError = Types.InvoiceError;
  public type InvoiceResult<T> = Types.InvoiceResult<T>;

  /// Shared mutable counters for the invoice domain.
  public type Counters = {
    var nextInvoiceId : Nat;
  };

  /// Validate a reviewed invoice before it is stored and minted.
  func validate(
    retailerName : Text,
    vendorReference : Text,
    totalAmount : Nat,
    currency : Text,
    lineItems : [InvoiceLineItem],
  ) : ?InvoiceError {
    if (retailerName.size() == 0) {
      return ?#invalidInvoice("Retailer name is required");
    };
    if (vendorReference.size() == 0) {
      return ?#invalidInvoice("Vendor reference is required");
    };
    if (totalAmount == 0) {
      return ?#invalidInvoice("Total amount must be greater than zero");
    };
    if (currency.size() == 0) {
      return ?#invalidInvoice("Currency is required");
    };
    if (lineItems.size() == 0) {
      return ?#invalidInvoice("At least one line item is required");
    };
    for (item in lineItems.values()) {
      if (item.description.size() == 0) {
        return ?#invalidInvoice("Every line item needs a description");
      };
      if (item.quantity == 0) {
        return ?#invalidInvoice("Every line item needs a positive quantity");
      };
    };
    null;
  };

  /// Submit a reviewed invoice: store it as accepted and mint tokens for the
  /// owner by appending a mint event to the ledger.
  public func submitInvoice(
    invoices : Map.Map<InvoiceId, Invoice>,
    invoiceCounters : Counters,
    events : Map.Map<Common.EventId, LedgerTypes.TokenEvent>,
    ledgerCounters : LedgerLib.Counters,
    caller : Principal,
    category : InvoiceCategory,
    retailerName : Text,
    vendorReference : Text,
    invoiceDate : Common.Timestamp,
    totalAmount : Nat,
    currency : Text,
    lineItems : [InvoiceLineItem],
    file : Common.FileRef,
  ) : InvoiceResult<InvoiceId> {
    switch (validate(retailerName, vendorReference, totalAmount, currency, lineItems)) {
      case (?err) { return #err(err) };
      case null {};
    };
    let id = invoiceCounters.nextInvoiceId;
    invoiceCounters.nextInvoiceId := id + 1;
    let invoice : Invoice = {
      id;
      owner = caller;
      category;
      retailerName;
      vendorReference;
      invoiceDate;
      totalAmount;
      currency;
      lineItems;
      file;
      status = #accepted;
      mintedAmount = totalAmount;
      createdAt = Time.now();
    };
    invoices.add(id, invoice);
    ignore LedgerLib.appendEvent(
      events,
      ledgerCounters,
      caller,
      #mint,
      totalAmount,
      "Invoice " # vendorReference # " accepted",
      ?("invoice:" # id.toText()),
    );
    #ok(id);
  };

  /// The caller's own invoices, newest first.
  public func listMyInvoices(
    invoices : Map.Map<InvoiceId, Invoice>,
    caller : Principal,
  ) : [InvoiceView] {
    let mine = invoices.values().toArray().filter(func i = i.owner == caller);
    let sorted = mine.sort(func (a, b) = Nat.compare(b.id, a.id));
    sorted.map(func i = { invoice = i });
  };

  /// Total number of invoices scanned, for the public explorer summary.
  public func countInvoices(
    invoices : Map.Map<InvoiceId, Invoice>,
  ) : Nat {
    invoices.size();
  };
};
