import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
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

export function Billing() {
  const queryClient = useQueryClient();
  const invoicesQuery = useQuery({ queryKey: ["billing", "invoices"], queryFn: () => billingApi.invoices() });
  const ticketsQuery = useQuery({ queryKey: ["repair"], queryFn: () => repairApi.list() });
  const invoices = unwrapArray(invoicesQuery.data, ["invoices"]);
  const tickets = unwrapArray(ticketsQuery.data, ["tickets"]);
  const invoiceCandidates = tickets.filter((ticket) => isBillingEligibleTicket(ticket, invoices));
  const payable = payableInvoices(invoices);
  const invoiceMutation = useNotifyMutation({ mutationFn: ({ ticketId, payload }) => repairApi.invoice(ticketId, payload), successMessage: "Invoice generated successfully.", onSuccess: () => queryClient.invalidateQueries({ queryKey: ["billing", "invoices"] }) });
  const paymentMutation = useNotifyMutation({ mutationFn: ({ invoiceId, payload }) => billingApi.collectPayment(invoiceId, payload), successMessage: "Payment collected successfully.", onSuccess: () => queryClient.invalidateQueries({ queryKey: ["billing", "invoices"] }) });

  return (
    <>
      <PageHeader title="Billing" description="Generate invoice, invoice list, collect payment, and customer ledger." />
      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,380px)]">
        <Card><CardContent className="p-0"><DataTable rows={invoices} emptyTitle="No invoices found" columns={[{ key: "invoiceNumber", header: "Invoice Number", render: (invoice) => <Link className="font-semibold text-[var(--primary)]" to={`/billing/invoices/${invoice.id}`}>{invoice.invoiceNumber}</Link> }, { key: "subtotalAmount", header: "Subtotal", render: (invoice) => formatCurrency(invoice.subtotalAmount) }, { key: "taxAmount", header: "Tax", render: (invoice) => formatCurrency(invoice.taxAmount) }, { key: "totalAmount", header: "Total", render: (invoice) => formatCurrency(invoice.totalAmount) }, { key: "paidAmount", header: "Paid Amount", render: (invoice) => formatCurrency(invoice.paidAmount) }, { key: "dueAmount", header: "Due Amount", render: (invoice) => formatCurrency(invoice.dueAmount) }, { key: "status", header: "Payment Status", render: (invoice) => <StatusBadge status={invoice.status} /> }]} /></CardContent></Card>
        <div className="min-w-0 space-y-5"><Card><CardHeader><CardTitle>Generate Invoice</CardTitle></CardHeader><CardContent><form className="space-y-3" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const manualName = String(form.get("manualItemName") || "").trim(); const manualUnitPrice = Number(form.get("manualUnitPrice") || 0); invoiceMutation.mutate({ ticketId: form.get("ticketId"), payload: { includeApprovedEstimate: form.get("includeApprovedEstimate") === "true", includeActualUsage: form.get("includeActualUsage") === "true", manualItems: manualName && manualUnitPrice > 0 ? [{ itemType: "LABOR", sourceType: "LABOR", name: manualName, quantity: Number(form.get("manualQuantity") || 1), unitPrice: manualUnitPrice }] : [], taxRate: Number(form.get("taxRate") || 0), discountAmount: Number(form.get("discountAmount") || 0), notes: form.get("notes") || undefined } }); }}><Select name="ticketId">{invoiceCandidates.map((ticket) => <option key={ticket.id} value={ticket.id}>{ticket.ticketNumber}</option>)}</Select>{!invoiceCandidates.length ? <p className="text-sm text-[var(--muted)]">No tickets are eligible for invoice generation. Tickets must be billable, have approved estimate or actual usage, and not already have an invoice.</p> : null}<Select name="includeApprovedEstimate" defaultValue="true"><option value="true">Include approved estimate</option><option value="false">Do not include approved estimate</option></Select><Select name="includeActualUsage" defaultValue="false"><option value="false">Do not include actual usage</option><option value="true">Include actual usage</option></Select><Input name="manualItemName" placeholder="Manual item name optional" /><Input name="manualQuantity" type="number" step="0.01" min="0.01" placeholder="Manual quantity" /><Input name="manualUnitPrice" type="number" step="0.01" min="0" placeholder="Manual unit price" /><Input name="taxRate" type="number" min="0" placeholder="Tax rate" /><Input name="discountAmount" type="number" min="0" placeholder="Discount" /><Textarea name="notes" placeholder="Notes" /><Button className="w-full" disabled={invoiceMutation.isPending || !invoiceCandidates.length}>Generate</Button></form></CardContent></Card><Card><CardHeader><CardTitle>Collect Payment</CardTitle></CardHeader><CardContent><form className="space-y-3" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); paymentMutation.mutate({ invoiceId: form.get("invoiceId"), payload: { amount: Number(form.get("amount") || 0), method: form.get("method"), transactionReference: form.get("transactionReference") || undefined, notes: form.get("notes") || undefined } }); }}><Select name="invoiceId">{payable.map((invoice) => <option key={invoice.id} value={invoice.id}>{invoice.invoiceNumber} · Due {formatCurrency(invoice.dueAmount)}</option>)}</Select>{!payable.length ? <p className="text-sm text-[var(--muted)]">No unpaid invoices have a remaining due amount.</p> : null}<Input name="amount" type="number" min="0.01" step="0.01" placeholder="Amount" /><Select name="method"><option>CASH</option><option>CARD</option><option>UPI</option><option>BANK_TRANSFER</option><option>WALLET</option></Select><Input name="transactionReference" placeholder="Transaction reference" /><Textarea name="notes" placeholder="Notes" /><Button className="w-full" disabled={paymentMutation.isPending || !payable.length}>Collect Payment</Button></form></CardContent></Card></div>
      </div>
    </>
  );
}

export function InvoiceDetails({ id }) {
  const [error, setError] = useState("");
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
        <Card><CardHeader><CardTitle>Collect Payment</CardTitle></CardHeader><CardContent><form className="space-y-3" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); setError(""); paymentMutation.mutate({ amount: Number(form.get("amount") || 0), method: form.get("method"), transactionReference: form.get("transactionReference") || undefined, notes: form.get("notes") || undefined }); }}><Input name="amount" type="number" placeholder="Amount" max={Number(invoice.dueAmount || 0)} /><Select name="method"><option>CASH</option><option>CARD</option><option>UPI</option><option>BANK_TRANSFER</option><option>WALLET</option></Select><Input name="transactionReference" placeholder="Transaction reference" /><Textarea name="notes" placeholder="Notes" />{error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}<Button className="w-full" disabled={paymentMutation.isPending || Number(invoice.dueAmount || 0) <= 0}>Collect Payment</Button></form></CardContent></Card>
      </div>
    </>
  );
}
