import OQL "mo:caffeineai-oql";
import Types "types/invoice";

module {
  /// OQL row conversion for InvoiceCategory: one Value variant (tag text).
  public func _toRow(self : Types.InvoiceCategory) : OQL.Value {
    #text(
      switch self {
        case (#materialOrder) { "materialOrder" };
        case (#heavyEquipmentRental) { "heavyEquipmentRental" };
        case (#handAndPowerTools) { "handAndPowerTools" };
      }
    );
  };
};
