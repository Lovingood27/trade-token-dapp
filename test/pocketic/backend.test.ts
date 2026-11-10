import { PocketIc, createIdentity } from "@dfinity/pic";
import type { Actor, CanisterFixture } from "@dfinity/pic";
import { afterAll, beforeAll, expect, it } from "vitest";

import { idlFactory } from "../../src/frontend/src/declarations/backend.did.js";
import type { _SERVICE } from "../../src/frontend/src/declarations/backend.did";
import { registerCaller } from "./test-utils";

const PIC_URL = process.env.POCKET_IC_URL ?? "";
const BACKEND_WASM = process.env.BACKEND_WASM ?? "";

let pic: PocketIc | undefined;
let actor: Actor<_SERVICE>;
let canisterId: CanisterFixture<_SERVICE>["canisterId"];

const alice = createIdentity("alice");
const bob = createIdentity("bob");

const DAY_NS = 86_400_000_000_000n;
const ISSUE_DATE = 1_700_000_000_000_000_000n;
const MATURITY_DATE = ISSUE_DATE + 90n * DAY_NS;

beforeAll(async () => {
  pic = await PocketIc.create(PIC_URL);
  ({ actor, canisterId } = await pic.setupCanister<_SERVICE>({
    idlFactory,
    wasm: BACKEND_WASM,
  }));
});

afterAll(async () => {
  await pic?.tearDown();
});

it("answers an empty-state marketplace read instead of trapping", async () => {
  await expect(actor.listMarketplace([], { fundingProgress: null })).resolves.toEqual(
    [],
  );
});

it("round-trips a token through the real canister", async () => {
  const issuer = await registerCaller(
    pic!.createActor<_SERVICE>(idlFactory, canisterId),
    alice,
  );
  const result = await issuer.createToken(
    { invoice: null },
    425_000n,
    "USD",
    "Shanghai Cosco Ltd",
    ISSUE_DATE,
    MATURITY_DATE,
    400_000n,
    "8.45% APY settled at maturity.",
  );
  expect("ok" in result).toBe(true);
  if (!("ok" in result)) return;

  const token = await actor.getToken(result.ok);
  expect(token).toHaveLength(1);
  expect(token[0]).toMatchObject({
    id: result.ok,
    debtorName: "Shanghai Cosco Ltd",
    faceValue: 425_000n,
    fundingTarget: 400_000n,
    amountFunded: 0n,
    status: { open: null },
  });
});

it("funds a token and moves it to funded at the target, locking further commitments", async () => {
  const issuer = await registerCaller(
    pic!.createActor<_SERVICE>(idlFactory, canisterId),
    alice,
  );
  const investor = await registerCaller(
    pic!.createActor<_SERVICE>(idlFactory, canisterId),
    bob,
  );

  const created = await issuer.createToken(
    { purchaseOrder: null },
    100_000n,
    "USD",
    "Funded Buyer",
    ISSUE_DATE,
    MATURITY_DATE,
    100_000n,
    "5% APY",
  );
  expect("ok" in created).toBe(true);
  if (!("ok" in created)) return;
  const tokenId = created.ok;

  const funded = await investor.fundToken(tokenId, 100_000n);
  expect("ok" in funded).toBe(true);

  const token = await actor.getToken(tokenId);
  expect(token[0]?.amountFunded).toBe(100_000n);
  expect(token[0]?.status).toEqual({ funded: null });

  const locked = await investor.fundToken(tokenId, 1n);
  expect("err" in locked).toBe(true);
  if ("err" in locked) {
    expect(locked.err).toEqual({ tokenNotOpen: null });
  }
});

it("rejects a commitment that exceeds the remaining funding target", async () => {
  const issuer = await registerCaller(
    pic!.createActor<_SERVICE>(idlFactory, canisterId),
    alice,
  );
  const investor = await registerCaller(
    pic!.createActor<_SERVICE>(idlFactory, canisterId),
    bob,
  );

  const created = await issuer.createToken(
    { invoice: null },
    50_000n,
    "USD",
    "Overflow Buyer",
    ISSUE_DATE,
    MATURITY_DATE,
    50_000n,
    "6% APY",
  );
  expect("ok" in created).toBe(true);
  if (!("ok" in created)) return;

  const result = await investor.fundToken(created.ok, 60_000n);
  expect("err" in result).toBe(true);
  if ("err" in result) {
    expect(result.err).toEqual({ exceedsFundingTarget: { remaining: 50_000n } });
  }
});

it("keeps one caller's issued tokens and portfolio private from another", async () => {
  const issuer = await registerCaller(
    pic!.createActor<_SERVICE>(idlFactory, canisterId),
    alice,
  );
  const investor = await registerCaller(
    pic!.createActor<_SERVICE>(idlFactory, canisterId),
    bob,
  );

  const created = await issuer.createToken(
    { invoice: null },
    80_000n,
    "USD",
    "Private Buyer",
    ISSUE_DATE,
    MATURITY_DATE,
    80_000n,
    "7% APY",
  );
  expect("ok" in created).toBe(true);
  if (!("ok" in created)) return;
  await investor.fundToken(created.ok, 80_000n);

  const aliceIssued = await issuer.listIssuedTokens();
  expect(aliceIssued.some((v) => v.token.id === created.ok)).toBe(true);

  const bobIssued = await investor.listIssuedTokens();
  expect(bobIssued.some((v) => v.token.id === created.ok)).toBe(false);

  const bobFunded = await investor.listFundedTokens();
  expect(bobFunded.some((v) => v.token.id === created.ok)).toBe(true);

  const aliceFunded = await issuer.listFundedTokens();
  expect(aliceFunded.some((v) => v.token.id === created.ok)).toBe(false);
});

it("rejects an anonymous caller from creating a token", async () => {
  const guest = pic!.createActor<_SERVICE>(idlFactory, canisterId);
  await expect(
    guest.createToken(
      { invoice: null },
      10_000n,
      "USD",
      "Guest Buyer",
      ISSUE_DATE,
      MATURITY_DATE,
      10_000n,
      "1% APY",
    ),
  ).rejects.toThrow();
});

it("answers empty-state ledger reads instead of trapping", async () => {
  const summary = await actor.getLedgerSummary();
  expect(summary).toMatchObject({
    totalMinted: 0n,
    totalUsed: 0n,
    totalBurned: 0n,
    invoiceCount: 0n,
    participantCount: 0n,
  });
  await expect(actor.listRecentEvents(10n)).resolves.toEqual([]);
});

it("submits a reviewed invoice, mints tokens and records a mint event", async () => {
  const owner = await registerCaller(
    pic!.createActor<_SERVICE>(idlFactory, canisterId),
    alice,
  );

  const result = await owner.submitInvoice(
    { materialOrder: null },
    "BuildRight Materials Co.",
    "INV-1001",
    ISSUE_DATE,
    18_450n,
    "USD",
    [{ description: "2x4 lumber", quantity: 10n, amount: 18_450n }],
    new Uint8Array([1, 2, 3]),
  );
  expect("ok" in result).toBe(true);
  if (!("ok" in result)) return;

  const invoices = await owner.listMyInvoices();
  expect(invoices).toHaveLength(1);
  expect(invoices[0].invoice).toMatchObject({
    id: result.ok,
    retailerName: "BuildRight Materials Co.",
    vendorReference: "INV-1001",
    totalAmount: 18_450n,
    currency: "USD",
    status: { accepted: null },
    mintedAmount: 18_450n,
  });

  const balance = await owner.getMyBalance();
  expect(balance).toMatchObject({
    balance: 18_450n,
    earned: 18_450n,
    used: 0n,
    burned: 0n,
  });

  const events = await owner.listMyEvents([]);
  expect(events).toHaveLength(1);
  expect(events[0]).toMatchObject({
    kind: { mint: null },
    amount: 18_450n,
  });
});

it("rejects an invalid invoice without minting", async () => {
  const owner = await registerCaller(
    pic!.createActor<_SERVICE>(idlFactory, canisterId),
    alice,
  );

  const result = await owner.submitInvoice(
    { handAndPowerTools: null },
    "",
    "INV-2002",
    ISSUE_DATE,
    5_000n,
    "USD",
    [{ description: "Drill", quantity: 1n, amount: 5_000n }],
    new Uint8Array([4]),
  );
  expect("err" in result).toBe(true);
  if ("err" in result) {
    expect(result.err).toEqual({ invalidInvoice: "Retailer name is required" });
  }
});

it("filters the caller's events by kind", async () => {
  const owner = await registerCaller(
    pic!.createActor<_SERVICE>(idlFactory, canisterId),
    alice,
  );

  await owner.submitInvoice(
    { heavyEquipmentRental: null },
    "Heavy Rentals Ltd",
    "INV-3003",
    ISSUE_DATE,
    7_500n,
    "USD",
    [{ description: "Excavator", quantity: 1n, amount: 7_500n }],
    new Uint8Array([5]),
  );

  const mints = await owner.listMyEvents([{ mint: null }]);
  expect(mints.length).toBeGreaterThan(0);
  expect(mints.every((e) => "mint" in e.kind)).toBe(true);

  const burns = await owner.listMyEvents([{ burn: null }]);
  expect(burns).toEqual([]);
});

it("keeps one caller's balance, invoices and events private from another", async () => {
  const aliceActor = await registerCaller(
    pic!.createActor<_SERVICE>(idlFactory, canisterId),
    alice,
  );
  const bobActor = await registerCaller(
    pic!.createActor<_SERVICE>(idlFactory, canisterId),
    bob,
  );

  const submitted = await aliceActor.submitInvoice(
    { materialOrder: null },
    "Private Materials Co.",
    "INV-4004",
    ISSUE_DATE,
    9_000n,
    "USD",
    [{ description: "Cement", quantity: 3n, amount: 9_000n }],
    new Uint8Array([6]),
  );
  expect("ok" in submitted).toBe(true);

  const bobInvoices = await bobActor.listMyInvoices();
  expect(bobInvoices.some((v) => v.invoice.vendorReference === "INV-4004")).toBe(
    false,
  );

  const bobBalance = await bobActor.getMyBalance();
  expect(bobBalance).toMatchObject({ balance: 0n, earned: 0n });

  const bobEvents = await bobActor.listMyEvents([]);
  expect(bobEvents).toEqual([]);
});

it("rejects an anonymous caller from reading a balance or submitting an invoice", async () => {
  const guest = pic!.createActor<_SERVICE>(idlFactory, canisterId);
  await expect(guest.getMyBalance()).rejects.toThrow();
  await expect(
    guest.submitInvoice(
      { materialOrder: null },
      "Guest Materials Co.",
      "INV-5005",
      ISSUE_DATE,
      1_000n,
      "USD",
      [{ description: "Nails", quantity: 1n, amount: 1_000n }],
      new Uint8Array([7]),
    ),
  ).rejects.toThrow();
});
