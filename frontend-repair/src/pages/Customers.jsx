import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { Input } from "@/components/ui/Form";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Table, Td, Th } from "@/components/ui/Table";
import { billingApi, customersApi, repairApi } from "@/services/modules";
import { formatCurrency, unwrapArray } from "@/utils/cn";

export function Customers() {
  const [search, setSearch] = useState("");
  const normalizedSearch = search.trim();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["customers", normalizedSearch],
    queryFn: () => customersApi.search({ query: normalizedSearch, limit: 20 }),
    enabled: normalizedSearch.length > 0,
  });
  const ticketsQuery = useQuery({
    queryKey: ["customers", "repair-ticket-customers", normalizedSearch],
    queryFn: () => repairApi.list({ limit: 100, search: normalizedSearch || undefined }),
  });
  const searchedCustomers = unwrapArray(data, ["customers"]);
  const repairTickets = unwrapArray(ticketsQuery.data, ["tickets"]);
  const ticketCustomers = uniqueTicketCustomers(repairTickets);
  const customers = normalizedSearch ? searchedCustomers : ticketCustomers;

  return (
    <>
      <PageHeader
        title="Customers"
        description="Search customer profiles, view details, billing ledger, invoices, and payments."
        actions={<Link to="/repair/new"><Button><Plus className="h-4 w-4" />Create Repair</Button></Link>}
      />
      <Card className="mb-4">
        <CardContent>
          <Input placeholder="Search customer by phone, email, or name" value={search} onChange={(event) => setSearch(event.target.value)} />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-0">
          <DataTable
            rows={customers}
            isLoading={normalizedSearch ? isLoading : ticketsQuery.isLoading}
            error={normalizedSearch ? error : ticketsQuery.error}
            onRetry={normalizedSearch ? refetch : ticketsQuery.refetch}
            searchable={false}
            emptyTitle={normalizedSearch ? "No customers found" : "No customers found"}
            emptyDescription={normalizedSearch ? "No matching customers were returned by the backend." : "Customers appear here from real repair tickets. Create a repair ticket to register a customer."}
            columns={[
              { key: "fullName", header: "Customer", render: (customer) => <Link className="font-semibold text-[var(--primary)]" to={`/customers/${customer.id}`}>{customer.fullName}</Link> },
              { key: "phone", header: "Phone" },
              { key: "email", header: "Email", render: (customer) => customer.email || "Not set" },
              { key: "address", header: "Address", render: (customer) => customer.address || "Not set" },
              { key: "ticketCount", header: "Tickets", render: (customer) => customer.ticketCount ?? customer._count?.tickets ?? "Not set" },
            ]}
          />
        </CardContent>
      </Card>
    </>
  );
}

export function CustomerDetails({ id }) {
  const ticketsQuery = useQuery({ queryKey: ["customers", id, "tickets"], queryFn: () => customersApi.tickets(id), enabled: Boolean(id) });
  const ledgerQuery = useQuery({ queryKey: ["customers", id, "ledger"], queryFn: () => billingApi.customerLedger(id), enabled: Boolean(id) });
  const tickets = unwrapArray(ticketsQuery.data, ["tickets"]);
  const ledger = unwrapArray(ledgerQuery.data, ["ledger", "entries"]);
  const balance = ledger.reduce((sum, entry) => sum + Number(entry.debit || 0) - Number(entry.credit || 0), 0);
  const invoices = ledger.filter((entry) => String(entry.type || entry.entryType || "").includes("INVOICE"));
  const payments = ledger.filter((entry) => String(entry.type || entry.entryType || "").includes("PAYMENT"));

  return (
    <>
      <PageHeader title="Customer Details" description="Repair history, invoice history, payment history, customer ledger, and outstanding balance." />
      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardContent><p className="text-sm text-[var(--muted)]">Open Repairs</p><p className="mt-2 text-2xl font-bold">{tickets.filter((ticket) => !["DELIVERED", "CANCELLED", "CLOSED"].includes(ticket.status)).length}</p></CardContent></Card>
        <Card><CardContent><p className="text-sm text-[var(--muted)]">Invoices</p><p className="mt-2 text-2xl font-bold">{invoices.length}</p></CardContent></Card>
        <Card><CardContent><p className="text-sm text-[var(--muted)]">Outstanding Balance</p><p className="mt-2 text-2xl font-bold">{formatCurrency(balance)}</p></CardContent></Card>
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Card><CardContent className="p-0"><Table><thead><tr><Th>Repair</Th><Th>Status</Th><Th>Payment</Th></tr></thead><tbody>{tickets.map((ticket) => <tr key={ticket.id}><Td>{ticket.ticketNumber}</Td><Td><StatusBadge status={ticket.status} /></Td><Td><StatusBadge status={ticket.paymentStatus} /></Td></tr>)}</tbody></Table></CardContent></Card>
        <Card><CardContent className="p-0"><Table><thead><tr><Th>Ledger Type</Th><Th>Debit</Th><Th>Credit</Th><Th>Balance</Th></tr></thead><tbody>{ledger.map((entry, index) => <tr key={entry.id || index}><Td>{entry.type || entry.entryType}</Td><Td>{formatCurrency(entry.debit)}</Td><Td>{formatCurrency(entry.credit)}</Td><Td>{formatCurrency(entry.runningBalance || entry.balance)}</Td></tr>)}</tbody></Table></CardContent></Card>
        <Card><CardContent className="p-0"><Table><thead><tr><Th>Invoice History</Th><Th>Amount</Th><Th>Date</Th></tr></thead><tbody>{invoices.map((entry, index) => <tr key={entry.id || index}><Td>{entry.referenceEntityId || entry.referenceId || "Invoice"}</Td><Td>{formatCurrency(entry.debit)}</Td><Td>{entry.createdAt}</Td></tr>)}</tbody></Table></CardContent></Card>
        <Card><CardContent className="p-0"><Table><thead><tr><Th>Payment History</Th><Th>Amount</Th><Th>Date</Th></tr></thead><tbody>{payments.map((entry, index) => <tr key={entry.id || index}><Td>{entry.referenceEntityId || entry.referenceId || "Payment"}</Td><Td>{formatCurrency(entry.credit)}</Td><Td>{entry.createdAt}</Td></tr>)}</tbody></Table></CardContent></Card>
      </div>
    </>
  );
}

function uniqueTicketCustomers(tickets) {
  const customers = new Map();
  for (const ticket of tickets) {
    const customer = ticket.customer;
    if (!customer?.id) continue;

    const previous = customers.get(customer.id);
    customers.set(customer.id, {
      ...customer,
      ticketCount: (previous?.ticketCount || 0) + 1,
    });
  }
  return [...customers.values()];
}
