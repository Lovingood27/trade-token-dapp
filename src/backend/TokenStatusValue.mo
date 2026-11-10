import Types "types/trade";
import OQL "mo:caffeineai-oql";

module {
  /// Variant → tag text for the token status column.
  public func _toRow(self : Types.TokenStatus) : OQL.Value =
    #text(
      switch self {
        case (#open) { "open" };
        case (#funded) { "funded" };
        case (#matured) { "matured" };
        case (#cancelled) { "cancelled" };
      }
    );
};
