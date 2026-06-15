import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Field, Input, Textarea } from "@/components/ui/Form";
import { PageHeader } from "@/components/ui/PageHeader";
import { QueryState } from "@/components/ui/QueryState";
import { useToast } from "@/contexts/ToastContext";
import { businessProfileApi } from "@/services/modules";

const fields = [
  ["name", "Business Name"],
  ["slug", "Slug"],
  ["phone", "Phone"],
  ["email", "Email"],
  ["website", "Website"],
  ["country", "Country"],
  ["state", "State"],
  ["city", "City"],
  ["address", "Address"],
  ["gstNumber", "GST Number"],
  ["logo", "Logo URL"],
  ["banner", "Banner URL"],
];

export function BusinessProfile() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const profileQuery = useQuery({
    queryKey: ["business-profile"],
    queryFn: businessProfileApi.get,
  });

  const updateMutation = useMutation({
    mutationFn: businessProfileApi.update,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-profile"] });
      toast.success("Business profile updated.");
    },
  });

  useEffect(() => {
    if (updateMutation.isError) {
      toast.error(updateMutation.error?.response?.data?.message || "Unable to update business profile.");
    }
  }, [toast, updateMutation.error, updateMutation.isError]);

  const business = profileQuery.data?.data?.business;

  return (
    <div>
      <PageHeader
        title="Business Profile"
        description="Owner-managed shop identity, branding, contact, address, and tax details."
      />
      <QueryState
        isLoading={profileQuery.isLoading}
        error={profileQuery.error}
        isEmpty={!business}
        emptyTitle="Business profile unavailable"
        onRetry={profileQuery.refetch}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Shop Source of Truth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-4 lg:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                const payload = Object.fromEntries(
                  [...form.entries()].map(([key, value]) => [key, String(value).trim()])
                );
                updateMutation.mutate(payload);
              }}
            >
              {fields.map(([name, label]) => (
                <Field key={name} label={label}>
                  <Input name={name} defaultValue={business?.[name] || ""} />
                </Field>
              ))}
              <Field className="lg:col-span-2" label="Description">
                <Textarea name="description" defaultValue={business?.description || ""} />
              </Field>
              <div className="lg:col-span-2">
                <Button disabled={updateMutation.isPending}>
                  <Save className="h-4 w-4" />
                  Save Profile
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </QueryState>
    </div>
  );
}
