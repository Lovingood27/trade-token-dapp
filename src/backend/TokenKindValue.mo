import Types "types/trade";
import OQL "mo:caffeineai-oql";

module {
  /// Variant → tag text for the token kind column.
  public func _toRow(self : Types.TokenKind) : OQL.Value =
    #text(
      switch self {
        case (#invoice) { "invoice" };
        case (#purchaseOrder) { "purchaseOrder" };
      }
    );
};
