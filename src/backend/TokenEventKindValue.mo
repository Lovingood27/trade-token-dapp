import OQL "mo:caffeineai-oql";
import Types "types/ledger";

module {
  /// OQL row conversion for TokenEventKind: one Value variant (tag text).
  public func _toRow(self : Types.TokenEventKind) : OQL.Value {
    #text(
      switch self {
        case (#mint) { "mint" };
        case (#use) { "use" };
        case (#burn) { "burn" };
      }
    );
  };
};
