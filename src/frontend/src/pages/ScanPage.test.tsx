import { renderPageWithRouter } from "@/__tests__/router-test-utils";
import { setIdentityForTest } from "@/__tests__/setup";
import type { Invoice, InvoiceView, backendInterface } from "@/backend";
import { InvoiceCategory, InvoiceStatus } from "@/backend";
import { Principal } from "@icp-sdk/core/principal";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ScanPage from "./ScanPage";

const member = Principal.fromText("ryjl3-tyaaa-aaaaa-aaaba-cai");

// jsdom's File does not implement arrayBuffer(); the page reads uploaded bytes
// through it, so provide a minimal implementation for the test environment.
if (typeof File.prototype.arrayBuffer !== "function") {
  File.prototype.arrayBuffer = function arrayBuffer(this: File) {
    return new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(this);
    });
  };
}

// The platform object-storage layer builds a blob URL when submitting; jsdom
// does not implement the object-URL API, so stub it for the test environment.
if (typeof URL.createObjectURL !== "function") {
  URL.createObjectURL = () => "blob:test";
  URL.revokeObjectURL = () => {};
}

/** A minimal signed-in identity whose principal is not anonymous. */
function signedInIdentity() {
  return { getPrincipal: () => member } as never;
}

function invoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    id: 1n,
    status: InvoiceStatus.accepted,
    lineItems: [{ description: "2x4 lumber", quantity: 10n, amount: 18_450n }],
    owner: member,
    file: new Uint8Array(),
    createdAt: 1_800_000_000_000_000_000n,
    retailerName: "BuildRight Materials Co.",
    invoiceDate: 1_800_000_000_000_000_000n,
    totalAmount: 18_450n,
    currency: "USD",
    vendorReference: "INV-20481",
    category: InvoiceCategory.materialOrder,
    mintedAmount: 18_450n,
    ...overrides,
  };
}

function invoiceView(overrides: Partial<Invoice> = {}): InvoiceView {
  return { invoice: invoice(overrides) };
}

type ScanActor = Pick<backendInterface, "submitInvoice" | "listMyInvoices">;

function makeActor(overrides: Partial<ScanActor> = {}): ScanActor {
  return {
    submitInvoice: vi.fn<backendInterface["submitInvoice"]>(async () => ({
      __kind__: "ok",
      ok: 1n,
    })),
    listMyInvoices: vi.fn<backendInterface["listMyInvoices"]>(async () => []),
    ...overrides,
  };
}

/** A text invoice file the page can parse into a review draft. */
function textInvoiceFile(): File {
  const body = [
    "Invoice INV-20481",
    "Date: 2024-06-14",
    "Total: 18450.00 USD",
    "2x4 lumber",
  ].join("\n");
  return new File([body], "invoice.txt", { type: "text/plain" });
}

/**
 * Drop a file on the scan dropzone. The drop path calls the page's file handler
 * directly, so it does not depend on the input's `accept` filter.
 */
async function uploadInvoice() {
  const dropzone = screen.getByTestId("scan.dropzone");
  fireEvent.drop(dropzone, { dataTransfer: { files: [textInvoiceFile()] } });
}

describe("ScanPage", () => {
  it("scans an uploaded invoice, reviews it and submits it to mint tokens", async () => {
    setIdentityForTest({ identity: signedInIdentity() });
    const user = userEvent.setup();
    const submitInvoice = vi.fn<backendInterface["submitInvoice"]>(
      async () => ({ __kind__: "ok", ok: 1n }),
    );
    const actor = makeActor({ submitInvoice });
    await renderPageWithRouter(<ScanPage />, actor, { path: "/scan" });

    await uploadInvoice();

    // The parsed draft is shown for review with the extracted reference.
    const form = await screen.findByTestId("scan.review_form");
    expect(within(form).getByTestId("scan.vendor_reference_input")).toHaveValue(
      "INV-20481",
    );
    expect(within(form).getByTestId("scan.total_amount_input")).toHaveValue(
      "18450.00",
    );

    // The reader does not extract the retailer or line items, so the user
    // supplies them before submitting.
    await user.type(
      within(form).getByTestId("scan.retailer_input"),
      "BuildRight Materials Co.",
    );
    await user.type(
      within(form).getByTestId("scan.line_item_description_input.1"),
      "2x4 lumber",
    );
    await user.type(
      within(form).getByTestId("scan.line_item_amount_input.1"),
      "18450",
    );
    await user.click(within(form).getByTestId("scan.submit_button"));

    await waitFor(() => expect(submitInvoice).toHaveBeenCalledTimes(1));
    const [category, retailer, reference, , total, currency, lineItems, file] =
      submitInvoice.mock.calls[0];
    expect(category).toBe(InvoiceCategory.materialOrder);
    expect(retailer).toBe("BuildRight Materials Co.");
    expect(reference).toBe("INV-20481");
    expect(total).toBe(18_450n);
    expect(currency).toBe("USD");
    expect(lineItems).toHaveLength(1);

    // The scanned file is submitted as raw bytes (IDL.Vec(IDL.Nat8)), not an
    // ExternalBlob wrapper, so the canister receives the invoice document.
    expect(file).toBeInstanceOf(Uint8Array);
    expect(new TextDecoder().decode(file)).toContain("INV-20481");

    expect(await screen.findByTestId("scan.success_state")).toBeInTheDocument();
  });

  it("blocks submission and shows validation errors for an incomplete invoice", async () => {
    setIdentityForTest({ identity: signedInIdentity() });
    const user = userEvent.setup();
    const submitInvoice = vi.fn<backendInterface["submitInvoice"]>(
      async () => ({
        __kind__: "ok",
        ok: 1n,
      }),
    );
    const actor = makeActor({ submitInvoice });
    await renderPageWithRouter(<ScanPage />, actor, { path: "/scan" });

    await uploadInvoice();
    const form = await screen.findByTestId("scan.review_form");

    // Clear the parsed total so the form is invalid.
    const total = within(form).getByTestId("scan.total_amount_input");
    await user.clear(total);
    await user.click(within(form).getByTestId("scan.submit_button"));

    expect(
      await within(form).findByTestId("scan.total_amount_input.error"),
    ).toBeInTheDocument();
    expect(submitInvoice).not.toHaveBeenCalled();
  });

  it("surfaces a backend rejection without leaving the review step", async () => {
    setIdentityForTest({ identity: signedInIdentity() });
    const user = userEvent.setup();
    const submitInvoice = vi.fn<backendInterface["submitInvoice"]>(
      async () => ({
        __kind__: "err",
        err: {
          __kind__: "invalidInvoice",
          invalidInvoice: "Retailer is required.",
        },
      }),
    );
    const actor = makeActor({ submitInvoice });
    await renderPageWithRouter(<ScanPage />, actor, { path: "/scan" });

    await uploadInvoice();
    const form = await screen.findByTestId("scan.review_form");
    await user.type(
      within(form).getByTestId("scan.retailer_input"),
      "BuildRight Materials Co.",
    );
    await user.type(
      within(form).getByTestId("scan.line_item_description_input.1"),
      "2x4 lumber",
    );
    await user.type(
      within(form).getByTestId("scan.line_item_amount_input.1"),
      "18450",
    );
    await user.click(within(form).getByTestId("scan.submit_button"));

    expect(await screen.findByTestId("scan.submit_error")).toHaveTextContent(
      "Retailer is required.",
    );
    expect(screen.queryByTestId("scan.success_state")).not.toBeInTheDocument();
  });

  it("lists previously scanned invoices for the signed-in user", async () => {
    setIdentityForTest({ identity: signedInIdentity() });
    const actor = makeActor({
      listMyInvoices: vi.fn<backendInterface["listMyInvoices"]>(async () => [
        invoiceView(),
      ]),
    });
    await renderPageWithRouter(<ScanPage />, actor, { path: "/scan" });

    const list = await screen.findByTestId("scan.history.list");
    expect(
      within(list).getByText("BuildRight Materials Co."),
    ).toBeInTheDocument();
    expect(within(list).getByText("Accepted")).toBeInTheDocument();
    expect(within(list).getByText("18,450.00 USD")).toBeInTheDocument();
  });

  it("shows an empty state when the user has no scanned invoices", async () => {
    setIdentityForTest({ identity: signedInIdentity() });
    const actor = makeActor();
    await renderPageWithRouter(<ScanPage />, actor, { path: "/scan" });

    expect(
      await screen.findByTestId("scan.history.empty_state"),
    ).toBeInTheDocument();
  });
});
