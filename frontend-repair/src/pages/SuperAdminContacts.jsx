import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { superAdminApi } from "@/services/modules";
import { formatDate } from "@/utils/cn";

export function SuperAdminContacts() {
  const contactsQuery = useQuery({
    queryKey: ["super-admin-contacts"],
    queryFn: () => superAdminApi.contacts(),
  });

  const inquiries = contactsQuery.data?.data?.contacts || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contact Inquiries"
        description="View onboarding callback requests and inquiries submitted by repair shop owners."
      />

      <Card className="border-slate-200 shadow-sm bg-white rounded-xl">
        <CardHeader className="border-b border-slate-100">
          <CardTitle>Inquiries & Leads</CardTitle>
        </CardHeader>
        <DataTable
          rows={inquiries}
          isLoading={contactsQuery.isLoading}
          error={contactsQuery.error}
          onRetry={contactsQuery.refetch}
          searchable
          emptyTitle="No inquiries found"
          columns={[
            {
              key: "name",
              header: "Owner / Manager",
              render: (inquiry) => (
                <div>
                  <p className="font-semibold text-slate-800">{inquiry.name}</p>
                </div>
              ),
            },
            {
              key: "phone",
              header: "Mobile Number",
              render: (inquiry) => (
                <a
                  href={`tel:${inquiry.phone}`}
                  className="font-mono text-sm text-blue-600 hover:underline hover:text-blue-700"
                >
                  {inquiry.phone}
                </a>
              ),
            },
            {
              key: "shopName",
              header: "Shop Name",
              render: (inquiry) => (
                <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                  {inquiry.shopName}
                </span>
              ),
            },
            {
              key: "message",
              header: "Special Needs / Message Details",
              render: (inquiry) => (
                <p className="text-xs text-slate-500 max-w-md break-words whitespace-normal leading-relaxed">
                  {inquiry.message}
                </p>
              ),
            },
            {
              key: "createdAt",
              header: "Received Date",
              render: (inquiry) => (
                <span className="text-xs text-slate-400">
                  {formatDate(inquiry.createdAt)}
                </span>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
