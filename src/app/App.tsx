import { Routes, Route } from "react-router-dom";
import RootLayout from "@/app/layout/RootLayout";
import HomePage from "@/features/home/HomePage";
import StudioPage from "@/features/studio/StudioPage";
import ProductionsPage from "@/features/productions/ProductionsPage";
import ProductionDetailPage from "@/features/productions/ProductionDetailPage";
import ArtistsPage from "@/features/artists/ArtistsPage";
import ArtistDetailPage from "@/features/artists/ArtistDetailPage";
import ServicesPage from "@/features/services/ServicesPage";
import MerchPage from "@/features/merch/MerchPage";
import MerchDetailPage from "@/features/merch/MerchDetailPage";
import CheckoutPage from "@/features/merch/CheckoutPage";
import OrderConfirmationPage from "@/features/merch/OrderConfirmationPage";
import ContactPage from "@/features/contact/ContactPage";
import NotFoundPage from "@/features/common/NotFoundPage";
import AdminApp from "@/features/admin/AdminApp";

export default function App() {
  return (
    <Routes>
      <Route path="/admin/*" element={<AdminApp />} />
      <Route element={<RootLayout />}>
        <Route index element={<HomePage />} />
        <Route path="studio" element={<StudioPage />} />
        <Route path="productions" element={<ProductionsPage />} />
        <Route path="productions/:slug" element={<ProductionDetailPage />} />
        <Route path="artistes" element={<ArtistsPage />} />
        <Route path="artistes/:slug" element={<ArtistDetailPage />} />
        <Route path="services" element={<ServicesPage />} />
        <Route path="merch" element={<MerchPage />} />
        <Route path="merch/:slug" element={<MerchDetailPage />} />
        <Route path="commande" element={<CheckoutPage />} />
        <Route path="commande/:reference" element={<OrderConfirmationPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
