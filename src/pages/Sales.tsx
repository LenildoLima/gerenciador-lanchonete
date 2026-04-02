import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { Search, Eye, Ban } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

interface Sale {
  id: string;
  created_at: string;
  payment_method: string;
  customer_name: string | null;
  notes: string | null;
  total: number;
  status: string;
}

interface SaleItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface SaleWithCount extends Sale {
  itemCount: number;
}

export default function Sales() {
  const [sales, setSales] = useState<SaleWithCount[]>([]);
  const [search, setSearch] = useState("");
  const [detailSale, setDetailSale] = useState<Sale | null>(null);
  const [detailItems, setDetailItems] = useState<SaleItem[]>([]);

  useEffect(() => {
    fetchSales();
  }, []);

  async function fetchSales() {
    const { data } = await supabase.from("sales").select("*").order("created_at", { ascending: false });
    const salesData = (data as Sale[]) || [];
    
    const withCounts: SaleWithCount[] = [];
    for (const sale of salesData) {
      const { count } = await supabase
        .from("sale_items")
        .select("*", { count: "exact", head: true })
        .eq("sale_id", sale.id);
      withCounts.push({ ...sale, itemCount: count || 0 });
    }
    setSales(withCounts);
  }

  async function viewDetails(sale: Sale) {
    const { data } = await supabase.from("sale_items").select("*").eq("sale_id", sale.id);
    setDetailItems((data as SaleItem[]) || []);
    setDetailSale(sale);
  }

  async function cancelSale(id: string) {
    if (!confirm("Deseja cancelar esta venda? O estoque NÃO será estornado.")) return;
    await supabase.from("sales").update({ status: "Cancelada" }).eq("id", id);
    toast.success("Venda cancelada");
    fetchSales();
  }

  const filtered = sales.filter((s) => {
    const term = search.toLowerCase();
    return (
      s.customer_name?.toLowerCase().includes(term) ||
      s.payment_method.toLowerCase().includes(term) ||
      formatDateTime(s.created_at).includes(term)
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Vendas</h1>
        <p className="text-sm text-muted-foreground">Histórico de vendas realizadas</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar vendas..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="card-metric overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left p-3 font-medium text-muted-foreground">DATA</th>
              <th className="text-left p-3 font-medium text-muted-foreground">ITENS</th>
              <th className="text-left p-3 font-medium text-muted-foreground">PAGAMENTO</th>
              <th className="text-left p-3 font-medium text-muted-foreground">CLIENTE</th>
              <th className="text-left p-3 font-medium text-muted-foreground">TOTAL</th>
              <th className="text-left p-3 font-medium text-muted-foreground">STATUS</th>
              <th className="text-right p-3 font-medium text-muted-foreground">AÇÕES</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                <td className="p-3">{formatDateTime(s.created_at)}</td>
                <td className="p-3 text-muted-foreground">{s.itemCount} itens</td>
                <td className="p-3">{s.payment_method}</td>
                <td className="p-3 text-muted-foreground">{s.customer_name || "-"}</td>
                <td className="p-3 font-medium">{formatCurrency(Number(s.total))}</td>
                <td className="p-3">
                  <span className={s.status === "Concluída" ? "badge-completed" : "badge-cancelled"}>
                    {s.status}
                  </span>
                </td>
                <td className="p-3 text-right">
                  <button onClick={() => viewDetails(s)} className="p-1.5 hover:bg-muted rounded-md mr-1">
                    <Eye className="w-4 h-4 text-muted-foreground" />
                  </button>
                  {s.status === "Concluída" && (
                    <button onClick={() => cancelSale(s.id)} className="p-1.5 hover:bg-destructive/10 rounded-md">
                      <Ban className="w-4 h-4 text-destructive" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-muted-foreground">
                  Nenhuma venda encontrada
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={!!detailSale} onOpenChange={() => setDetailSale(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Detalhes da Venda</DialogTitle>
          </DialogHeader>
          {detailSale && (
            <div className="space-y-4">
              <div className="text-sm space-y-1">
                <p><span className="text-muted-foreground">Data:</span> {formatDateTime(detailSale.created_at)}</p>
                <p><span className="text-muted-foreground">Pagamento:</span> {detailSale.payment_method}</p>
                <p><span className="text-muted-foreground">Cliente:</span> {detailSale.customer_name || "-"}</p>
                {detailSale.notes && <p><span className="text-muted-foreground">Obs:</span> {detailSale.notes}</p>}
              </div>
              <div className="border-t border-border pt-3 space-y-2">
                {detailItems.map((i) => (
                  <div key={i.id} className="flex justify-between text-sm">
                    <span>{i.quantity}x {i.product_name}</span>
                    <span>{formatCurrency(i.subtotal)}</span>
                  </div>
                ))}
                <div className="border-t border-border pt-2 flex justify-between font-bold">
                  <span>Total</span>
                  <span className="text-primary">{formatCurrency(Number(detailSale.total))}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
