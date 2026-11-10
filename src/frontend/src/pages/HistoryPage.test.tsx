import { renderPageWithRouter } from "@/__tests__/router-test-utils";
import { setIdentityForTest } from "@/__tests__/setup";
import type { PublicEventView, TokenEvent, backendInterface } from "@/backend";
import { TokenEventKind } from "@/backend";
import { Principal } from "@icp-sdk/core/principal";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import HistoryPage from "./HistoryPage";

const member = Principal.fromText("ryjl3-tyaaa-aaaaa-aaaba-cai");

/** A minimal signed-in identity whose principal is not anonymous. */
function signedInIdentity() {
  return { getPrincipal: () => member } as never;
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

type HistoryActor = Pick<backendInterface, "listMyEvents" | "listRecentEvents">;

function makeActor(overrides: Partial<HistoryActor> = {}): HistoryActor {
  return {
    listMyEvents: vi.fn<backendInterface["listMyEvents"]>(async () => []),
    listRecentEvents: vi.fn<backendInterface["listRecentEvents"]>(
      async () => [],
    ),
    ...overrides,
  };
}

describe("HistoryPage", () => {
  it("lists a signed-in user's events with kind, amount and timestamp, newest first", async () => {
    setIdentityForTest({ identity: signedInIdentity() });
    const actor = makeActor({
      listMyEvents: vi.fn<backendInterface["listMyEvents"]>(async () => [
        myEvent({
          id: 2n,
          kind: TokenEventKind.use,
          amount: 2_500n,
          reason: "Tools used",
          createdAt: 1_800_000_000_000_000_000n,
        }),
        myEvent({
          id: 1n,
          kind: TokenEventKind.mint,
          amount: 18_450n,
          reason: "Invoice accepted",
          createdAt: 1_700_000_000_000_000_000n,
        }),
      ]),
    });
    await renderPageWithRouter(<HistoryPage />, actor, { path: "/history" });

    const list = await screen.findByTestId("history.event_list");
    const rows = within(list).getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    // Newest first: the use event precedes the older mint event.
    expect(within(rows[0]).getByText("Used")).toBeInTheDocument();
    expect(within(rows[0]).getByText("2,500.00")).toBeInTheDocument();
    expect(within(rows[1]).getByText("Minted")).toBeInTheDocument();
    expect(within(rows[1]).getByText("18,450.00")).toBeInTheDocument();
    expect(within(rows[1]).getByText("INV-20481")).toBeInTheDocument();
  });

  it("shows the public feed to a signed-out visitor", async () => {
    const actor = makeActor({
      listRecentEvents: vi.fn<backendInterface["listRecentEvents"]>(
        async () => [publicEvent({ kind: TokenEventKind.burn, amount: 500n })],
      ),
    });
    await renderPageWithRouter(<HistoryPage />, actor, { path: "/history" });

    const list = await screen.findByTestId("history.event_list");
    expect(within(list).getByText("Burned")).toBeInTheDocument();
    expect(within(list).getByText("500.00")).toBeInTheDocument();
    expect(screen.getByTestId("history.signin_prompt")).toBeInTheDocument();
    // The public feed is the active source for a signed-out visitor.
    expect(actor.listRecentEvents).toHaveBeenCalledWith(50n);
  });

  it("re-requests the caller's events when the kind filter changes", async () => {
    setIdentityForTest({ identity: signedInIdentity() });
    const user = userEvent.setup();
    const actor = makeActor();
    await renderPageWithRouter(<HistoryPage />, actor, { path: "/history" });

    await waitFor(() => expect(actor.listMyEvents).toHaveBeenCalledWith(null));
    await user.click(await screen.findByTestId("history.filter.kind.burn"));

    await waitFor(() =>
      expect(actor.listMyEvents).toHaveBeenCalledWith(TokenEventKind.burn),
    );
  });

  it("shows an empty state with a clear-filter action when a filter matches nothing", async () => {
    setIdentityForTest({ identity: signedInIdentity() });
    const user = userEvent.setup();
    const actor = makeActor();
    await renderPageWithRouter(<HistoryPage />, actor, { path: "/history" });

    await user.click(await screen.findByTestId("history.filter.kind.mint"));

    expect(
      await screen.findByTestId("history.empty_state"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("history.clear_filter_button"),
    ).toBeInTheDocument();
  });

  it("surfaces a retryable error when the ledger fails", async () => {
    setIdentityForTest({ identity: signedInIdentity() });
    const actor = makeActor({
      listMyEvents: vi
        .fn<backendInterface["listMyEvents"]>()
        .mockRejectedValue(new Error("ledger down")),
    });
    await renderPageWithRouter(<HistoryPage />, actor, { path: "/history" });

    expect(
      await screen.findByTestId("history.error_state"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("history.retry_button")).toBeInTheDocument();
  });
});
