import { renderPageWithRouter } from "@/__tests__/router-test-utils";
import { setIdentityForTest } from "@/__tests__/setup";
import type {
  AttachedDocument,
  FundedTokenView,
  TradeToken,
  backendInterface,
} from "@/backend";
import { TokenKind, TokenStatus } from "@/backend";
import { Principal } from "@icp-sdk/core/principal";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import TokenDetailPage from "./TokenDetailPage";

const issuer = Principal.fromText("aaaaa-aa");
const investor = Principal.fromText("ryjl3-tyaaa-aaaaa-aaaba-cai");

/** A minimal signed-in identity whose principal is not anonymous. */
function signedInIdentity() {
  return { getPrincipal: () => investor } as never;
}

function token(overrides: Partial<TradeToken> = {}): TradeToken {
  return {
    id: 1n,
    issueDate: 1_700_000_000_000_000_000n,
    status: TokenStatus.open,
    returnTerms: "8.45% APY, settled at maturity.",
    maturityDate: 1_800_000_000_000_000_000n,
    kind: TokenKind.invoice,
    createdAt: 1_700_000_000_000_000_000n,
    debtorName: "Shanghai Cosco Ltd",
    issuer,
    currency: "USD",
    amountFunded: 100_000n,
    fundingTarget: 400_000n,
    faceValue: 425_000n,
    ...overrides,
  };
}

function makeActor(
  overrides: Partial<backendInterface> = {},
): Pick<
  backendInterface,
  "getToken" | "listTokenDocuments" | "listFundedTokens" | "fundToken"
> {
  return {
    getToken: vi.fn<backendInterface["getToken"]>(async () => token()),
    listTokenDocuments: vi.fn<backendInterface["listTokenDocuments"]>(
      async () => [],
    ),
    listFundedTokens: vi.fn<backendInterface["listFundedTokens"]>(
      async () => [],
    ),
    fundToken: vi.fn<backendInterface["fundToken"]>(async () => ({
      __kind__: "ok",
      ok: 1n,
    })),
    ...overrides,
  };
}

function renderDetail(actor: ReturnType<typeof makeActor>, tokenId = "1") {
  return renderPageWithRouter(<TokenDetailPage />, actor, {
    path: "/token/$tokenId",
    initialEntry: `/token/${tokenId}`,
  });
}

describe("TokenDetailPage", () => {
  it("shows the full terms and funding progress to a signed-out visitor", async () => {
    await renderDetail(makeActor());

    expect(
      await screen.findByRole("heading", { name: "Shanghai Cosco Ltd" }),
    ).toBeInTheDocument();
    const terms = screen.getByTestId("token.terms.list");
    expect(within(terms).getByText("425,000.00 USD")).toBeInTheDocument();
    expect(within(terms).getByText("400,000.00 USD")).toBeInTheDocument();
    expect(within(terms).getByText("100,000.00 USD")).toBeInTheDocument();
    expect(
      screen.getByText("8.45% APY, settled at maturity."),
    ).toBeInTheDocument();
    expect(screen.getByText("25% funded")).toBeInTheDocument();
  });

  it("prompts a signed-out visitor to sign in to fund", async () => {
    await renderDetail(makeActor());

    expect(
      await screen.findByText(
        "Sign in with Internet Identity to commit funds to this token.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("funding.amount.input"),
    ).not.toBeInTheDocument();
  });

  it("shows an error state for an invalid token reference", async () => {
    await renderDetail(makeActor(), "not-a-number");

    expect(
      await screen.findByText("This token reference is not valid."),
    ).toBeInTheDocument();
  });

  it("shows a not-found state when the token does not exist", async () => {
    const actor = makeActor({
      getToken: vi.fn<backendInterface["getToken"]>(async () => null),
    });
    await renderDetail(actor);

    expect(await screen.findByText("Token not found")).toBeInTheDocument();
  });

  it("lists attached documents from the backend", async () => {
    const document: AttachedDocument = {
      id: 7n,
      tokenId: 1n,
      contentType: "application/pdf",
      file: new Uint8Array([1, 2, 3]),
      fileName: "invoice-42.pdf",
      uploadedAt: 1_700_000_000_000_000_000n,
    };
    const actor = makeActor({
      listTokenDocuments: vi.fn<backendInterface["listTokenDocuments"]>(
        async () => [document],
      ),
    });
    await renderDetail(actor);

    expect(await screen.findByText("invoice-42.pdf")).toBeInTheDocument();
    expect(
      screen.getByTestId("token.document.open_button"),
    ).toBeInTheDocument();
  });

  it("funds an open token as a signed-in investor and reports success", async () => {
    const user = userEvent.setup();
    setIdentityForTest({ identity: signedInIdentity() });
    const fundToken = vi.fn<backendInterface["fundToken"]>(async () => ({
      __kind__: "ok",
      ok: 1n,
    }));
    await renderDetail(makeActor({ fundToken }));

    const input = await screen.findByTestId("funding.amount.input");
    await user.type(input, "50000");
    await user.click(screen.getByTestId("funding.submit_button"));

    await waitFor(() => expect(fundToken).toHaveBeenCalledWith(1n, 50_000n));
    expect(
      await screen.findByText("Committed 50,000.00 USD to this token."),
    ).toBeInTheDocument();
  });

  it("rejects a commitment that exceeds the remaining target", async () => {
    const user = userEvent.setup();
    setIdentityForTest({ identity: signedInIdentity() });
    const fundToken = vi.fn<backendInterface["fundToken"]>(async () => ({
      __kind__: "ok",
      ok: 1n,
    }));
    await renderDetail(makeActor({ fundToken }));

    const input = await screen.findByTestId("funding.amount.input");
    await user.type(input, "999999");
    await user.click(screen.getByTestId("funding.submit_button"));

    expect(
      await screen.findByText(
        "Amount exceeds the remaining target of 300,000.00.",
      ),
    ).toBeInTheDocument();
    expect(fundToken).not.toHaveBeenCalled();
  });

  it("shows the caller's own commitments in the funding history", async () => {
    setIdentityForTest({ identity: signedInIdentity() });
    const view: FundedTokenView = {
      token: token(),
      commitment: {
        id: 3n,
        tokenId: 1n,
        expectedReturn: 106_250n,
        amount: 100_000n,
        committedAt: 1_700_000_000_000_000_000n,
        investor,
      },
    };
    const actor = makeActor({
      listFundedTokens: vi.fn<backendInterface["listFundedTokens"]>(
        async () => [view],
      ),
    });
    await renderDetail(actor);

    const history = await screen.findByTestId("token.funding_history.list");
    expect(within(history).getByText("100,000.00 USD")).toBeInTheDocument();
    expect(within(history).getByText("106,250.00 USD")).toBeInTheDocument();
  });
});
