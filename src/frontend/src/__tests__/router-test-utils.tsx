import type { backendInterface } from "@/backend";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { setActorForTest } from "./setup";

/**
 * Render a page component inside a real TanStack Router so router hooks
 * (`useSearch`, `useParams`, `useNavigate`) and `<Link>` resolve. The route
 * tree mirrors the app's paths, with the page under test mounted at `path`.
 */
export async function renderPageWithRouter<K extends keyof backendInterface>(
  ui: ReactElement,
  actor: Pick<backendInterface, K>,
  options: { path: string; initialEntry?: string } = { path: "/" },
) {
  setActorForTest(actor);
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  const rootRoute = createRootRoute({ component: () => <Outlet /> });
  const pageRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: options.path,
    component: () => ui,
  });
  const children = [pageRoute];
  if (options.path !== "/token/$tokenId") {
    children.push(
      createRoute({
        getParentRoute: () => rootRoute,
        path: "/token/$tokenId",
        component: () => <div data-ocid="token_detail.stub" />,
      }),
    );
  }
  const router = createRouter({
    routeTree: rootRoute.addChildren(children),
    history: createMemoryHistory({
      initialEntries: [options.initialEntry ?? options.path],
    }),
  });
  // Resolve the initial match before rendering so the page is present on the
  // first paint; otherwise the router renders an empty shell for one tick.
  await router.load();

  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    ),
    queryClient,
    router,
  };
}
