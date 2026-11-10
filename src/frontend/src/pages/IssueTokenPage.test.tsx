import { renderPageWithRouter } from "@/__tests__/router-test-utils";
import type { backendInterface } from "@/backend";
import { TokenKind } from "@/backend";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import IssueTokenPage from "./IssueTokenPage";

function makeActor(
  createToken: backendInterface["createToken"],
): Pick<backendInterface, "createToken"> {
  return { createToken };
}

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByTestId("issue.face_value_input"), "425000");
  await user.type(screen.getByTestId("issue.debtor_input"), "Shanghai Cosco");
  await user.type(screen.getByTestId("issue.issue_date_input"), "2024-01-01");
  await user.type(
    screen.getByTestId("issue.maturity_date_input"),
    "2024-06-01",
  );
  await user.type(screen.getByTestId("issue.funding_target_input"), "400000");
  await user.type(
    screen.getByTestId("issue.return_terms_textarea"),
    "8.45% APY settled at maturity.",
  );
}

describe("IssueTokenPage", () => {
  it("creates a token with the entered terms and shows the success state", async () => {
    const user = userEvent.setup();
    const createToken = vi.fn<backendInterface["createToken"]>(async () => ({
      __kind__: "ok",
      ok: 7n,
    }));
    await renderPageWithRouter(<IssueTokenPage />, makeActor(createToken), {
      path: "/issue",
    });

    await fillValidForm(user);
    await user.click(screen.getByTestId("issue.submit_button"));

    await waitFor(() => expect(createToken).toHaveBeenCalledTimes(1));
    const [kind, faceValue, currency, debtorName, , , fundingTarget, terms] =
      createToken.mock.calls[0];
    expect(kind).toBe(TokenKind.invoice);
    expect(faceValue).toBe(425_000n);
    expect(currency).toBe("USD");
    expect(debtorName).toBe("Shanghai Cosco");
    expect(fundingTarget).toBe(400_000n);
    expect(terms).toBe("8.45% APY settled at maturity.");

    expect(await screen.findByText("Token created")).toBeInTheDocument();
    expect(screen.getByText("Token ID #7")).toBeInTheDocument();
  });

  it("blocks submission and shows validation errors for an empty form", async () => {
    const user = userEvent.setup();
    const createToken = vi.fn<backendInterface["createToken"]>(async () => ({
      __kind__: "ok",
      ok: 1n,
    }));
    await renderPageWithRouter(<IssueTokenPage />, makeActor(createToken), {
      path: "/issue",
    });

    await user.click(screen.getByTestId("issue.submit_button"));

    expect(
      await screen.findByText("Enter the face value of the obligation."),
    ).toBeInTheDocument();
    expect(createToken).not.toHaveBeenCalled();
  });

  it("rejects a funding target above the face value", async () => {
    const user = userEvent.setup();
    const createToken = vi.fn<backendInterface["createToken"]>(async () => ({
      __kind__: "ok",
      ok: 1n,
    }));
    await renderPageWithRouter(<IssueTokenPage />, makeActor(createToken), {
      path: "/issue",
    });

    await user.type(screen.getByTestId("issue.face_value_input"), "100");
    await user.type(screen.getByTestId("issue.funding_target_input"), "500");
    await user.click(screen.getByTestId("issue.submit_button"));

    expect(
      await screen.findByText("Funding target cannot exceed the face value."),
    ).toBeInTheDocument();
    expect(createToken).not.toHaveBeenCalled();
  });

  it("surfaces a backend rejection message", async () => {
    const user = userEvent.setup();
    const createToken = vi.fn<backendInterface["createToken"]>(async () => ({
      __kind__: "err",
      err: { __kind__: "invalidTerms", invalidTerms: "Terms rejected" },
    }));
    await renderPageWithRouter(<IssueTokenPage />, makeActor(createToken), {
      path: "/issue",
    });

    await fillValidForm(user);
    await user.click(screen.getByTestId("issue.submit_button"));

    expect(await screen.findByText("Terms rejected")).toBeInTheDocument();
  });
});
