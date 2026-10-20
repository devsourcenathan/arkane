import { Routes, Route, Navigate } from "react-router-dom";
import { AdminAuthProvider, useAdminAuth } from "./AdminAuthProvider";
import { ToastProvider } from "./ToastProvider";
import { LoginPage } from "./LoginPage";
import { AdminLayout } from "./AdminLayout";
import { LoadingState } from "@/components/ui/states";
import { DashboardPage } from "./pages/DashboardPage";
import { SettingsPage } from "./pages/SettingsPage";
import { MediaPage } from "./pages/MediaPage";
import { MessagesPage } from "./pages/MessagesPage";
import { ArtistsListPage, ArtistEditPage } from "./pages/artists";
import { TeamListPage, TeamEditPage } from "./pages/team";
import { ServicesListPage, ServiceEditPage } from "./pages/services";
import { ProjectsListPage, ProjectEditPage } from "./pages/projects";
import { ProductsListPage, ProductEditPage } from "./pages/products";
import { OrdersListPage, OrderDetailPage } from "./pages/orders";

function AdminGate() {
  const { user, loading } = useAdminAuth();

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg">
        <LoadingState label="Vérification de la session…" />
      </div>
    );
  }
  if (!user) return <LoginPage />;

  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="productions" element={<ProjectsListPage />} />
        <Route path="productions/nouveau" element={<ProjectEditPage />} />
        <Route path="productions/:id" element={<ProjectEditPage />} />
        <Route path="artistes" element={<ArtistsListPage />} />
        <Route path="artistes/nouveau" element={<ArtistEditPage />} />
        <Route path="artistes/:id" element={<ArtistEditPage />} />
        <Route path="equipe" element={<TeamListPage />} />
        <Route path="equipe/nouveau" element={<TeamEditPage />} />
        <Route path="equipe/:id" element={<TeamEditPage />} />
        <Route path="services" element={<ServicesListPage />} />
        <Route path="services/nouveau" element={<ServiceEditPage />} />
        <Route path="services/:id" element={<ServiceEditPage />} />
        <Route path="produits" element={<ProductsListPage />} />
        <Route path="produits/nouveau" element={<ProductEditPage />} />
        <Route path="produits/:id" element={<ProductEditPage />} />
        <Route path="commandes" element={<OrdersListPage />} />
        <Route path="commandes/:id" element={<OrderDetailPage />} />
        <Route path="messages" element={<MessagesPage />} />
        <Route path="medias" element={<MediaPage />} />
        <Route path="parametres" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Route>
    </Routes>
  );
}

export default function AdminApp() {
  return (
    <AdminAuthProvider>
      <ToastProvider>
        <AdminGate />
      </ToastProvider>
    </AdminAuthProvider>
  );
}
