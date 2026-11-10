import { SignInButton } from "@/components/InternetIdentity";
import { cn } from "@/lib/utils";
import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { type ReactNode, useState } from "react";

interface NavItem {
  to: string;
  label: string;
  requiresAuth?: boolean;
}

const navItems: NavItem[] = [
  { to: "/", label: "Dashboard" },
  { to: "/marketplace", label: "Marketplace" },
  { to: "/scan", label: "Scan", requiresAuth: true },
  { to: "/history", label: "History", requiresAuth: true },
  { to: "/issuer", label: "My Tokens", requiresAuth: true },
  { to: "/portfolio", label: "Portfolio", requiresAuth: true },
  { to: "/issue", label: "Issue", requiresAuth: true },
];

function useSignedIn(): boolean {
  const { identity } = useInternetIdentity();
  return !!identity && !identity.getPrincipal().isAnonymous();
}

function NavLink({
  item,
  onNavigate,
}: { item: NavItem; onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const active =
    item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      data-ocid={`nav.${item.label.toLowerCase().replace(/\s+/g, "_")}.link`}
      className={cn(
        "relative py-1 text-sm font-medium transition-smooth",
        active
          ? "text-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {item.label}
      {active && (
        <span className="absolute -bottom-[1.35rem] left-0 right-0 h-0.5 rounded-full bg-primary" />
      )}
    </Link>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const signedIn = useSignedIn();
  const [menuOpen, setMenuOpen] = useState(false);
  const visibleItems = navItems.filter(
    (item) => !item.requiresAuth || signedIn,
  );

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            data-ocid="nav.brand.link"
            className="flex items-center gap-2 font-display text-lg font-bold tracking-tight text-foreground"
          >
            <span className="inline-block size-2.5 rounded-full bg-primary" />
            LEDGER
          </Link>

          <nav
            aria-label="Primary"
            className="hidden items-center gap-7 md:flex"
          >
            {visibleItems.map((item) => (
              <NavLink key={item.to} item={item} />
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <SignInButton className="hidden rounded-md border border-border bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition-smooth hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60 sm:inline-flex" />
            <button
              type="button"
              data-ocid="nav.menu.toggle"
              aria-label={menuOpen ? "Close navigation" : "Open navigation"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
              className="inline-flex size-10 items-center justify-center rounded-md border border-border text-foreground transition-smooth hover:bg-secondary md:hidden"
            >
              {menuOpen ? (
                <X className="size-5" aria-hidden="true" />
              ) : (
                <Menu className="size-5" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav
            aria-label="Mobile"
            className="border-t border-border bg-card px-4 py-3 md:hidden"
          >
            <ul className="flex flex-col gap-1">
              {visibleItems.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    onClick={() => setMenuOpen(false)}
                    data-ocid={`nav.mobile.${item.label.toLowerCase().replace(/\s+/g, "_")}.link`}
                    className="block rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition-smooth hover:bg-secondary hover:text-foreground"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
              <li className="pt-1 sm:hidden">
                <SignInButton className="w-full rounded-md border border-border bg-secondary px-4 py-2.5 text-sm font-medium text-secondary-foreground transition-smooth hover:brightness-110 disabled:opacity-60" />
              </li>
            </ul>
          </nav>
        )}
      </header>

      <main className="flex-1 bg-background">{children}</main>

      <footer className="border-t border-border bg-muted/40">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 font-display text-sm font-semibold tracking-tight text-foreground">
            <span className="inline-block size-2 rounded-full bg-primary" />
            LEDGER
          </div>
          <p className="text-xs text-muted-foreground">
            Tokenized trade finance, settled on-chain.
          </p>
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noreferrer"
            data-ocid="footer.attribution.link"
            className="text-xs text-muted-foreground transition-smooth hover:text-foreground"
          >
            © {new Date().getFullYear()}. Built with love using caffeine.ai
          </a>
        </div>
      </footer>
    </div>
  );
}
