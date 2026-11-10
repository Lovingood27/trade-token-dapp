import Common "common";

module {
  public type Timestamp = Common.Timestamp;
  public type InvoiceId = Common.InvoiceId;
  public type FileRef = Common.FileRef;

  /// The category of a scanned invoice.
  public type InvoiceCategory = {
    #materialOrder;
    #heavyEquipmentRental;
    #handAndPowerTools;
  };

  /// Review status of a scanned invoice.
  public type InvoiceStatus = {
    #pendingReview;
    #accepted;
    #rejected;
  };

  /// One line item on a scanned invoice.
  public type InvoiceLineItem = {
    description : Text;
    quantity : Nat;
    amount : Nat;
  };

  /// A scanned invoice submitted for review and token minting.
  public type Invoice = {
    id : InvoiceId;
    owner : Principal;
    category : InvoiceCategory;
    retailerName : Text;
    vendorReference : Text;
    invoiceDate : Timestamp;
    totalAmount : Nat;
    currency : Text;
    lineItems : [InvoiceLineItem];
    file : FileRef;
    status : InvoiceStatus;
    mintedAmount : Nat;
    createdAt : Timestamp;
  };

  /// A caller-private invoice row.
  public type InvoiceView = {
    invoice : Invoice;
  };

  /// Errors returned by invoice operations.
  public type InvoiceError = {
    #invalidInvoice : Text;
    #invoiceNotFound : InvoiceId;
    #notOwner;
    #alreadyReviewed : InvoiceStatus;
  };

  /// Result of an invoice operation: either a success value or an InvoiceError.
  public type InvoiceResult<T> = {
    #ok : T;
    #err : InvoiceError;
  };
};
