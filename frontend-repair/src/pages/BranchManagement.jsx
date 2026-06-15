import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ConfirmAction } from "@/components/ui/ConfirmAction";
import { Field, Input, Select, Textarea } from "@/components/ui/Form";
import { PageHeader } from "@/components/ui/PageHeader";
import { QueryState } from "@/components/ui/QueryState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Table, Td, Th } from "@/components/ui/Table";
import { useToast } from "@/contexts/ToastContext";
import { branchesApi, staffApi } from "@/services/modules";

export function BranchManagement() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [editBranchId, setEditBranchId] = useState("");
  const [adminId, setAdminId] = useState("");
  const [adminBranchId, setAdminBranchId] = useState("");

  const branchesQuery = useQuery({
    queryKey: ["branches"],
    queryFn: branchesApi.list,
  });

  const staffQuery = useQuery({
    queryKey: ["staff"],
    queryFn: staffApi.list,
  });

  const branches = useMemo(() => branchesQuery.data?.data?.branches || [], [branchesQuery.data]);
  const staff = useMemo(() => staffQuery.data?.data?.staff || [], [staffQuery.data]);
  const admins = useMemo(() => staff.filter((member) => member.role === "ADMIN"), [staff]);
  const editBranch = branches.find((branch) => branch.id === editBranchId);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["branches"] });
    queryClient.invalidateQueries({ queryKey: ["staff"] });
  };

  const createMutation = useMutation({
    mutationFn: branchesApi.create,
    onSuccess: () => {
      refresh();
      toast.success("Branch created.");
    },
    onError: (error) => toast.error(error?.response?.data?.message || "Unable to create branch."),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => branchesApi.update(id, payload),
    onSuccess: () => {
      refresh();
      toast.success("Branch updated.");
    },
    onError: (error) => toast.error(error?.response?.data?.message || "Unable to update branch."),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, action }) => (action === "activate" ? branchesApi.activate(id) : branchesApi.deactivate(id)),
    onSuccess: () => {
      refresh();
      toast.success("Branch status updated.");
    },
    onError: (error) => toast.error(error?.response?.data?.message || "Unable to update branch status."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => branchesApi.delete(id),
    onSuccess: () => {
      refresh();
      toast.success("Branch deleted successfully.");
    },
    onError: (error) => toast.error(error?.response?.data?.message || "Unable to delete branch."),
  });

  const assignMutation = useMutation({
    mutationFn: ({ id, branchId }) => staffApi.assignBranch(id, { branchId }),
    onSuccess: () => {
      refresh();
      toast.success("Admin branch assignment updated.");
    },
    onError: (error) => toast.error(error?.response?.data?.message || "Unable to assign admin to branch."),
  });

  const buildBranchPayload = (form) => ({
    name: String(form.get("name") || "").trim(),
    code: String(form.get("code") || "").trim().toUpperCase() || undefined,
    phone: String(form.get("phone") || "").trim() || undefined,
    email: String(form.get("email") || "").trim() || undefined,
    address: String(form.get("address") || "").trim() || undefined,
    isMainBranch: form.get("isMainBranch") === "on",
  });

  return (
    <div>
      <PageHeader
        title="Branches"
        description="Owner-managed shop branches. ERP data is scoped by branch for Admin and Technician users."
      />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card>
          <CardHeader>
            <CardTitle>Branch List</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <QueryState
              isLoading={branchesQuery.isLoading}
              error={branchesQuery.error}
              isEmpty={branches.length === 0}
              emptyTitle="No branches"
              emptyDescription="Create the first active branch for this business."
              onRetry={branchesQuery.refetch}
            >
              <Table>
                <thead>
                  <tr>
                    <Th>Branch</Th>
                    <Th>Code</Th>
                    <Th>Contact</Th>
                    <Th>Status</Th>
                    <Th>Action</Th>
                  </tr>
                </thead>
                <tbody>
                  {branches.map((branch) => (
                    <tr key={branch.id}>
                      <Td>
                        <p className="font-semibold">{branch.name}</p>
                        <p className="text-xs text-[var(--muted)]">{branch.isMainBranch ? "Main branch" : branch.address || "Address not set"}</p>
                      </Td>
                      <Td>{branch.code}</Td>
                      <Td>
                        <p>{branch.phone || "Phone not set"}</p>
                        <p className="text-xs text-[var(--muted)]">{branch.email || "Email not set"}</p>
                      </Td>
                      <Td><StatusBadge status={branch.status} /></Td>
                      <Td>
                        <div className="flex flex-wrap gap-2">
                          <Link to={`/branches/${branch.id}`}>
                            <Button size="sm" variant="primary">View</Button>
                          </Link>
                          <Button size="sm" variant="secondary" onClick={() => setEditBranchId(branch.id)}>Edit</Button>
                          <ConfirmAction
                            title={branch.status === "ACTIVE" ? "Deactivate branch?" : "Activate branch?"}
                            description="Branch status controls whether new staff and operational work can use this branch."
                            confirmLabel={branch.status === "ACTIVE" ? "Deactivate" : "Activate"}
                            variant={branch.status === "ACTIVE" ? "danger" : "primary"}
                            disabled={branch.isMainBranch || statusMutation.isPending}
                            onConfirm={() =>
                              statusMutation.mutate({
                                id: branch.id,
                                action: branch.status === "ACTIVE" ? "deactivate" : "activate",
                              })
                            }
                          >
                            {branch.status === "ACTIVE" ? "Deactivate" : "Activate"}
                          </ConfirmAction>
                          <ConfirmAction
                            title="Delete branch?"
                            description="Are you sure you want to delete this branch? This action cannot be undone."
                            confirmLabel="Delete"
                            variant="danger"
                            disabled={branch.isMainBranch || deleteMutation.isPending}
                            onConfirm={() => deleteMutation.mutate(branch.id)}
                          >
                            Delete
                          </ConfirmAction>
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </QueryState>
          </CardContent>
        </Card>
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>{editBranch ? "Edit Branch" : "Create Branch"}</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                key={editBranch?.id || "create"}
                className="space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  const payload = buildBranchPayload(new FormData(event.currentTarget));
                  if (editBranch) {
                    updateMutation.mutate({ id: editBranch.id, payload });
                  } else {
                    createMutation.mutate(payload);
                    event.currentTarget.reset();
                  }
                }}
              >
                <Field label="Branch Name"><Input name="name" defaultValue={editBranch?.name || ""} required /></Field>
                <Field label="Branch Code (Optional)"><Input name="code" defaultValue={editBranch?.code || ""} /></Field>
                <Field label="Phone"><Input name="phone" defaultValue={editBranch?.phone || ""} /></Field>
                <Field label="Email"><Input name="email" type="email" defaultValue={editBranch?.email || ""} /></Field>
                <Field label="Address"><Textarea name="address" defaultValue={editBranch?.address || ""} /></Field>
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input type="checkbox" name="isMainBranch" defaultChecked={Boolean(editBranch?.isMainBranch)} />
                  Main branch
                </label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {editBranch ? (
                    <Button type="button" variant="secondary" onClick={() => setEditBranchId("")}>Cancel</Button>
                  ) : null}
                  <Button className="sm:col-span-1" disabled={createMutation.isPending || updateMutation.isPending}>
                    {editBranch ? "Save Branch" : "Create Branch"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Assign Admin To Branch</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  assignMutation.mutate({ id: adminId, branchId: adminBranchId });
                }}
              >
                <Field label="Admin">
                  <Select required value={adminId} onChange={(event) => setAdminId(event.target.value)}>
                    <option value="">Select admin</option>
                    {admins.map((admin) => (
                      <option key={admin.id} value={admin.id}>
                        {admin.fullName} · {admin.branch?.name || "No branch"}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Branch">
                  <Select required value={adminBranchId} onChange={(event) => setAdminBranchId(event.target.value)}>
                    <option value="">Select branch</option>
                    {branches
                      .filter((branch) => branch.status === "ACTIVE")
                      .map((branch) => (
                        <option key={branch.id} value={branch.id}>{branch.name}</option>
                      ))}
                  </Select>
                </Field>
                <Button className="w-full" disabled={!adminId || !adminBranchId || assignMutation.isPending}>
                  Assign Admin
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
