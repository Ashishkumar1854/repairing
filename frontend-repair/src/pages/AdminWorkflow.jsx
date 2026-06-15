import { Link } from "react-router-dom";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  Wrench,
  UserCheck,
  DollarSign,
  PackageOpen,
  ClipboardCheck,
  FileSpreadsheet,
  Handshake,
  Truck,
  ArrowRight,
  HelpCircle
} from "lucide-react";

export function AdminWorkflow() {
  const steps = [
    {
      num: 1,
      title: "Repair Intake",
      icon: Wrench,
      iconBg: "bg-blue-50 text-blue-600",
      description: "When a customer visits the shop, register their contact info and record device attributes (IMEI, Serial Number, condition, issues).",
      actionText: "Intake New Repair",
      actionPath: "/repair/new",
      tip: "Gather exact symptoms from the customer to speed up technical diagnosis."
    },
    {
      num: 2,
      title: "Technician Assignment",
      icon: UserCheck,
      iconBg: "bg-indigo-50 text-indigo-600",
      description: "Assign the newly created ticket to an active technician in your branch based on their workload chart.",
      actionText: "Assign Ticket",
      actionPath: "/assignments",
      tip: "Monitor the 'Technician Workload' chart on your dashboard to distribute work evenly."
    },
    {
      num: 3,
      title: "Diagnostics & Estimates",
      icon: DollarSign,
      iconBg: "bg-yellow-50 text-yellow-600",
      description: "Once the tech completes diagnosis, review their notes. Add labor/parts pricing and request customer approval. Mark as approved to resume repair.",
      actionText: "Review Estimates",
      actionPath: "/repair/estimates",
      tip: "Technicians cannot proceed with the repair until the estimate is officially marked 'Approved'."
    },
    {
      num: 4,
      title: "Repair Execution",
      icon: PackageOpen,
      iconBg: "bg-emerald-50 text-emerald-600",
      description: "The technician consumes inventory items, logs repair steps, and changes ticket status to IN_REPAIR. Once finished, they submit it to review.",
      actionText: "Check Inventory Stock",
      actionPath: "/inventory",
      tip: "The system automatically recalculates inventory quantity and tracks actual parts cost in real time."
    },
    {
      num: 5,
      title: "Quality Review (QA Queue)",
      icon: ClipboardCheck,
      iconBg: "bg-orange-50 text-orange-600",
      description: "Review completed tickets in the 'Completed Repairs Review Queue' on your dashboard. Reject for rework or approve for customer delivery.",
      actionText: "Open QA Queue",
      actionPath: "/dashboard",
      tip: "Double-check the labor vs parts cost breakdown before changing status to 'Ready for Delivery'."
    },
    {
      num: 6,
      title: "Generate Invoice & Payment",
      icon: FileSpreadsheet,
      iconBg: "bg-purple-50 text-purple-600",
      description: "Select the ready ticket, add optional GST/tax rate, apply discounts, generate the invoice, and collect full or partial payment (Cash, Card, UPI).",
      actionText: "Open Billing console",
      actionPath: "/billing",
      tip: "You can track outstanding customer balances via the Customer Ledger in the billing options."
    },
    {
      num: 7,
      title: "Custody Handover & Delivery",
      icon: Handshake,
      iconBg: "bg-green-50 text-green-600",
      description: "Deliver the device to the customer, sign off on the custody log, and mark the ticket status as 'Closed' to complete the lifecycle.",
      actionText: "Deliver Device",
      actionPath: "/handover",
      tip: "Handover guarantees that the device leaves shop custody and logs the final staff handler."
    },
    {
      num: 8,
      title: "Vendor Outsourcing (Optional)",
      icon: Truck,
      iconBg: "bg-rose-50 text-rose-600",
      description: "If a repair requires specialized outside tools, dispatch the item to a vendor, manage vendor job status, and log incoming costs.",
      actionText: "Outsource Repairs",
      actionPath: "/vendors",
      tip: "Outsourcing automatically tracks the external vendor's repair cost in your final dashboard profitability."
    }
  ];

  return (
    <div className="mx-auto max-w-4xl min-w-0">
      <PageHeader
        title="Admin Operational Workflow"
        description="Follow this step-by-step interactive map to run daily branch operations without hassle."
        actions={
          <Link to="/dashboard">
            <Button variant="secondary">Back to Dashboard</Button>
          </Link>
        }
      />

      <div className="grid gap-6">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <Card key={step.num} className="relative overflow-hidden transition-all hover:shadow-md border-slate-200">
              <div className="absolute top-0 left-0 bottom-0 w-1 bg-[var(--primary)]" />
              <CardContent className="p-5 flex flex-col md:flex-row gap-5 items-start justify-between">
                <div className="flex gap-4 min-w-0 items-start">
                  <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${step.iconBg} shadow-xs font-semibold`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-400 font-mono bg-slate-100 px-2 py-0.5 rounded">
                        STEP {step.num}
                      </span>
                      <h3 className="text-base font-bold text-slate-900">{step.title}</h3>
                    </div>
                    <p className="mt-2 text-sm text-slate-600 leading-relaxed">{step.description}</p>
                    
                    <div className="mt-3 flex items-start gap-1.5 rounded-md bg-slate-50 p-2.5 text-xs text-slate-500 border border-slate-100">
                      <HelpCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-slate-400" />
                      <span><strong>Operational Tip:</strong> {step.tip}</span>
                    </div>
                  </div>
                </div>

                <div className="w-full md:w-auto shrink-0 mt-3 md:mt-0 flex flex-col items-stretch">
                  <Link to={step.actionPath}>
                    <Button className="w-full md:w-auto justify-between gap-2 text-xs h-9">
                      {step.actionText}
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
