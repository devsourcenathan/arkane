import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { Wordmark } from "@/components/brand/Wordmark";
import { useAdminAuth } from "./AdminAuthProvider";

const NAV = [
  { to: "/admin", label: "Tableau de bord", end: true },
  { to: "/admin/productions", label: "Productions" },
  { to: "/admin/artistes", label: "Artistes" },
  { to: "/admin/equipe", label: "Équipe" },
  { to: "/admin/services", label: "Services" },
  { to: "/admin/produits", label: "Produits" },
  { to: "/admin/commandes", label: "Commandes" },
  { to: "/admin/messages", label: "Messages" },
  { to: "/admin/medias", label: "Médias" },
  { to: "/admin/parametres", label: "Paramètres" },
];

export function AdminLayout() {
  const { user, logout } = useAdminAuth();
  const [open, setOpen] = useState(false);

  const navLinks = (
    <ul className="space-y-1">
      {NAV.map((item) => (
        <li key={item.to}>
          <NavLink
            to={item.to}
            end={item.end}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `block rounded-md px-3 py-2 text-sm transition-colors ${
                isActive ? "bg-surface text-fg-strong" : "text-fg-muted hover:bg-surface/60 hover:text-fg"
              }`
            }
          >
            {item.label}
          </NavLink>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="min-h-dvh bg-bg lg:grid lg:grid-cols-[260px_1fr]">
      {/* Sidebar desktop */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-border bg-bg-deep p-5 lg:flex">
        <Link to="/admin" className="mb-8 inline-flex">
          <Wordmark className="h-5 text-fg-strong" />
        </Link>
        <nav className="flex-1">{navLinks}</nav>
        <div className="mt-6 border-t border-border pt-4">
          <p className="truncate px-3 text-xs text-fg-subtle">{user?.email}</p>
          <button type="button" onClick={() => void logout()} className="btn-ghost mt-2 w-full justify-start px-3">
            Déconnexion
          </button>
          <Link to="/" className="btn-ghost mt-1 w-full justify-start px-3 text-xs">
            ← Voir le site
          </Link>
        </div>
      </aside>

      {/* Topbar mobile */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-bg/90 px-4 py-3 backdrop-blur lg:hidden">
        <Wordmark className="h-5 text-fg-strong" />
        <button type="button" onClick={() => setOpen((v) => !v)} className="btn-ghost px-3" aria-expanded={open}>
          {open ? "Fermer" : "Menu"}
        </button>
      </div>
      {open && (
        <div className="border-b border-border bg-bg-deep p-4 lg:hidden">
          {navLinks}
          <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
            <span className="text-xs text-fg-subtle">{user?.email}</span>
            <button type="button" onClick={() => void logout()} className="btn-ghost px-3">
              Déconnexion
            </button>
          </div>
        </div>
      )}

      <main className="min-w-0">
        <div className="mx-auto max-w-5xl px-5 py-8 lg:px-10 lg:py-12">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
