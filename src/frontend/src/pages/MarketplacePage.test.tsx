import { renderPageWithRouter } from "@/__tests__/router-test-utils";
import type { TokenSummary, backendInterface } from "@/backend";
import { TokenKind, TokenSort, TokenStatus } from "@/backend";
import { Principal } from "@icp-sdk/core/principal";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import MarketplacePage from "./MarketplacePage";

const issuer = Principal.fromText("aaaaa-aa");

function summary(overrides: Partial<TokenSummary> = {}): TokenSummary {
  return {
    id: 1n,
    status: TokenStatus.open,
    returnTerms: "8.45% APY",
    maturityDate: 1_800_000_000_000_000_000n,
    kind: TokenKind.invoice,
    issuer,
    currency: "USD",
    amountFunded: 100_000n,
    fundingProgress: 0.25,
    fundingTarget: 400_000n,
    faceValue: 425_000n,
    ...overrides,
  };
}

function makeActor(
  listMarketplace: backendInterface["listMarketplace"],
): Pick<backendInterface, "listMarketplace"> {
  return { listMarketplace };
}

describe("MarketplacePage", () => {
  it("renders open tokens with issuer, face value and funding progress", async () => {
    const listMarketplace = vi.fn<backendInterface["listMarketplace"]>(
      async () => [summary()],
    );
    await renderPageWithRouter(
      <MarketplacePage />,
      makeActor(listMarketplace),
      {
        path: "/",
      },
    );

    expect(await screen.findByText("LTT-000001")).toBeInTheDocument();
    const card = screen.getByTestId("marketplace.token_card.1");
    expect(within(card).getByText("425,000.00 USD")).toBeInTheDocument();
    expect(
      within(card).getByText("100,000.00 USD / 400,000.00 USD"),
    ).toBeInTheDocument();
    expect(within(card).getByText("8.45% APY")).toBeInTheDocument();
    expect(within(card).getByText("Open")).toBeInTheDocument();
  });

  it("shows an empty state when no tokens match", async () => {
    const listMarketplace = vi.fn<backendInterface["listMarketplace"]>(
      async () => [],
    );
    await renderPageWithRouter(
      <MarketplacePage />,
      makeActor(listMarketplace),
      {
        path: "/",
      },
    );

    expect(
      await screen.findByText("No tokens match this view"),
    ).toBeInTheDocument();
  });

  it("requests the marketplace with the default filter and sort", async () => {
    const listMarketplace = vi.fn<backendInterface["listMarketplace"]>(
      async () => [],
    );
    await renderPageWithRouter(
      <MarketplacePage />,
      makeActor(listMarketplace),
      {
        path: "/",
      },
    );

    await waitFor(() => expect(listMarketplace).toHaveBeenCalled());
    expect(listMarketplace).toHaveBeenCalledWith(
      null,
      TokenSort.fundingProgress,
    );
  });

  it("surfaces a retryable error state when the ledger fails", async () => {
    const listMarketplace = vi
      .fn<backendInterface["listMarketplace"]>()
      .mockRejectedValue(new Error("ledger down"));
    await renderPageWithRouter(
      <MarketplacePage />,
      makeActor(listMarketplace),
      {
        path: "/",
      },
    );

    expect(
      await screen.findByText("Could not load the marketplace"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("lets a signed-out visitor open a token detail view", async () => {
    const listMarketplace = vi.fn<backendInterface["listMarketplace"]>(
      async () => [summary()],
    );
    await renderPageWithRouter(
      <MarketplacePage />,
      makeActor(listMarketplace),
      {
        path: "/",
      },
    );

    const link = await screen.findByRole("link", { name: /Fund Token/i });
    expect(link).toHaveAttribute("href", "/token/1");
  });

  it("filters by status through the filter controls", async () => {
    const user = userEvent.setup();
    const listMarketplace = vi.fn<backendInterface["listMarketplace"]>(
      async () => [],
    );
    await renderPageWithRouter(
      <MarketplacePage />,
      makeActor(listMarketplace),
      {
        path: "/",
      },
    );

    await user.click(
      await screen.findByTestId("marketplace.filter.status.funded"),
    );

    await waitFor(() =>
      expect(listMarketplace).toHaveBeenCalledWith(
        TokenStatus.funded,
        TokenSort.fundingProgress,
      ),
    );
  });

  it("re-requests the marketplace when the sort control changes", async () => {
    const user = userEvent.setup();
    const listMarketplace = vi.fn<backendInterface["listMarketplace"]>(
      async () => [],
    );
    await renderPageWithRouter(
      <MarketplacePage />,
      makeActor(listMarketplace),
      {
        path: "/",
      },
    );

    await user.click(await screen.findByTestId("marketplace.sort.faceValue"));

    await waitFor(() =>
      expect(listMarketplace).toHaveBeenCalledWith(null, TokenSort.faceValue),
    );
  });

  it("summarizes token count, face value and funded totals", async () => {
    const listMarketplace = vi.fn<backendInterface["listMarketplace"]>(
      async () => [
        summary({ id: 1n, faceValue: 425_000n, amountFunded: 100_000n }),
        summary({ id: 2n, faceValue: 75_000n, amountFunded: 25_000n }),
      ],
    );
    await renderPageWithRouter(
      <MarketplacePage />,
      makeActor(listMarketplace),
      {
        path: "/",
      },
    );

    // Wait for the listing to resolve before reading the header totals.
    await screen.findByText("LTT-000001");
    const page = screen.getByTestId("marketplace.page");
    expect(within(page).getByText("2")).toBeInTheDocument();
    expect(within(page).getByText("500,000.00 USD")).toBeInTheDocument();
    expect(within(page).getByText("125,000.00 USD")).toBeInTheDocument();
  });
});
