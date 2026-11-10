import { RequireSignIn } from "@/components/InternetIdentity";
import DashboardPage from "@/pages/DashboardPage";
import HistoryPage from "@/pages/HistoryPage";
import IssueTokenPage from "@/pages/IssueTokenPage";
import IssuerDashboardPage from "@/pages/IssuerDashboardPage";
import MarketplacePage from "@/pages/MarketplacePage";
import PortfolioPage from "@/pages/PortfolioPage";
import ScanPage from "@/pages/ScanPage";
import TokenDetailPage from "@/pages/TokenDetailPage";
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";

const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: DashboardPage,
});

const marketplaceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/marketplace",
  component: MarketplacePage,
});

const tokenDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/token/$tokenId",
  component: TokenDetailPage,
});

const scanRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/scan",
  component: () => (
    <RequireSignIn>
      <ScanPage />
    </RequireSignIn>
  ),
});

const historyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/history",
  component: () => (
    <RequireSignIn>
      <HistoryPage />
    </RequireSignIn>
  ),
});

const issueRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/issue",
  component: () => (
    <RequireSignIn>
      <IssueTokenPage />
    </RequireSignIn>
  ),
});

const issuerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/issuer",
  component: () => (
    <RequireSignIn>
      <IssuerDashboardPage />
    </RequireSignIn>
  ),
});

const portfolioRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/portfolio",
  component: () => (
    <RequireSignIn>
      <PortfolioPage />
    </RequireSignIn>
  ),
});

const routeTree = rootRoute.addChildren([
  dashboardRoute,
  marketplaceRoute,
  tokenDetailRoute,
  scanRoute,
  historyRoute,
  issueRoute,
  issuerRoute,
  portfolioRoute,
]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return <RouterProvider router={router} />;
}
