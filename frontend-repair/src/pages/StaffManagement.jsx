import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ConfirmAction } from "@/components/ui/ConfirmAction";
import { KeyRound, Trash2, UserCheck, UserX } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/Form";
import { PageHeader } from "@/components/ui/PageHeader";
import { QueryState } from "@/components/ui/QueryState";
import { Table, Td, Th } from "@/components/ui/Table";
import { useToast } from "@/contexts/ToastContext";
import { useAuth } from "@/contexts/AuthContext";
import { branchesApi, staffApi } from "@/services/modules";

export function StaffManagement() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { user } = useAuth();
  const [selectedStaffId, setSelectedStaffId] = useState("");

  const isOwner = user?.role === "OWNER";

  const staffQuery = useQuery({
    queryKey: ["staff"],
    queryFn: staffApi.list,
  });

  const branchesQuery = useQuery({
    queryKey: ["branches"],
    queryFn: branchesApi.list,
  });

  const refreshStaff = () => queryClient.invalidateQueries({ queryKey: ["staff"] });

  const createMutation = useMutation({
    mutationFn: staffApi.createStaff,
    onSuccess: () => {
      refreshStaff();
      toast.success(isOwner ? "Branch admin created successfully." : "Technician created successfully.");
    },
    onError: (error) => toast.error(error?.response?.data?.message || (isOwner ? "Unable to create branch admin." : "Unable to create technician.")),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, action }) => (action === "enable" ? staffApi.enable(id) : staffApi.disable(id)),
    onSuccess: () => {
      refreshStaff();
      toast.success(isOwner ? "Branch admin status updated." : "Technician status updated.");
    },
    onError: (error) => toast.error(error?.response?.data?.message || (isOwner ? "Unable to update branch admin." : "Unable to update technician.")),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => staffApi.delete(id),
    onSuccess: () => {
      refreshStaff();
      toast.success(isOwner ? "Branch admin deleted successfully." : "Technician deleted successfully.");
    },
    onError: (error) => toast.error(error?.response?.data?.message || (isOwner ? "Unable to delete branch admin." : "Unable to delete technician.")),
  });

  const passwordMutation = useMutation({
    mutationFn: ({ id, password }) => staffApi.resetPassword(id, { password }),
    onSuccess: () => toast.success(isOwner ? "Branch admin password reset successfully." : "Technician password reset successfully."),
    onError: (error) => toast.error(error?.response?.data?.message || "Unable to reset password."),
  });

  const managedStaff = useMemo(() => staffQuery.data?.data?.staff || [], [staffQuery.data]);
  const branches = useMemo(() => branchesQuery.data?.data?.branches || [], [branchesQuery.data]);
  const activeBranches = useMemo(() => branches.filter((branch) => branch.status === "ACTIVE"), [branches]);

  const adminBranch = useMemo(() => {
    if (isOwner) return null;
    return branches.find((b) => b.id === user?.branchId);
  }, [branches, isOwner, user?.branchId]);

  return (
    <div>
      <PageHeader
        title={isOwner ? "Branch Admins" : "Technicians"}
        description={
          isOwner
            ? "Manage branch administrators. Assign branch admins, disable branch admins, and reset branch admin passwords."
            : "Manage branch technicians. Create technicians, disable technicians, and reset technician passwords."
        }
      />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card>
          <CardHeader>
            <CardTitle>{isOwner ? "Branch Admins" : "Branch Technicians"}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <QueryState
              isLoading={staffQuery.isLoading}
              error={staffQuery.error}
              isEmpty={managedStaff.length === 0}
              emptyTitle={isOwner ? "No branch admins yet" : "No branch technicians yet"}
              emptyDescription={
                isOwner
                  ? "Create a Branch Admin from the form on this screen to configure branch operators."
                  : "Create a branch technician to assign repair ticket execution work."
              }
              onRetry={staffQuery.refetch}
            >
              <Table>
                <thead>
                  <tr>
                    <Th>Name</Th>
                    <Th>Email</Th>
                    <Th>Role</Th>
                    {isOwner && <Th>Branch</Th>}
                    <Th>Phone</Th>
                    <Th>Status</Th>
                    <Th>Action</Th>
                  </tr>
                </thead>
                <tbody>
                  {managedStaff.map((staff) => (
                    <tr key={staff.id}>
                      <Td className="font-semibold">{staff.fullName}</Td>
                      <Td>{staff.email}</Td>
                      <Td>{staff.role}</Td>
                      {isOwner && <Td>{staff.branch?.name || "Not assigned"}</Td>}
                      <Td>{staff.phone || "Not set"}</Td>
                      <Td>{staff.isActive ? "Active" : "Disabled"}</Td>
                      <Td>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant={staff.isActive ? "danger" : "secondary"}
                            disabled={statusMutation.isPending}
                            onClick={() =>
                              statusMutation.mutate({
                                id: staff.id,
                                action: staff.isActive ? "disable" : "enable",
                              })
                            }
                          >
                            {staff.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                            {staff.isActive ? "Disable" : "Enable"}
                          </Button>
                          <ConfirmAction
                            title={isOwner ? "Delete branch admin?" : "Delete technician?"}
                            description={isOwner ? "Are you sure you want to delete this branch admin? This action cannot be undone." : "Are you sure you want to delete this technician? This action cannot be undone."}
                            confirmLabel="Delete"
                            variant="danger"
                            disabled={deleteMutation.isPending}
                            onConfirm={() => deleteMutation.mutate(staff.id)}
                          >
                            <Trash2 className="h-4 w-4" />
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
              <CardTitle>{isOwner ? "Create Branch Admin" : "Create Technician"}</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  createMutation.mutate({
                    name: String(form.get("fullName") || "").trim(),
                    email: String(form.get("email") || "").trim(),
                    phone: String(form.get("phone") || "").trim() || undefined,
                    password: String(form.get("password") || ""),
                    branchId: String(form.get("branchId") || "").trim(),
                  });
                  event.currentTarget.reset();
                }}
              >
                <Field label="Name"><Input name="fullName" required /></Field>
                <Field label="Email"><Input name="email" type="email" required /></Field>
                <Field label="Phone"><Input name="phone" /></Field>
                <Field label="Password"><Input name="password" type="password" minLength={8} required /></Field>
                
                {!isOwner ? (
                  <Field label="Branch">
                    <Input readOnly disabled value={adminBranch?.name || user?.branch?.name || "My Branch"} />
                    <input type="hidden" name="branchId" value={user?.branchId || ""} />
                  </Field>
                ) : (
                  <Field label="Branch">
                    <Select name="branchId" required disabled={branchesQuery.isLoading || activeBranches.length === 0}>
                      <option value="">Select branch</option>
                      {activeBranches.map((branch) => (
                        <option key={branch.id} value={branch.id}>{branch.name}</option>
                      ))}
                    </Select>
                  </Field>
                )}
                
                <Button className="w-full" disabled={createMutation.isPending}>
                  {isOwner ? "Create Branch Admin" : "Create Technician"}
                </Button>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{isOwner ? "Reset Admin Password" : "Reset Technician Password"}</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  passwordMutation.mutate({
                    id: selectedStaffId,
                    password: String(form.get("password") || ""),
                  });
                  event.currentTarget.reset();
                  setSelectedStaffId("");
                }}
              >
                <Field label={isOwner ? "Branch Admin" : "Technician"}>
                  <Select
                    required
                    value={selectedStaffId}
                    onChange={(event) => setSelectedStaffId(event.target.value)}
                  >
                    <option value="">{isOwner ? "Select branch admin" : "Select technician"}</option>
                    {managedStaff.map((staff) => (
                      <option key={staff.id} value={staff.id}>
                        {staff.fullName} · {staff.email}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="New Password"><Input name="password" type="password" minLength={8} required /></Field>
                <Button className="w-full" disabled={!selectedStaffId || passwordMutation.isPending}>
                  <KeyRound className="h-4 w-4" />
                  Reset Password
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
