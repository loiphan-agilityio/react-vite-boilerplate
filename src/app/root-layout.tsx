import { Link, Outlet } from 'react-router';

import vite from '@/assets/tech/vite.svg';
import { Button } from '@/components/ui/button';

const navLinkClass = 'text-sm text-muted-foreground transition-colors hover:text-foreground';

export const RootLayout = () => (
  <div className="flex min-h-svh flex-col bg-background text-foreground">
    <header className="sticky top-0 z-10 bg-background/80 backdrop-blur">
      <nav
        aria-label="Main"
        className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-6 px-4"
      >
        <Link to="/" className="flex items-center gap-2 font-heading font-semibold">
          <img src={vite} alt="" className="size-7" />
          Boilerplate
        </Link>
        <div className="flex items-center gap-6">
          {/* Plain anchors: they work from the 404 page too, where a router Link would not scroll. */}
          <a href="/#stack-heading" className={`hidden sm:inline ${navLinkClass}`}>
            Stack
          </a>
          <Button asChild size="sm">
            <a href="/#start-heading">Get started</a>
          </Button>
        </div>
      </nav>
      <div
        aria-hidden
        className="h-px bg-gradient-to-r from-brand-cyan via-primary to-brand-purple"
      />
    </header>
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-12">
      <Outlet />
    </main>
    <footer className="border-t py-6 text-center text-sm text-muted-foreground">
      Built with React, Vite and shadcn/ui.
    </footer>
  </div>
);
