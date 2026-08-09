"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/roles";

export type NavItem = {
  href: string;
  label: string;
  roles: Role[];
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", roles: ["super_admin", "branch_user", "worker"] },
  { href: "/inventory", label: "Inventory", roles: ["super_admin", "branch_user", "worker"] },
  { href: "/inventory/low-stock", label: "Low stock", roles: ["super_admin", "branch_user", "worker"] },
  { href: "/pull-in", label: "Pull in", roles: ["super_admin", "branch_user", "worker"] },
  { href: "/pull-out", label: "Pull out", roles: ["super_admin", "branch_user", "worker"] },
  { href: "/reports", label: "Reports", roles: ["super_admin", "branch_user"] },
  { href: "/posts", label: "Announcements", roles: ["super_admin", "branch_user", "worker"] },
  { href: "/accounts", label: "Accounts", roles: ["super_admin"] },
  { href: "/profile", label: "Profile", roles: ["super_admin", "branch_user", "worker"] },
];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === href;
  // "/inventory" must not light up while "/inventory/low-stock" is open.
  if (href === "/inventory") return pathname === "/inventory";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinks({
  role,
  onNavigate,
}: {
  role: Role;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => item.roles.includes(role));

  return (
    <nav className="space-y-0.5">
      {items.map((item) => {
        const active = isActive(pathname, item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex h-11 items-center rounded-lg px-3 text-sm font-medium transition-colors duration-150",
              active
                ? "text-[color:var(--accent)]"
                : "text-muted hover:bg-[color:var(--surface-sunken)] hover:text-[color:var(--text)]",
            )}
          >
            {/* One shared pill slides between items rather than each fading
                independently, so the eye tracks where selection moved. */}
            {active ? (
              <motion.span
                layoutId="nav-active"
                transition={{ type: "spring", stiffness: 400, damping: 34 }}
                className="absolute inset-0 rounded-lg bg-[color:var(--accent)]/12"
              />
            ) : null}
            <span className="relative z-10">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar({
  role,
  fullName,
  branchName,
  roleLabel,
  logout,
}: {
  role: Role;
  fullName: string;
  branchName: string;
  roleLabel: string;
  logout: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const reduced = useReducedMotion();

  return (
    <>
      {/* Mobile bar */}
      <div className="surface-raised sticky top-0 z-30 flex h-14 items-center gap-3 border-b px-4 lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open navigation"
          className="text-muted -ml-2 flex size-11 items-center justify-center rounded-lg hover:bg-[color:var(--surface-sunken)]"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        </button>
        <span className="font-semibold">Blog Inventory</span>
      </div>

      {/* Desktop rail */}
      <aside className="surface-raised hidden w-64 shrink-0 flex-col border-r lg:flex">
        <div className="flex h-16 items-center gap-2.5 border-b px-5">
          <span className="accent-bg flex size-8 items-center justify-center rounded-lg text-xs font-bold">
            BI
          </span>
          <span className="font-semibold">Blog Inventory</span>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <NavLinks role={role} />
        </div>

        <div className="space-y-2 border-t p-3">
          <div className="px-2">
            <p className="truncate text-sm font-medium">{fullName}</p>
            <p className="text-muted truncate text-xs">
              {roleLabel} · {branchName}
            </p>
          </div>
          {logout}
        </div>
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open ? (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            />
            <motion.aside
              initial={{ x: reduced ? 0 : "-100%", opacity: reduced ? 0 : 1 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: reduced ? 0 : "-100%", opacity: reduced ? 0 : 1 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="surface-raised fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r lg:hidden"
            >
              <div className="flex h-14 items-center justify-between border-b px-4">
                <span className="font-semibold">Blog Inventory</span>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close navigation"
                  className="text-muted flex size-11 items-center justify-center rounded-lg hover:bg-[color:var(--surface-sunken)]"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3">
                <NavLinks role={role} onNavigate={() => setOpen(false)} />
              </div>

              <div className="space-y-2 border-t p-3">
                <div className="px-2">
                  <p className="truncate text-sm font-medium">{fullName}</p>
                  <p className="text-muted truncate text-xs">
                    {roleLabel} · {branchName}
                  </p>
                </div>
                {logout}
              </div>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}
