import { renderPageWithRouter } from "@/__tests__/router-test-utils";
import type { FundedTokenView, TradeToken, backendInterface } from "@/backend";
import { TokenKind, TokenStatus } from "@/backend";
import { Principal } from "@icp-sdk/core/principal";
import { screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PortfolioPage from "./PortfolioPage";

const issuer = Principal.fromText("aaaaa-aa");
const investor = Principal.fromText("ryjl3-tyaaa-aaaaa-aaaba-cai");

function token(overrides: Partial<TradeToken> = {}): TradeToken {
  return {
    id: 1n,
    issueDate: 1_700_000_000_000_000_000n,
    status: TokenStatus.funded,
    returnTerms: "8.45% APY",
    maturityDate: 1_800_000_000_000_000_000n,
    kind: TokenKind.invoice,
    createdAt: 1_700_000_000_000_000_000n,
    debtorName: "Shanghai Cosco Ltd",
    issuer,
    currency: "USD",
    amountFunded: 400_000n,
    fundingTarget: 400_000n,
    faceValue: 425_000n,
    ...overrides,
  };
}

function holding(overrides: Partial<TradeToken> = {}): FundedTokenView {
  return {
    token: token(overrides),
    commitment: {
      id: 3n,
      tokenId: 1n,
      expectedReturn: 106_250n,
      amount: 100_000n,
      committedAt: 1_700_000_000_000_000_000n,
      investor,
    },
  };
}

function makeActor(
  listFundedTokens: backendInterface["listFundedTokens"],
): Pick<backendInterface, "listFundedTokens"> {
  return { listFundedTokens };
}

describe("PortfolioPage", () => {
  it("lists funded tokens with committed amount, status and expected return", async () => {
    const actor = makeActor(
      vi.fn<backendInterface["listFundedTokens"]>(async () => [holding()]),
    );
    await renderPageWithRouter(<PortfolioPage />, actor, {
      path: "/portfolio",
    });

    const item = await screen.findByTestId("portfolio.item.1");
    expect(within(item).getByText("Shanghai Cosco Ltd")).toBeInTheDocument();
    expect(within(item).getByText("100,000.00 USD")).toBeInTheDocument();
    expect(within(item).getByText("106,250.00 USD")).toBeInTheDocument();
    expect(within(item).getByText("Funded")).toBeInTheDocument();
  });

  it("shows an empty state when the investor has no holdings", async () => {
    const actor = makeActor(
      vi.fn<backendInterface["listFundedTokens"]>(async () => []),
    );
    await renderPageWithRouter(<PortfolioPage />, actor, {
      path: "/portfolio",
    });

    expect(await screen.findByText("No holdings yet")).toBeInTheDocument();
  });

  it("shows a retryable error state when the portfolio fails to load", async () => {
    const actor = makeActor(
      vi
        .fn<backendInterface["listFundedTokens"]>()
        .mockRejectedValue(new Error("ledger down")),
    );
    await renderPageWithRouter(<PortfolioPage />, actor, {
      path: "/portfolio",
    });

    expect(
      await screen.findByText(
        "We could not load your portfolio. Please try again.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByTestId("portfolio.retry_button")).toBeInTheDocument();
  });
});
