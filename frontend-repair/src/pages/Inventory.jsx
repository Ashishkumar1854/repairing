import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { Input } from "@/components/ui/Form";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Table, Td, Th } from "@/components/ui/Table";
import { inventoryApi } from "@/services/modules";
import { formatCurrency, unwrapArray } from "@/utils/cn";
import { firstObject } from "@/utils/data";
import { useNotifyMutation } from "@/hooks/useNotifyMutation";

export function Inventory() {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["inventory"], queryFn: () => inventoryApi.list() });
  const items = unwrapArray(data, ["items"]);
  const mutation = useNotifyMutation({ mutationFn: inventoryApi.create, successMessage: "Inventory item created.", onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventory"] }) });

  return (
    <>
      <PageHeader title="Inventory" description="Inventory list, item details, stock adjustments, stock history, and low stock alerts." />
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <Card><CardContent className="p-0"><DataTable rows={items} emptyTitle="No inventory items" columns={[{ key: "sku", header: "SKU", render: (item) => <Link className="font-semibold text-[var(--primary)]" to={`/inventory/${item.id}`}>{item.sku}</Link> }, { key: "partName", header: "Part Name" }, { key: "stockQuantity", header: "Quantity", render: (item) => String(item.stockQuantity) }, { key: "reorderLevel", header: "Minimum Stock", render: (item) => String(item.reorderLevel || 0) }, { key: "value", header: "Inventory Value", render: (item) => formatCurrency(Number(item.stockQuantity) * Number(item.unitCost || 0)) }, { key: "status", header: "Status", render: (item) => <StatusBadge status={Number(item.stockQuantity) <= Number(item.reorderLevel || 0) ? "WAITING_PARTS" : "APPROVED"} /> }]} /></CardContent></Card>
        <Card><CardHeader><CardTitle>Add Inventory Item</CardTitle></CardHeader><CardContent><form className="space-y-3" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); mutation.mutate({ sku: form.get("sku"), partName: form.get("partName"), category: form.get("category"), stockQuantity: Number(form.get("stockQuantity") || 0), unitCost: Number(form.get("unitCost") || 0), sellingPrice: Number(form.get("sellingPrice") || 0), reorderLevel: Number(form.get("reorderLevel") || 0) }); }}><Input name="sku" placeholder="SKU" required /><Input name="partName" placeholder="Part Name" required /><Input name="category" placeholder="Category" /><Input name="stockQuantity" type="number" placeholder="Quantity" /><Input name="unitCost" type="number" placeholder="Unit Cost" /><Input name="sellingPrice" type="number" placeholder="Selling Price" /><Input name="reorderLevel" type="number" placeholder="Minimum Stock" /><Button className="w-full" disabled={mutation.isPending}>Add Item</Button></form></CardContent></Card>
      </div>
    </>
  );
}

export function InventoryDetails({ id }) {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["inventory", id], queryFn: () => inventoryApi.get(id), enabled: Boolean(id) });
  const item = firstObject(data, ["item"]);
  const movements = item.movements || item.stockMovements || item.inventoryMovements || [];
  const update = useNotifyMutation({ mutationFn: (payload) => inventoryApi.update(id, payload), successMessage: "Inventory item updated.", onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventory", id] }) });

  if (!item?.id) return <p className="text-sm text-[var(--muted)]">Loading inventory item...</p>;

  return (
    <>
      <PageHeader title={item.sku} description="Inventory details, edit inventory item, stock adjustment UI, and stock movement history." />
      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent><p className="text-sm text-[var(--muted)]">Part Name</p><p className="mt-2 text-xl font-bold">{item.partName}</p></CardContent></Card>
        <Card><CardContent><p className="text-sm text-[var(--muted)]">Quantity</p><p className="mt-2 text-xl font-bold">{String(item.stockQuantity)}</p></CardContent></Card>
        <Card><CardContent><p className="text-sm text-[var(--muted)]">Minimum Stock</p><p className="mt-2 text-xl font-bold">{String(item.reorderLevel || 0)}</p></CardContent></Card>
        <Card><CardContent><p className="text-sm text-[var(--muted)]">Value</p><p className="mt-2 text-xl font-bold">{formatCurrency(Number(item.stockQuantity || 0) * Number(item.unitCost || 0))}</p></CardContent></Card>
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_360px]">
        <Card><CardHeader><CardTitle>Stock Movement History</CardTitle></CardHeader><CardContent className="p-0"><Table><thead><tr><Th>Type</Th><Th>Before</Th><Th>Change</Th><Th>After</Th><Th>Date</Th></tr></thead><tbody>{movements.map((movement, index) => <tr key={movement.id || index}><Td>{movement.type || movement.movementType}</Td><Td>{String(movement.quantityBefore ?? "")}</Td><Td>{String(movement.quantityChanged ?? movement.quantity ?? "")}</Td><Td>{String(movement.quantityAfter ?? "")}</Td><Td>{movement.createdAt}</Td></tr>)}</tbody></Table></CardContent></Card>
        <Card><CardHeader><CardTitle>Edit / Stock Adjustment</CardTitle></CardHeader><CardContent><form className="space-y-3" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); update.mutate({ partName: form.get("partName"), category: form.get("category"), stockQuantity: Number(form.get("stockQuantity") || item.stockQuantity), unitCost: Number(form.get("unitCost") || item.unitCost || 0), sellingPrice: Number(form.get("sellingPrice") || item.sellingPrice || 0), reorderLevel: Number(form.get("reorderLevel") || item.reorderLevel || 0) }); }}><Input name="partName" defaultValue={item.partName} /><Input name="category" defaultValue={item.category || ""} /><Input name="stockQuantity" type="number" defaultValue={item.stockQuantity} /><Input name="unitCost" type="number" defaultValue={item.unitCost || 0} /><Input name="sellingPrice" type="number" defaultValue={item.sellingPrice || 0} /><Input name="reorderLevel" type="number" defaultValue={item.reorderLevel || 0} /><Button className="w-full" disabled={update.isPending}>Save Inventory Item</Button></form></CardContent></Card>
      </div>
    </>
  );
}
