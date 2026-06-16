import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useParams } from "react-router-dom";
import { AppLayout } from "@/layouts/AppLayout";
import { ProtectedRoute } from "@/routes/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";

const Assignments = lazy(() => import("@/pages/Assignments").then((module) => ({ default: module.Assignments })));
const AssignedRepairs = lazy(() => import("@/pages/AssignedRepairs").then((module) => ({ default: module.AssignedRepairs })));
const Billing = lazy(() => import("@/pages/Billing").then((module) => ({ default: module.Billing })));
const BranchManagement = lazy(() => import("@/pages/BranchManagement").then((module) => ({ default: module.BranchManagement })));
const BusinessProfile = lazy(() => import("@/pages/BusinessProfile").then((module) => ({ default: module.BusinessProfile })));
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
const Signup = lazy(() => import("@/pages/Signup").then((module) => ({ default: module.Signup })));
const ForgotPassword = lazy(() => import("@/pages/ForgotPassword").then((module) => ({ default: module.ForgotPassword })));
const PartsUsage = lazy(() => import("@/pages/PartsUsage").then((module) => ({ default: module.PartsUsage })));
const CreateRepair = lazy(() => import("@/pages/Repair").then((module) => ({ default: module.CreateRepair })));
const Repair = lazy(() => import("@/pages/Repair").then((module) => ({ default: module.Repair })));
const RepairDetails = lazy(() => import("@/pages/Repair").then((module) => ({ default: module.RepairDetails })));
const AdminWorkflow = lazy(() => import("@/pages/AdminWorkflow").then((module) => ({ default: module.AdminWorkflow })));
const BranchPortal = lazy(() => import("@/pages/BranchPortal").then((module) => ({ default: module.BranchPortal })));
const BranchDetails = lazy(() => import("@/pages/BranchDetails").then((module) => ({ default: module.BranchDetails })));
const LandingPage = lazy(() => import("@/pages/PublicPage/LandingPage").then((module) => ({ default: module.LandingPage })));
const ContactPage = lazy(() => import("@/pages/PublicPage/ContactPage").then((module) => ({ default: module.ContactPage })));
const StaffManagement = lazy(() => import("@/pages/StaffManagement").then((module) => ({ default: module.StaffManagement })));
const Subscription = lazy(() => import("@/pages/Subscription").then((module) => ({ default: module.Subscription })));
const SuperAdminBusinesses = lazy(() => import("@/pages/SuperAdminBusinesses").then((module) => ({ default: module.SuperAdminBusinesses })));
const SuperAdminBusinessDetails = lazy(() => import("@/pages/SuperAdminBusinesses").then((module) => ({ default: module.SuperAdminBusinessDetails })));
const SuperAdminContacts = lazy(() => import("@/pages/SuperAdminContacts").then((module) => ({ default: module.SuperAdminContacts })));
const Vendors = lazy(() => import("@/pages/Vendors").then((module) => ({ default: module.Vendors })));
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

function SuperAdminBusinessDetailsRoute() {
  const { id } = useParams();
  return <SuperAdminBusinessDetails id={id} />;
}

function RequireRole({ roles, children }) {
  const { hasRole } = useAuth();

  if (!hasRole(...roles)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}

const ownerOnly = ["OWNER"];
const operator = ["ADMIN"];
const staffManagers = ["OWNER", "ADMIN"];
const operatorAndTechnician = ["OWNER", "ADMIN", "TECHNICIAN"];
const superAdminOnly = ["SUPER_ADMIN"];
const technicianOnly = ["TECHNICIAN"];

export function AppRoutes() {
  return (
    <Suspense fallback={<div className="grid min-h-screen place-items-center text-sm text-[var(--muted)]">Loading screen...</div>}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route element={<ProtectedRoute />} >
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<RequireRole roles={operatorAndTechnician}><Dashboard /></RequireRole>} />
            <Route path="/branch/portal" element={<RequireRole roles={staffManagers}><BranchPortal /></RequireRole>} />
            <Route path="/branches/:id" element={<RequireRole roles={ownerOnly}><BranchDetails /></RequireRole>} />
            <Route path="/admin/workflow" element={<RequireRole roles={staffManagers}><AdminWorkflow /></RequireRole>} />
            <Route path="/assignments" element={<RequireRole roles={operator}><Assignments /></RequireRole>} />
            <Route path="/billing" element={<RequireRole roles={operator}><Billing /></RequireRole>} />
            <Route path="/billing/invoices/:id" element={<RequireRole roles={operator}><InvoiceDetailsRoute /></RequireRole>} />
            <Route path="/branches" element={<RequireRole roles={ownerOnly}><BranchManagement /></RequireRole>} />
            <Route path="/business" element={<RequireRole roles={ownerOnly}><BusinessProfile /></RequireRole>} />
            <Route path="/customers" element={<RequireRole roles={operator}><Customers /></RequireRole>} />
            <Route path="/customers/:id" element={<RequireRole roles={operator}><CustomerDetailsRoute /></RequireRole>} />
            <Route path="/handover" element={<RequireRole roles={operator}><Handover /></RequireRole>} />
            <Route path="/inventory" element={<RequireRole roles={operator}><Inventory /></RequireRole>} />
            <Route path="/inventory/:id" element={<RequireRole roles={operator}><InventoryDetailsRoute /></RequireRole>} />
            <Route path="/repair" element={<RequireRole roles={operator}><Repair /></RequireRole>} />
            <Route path="/repair/new" element={<RequireRole roles={operator}><CreateRepair /></RequireRole>} />
            <Route path="/repair/estimates" element={<RequireRole roles={operator}><Estimates /></RequireRole>} />
            <Route path="/repair/estimates/:id" element={<RequireRole roles={operator}><EstimateDetailsRoute /></RequireRole>} />
            <Route path="/repair/parts-usage" element={<RequireRole roles={operator}><PartsUsage /></RequireRole>} />
            <Route path="/repair/:id" element={<RequireRole roles={operator}><RepairDetailsRoute /></RequireRole>} />
            <Route path="/staff" element={<RequireRole roles={staffManagers}><StaffManagement /></RequireRole>} />
            <Route path="/subscription" element={<RequireRole roles={ownerOnly}><Subscription /></RequireRole>} />
            <Route path="/super-admin/businesses" element={<RequireRole roles={superAdminOnly}><SuperAdminBusinesses /></RequireRole>} />
            <Route path="/super-admin/businesses/:id" element={<RequireRole roles={superAdminOnly}><SuperAdminBusinessDetailsRoute /></RequireRole>} />
            <Route path="/super-admin/contacts" element={<RequireRole roles={superAdminOnly}><SuperAdminContacts /></RequireRole>} />
            <Route path="/technician/repairs" element={<RequireRole roles={technicianOnly}><AssignedRepairs /></RequireRole>} />
            <Route path="/vendors" element={<RequireRole roles={operator}><Vendors /></RequireRole>} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
