import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { QueryState } from "@/components/ui/QueryState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { superAdminApi } from "@/services/modules";
import { cn, formatDate } from "@/utils/cn";
import { useToast } from "@/contexts/ToastContext";

function ownerLabel(owner) {
  if (!owner) return "Not assigned";
  return owner.fullName ? `${owner.fullName} (${owner.email})` : owner.email;
}

function planLabel(subscription) {
  if (!subscription) return "No plan";
  return `${subscription.plan} / ${subscription.status}`;
}

export function SuperAdminBusinesses() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const businessesQuery = useQuery({
    queryKey: ["super-admin-businesses"],
    queryFn: () => superAdminApi.businesses(),
  });

  const businesses = businessesQuery.data?.data?.businesses || [];

  const statusMutation = useMutation({
    mutationFn: ({ id, action }) =>
      action === "suspend" ? superAdminApi.suspend(id) : superAdminApi.activate(id),
    onSuccess: (_, variables) => {
      toast.success(
        variables.action === "suspend" ? "Business suspended." : "Business activated."
      );
      queryClient.invalidateQueries({ queryKey: ["super-admin-businesses"] });
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || "Business status update failed.");
    },
  });

  return (
    <div>
      <PageHeader
        title="Businesses"
        description="SaaS tenant list for super admin operations."
      />

      <Card>
        <CardHeader>
          <CardTitle>Business Tenants</CardTitle>
        </CardHeader>
        <DataTable
          rows={businesses}
          isLoading={businessesQuery.isLoading}
          error={businessesQuery.error}
          onRetry={businessesQuery.refetch}
          searchable
          emptyTitle="No businesses found"
          columns={[
            {
              key: "name",
              header: "Business",
              render: (business) => (
                <div>
                  <p className="font-semibold">{business.name}</p>
                  <p className="text-xs text-[var(--muted)]">{business.slug}</p>
                </div>
              ),
            },
            {
              key: "owner",
              header: "Owner",
              render: (business) => ownerLabel(business.owner),
            },
            {
              key: "plan",
              header: "Plan",
              render: (business) => planLabel(business.subscription),
            },
            {
              key: "status",
              header: "Status",
              render: (business) => <StatusBadge status={business.status} />,
            },
            {
              key: "createdAt",
              header: "Created",
              render: (business) => formatDate(business.createdAt),
            },
            {
              key: "actions",
              header: "Action",
              render: (business) => {
                const isSuspended = business.status === "SUSPENDED";
                return (
                  <div className="flex flex-wrap gap-2">
                    <ActionLink to={`/super-admin/businesses/${business.id}`}>
                      View
                    </ActionLink>
                    <Button
                      size="sm"
                      variant={isSuspended ? "primary" : "secondary"}
                      disabled={statusMutation.isPending}
                      onClick={() =>
                        statusMutation.mutate({
                          id: business.id,
                          action: isSuspended ? "activate" : "suspend",
                        })
                      }
                    >
                      {isSuspended ? "Activate" : "Suspend"}
                    </Button>
                  </div>
                );
              },
            },
          ]}
        />
      </Card>
    </div>
  );
}

function ActionLink({ to, children }) {
  return (
    <Link
      to={to}
      className={cn(
        "focus-ring inline-flex h-9 items-center justify-center rounded-md border border-[var(--border)] bg-white px-3 text-sm font-medium text-[var(--foreground)] transition hover:bg-slate-50"
      )}
    >
      {children}
    </Link>
  );
}

export function SuperAdminBusinessDetails({ id }) {
  const businessQuery = useQuery({
    queryKey: ["super-admin-business", id],
    queryFn: () => superAdminApi.business(id),
    enabled: Boolean(id),
  });
  const business = businessQuery.data?.data?.business;

  return (
    <div>
      <PageHeader title="Business Details" description="Tenant profile and subscription snapshot." />
      <QueryState
        isLoading={businessQuery.isLoading}
        error={businessQuery.error}
        isEmpty={!business}
        onRetry={businessQuery.refetch}
      >
        <Card>
          <CardHeader>
            <CardTitle>{business?.name}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Info label="Slug" value={business?.slug} />
            <Info label="Status" value={<StatusBadge status={business?.status} />} />
            <Info label="Owner" value={ownerLabel(business?.owner)} />
            <Info label="Plan" value={planLabel(business?.subscription)} />
            <Info label="Phone" value={business?.phone || "Not set"} />
            <Info label="Email" value={business?.email || "Not set"} />
            <Info label="Website" value={business?.website || "Not set"} />
            <Info label="GST Number" value={business?.gstNumber || "Not set"} />
            <Info
              label="Address"
              value={[business?.address, business?.city, business?.state, business?.country]
                .filter(Boolean)
                .join(", ") || "Not set"}
            />
          </CardContent>
        </Card>
      </QueryState>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-md border border-[var(--border)] p-4">
      <p className="text-xs font-semibold uppercase text-[var(--muted)]">{label}</p>
      <div className="mt-2 text-sm font-medium">{value}</div>
    </div>
  );
}
