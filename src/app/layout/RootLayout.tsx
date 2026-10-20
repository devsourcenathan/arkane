import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Navbar from "@/app/layout/Navbar";
import Footer from "@/app/layout/Footer";
import { CartDrawer } from "@/components/cart/CartDrawer";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);
  return null;
}

export default function RootLayout() {
  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded focus:bg-surface focus:px-4 focus:py-2 focus:text-fg"
      >
        Aller au contenu
      </a>
      <ScrollToTop />
      <Navbar />
      <main id="contenu" className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <CartDrawer />
    </div>
  );
}
