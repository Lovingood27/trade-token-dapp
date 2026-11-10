import { renderPageWithRouter } from "@/__tests__/router-test-utils";
import { setIdentityForTest } from "@/__tests__/setup";
import type {
  BalanceView,
  LedgerSummary,
  PublicEventView,
  TokenEvent,
  backendInterface,
} from "@/backend";
import { TokenEventKind } from "@/backend";
import { Principal } from "@icp-sdk/core/principal";
import { screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DashboardPage from "./DashboardPage";

const member = Principal.fromText("ryjl3-tyaaa-aaaaa-aaaba-cai");

/** A minimal signed-in identity whose principal is not anonymous. */
function signedInIdentity() {
  return { getPrincipal: () => member } as never;
}

function summary(overrides: Partial<LedgerSummary> = {}): LedgerSummary {
  return {
    totalMinted: 1_250_000n,
    totalUsed: 40_000n,
    totalBurned: 5_000n,
    invoiceCount: 7n,
    participantCount: 3n,
    ...overrides,
  };
}

function balance(overrides: Partial<BalanceView> = {}): BalanceView {
  return {
    balance: 1_205_000n,
    earned: 1_250_000n,
    used: 40_000n,
    burned: 5_000n,
    ...overrides,
  };
}

function publicEvent(
  overrides: Partial<PublicEventView> = {},
): PublicEventView {
  return {
    id: 1n,
    ownerShort: "ryjl3…ba-cai",
    kind: TokenEventKind.mint,
    createdAt: 1_800_000_000_000_000_000n,
    reference: "INV-20481",
    amount: 18_450n,
    reason: "Invoice accepted",
    ...overrides,
  };
}

function myEvent(overrides: Partial<TokenEvent> = {}): TokenEvent {
  return {
    id: 1n,
    owner: member,
    kind: TokenEventKind.mint,
    createdAt: 1_800_000_000_000_000_000n,
    reference: "INV-20481",
    amount: 18_450n,
    reason: "Invoice accepted",
    ...overrides,
  };
}

type DashboardActor = Pick<
  backendInterface,
  "getLedgerSummary" | "listRecentEvents" | "getMyBalance" | "listMyEvents"
>;

function makeActor(overrides: Partial<DashboardActor> = {}): DashboardActor {
  return {
    getLedgerSummary: vi.fn<backendInterface["getLedgerSummary"]>(async () =>
      summary(),
    ),
    listRecentEvents: vi.fn<backendInterface["listRecentEvents"]>(
      async () => [],
    ),
    getMyBalance: vi.fn<backendInterface["getMyBalance"]>(async () =>
      balance(),
    ),
    listMyEvents: vi.fn<backendInterface["listMyEvents"]>(async () => []),
    ...overrides,
  };
}

describe("DashboardPage", () => {
  it("shows the public explorer totals and recent activity to a signed-out visitor", async () => {
    const actor = makeActor({
      listRecentEvents: vi.fn<backendInterface["listRecentEvents"]>(
        async () => [publicEvent()],
      ),
    });
    await renderPageWithRouter(<DashboardPage />, actor, { path: "/" });

    expect(await screen.findByText("Explorer")).toBeInTheDocument();
    const page = screen.getByTestId("dashboard.page");
    // Wait for the network totals query to resolve before reading the figures.
    expect(await within(page).findByText("1,250,000.00")).toBeInTheDocument();
    expect(within(page).getByText("40,000.00")).toBeInTheDocument();
    expect(within(page).getByText("5,000.00")).toBeInTheDocument();
    expect(within(page).getByText("7")).toBeInTheDocument();
    expect(within(page).getByText("3")).toBeInTheDocument();

    // The public feed renders the event with its kind, amount and reference.
    const feed = await screen.findByTestId("dashboard.activity.list");
    expect(within(feed).getByText("Minted")).toBeInTheDocument();
    expect(within(feed).getByText("18,450.00")).toBeInTheDocument();
    expect(within(feed).getByText("INV-20481")).toBeInTheDocument();
  });

  it("invites a signed-out visitor to sign in instead of showing a balance", async () => {
    const actor = makeActor();
    await renderPageWithRouter(<DashboardPage />, actor, { path: "/" });

    expect(
      await screen.findByTestId("dashboard.balance.sign_in_prompt"),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("dashboard.balance.panel"),
    ).not.toBeInTheDocument();
    expect(actor.getMyBalance).not.toHaveBeenCalled();
  });

  it("shows a signed-in user their balance and personal activity", async () => {
    setIdentityForTest({ identity: signedInIdentity() });
    const actor = makeActor({
      listMyEvents: vi.fn<backendInterface["listMyEvents"]>(async () => [
        myEvent({
          kind: TokenEventKind.use,
          amount: 2_500n,
          reason: "Tools used",
        }),
      ]),
    });
    await renderPageWithRouter(<DashboardPage />, actor, { path: "/" });

    const panel = await screen.findByTestId("dashboard.balance.panel");
    expect(
      within(panel).getByTestId("dashboard.balance.value"),
    ).toHaveTextContent("1,205,000.00");
    expect(within(panel).getByText("1,250,000.00")).toBeInTheDocument();
    expect(within(panel).getByText("40,000.00")).toBeInTheDocument();
    expect(within(panel).getByText("5,000.00")).toBeInTheDocument();

    const feed = await screen.findByTestId("dashboard.activity.list");
    expect(within(feed).getByText("Used")).toBeInTheDocument();
    expect(within(feed).getByText("2,500.00")).toBeInTheDocument();
  });

  it("shows an empty state for the public feed when there is no activity", async () => {
    const actor = makeActor();
    await renderPageWithRouter(<DashboardPage />, actor, { path: "/" });

    expect(
      await screen.findByTestId("dashboard.activity.empty_state"),
    ).toBeInTheDocument();
  });

  it("surfaces a retryable error when the network totals fail", async () => {
    const actor = makeActor({
      getLedgerSummary: vi
        .fn<backendInterface["getLedgerSummary"]>()
        .mockRejectedValue(new Error("ledger down")),
    });
    await renderPageWithRouter(<DashboardPage />, actor, { path: "/" });

    expect(
      await screen.findByTestId("dashboard.network.error_state"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("dashboard.network.retry_button"),
    ).toBeInTheDocument();
  });

  it("surfaces a retryable error when the personal balance fails", async () => {
    setIdentityForTest({ identity: signedInIdentity() });
    const actor = makeActor({
      getMyBalance: vi
        .fn<backendInterface["getMyBalance"]>()
        .mockRejectedValue(new Error("ledger down")),
    });
    await renderPageWithRouter(<DashboardPage />, actor, { path: "/" });

    expect(
      await screen.findByTestId("dashboard.balance.error_state"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("dashboard.balance.retry_button"),
    ).toBeInTheDocument();
  });

  it("requests the public recent events with the dashboard limit", async () => {
    const actor = makeActor();
    await renderPageWithRouter(<DashboardPage />, actor, { path: "/" });

    await waitFor(() => expect(actor.listRecentEvents).toHaveBeenCalled());
    expect(actor.listRecentEvents).toHaveBeenCalledWith(12n);
  });
});
