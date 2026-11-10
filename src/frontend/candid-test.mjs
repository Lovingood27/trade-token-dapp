import { IDL } from "@icp-sdk/core/candid";
import { ExternalBlob } from "@caffeineai/object-storage";

const FileRef = IDL.Vec(IDL.Nat8);
const bytes = new Uint8Array([1, 2, 3, 4]);
const blob = ExternalBlob.fromBytes(bytes, "text/plain", "a.txt");

try {
  const out = IDL.encode([FileRef], [blob]);
  console.log("BLOB ENCODE OK, length:", out.length);
} catch (e) {
  console.log("BLOB ENCODE THREW:", e.message);
}

try {
  const out = IDL.encode([FileRef], [bytes]);
  console.log("BYTES ENCODE OK, length:", out.length);
} catch (e) {
  console.log("BYTES ENCODE THREW:", e.message);
}
