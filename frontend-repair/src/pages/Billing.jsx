import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { Input, Select, Textarea } from "@/components/ui/Form";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Table, Td, Th } from "@/components/ui/Table";
import { billingApi, repairApi } from "@/services/modules";
import { formatCurrency, unwrapArray } from "@/utils/cn";
import { firstObject } from "@/utils/data";
import { useNotifyMutation, getErrorMessage } from "@/hooks/useNotifyMutation";
import { isBillingEligibleTicket, payableInvoices } from "@/utils/workflow";
import { ticketLabel } from "@/utils/ticketLabel";

export function Billing() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [selectedTicketId, setSelectedTicketId] = useState(searchParams.get("ticketId") || "");
  const [lastPaidTicketId, setLastPaidTicketId] = useState("");

  const [taxRate, setTaxRate] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [notes, setNotes] = useState("");

  const invoicesQuery = useQuery({ queryKey: ["billing", "invoices"], queryFn: () => billingApi.invoices() });
  const ticketsQuery = useQuery({ queryKey: ["repair"], queryFn: () => repairApi.list({ limit: 100 }) });
  const invoices = unwrapArray(invoicesQuery.data, ["invoices"]);
  const tickets = unwrapArray(ticketsQuery.data, ["tickets"]);

  const invoiceCandidates = tickets.filter((ticket) => isBillingEligibleTicket(ticket, invoices));
  const activeTicketId = selectedTicketId || invoiceCandidates[0]?.id || "";

  // Fetch candidate ticket details to get actual costs (labor, parts, vendor)
  const ticketDetailQuery = useQuery({
    queryKey: ["repair-ticket-billing-detail", activeTicketId],
    queryFn: () => repairApi.get(activeTicketId),
    enabled: Boolean(activeTicketId),
  });
  const ticket = ticketDetailQuery.data?.data?.ticket || ticketDetailQuery.data?.data || null;

  const waitingApprovalTickets = tickets.filter((ticket) => ticket.status === "WAITING_APPROVAL");
  const payable = payableInvoices(invoices);

  const invoiceMutation = useNotifyMutation({
    mutationFn: ({ ticketId, payload }) => repairApi.invoice(ticketId, payload),
    successMessage: "Invoice generated successfully.",
    onSuccess: async () => {
      setTaxRate(0);
      setDiscountAmount(0);
      setNotes("");
      await queryClient.invalidateQueries({ queryKey: ["billing", "invoices"] });
      await queryClient.invalidateQueries({ queryKey: ["repair"] });
    },
  });

  const paymentMutation = useNotifyMutation({
    mutationFn: ({ invoiceId, payload }) => billingApi.collectPayment(invoiceId, payload),
    successMessage: "Payment collected successfully.",
    onSuccess: async (_data, variables) => {
      const invoice = invoices.find((item) => item.id === variables.invoiceId);
      setLastPaidTicketId(invoice?.repairTicketId || invoice?.ticket?.id || "");
      await queryClient.invalidateQueries({ queryKey: ["billing", "invoices"] });
    },
  });

  const generatedInvoice = firstObject(invoiceMutation.data, ["invoice"]);

  // Math calculations
  const laborCost = Number(ticket?.laborCost || 0);
  const partsCost = Number(ticket?.partsCost || 0);
  const vendorCost = Number(ticket?.vendorCost || 0);
  const subtotal = laborCost + partsCost + vendorCost;
  const taxableAmount = Math.max(0, subtotal - Number(discountAmount || 0));
  const taxAmount = taxableAmount * (Number(taxRate || 0) / 100);
  const finalAmount = taxableAmount + taxAmount;

  const handleSubmitInvoice = (event) => {
    event.preventDefault();
    if (!activeTicketId) return;

    const manualItems = [];
    if (laborCost > 0) {
      manualItems.push({
        name: "Labor Cost",
        unitPrice: laborCost,
        quantity: 1,
        sourceType: "LABOR",
        itemType: "LABOR",
      });
    }
    if (partsCost > 0) {
      manualItems.push({
        name: "Parts Cost",
        unitPrice: partsCost,
        quantity: 1,
        sourceType: "MANUAL",
        itemType: "PART",
      });
    }
    if (vendorCost > 0) {
      manualItems.push({
        name: "Vendor Cost",
        unitPrice: vendorCost,
        quantity: 1,
        sourceType: "MANUAL",
        itemType: "PART",
      });
    }

    // Default item if no cost logged
    if (manualItems.length === 0) {
      manualItems.push({
        name: "Diagnostic & Repair Intake Charge",
        unitPrice: 0,
        quantity: 1,
        sourceType: "MANUAL",
        itemType: "PART",
      });
    }

    invoiceMutation.mutate({
      ticketId: activeTicketId,
      payload: {
        includeApprovedEstimate: false,
        includeActualUsage: false,
        manualItems,
        taxRate: Number(taxRate || 0),
        discountAmount: Number(discountAmount || 0),
        notes: notes || undefined,
      },
    });
  };

  return (
    <>
      <PageHeader title="Billing" description="Generate invoice, invoice list, collect payment, and customer ledger." />
      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,380px)]">
        <Card>
          <CardContent className="p-0">
            <DataTable
              rows={invoices}
              emptyTitle="No invoices found"
              columns={[
                {
                  key: "invoiceNumber",
                  header: "Invoice",
                  render: (invoice) => (
                    <Link className="font-semibold text-[var(--primary)]" to={`/billing/invoices/${invoice.id}`}>
                      {invoice.invoiceNumber}
                    </Link>
                  ),
                },
                {
                  key: "repair",
                  header: "Repair",
                  render: (invoice) => (invoice.ticket ? ticketLabel(invoice.ticket) : "Not set"),
                },
                {
                  key: "customer",
                  header: "Customer",
                  render: (invoice) => (invoice.customer?.fullName || "Not set"),
                },
                {
                  key: "totalAmount",
                  header: "Total",
                  render: (invoice) => formatCurrency(invoice.totalAmount),
                },
                {
                  key: "paidAmount",
                  header: "Paid",
                  render: (invoice) => formatCurrency(invoice.paidAmount),
                },
                {
                  key: "dueAmount",
                  header: "Due",
                  render: (invoice) => formatCurrency(invoice.dueAmount),
                },
                {
                  key: "status",
                  header: "Status",
                  render: (invoice) => <StatusBadge status={invoice.status} />,
                },
                {
                  key: "action",
                  header: "Action",
                  render: (invoice) =>
                    Number(invoice.dueAmount || 0) > 0 ? (
                      <Link to={`/billing/invoices/${invoice.id}`}>
                        <Button size="sm" type="button">
                          Pay
                        </Button>
                      </Link>
                    ) : (
                      <span className="text-sm text-[var(--muted)]">Paid</span>
                    ),
                },
              ]}
            />
          </CardContent>
        </Card>

        <div className="min-w-0 space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Generate Invoice</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleSubmitInvoice}>
                <Field label="Select Repair Ticket">
                  <Select
                    name="ticketId"
                    value={activeTicketId}
                    onChange={(event) => {
                      setSelectedTicketId(event.target.value);
                      setDiscountAmount(0);
                      setTaxRate(0);
                      setNotes("");
                    }}
                  >
                    <option value="" disabled>-- Select Ticket --</option>
                    {invoiceCandidates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {ticketLabel(t)} · {t.title}
                      </option>
                    ))}
                  </Select>
                </Field>

                {!invoiceCandidates.length ? (
                  <p className="text-sm text-[var(--muted)]">
                    No tickets are ready for invoice. First approve the estimate, or consume actual parts, then come back here.
                  </p>
                ) : null}

                {waitingApprovalTickets.length ? (
                  <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    <p className="font-semibold">Waiting approval before billing</p>
                    <p className="mt-1">{waitingApprovalTickets.slice(0, 3).map(ticketLabel).join(", ")}</p>
                    <Link className="mt-2 inline-block text-[var(--primary)]" to="/repair/estimates">
                      Go to Estimates
                    </Link>
                  </div>
                ) : null}

                {ticket && (
                  <div className="space-y-2.5 bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Labor Cost:</span>
                      <span className="font-bold text-slate-800">{formatCurrency(laborCost)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Parts Cost:</span>
                      <span className="font-bold text-slate-800">{formatCurrency(partsCost)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Vendor Cost:</span>
                      <span className="font-bold text-slate-800">{formatCurrency(vendorCost)}</span>
                    </div>
                    <hr className="border-slate-200 my-1" />
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal:</span>
                      <span>{formatCurrency(subtotal)}</span>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Tax Rate (%)">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      placeholder="0"
                      value={taxRate || ""}
                      onChange={(e) => setTaxRate(e.target.value)}
                    />
                  </Field>
                  <Field label="Discount ($)">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0"
                      value={discountAmount || ""}
                      onChange={(e) => setDiscountAmount(e.target.value)}
                    />
                  </Field>
                </div>

                {ticket && (
                  <div className="flex justify-between items-center bg-indigo-50 text-indigo-900 px-3 py-2.5 rounded-md border border-indigo-100 text-xs">
                    <span className="font-semibold uppercase tracking-wider">Final Amount:</span>
                    <span className="text-base font-black font-mono">{formatCurrency(finalAmount)}</span>
                  </div>
                )}

                <Field label="Invoice Notes">
                  <Textarea
                    placeholder="Notes shown on the invoice..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </Field>

                <Button
                  className="w-full"
                  type="submit"
                  disabled={invoiceMutation.isPending || !activeTicketId}
                >
                  {invoiceMutation.isPending ? "Generating..." : "Generate Invoice"}
                </Button>
              </form>
              {generatedInvoice?.id ? <GeneratedInvoiceSummary invoice={generatedInvoice} /> : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Collect Payment</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  paymentMutation.mutate({
                    invoiceId: form.get("invoiceId"),
                    payload: {
                      amount: Number(form.get("amount") || 0),
                      method: form.get("method"),
                      transactionReference: form.get("transactionReference") || undefined,
                      notes: form.get("notes") || undefined,
                    },
                  });
                }}
              >
                <Select name="invoiceId">
                  {payable.map((invoice) => (
                    <option key={invoice.id} value={invoice.id}>
                      {invoice.invoiceNumber} · Due {formatCurrency(invoice.dueAmount)}
                    </option>
                  ))}
                </Select>
                {!payable.length ? <p className="text-sm text-[var(--muted)]">No unpaid invoices have a remaining due amount.</p> : null}
                <Input name="amount" type="number" min="0.01" step="0.01" placeholder="Amount" />
                <Select name="method">
                  <option>CASH</option>
                  <option>CARD</option>
                  <option>UPI</option>
                  <option>BANK_TRANSFER</option>
                  <option>WALLET</option>
                </Select>
                <Input name="transactionReference" placeholder="Transaction reference" />
                <Textarea name="notes" placeholder="Payment notes" />
                <Button className="w-full" disabled={paymentMutation.isPending || !payable.length}>
                  Collect Payment
                </Button>
              </form>
              {lastPaidTicketId ? (
                <Link className="mt-3 block" to={`/handover?ticketId=${lastPaidTicketId}`}>
                  <Button className="w-full" type="button" variant="secondary">
                    Go to Handover
                  </Button>
                </Link>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function GeneratedInvoiceSummary({ invoice }) {
  return (
    <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-emerald-900">Invoice ready</p>
          <p className="mt-1 text-emerald-800">{invoice.invoiceNumber} · {formatCurrency(invoice.totalAmount)}</p>
          <p className="mt-1 text-emerald-700">Due {formatCurrency(invoice.dueAmount)} for {invoice.customer?.fullName || invoice.ticket?.title || "selected repair"}.</p>
        </div>
        <StatusBadge status={invoice.status} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link to={`/billing/invoices/${invoice.id}`}>
          <Button type="button" size="sm">Open Invoice</Button>
        </Link>
        {Number(invoice.dueAmount || 0) > 0 ? (
          <Link to={`/billing/invoices/${invoice.id}`}>
            <Button type="button" size="sm" variant="secondary">Collect Payment</Button>
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export function InvoiceDetails({ id }) {
  const [error, setError] = useState("");
  const [paymentCollected, setPaymentCollected] = useState(false);
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["billing", "invoice", id], queryFn: () => billingApi.invoice(id), enabled: Boolean(id) });
  const invoice = firstObject(data, ["invoice"]);
  const payments = invoice.payments || invoice.repairPayments || [];
  const items = invoice.items || invoice.invoiceItems || [];
  const paymentMutation = useNotifyMutation({
    mutationFn: (payload) => billingApi.collectPayment(id, payload),
    successMessage: "Payment collected successfully.",
    onSuccess: () => {
      setError("");
      setPaymentCollected(true);
      queryClient.invalidateQueries({ queryKey: ["billing", "invoice", id] });
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  if (!invoice?.id) return <p className="text-sm text-[var(--muted)]">Loading invoice...</p>;

  return (
    <>
      <PageHeader title={invoice.invoiceNumber} description="Invoice details, invoice items, payment history, overpayment protection, and due summary." />
      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent><p className="text-sm text-[var(--muted)]">Total</p><p className="mt-2 text-2xl font-bold">{formatCurrency(invoice.totalAmount)}</p></CardContent></Card>
        <Card><CardContent><p className="text-sm text-[var(--muted)]">Paid</p><p className="mt-2 text-2xl font-bold">{formatCurrency(invoice.paidAmount)}</p></CardContent></Card>
        <Card><CardContent><p className="text-sm text-[var(--muted)]">Due Amount</p><p className="mt-2 text-2xl font-bold">{formatCurrency(invoice.dueAmount)}</p></CardContent></Card>
        <Card><CardContent><p className="text-sm text-[var(--muted)]">Status</p><div className="mt-2"><StatusBadge status={invoice.status} /></div></CardContent></Card>
      </div>
      <div className="mt-5 grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,360px)]">
        <div className="space-y-5">
          <Card><CardHeader><CardTitle>Invoice Items</CardTitle></CardHeader><CardContent className="p-0"><Table><thead><tr><Th>Item</Th><Th>Type</Th><Th>Qty</Th><Th>Unit</Th><Th>Total</Th></tr></thead><tbody>{items.map((item, index) => <tr key={item.id || index}><Td>{item.name}</Td><Td>{item.itemType || item.sourceType}</Td><Td>{String(item.quantity)}</Td><Td>{formatCurrency(item.unitAmount || item.unitPrice)}</Td><Td>{formatCurrency(item.totalAmount || item.lineTotal)}</Td></tr>)}</tbody></Table></CardContent></Card>
          <Card><CardHeader><CardTitle>Payment History</CardTitle></CardHeader><CardContent className="p-0"><Table><thead><tr><Th>Amount</Th><Th>Method</Th><Th>Status</Th><Th>Date</Th></tr></thead><tbody>{payments.map((payment, index) => <tr key={payment.id || index}><Td>{formatCurrency(payment.amount)}</Td><Td>{payment.method}</Td><Td><StatusBadge status={payment.status} /></Td><Td>{payment.collectedAt || payment.paidAt || payment.createdAt}</Td></tr>)}</tbody></Table></CardContent></Card>
        </div>
        <Card><CardHeader><CardTitle>Collect Payment</CardTitle></CardHeader><CardContent><form className="space-y-3" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); setError(""); paymentMutation.mutate({ amount: Number(form.get("amount") || 0), method: form.get("method"), transactionReference: form.get("transactionReference") || undefined, notes: form.get("notes") || undefined }); }}><Input name="amount" type="number" placeholder="Amount" max={Number(invoice.dueAmount || 0)} /><Select name="method"><option>CASH</option><option>CARD</option><option>UPI</option><option>BANK_TRANSFER</option><option>WALLET</option></Select><Input name="transactionReference" placeholder="Transaction reference" /><Textarea name="notes" placeholder="Notes" />{error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}<Button className="w-full" disabled={paymentMutation.isPending || Number(invoice.dueAmount || 0) <= 0}>Collect Payment</Button></form>{(paymentCollected || Number(invoice.dueAmount || 0) <= 0) && (invoice.repairTicketId || invoice.ticket?.id) ? <Link className="mt-3 block" to={`/handover?ticketId=${invoice.repairTicketId || invoice.ticket?.id}`}><Button className="w-full" type="button" variant="secondary">Go to Handover</Button></Link> : null}</CardContent></Card>
      </div>
    </>
  );
}
