import { Bell, Building2, Settings, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useAuth } from "@/contexts/AuthContext";
import { displayValue } from "@/utils/data";

export function AuthPage() {
  const { user } = useAuth();
  return (
    <>
      <PageHeader title="Auth" description="Profile, session information, and account security." />
      <div className="grid gap-5 xl:grid-cols-3">
        <Card><CardHeader><CardTitle>Profile</CardTitle></CardHeader><CardContent className="space-y-2 text-sm"><Source endpoint="GET /auth/me" /><Info label="Name" value={user?.fullName} /><Info label="Email" value={user?.email} /><Info label="Role" value={<StatusBadge status={user?.role} />} /><Info label="Business" value={user?.business?.name} /></CardContent></Card>
        <Card><CardHeader><CardTitle>Session Information</CardTitle></CardHeader><CardContent className="space-y-2 text-sm"><Source endpoint="GET /auth/me" /><Info label="Tenant" value={user?.businessId} /><Info label="Account Status" value={user?.isActive ? "Active" : "Inactive"} /><Info label="Auth Source" value="JWT access token + refresh token" /></CardContent></Card>
        <MissingEndpoint title="Change Password" endpoint="No change-password endpoint exists in the backend Postman collection." />
      </div>
    </>
  );
}

export function BusinessPage() {
  const { user } = useAuth();
  const business = user?.business || {};
  return (
    <>
      <PageHeader title="Business" description="Business profile, GST/tax settings, and contact information." />
      <div className="grid gap-5 xl:grid-cols-3">
        <Card><CardHeader><CardTitle>Business Profile</CardTitle></CardHeader><CardContent className="space-y-2 text-sm"><Source endpoint="GET /auth/me" /><Info label="Name" value={business.name} /><Info label="Slug" value={business.slug} /><Info label="Type" value={business.type} /></CardContent></Card>
        <MissingEndpoint title="GST / Tax Settings" endpoint="No business tax/settings endpoint exists in the backend Postman collection." />
        <MissingEndpoint title="Contact Information" endpoint="No business profile update endpoint exists in the backend Postman collection." />
      </div>
    </>
  );
}

export function NotificationsPage() {
  return (
    <>
      <PageHeader title="Notifications" description="Notification center with repair and payment alerts." />
      <MissingEndpoint title="Notification Center" endpoint="No notifications endpoint exists in the backend Postman collection." />
    </>
  );
}

export function StaffPage() {
  return (
    <>
      <PageHeader title="Staff" description="Staff list, roles, permissions, and technician assignment visibility." />
      <div className="grid gap-5 xl:grid-cols-2">
        <MissingEndpoint title="Staff List" endpoint="No staff listing endpoint exists in the backend Postman collection." />
        <MissingEndpoint title="Create Staff" endpoint="No staff creation endpoint exists in the backend Postman collection." />
      </div>
    </>
  );
}

export function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" description="ERP, business, notification, and invoice settings." />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <SettingsCard icon={<Settings />} title="ERP Settings" endpoint="No ERP settings endpoint exists in the backend Postman collection." />
        <SettingsCard icon={<Building2 />} title="Business Settings" endpoint="No business settings endpoint exists in the backend Postman collection." />
        <SettingsCard icon={<Bell />} title="Notification Settings" endpoint="No notification settings endpoint exists in the backend Postman collection." />
        <SettingsCard icon={<ShieldCheck />} title="Invoice Settings" endpoint="No invoice settings endpoint exists in the backend Postman collection." />
      </div>
    </>
  );
}

function SettingsCard({ icon, title, endpoint }) {
  return <Card><CardHeader><CardTitle className="flex items-center gap-2">{icon}{title}</CardTitle></CardHeader><CardContent><EmptyState title="Endpoint unavailable" description={endpoint} /></CardContent></Card>;
}

function MissingEndpoint({ title, endpoint }) {
  return <Card><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent><EmptyState title="Endpoint unavailable" description={endpoint} /></CardContent></Card>;
}

function Source({ endpoint }) {
  return <p className="mb-3 rounded-md bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">Source: {endpoint}</p>;
}

function Info({ label, value }) {
  return <div><p className="text-xs font-semibold uppercase text-slate-500">{label}</p><div className="mt-1">{typeof value === "object" ? value : displayValue(value)}</div></div>;
}
