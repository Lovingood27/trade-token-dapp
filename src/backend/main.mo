import Map "mo:core/Map";
import Principal "mo:core/Principal";
import AccessControl "mo:caffeineai-authorization/access-control";
import MixinAuthorization "mo:caffeineai-authorization/MixinAuthorization";
import MixinObjectStorage "mo:caffeineai-object-storage/Mixin";
import Expose "mo:caffeineai-oql/Expose";
import Entity "mo:caffeineai-oql/Entity";
import MapEntity "mo:caffeineai-oql/MapEntity";
import RecordValue "mo:caffeineai-oql/RecordValue";
import NatValue "mo:caffeineai-oql/NatValue";
import IntValue "mo:caffeineai-oql/IntValue";
import TextValue "mo:caffeineai-oql/TextValue";
import PrincipalValue "mo:caffeineai-oql/PrincipalValue";
import BlobValue "mo:caffeineai-oql/BlobValue";
import TokenKindValue "TokenKindValue";
import TokenStatusValue "TokenStatusValue";
import TokenEventKindValue "TokenEventKindValue";
import InvoiceCategoryValue "InvoiceCategoryValue";
import InvoiceStatusValue "InvoiceStatusValue";
import LedgerTypes "types/ledger";
import InvoiceTypes "types/invoice";
import LedgerLib "lib/ledger";
import InvoiceLib "lib/invoice";
import LedgerApi "mixins/ledger-api";
import InvoiceApi "mixins/invoice-api";
import Common "types/common";
import Types "types/trade";
import TradeLib "lib/trade";
import TradeApi "mixins/trade-api";
import FundingApi "mixins/funding";
import ApiDocMixin "mixins/api-doc";

actor {
  let accessControlState : AccessControl.AccessControlState;
  include MixinAuthorization(accessControlState, null);

  let tokens : Map.Map<Common.TokenId, Types.TradeToken>;
  let commitments : Map.Map<Common.CommitmentId, Types.FundingCommitment>;
  let documents : Map.Map<Common.DocumentId, Types.AttachedDocument>;
  let counters : TradeLib.Counters;

  let events : Map.Map<Common.EventId, LedgerTypes.TokenEvent>;
  let ledgerCounters : LedgerLib.Counters;
  let invoices : Map.Map<Common.InvoiceId, InvoiceTypes.Invoice>;
  let invoiceCounters : InvoiceLib.Counters;

  include MixinObjectStorage();

  include TradeApi(accessControlState, tokens, commitments, documents, counters);
  include FundingApi(accessControlState, tokens, commitments, counters);
  include LedgerApi(accessControlState, events, ledgerCounters, invoices);
  include InvoiceApi(accessControlState, invoices, invoiceCounters, events, ledgerCounters);

  include ApiDocMixin();

  transient let samplePrincipal = Principal.fromText("aaaaa-aa");

  include Expose({
    entities = [
      tokens.toEntity("tradeToken", "TradeToken", "id")
        .sample({
          id = 0;
          issuer = samplePrincipal;
          kind = #invoice;
          faceValue = 0;
          currency = "";
          debtorName = "";
          issueDate = 0;
          maturityDate = 0;
          fundingTarget = 0;
          returnTerms = "";
          amountFunded = 0;
          status = #open;
          createdAt = 0;
        })
        .public_()
        .build(),
      commitments.toEntity("fundingCommitment", "FundingCommitment", "id")
        .sample({
          id = 0;
          tokenId = 0;
          investor = samplePrincipal;
          amount = 0;
          expectedReturn = 0;
          committedAt = 0;
        })
        .ownedBy("investor")
        .scopedPerUser()
        .build(),
      documents.toEntity("attachedDocument", "AttachedDocument", "id")
        .sample({
          id = 0;
          tokenId = 0;
          file = "" : Blob;
          fileName = "";
          contentType = "";
          uploadedAt = 0;
        })
        .public_()
        .build(),
      events.toEntity("tokenEvent", "TokenEvent", "id")
        .sample({
          id = 0;
          owner = samplePrincipal;
          kind = #mint;
          amount = 0;
          reason = "";
          reference = ?"";
          createdAt = 0;
        })
        .ownedBy("owner")
        .scopedPerUser()
        .build(),
      invoices.toEntityManual("invoice", "Invoice", "id")
        .sample({
          id = 0;
          owner = samplePrincipal;
          category = #materialOrder;
          retailerName = "";
          vendorReference = "";
          invoiceDate = 0;
          totalAmount = 0;
          currency = "";
          lineItems = [];
          file = "" : Blob;
          status = #pendingReview;
          mintedAmount = 0;
          createdAt = 0;
        })
        .payload("owner", func i = i.owner)
        .payload("category", func i = i.category)
        .payload("retailerName", func i = i.retailerName)
        .payload("vendorReference", func i = i.vendorReference)
        .payload("invoiceDate", func i = i.invoiceDate)
        .payload("totalAmount", func i = i.totalAmount)
        .payload("currency", func i = i.currency)
        .payload("lineItemCount", func i = i.lineItems.size())
        .payload("status", func i = i.status)
        .payload("mintedAmount", func i = i.mintedAmount)
        .payload("createdAt", func i = i.createdAt)
        .ownedBy("owner")
        .scopedPerUser()
        .build(),
    ];
  });
};
