import { renderPageWithRouter } from "@/__tests__/router-test-utils";
import type { IssuedTokenView, TradeToken, backendInterface } from "@/backend";
import { TokenKind, TokenStatus } from "@/backend";
import { Principal } from "@icp-sdk/core/principal";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import IssuerDashboardPage from "./IssuerDashboardPage";

const issuer = Principal.fromText("aaaaa-aa");

function token(overrides: Partial<TradeToken> = {}): TradeToken {
  return {
    id: 1n,
    issueDate: 1_700_000_000_000_000_000n,
    status: TokenStatus.open,
    returnTerms: "8.45% APY",
    maturityDate: 1_800_000_000_000_000_000n,
    kind: TokenKind.invoice,
    createdAt: 1_700_000_000_000_000_000n,
    debtorName: "Shanghai Cosco Ltd",
    issuer,
    currency: "USD",
    amountFunded: 0n,
    fundingTarget: 400_000n,
    faceValue: 425_000n,
    ...overrides,
  };
}

function view(overrides: Partial<TradeToken> = {}): IssuedTokenView {
  return { token: token(overrides), commitmentCount: 0n };
}

function makeActor(
  overrides: Partial<backendInterface> = {},
): Pick<backendInterface, "listIssuedTokens" | "updateToken" | "cancelToken"> {
  return {
    listIssuedTokens: vi.fn<backendInterface["listIssuedTokens"]>(async () => [
      view(),
    ]),
    updateToken: vi.fn<backendInterface["updateToken"]>(async () => ({
      __kind__: "ok",
      ok: null,
    })),
    cancelToken: vi.fn<backendInterface["cancelToken"]>(async () => ({
      __kind__: "ok",
      ok: null,
    })),
    ...overrides,
  };
}

describe("IssuerDashboardPage", () => {
  it("lists the caller's issued tokens with their funding status", async () => {
    await renderPageWithRouter(<IssuerDashboardPage />, makeActor(), {
      path: "/issuer",
    });

    expect(await screen.findByText("Shanghai Cosco Ltd")).toBeInTheDocument();
    const card = screen.getByTestId("issuer.token.item.1");
    expect(within(card).getByText("425,000.00 USD")).toBeInTheDocument();
    expect(within(card).getByText("Open")).toBeInTheDocument();
  });

  it("shows an empty state when the issuer has no tokens", async () => {
    const actor = makeActor({
      listIssuedTokens: vi.fn<backendInterface["listIssuedTokens"]>(
        async () => [],
      ),
    });
    await renderPageWithRouter(<IssuerDashboardPage />, actor, {
      path: "/issuer",
    });

    expect(await screen.findByText("No tokens issued yet")).toBeInTheDocument();
  });

  it("edits an open, unfunded token's terms", async () => {
    const user = userEvent.setup();
    const updateToken = vi.fn<backendInterface["updateToken"]>(async () => ({
      __kind__: "ok",
      ok: null,
    }));
    await renderPageWithRouter(
      <IssuerDashboardPage />,
      makeActor({ updateToken }),
      { path: "/issuer" },
    );

    await user.click(await screen.findByTestId("issuer.token.edit_button.1"));
    const debtorInput = screen.getByTestId("issuer.edit.debtor_input.1");
    await user.clear(debtorInput);
    await user.type(debtorInput, "New Buyer Ltd");
    await user.click(screen.getByTestId("issuer.edit.save_button.1"));

    await waitFor(() => expect(updateToken).toHaveBeenCalledTimes(1));
    expect(updateToken.mock.calls[0][0]).toBe(1n);
    expect(updateToken.mock.calls[0][3]).toBe("New Buyer Ltd");
  });

  it("cancels an open, unfunded token after confirmation", async () => {
    const user = userEvent.setup();
    const cancelToken = vi.fn<backendInterface["cancelToken"]>(async () => ({
      __kind__: "ok",
      ok: null,
    }));
    await renderPageWithRouter(
      <IssuerDashboardPage />,
      makeActor({ cancelToken }),
      { path: "/issuer" },
    );

    await user.click(await screen.findByTestId("issuer.token.cancel_button.1"));
    await user.click(
      await screen.findByTestId("issuer.cancel_dialog.confirm_button.1"),
    );

    await waitFor(() => expect(cancelToken).toHaveBeenCalledWith(1n));
  });

  it("locks editing once funding has begun", async () => {
    const actor = makeActor({
      listIssuedTokens: vi.fn<backendInterface["listIssuedTokens"]>(
        async () => [view({ amountFunded: 50_000n })],
      ),
    });
    await renderPageWithRouter(<IssuerDashboardPage />, actor, {
      path: "/issuer",
    });

    expect(
      await screen.findByText("Terms are locked once funding begins."),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("issuer.token.edit_button.1"),
    ).not.toBeInTheDocument();
  });
});
