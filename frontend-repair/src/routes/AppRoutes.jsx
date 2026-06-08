import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useParams } from "react-router-dom";
import { AppLayout } from "@/layouts/AppLayout";
import { ProtectedRoute } from "@/routes/ProtectedRoute";

const Analytics = lazy(() => import("@/pages/Analytics").then((module) => ({ default: module.Analytics })));
const Assignments = lazy(() => import("@/pages/Assignments").then((module) => ({ default: module.Assignments })));
const Billing = lazy(() => import("@/pages/Billing").then((module) => ({ default: module.Billing })));
const InvoiceDetails = lazy(() => import("@/pages/Billing").then((module) => ({ default: module.InvoiceDetails })));
const CustomerDetails = lazy(() => import("@/pages/Customers").then((module) => ({ default: module.CustomerDetails })));
const Customers = lazy(() => import("@/pages/Customers").then((module) => ({ default: module.Customers })));
const Dashboard = lazy(() => import("@/pages/Dashboard").then((module) => ({ default: module.Dashboard })));
const EstimateDetails = lazy(() => import("@/pages/Estimates").then((module) => ({ default: module.EstimateDetails })));
const Estimates = lazy(() => import("@/pages/Estimates").then((module) => ({ default: module.Estimates })));
const Handover = lazy(() => import("@/pages/Handover").then((module) => ({ default: module.Handover })));
const Inventory = lazy(() => import("@/pages/Inventory").then((module) => ({ default: module.Inventory })));
const InventoryDetails = lazy(() => import("@/pages/Inventory").then((module) => ({ default: module.InventoryDetails })));
const Login = lazy(() => import("@/pages/Login").then((module) => ({ default: module.Login })));
const PartsUsage = lazy(() => import("@/pages/PartsUsage").then((module) => ({ default: module.PartsUsage })));
const CreateRepair = lazy(() => import("@/pages/Repair").then((module) => ({ default: module.CreateRepair })));
const Repair = lazy(() => import("@/pages/Repair").then((module) => ({ default: module.Repair })));
const RepairDetails = lazy(() => import("@/pages/Repair").then((module) => ({ default: module.RepairDetails })));
const Vendors = lazy(() => import("@/pages/Vendors").then((module) => ({ default: module.Vendors })));
const AuthPage = lazy(() => import("@/pages/SystemPages").then((module) => ({ default: module.AuthPage })));
const BusinessPage = lazy(() => import("@/pages/SystemPages").then((module) => ({ default: module.BusinessPage })));
const NotificationsPage = lazy(() => import("@/pages/SystemPages").then((module) => ({ default: module.NotificationsPage })));
const StaffPage = lazy(() => import("@/pages/SystemPages").then((module) => ({ default: module.StaffPage })));
const SettingsPage = lazy(() => import("@/pages/SystemPages").then((module) => ({ default: module.SettingsPage })));
const NotFoundPage = lazy(() => import("@/pages/ErrorPages").then((module) => ({ default: module.NotFoundPage })));
const UnauthorizedPage = lazy(() => import("@/pages/ErrorPages").then((module) => ({ default: module.UnauthorizedPage })));

function RepairDetailsRoute() {
  const { id } = useParams();
  return <RepairDetails id={id} />;
}

function EstimateDetailsRoute() {
  const { id } = useParams();
  return <EstimateDetails id={id} />;
}

function CustomerDetailsRoute() {
  const { id } = useParams();
  return <CustomerDetails id={id} />;
}

function InvoiceDetailsRoute() {
  const { id } = useParams();
  return <InvoiceDetails id={id} />;
}

function InventoryDetailsRoute() {
  const { id } = useParams();
  return <InventoryDetails id={id} />;
}

export function AppRoutes() {
  return (
    <Suspense fallback={<div className="grid min-h-screen place-items-center text-sm text-[var(--muted)]">Loading screen...</div>}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/assignments" element={<Assignments />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/billing" element={<Billing />} />
            <Route path="/billing/invoices/:id" element={<InvoiceDetailsRoute />} />
            <Route path="/business" element={<BusinessPage />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/customers/:id" element={<CustomerDetailsRoute />} />
            <Route path="/handover" element={<Handover />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/inventory/:id" element={<InventoryDetailsRoute />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/repair" element={<Repair />} />
            <Route path="/repair/new" element={<CreateRepair />} />
            <Route path="/repair/estimates" element={<Estimates />} />
            <Route path="/repair/estimates/:id" element={<EstimateDetailsRoute />} />
            <Route path="/repair/parts-usage" element={<PartsUsage />} />
            <Route path="/repair/:id" element={<RepairDetailsRoute />} />
            <Route path="/staff" element={<StaffPage />} />
            <Route path="/vendors" element={<Vendors />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
