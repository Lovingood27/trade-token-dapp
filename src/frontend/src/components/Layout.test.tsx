import { setIdentityForTest } from "@/__tests__/setup";
import { Principal } from "@icp-sdk/core/principal";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Layout } from "./Layout";

const member = Principal.fromText("ryjl3-tyaaa-aaaaa-aaaba-cai");

/** A minimal signed-in identity whose principal is not anonymous. */
function signedInIdentity() {
  return { getPrincipal: () => member } as never;
}

async function renderLayout() {
  const rootRoute = createRootRoute({
    component: () => (
      <Layout>
        <Outlet />
      </Layout>
    ),
  });
  const homeRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    component: () => <div data-ocid="home.stub" />,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([homeRoute]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  await router.load();
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

describe("Layout", () => {
  it("shows the public dashboard and marketplace entries to a signed-out visitor", async () => {
    await renderLayout();

    const nav = screen.getByRole("navigation", { name: "Primary" });
    expect(
      within(nav).getByRole("link", { name: "Dashboard" }),
    ).toHaveAttribute("href", "/");
    expect(
      within(nav).getByRole("link", { name: "Marketplace" }),
    ).toHaveAttribute("href", "/marketplace");
  });

  it("hides signed-in-only entries from a signed-out visitor", async () => {
    await renderLayout();

    const nav = screen.getByRole("navigation", { name: "Primary" });
    expect(
      within(nav).queryByRole("link", { name: "Scan" }),
    ).not.toBeInTheDocument();
    expect(
      within(nav).queryByRole("link", { name: "History" }),
    ).not.toBeInTheDocument();
    expect(
      within(nav).queryByRole("link", { name: "My Tokens" }),
    ).not.toBeInTheDocument();
    expect(
      within(nav).queryByRole("link", { name: "Portfolio" }),
    ).not.toBeInTheDocument();
    expect(
      within(nav).queryByRole("link", { name: "Issue" }),
    ).not.toBeInTheDocument();
  });

  it("reveals the signed-in entries once a user is authenticated", async () => {
    setIdentityForTest({ identity: signedInIdentity() });
    await renderLayout();

    const nav = screen.getByRole("navigation", { name: "Primary" });
    expect(within(nav).getByRole("link", { name: "Scan" })).toHaveAttribute(
      "href",
      "/scan",
    );
    expect(within(nav).getByRole("link", { name: "History" })).toHaveAttribute(
      "href",
      "/history",
    );
    expect(
      within(nav).getByRole("link", { name: "My Tokens" }),
    ).toHaveAttribute("href", "/issuer");
    expect(
      within(nav).getByRole("link", { name: "Portfolio" }),
    ).toHaveAttribute("href", "/portfolio");
    expect(within(nav).getByRole("link", { name: "Issue" })).toHaveAttribute(
      "href",
      "/issue",
    );
  });
});
