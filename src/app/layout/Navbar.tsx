import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Wordmark } from "@/components/brand/Wordmark";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useCart } from "@/app/providers/CartProvider";
import { useLang } from "@/app/providers/LanguageProvider";

const NAV_LINKS = [
  { to: "/studio", fr: "Studio", en: "Studio" },
  { to: "/productions", fr: "Productions", en: "Productions" },
  { to: "/artistes", fr: "Artistes", en: "Artists" },
  { to: "/services", fr: "Services", en: "Services" },
  { to: "/merch", fr: "Boutique", en: "Shop" },
];

function CartButton() {
  const { count, openCart } = useCart();
  const { t } = useLang();
  return (
    <button
      type="button"
      onClick={openCart}
      className="relative -m-2 flex h-10 w-10 items-center justify-center rounded text-fg transition-colors hover:text-fg-strong"
      aria-label={count > 0 ? t(`Panier (${count})`, `Cart (${count})`) : t("Panier", "Cart")}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M6 7h12l-1 13H7L6 7z" strokeLinejoin="round" />
        <path d="M9 7a3 3 0 0 1 6 0" strokeLinecap="round" />
      </svg>
      {count > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-fg px-1 text-[10px] font-bold text-fg-inverted">
          {count}
        </span>
      )}
    </button>
  );
}

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const { t } = useLang();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={`sticky top-0 z-40 transition-colors duration-[var(--dur)] ${
        scrolled || open
          ? "border-b border-border bg-bg/85 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <nav className="container-page flex h-16 items-center justify-between md:h-20" aria-label={t("Navigation principale", "Main navigation")}>
        <Link to="/" className="relative z-50 -m-2 p-2" aria-label={t("Arkane Production — accueil", "Arkane Production — home")}>
          <Wordmark className="h-5 w-auto text-fg-strong" />
        </Link>

        <ul className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <li key={link.to}>
              <NavLink
                to={link.to}
                className={({ isActive }) =>
                  `text-sm tracking-wide transition-colors duration-[var(--dur-fast)] hover:text-fg ${
                    isActive ? "text-fg" : "text-fg-muted"
                  }`
                }
              >
                {t(link.fr, link.en)}
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3 md:gap-4">
          <LanguageSwitcher className="hidden sm:inline-flex" />
          <CartButton />
          <Link to="/contact" className="btn-primary hidden md:inline-flex">
            Contact
          </Link>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="relative z-50 -m-2 flex h-10 w-10 items-center justify-center rounded text-fg md:hidden"
            aria-expanded={open}
            aria-controls="menu-mobile"
            aria-label={open ? t("Fermer le menu", "Close menu") : t("Ouvrir le menu", "Open menu")}
          >
            <span className="relative block h-4 w-6">
              <span className={`absolute left-0 h-0.5 w-6 bg-current transition-all duration-[var(--dur)] ${open ? "top-1.5 rotate-45" : "top-0"}`} />
              <span className={`absolute left-0 top-1.5 h-0.5 w-6 bg-current transition-opacity duration-[var(--dur)] ${open ? "opacity-0" : "opacity-100"}`} />
              <span className={`absolute left-0 h-0.5 w-6 bg-current transition-all duration-[var(--dur)] ${open ? "top-1.5 -rotate-45" : "top-3"}`} />
            </span>
          </button>
        </div>
      </nav>

      {/* Panneau mobile */}
      <div
        id="menu-mobile"
        className={`fixed inset-0 top-0 z-40 flex flex-col bg-bg px-5 pb-10 pt-24 transition-opacity duration-[var(--dur)] md:hidden ${
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <ul className="flex flex-col divide-y divide-border">
          {NAV_LINKS.map((link) => (
            <li key={link.to}>
              <NavLink to={link.to} className="flex items-center justify-between py-5 font-display text-2xl tracking-tightest text-fg-strong">
                {t(link.fr, link.en)}
                <span aria-hidden className="text-fg-subtle">↗</span>
              </NavLink>
            </li>
          ))}
        </ul>
        <div className="mt-8 flex items-center justify-between">
          <LanguageSwitcher />
          <Link to="/contact" className="btn-primary">
            Contact
          </Link>
        </div>
      </div>
    </header>
  );
}
