import OQL "mo:caffeineai-oql";
import Types "types/invoice";

module {
  /// OQL row conversion for InvoiceStatus: one Value variant (tag text).
  public func _toRow(self : Types.InvoiceStatus) : OQL.Value {
    #text(
      switch self {
        case (#pendingReview) { "pendingReview" };
        case (#accepted) { "accepted" };
        case (#rejected) { "rejected" };
      }
    );
  };
};
