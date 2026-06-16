import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { CalendarClock, CreditCard, IndianRupee, Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Field, Select } from "@/components/ui/Form";
import { PageHeader } from "@/components/ui/PageHeader";
import { QueryState } from "@/components/ui/QueryState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { subscriptionApi } from "@/services/modules";
import { formatCurrency } from "@/utils/cn";

function formatDate(value) {
  if (!value) return "No expiry set";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function Subscription() {
  const toast = useToast();
  const { updateSubscription } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const subscriptionQuery = useQuery({
    queryKey: ["subscription-current"],
    queryFn: subscriptionApi.current,
  });
  const subscription = subscriptionQuery.data?.data?.subscription;
  const displaySubscription =
    subscription ||
    {
      plan: "STARTER",
      status: "PENDING",
      expiresAt: null,
      daysRemaining: null,
      metadata: null,
    };
  const planOptions = subscriptionQuery.data?.data?.planOptions || [];
  const durationOptions = subscriptionQuery.data?.data?.durationOptions || [30, 90, 180, 365];
  const [plan, setPlan] = useState("STARTER");
  const [durationDays, setDurationDays] = useState(30);

  const selectedPlan = useMemo(
    () => planOptions.find((option) => option.plan === plan) || planOptions[0],
    [plan, planOptions]
  );
  const price = selectedPlan ? selectedPlan.monthlyPrice * Math.max(1, Math.ceil(durationDays / 30)) : 0;
  const canStartStarterTrial =
    selectedPlan?.plan === "STARTER" &&
    selectedPlan?.hasTrial &&
    displaySubscription.status !== "TRIALING" &&
    !displaySubscription.metadata?.starterTrialStartedAt;

  useEffect(() => {
    if (subscription) updateSubscription(subscription);
  }, [subscription, updateSubscription]);

  const paymentMutation = useMutation({
    mutationFn: subscriptionApi.requestPayment,
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["subscription-current"] });
      toast.success("Payment request prepared.");
      if (response.data?.whatsappUrl) {
        window.open(response.data.whatsappUrl, "_blank", "noopener,noreferrer");
      }
      navigate("/dashboard", { replace: true });
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || "Payment request failed.");
    },
  });

  const handlePay = () => {
    paymentMutation.mutate({ plan, durationDays });
  };

  const trialMutation = useMutation({
    mutationFn: subscriptionApi.startTrial,
    onSuccess: (response) => {
      updateSubscription(response.data.subscription);
      queryClient.invalidateQueries({ queryKey: ["subscription-current"] });
      toast.success("Starter trial started.");
      navigate("/dashboard", { replace: true });
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || "Unable to start trial.");
    },
  });

  return (
    <div>
      <PageHeader
        title="Subscription"
        description="Plan status, renewal request, and remaining service days."
      />
      <QueryState
        isLoading={subscriptionQuery.isLoading}
        error={subscriptionQuery.error}
        isEmpty={!subscription}
        emptyTitle="Subscription unavailable"
        onRetry={subscriptionQuery.refetch}
      >
        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Current Plan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-5">
                <Metric label="Plan" value={displaySubscription.plan} />
                <Metric label="Status" value={<StatusBadge status={displaySubscription.status} />} />
                <Metric label="Expires" value={formatDate(displaySubscription.expiresAt)} />
                <Metric
                  label="Days Left"
                  value={
                    displaySubscription.daysRemaining === null
                      ? "No expiry"
                      : `${displaySubscription.daysRemaining} days`
                  }
                />
                <Metric
                  label="Free Devices"
                  value={
                    displaySubscription.trialDeviceLimit
                      ? `${displaySubscription.trialDevicesUsed || 0}/${displaySubscription.trialDeviceLimit}`
                      : "Paid"
                  }
                />
              </div>
              {displaySubscription.metadata?.paymentRequest ? (
                <div className="mt-4 rounded-md border border-[var(--border)] bg-slate-50 p-4 text-sm">
                  <p className="font-semibold">Latest payment request</p>
                  <p className="mt-1 text-[var(--muted)]">
                    {displaySubscription.metadata.paymentRequest.serviceName} ·{" "}
                    {displaySubscription.metadata.paymentRequest.durationDays} days ·{" "}
                    {formatCurrency(displaySubscription.metadata.paymentRequest.price)}
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4" />
                Upgrade
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Service plan">
                <Select value={plan} onChange={(event) => setPlan(event.target.value)}>
                  {planOptions.map((option) => (
                    <option key={option.plan} value={option.plan}>
                      {option.monthlyPrice === null
                        ? `${option.name} - Custom`
                        : `${option.name} - ${formatCurrency(option.monthlyPrice)}/month`}
                    </option>
                  ))}
                </Select>
              </Field>
              {selectedPlan?.monthlyPrice !== null ? (
                <Field label="Duration">
                  <Select
                    value={durationDays}
                    onChange={(event) => setDurationDays(Number(event.target.value))}
                  >
                    {durationOptions.map((days) => (
                      <option key={days} value={days}>
                        {days} days
                      </option>
                    ))}
                  </Select>
                </Field>
              ) : null}
              <div className="rounded-md border border-[var(--border)] p-4">
                <p className="flex items-center gap-2 text-sm text-[var(--muted)]">
                  <IndianRupee className="h-4 w-4" />
                  Payable amount
                </p>
                <p className="mt-2 text-2xl font-bold">
                  {selectedPlan?.monthlyPrice === null ? "Custom quote" : formatCurrency(price)}
                </p>
                <p className="mt-1 text-sm text-[var(--muted)]">{selectedPlan?.serviceName || plan}</p>
                {selectedPlan?.plan === "STARTER" ? (
                  <p className="mt-2 text-sm text-[var(--muted)]">
                    Includes 2 branches and first 50 repair devices free.
                  </p>
                ) : null}
              </div>
              {canStartStarterTrial ? (
                <Button
                  className="w-full"
                  variant="secondary"
                  disabled={trialMutation.isPending}
                  onClick={() => trialMutation.mutate()}
                >
                  {trialMutation.isPending ? "Starting..." : "Start Starter Trial"}
                </Button>
              ) : null}
              <Button className="w-full" disabled={paymentMutation.isPending || !selectedPlan} onClick={handlePay}>
                <Send className="h-4 w-4" />
                {paymentMutation.isPending ? "Preparing..." : "Payment Now"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </QueryState>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-md border border-[var(--border)] p-4">
      <p className="text-sm text-[var(--muted)]">{label}</p>
      <div className="mt-2 text-xl font-bold">{value}</div>
    </div>
  );
}
