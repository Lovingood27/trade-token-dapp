import Map "mo:core/Map";
import AccessControl "mo:caffeineai-authorization/access-control";

module {
  type TokenKind = { #invoice; #purchaseOrder };
  type TokenStatus = { #open; #funded; #matured; #cancelled };

  type TradeToken = {
    id : Nat;
    issuer : Principal;
    kind : TokenKind;
    faceValue : Nat;
    currency : Text;
    debtorName : Text;
    issueDate : Int;
    maturityDate : Int;
    fundingTarget : Nat;
    returnTerms : Text;
    amountFunded : Nat;
    status : TokenStatus;
    createdAt : Int;
  };

  type FundingCommitment = {
    id : Nat;
    tokenId : Nat;
    investor : Principal;
    amount : Nat;
    expectedReturn : Nat;
    committedAt : Int;
  };

  type AttachedDocument = {
    id : Nat;
    tokenId : Nat;
    file : Blob;
    fileName : Text;
    contentType : Text;
    uploadedAt : Int;
  };

  type Counters = {
    var nextTokenId : Nat;
    var nextCommitmentId : Nat;
    var nextDocumentId : Nat;
  };

  type TokenEventKind = { #mint; #use; #burn };

  type TokenEvent = {
    id : Nat;
    owner : Principal;
    kind : TokenEventKind;
    amount : Nat;
    reason : Text;
    reference : ?Text;
    createdAt : Int;
  };

  type LedgerCounters = {
    var nextEventId : Nat;
  };

  type InvoiceCategory = { #materialOrder; #heavyEquipmentRental; #handAndPowerTools };
  type InvoiceStatus = { #pendingReview; #accepted; #rejected };

  type InvoiceLineItem = {
    description : Text;
    quantity : Nat;
    amount : Nat;
  };

  type Invoice = {
    id : Nat;
    owner : Principal;
    category : InvoiceCategory;
    retailerName : Text;
    vendorReference : Text;
    invoiceDate : Int;
    totalAmount : Nat;
    currency : Text;
    lineItems : [InvoiceLineItem];
    file : Blob;
    status : InvoiceStatus;
    mintedAmount : Nat;
    createdAt : Int;
  };

  type InvoiceCounters = {
    var nextInvoiceId : Nat;
  };

  public type OldActor = {
    accessControlState : AccessControl.AccessControlState;
    tokens : Map.Map<Nat, TradeToken>;
    commitments : Map.Map<Nat, FundingCommitment>;
    documents : Map.Map<Nat, AttachedDocument>;
    counters : Counters;
  };

  public type NewActor = {
    accessControlState : AccessControl.AccessControlState;
    tokens : Map.Map<Nat, TradeToken>;
    commitments : Map.Map<Nat, FundingCommitment>;
    documents : Map.Map<Nat, AttachedDocument>;
    counters : Counters;
    events : Map.Map<Nat, TokenEvent>;
    ledgerCounters : LedgerCounters;
    invoices : Map.Map<Nat, Invoice>;
    invoiceCounters : InvoiceCounters;
  };

  public func migration(old : OldActor) : NewActor {
    {
      accessControlState = old.accessControlState;
      tokens = old.tokens;
      commitments = old.commitments;
      documents = old.documents;
      counters = old.counters;
      events = Map.empty();
      ledgerCounters = { var nextEventId = 0 };
      invoices = Map.empty();
      invoiceCounters = { var nextInvoiceId = 0 };
    };
  };
};
