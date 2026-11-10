# Project Guidance

## User Preferences

- Anyone can browse the marketplace; only signed-in users can create or fund tokens
- The app runs its own on-chain Trade Token ledger on the Internet Computer and is designed to interoperate with an external chain later
- Anyone can browse the explorer, marketplace and public event feed; only signed-in users get full access
- The app is a self-contained demo of the utility-token concept

## Accepted Requirements

- Businesses tokenize invoices/purchase orders as Trade Tokens and investors fund them
- Anyone can browse the marketplace; only signed-in users act
- The app runs its own on-chain Trade Token ledger on the Internet Computer and is designed to interoperate with an external chain later; no live external chain connection is built now
- Automated smart contracts handle token funding and settlement
- Explorer/dashboard home surface showing token balance and mint/use/burn activity
- Scan in invoices for material orders, heavy equipment rentals, and brand-specific hand and power tools from specific retailers
- Full history of token mint, use and burn events
- Anyone can browse; only signed-in users get full access
- No external chain connection — self-contained utility-token demo

## Verified Commands

- **typecheck**: `pnpm typecheck`
- **fix**: `pnpm fix`
- **build**: `pnpm build`

## Learnings

- Motoko has no `A or B` union type syntax; use a variant such as TradeResult<T> = { #ok : T; #err : TradeError }.
- A package imported in source but absent from mops.toml fails M0010; fix with `mops add <package>`.
- OQL auto-derivation needs IntValue imported for Int/Timestamp fields; a missing import fails M0230 with a hint naming the module.
- Custom variant fields need a top-level <Type>Value.mo with _toRow returning one Value variant, imported in the entity-declaring file.
- OQL scoped entities need .ownedBy(field) plus .scopedPerUser(); public entities must not declare an owner.
- Mixin counter params must use the shared TradeLib.Counters type; a narrow inline record fails M0096.
- Map<Nat,_> operations need `import Nat "mo:core/Nat"` for the implicit compare, even when no Nat function is called.
- Never mutate a Map while iterating its entries(); collect updates into a List first, then apply.
- biome requires tabIndex on a div with role=progressbar, and rejects role=status on a <p>; use <output> for live-region messages.
- FileRef (Uint8Array) is not a BlobPart; wrap with new Uint8Array(file) before new Blob([...]) to satisfy TypeScript.
- Object-storage uploads pass an ExternalBlob where the generated binding types the file param as Uint8Array; the platform candid layer serializes it.
- Foundation routes live in App.tsx via TanStack Router createRootRoute/createRoute; private routes wrap the page in RequireSignIn.
- Marketplace filter and sort persist via useSearch plus navigate({search}) without validateSearch; TanStack Router still serializes the params into the URL.
- Custom Tailwind animations need a motion-safe: or motion-reduce: guard to honor prefers-reduced-motion.
- The default route "/" is the explorer dashboard; the marketplace lives at "/marketplace" and page links must target that path.
- submitInvoice and attachDocument take FileRef = IDL.Vec(IDL.Nat8) passed raw to the actor; passing an ExternalBlob throws 'Invalid vec nat8 argument' before any canister call, so pass raw Uint8Array bytes.
- The generated binding never invokes _uploadFile for top-level file params; pass raw Uint8Array bytes as test/pocketic/backend.test.ts does.
- ExternalBlob.fromBytes needs Uint8Array<ArrayBuffer>; annotate stored file bytes as Uint8Array<ArrayBuffer> or tsc rejects the call.
- MapEntity.toEntityManual takes two type params <K, V>; passing one explicit arg fails M0045 — omit it and let the map infer both.
- Text has no slice; use toArray() then [Char].sliceToArray(Int,Int).toText() for principal shortening.
- Private dashboard hooks (useMyBalance/useMyEvents) must mount only inside a signed-in sub-component; mounting them in the public page runs them while signed out.
- Normalizing TokenEvent and PublicEventView into one ActivityRow shape lets a single feed component serve both personal and public views.
- Editable line-item rows need a stable id field for React keys; biome noArrayIndexKey rejects index keys even for reorderable drafts.
- biome requires aria-valuenow/min/max on role=progressbar; for indeterminate pending UI use an aria-hidden bar plus a text status.
