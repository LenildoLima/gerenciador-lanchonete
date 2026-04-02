import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, formatTime } from "@/lib/format";
import { ShoppingCart, DollarSign, Package, AlertTriangle, Receipt } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface Product {
  id: string;
  name: string;
  category: string;
  stock: number;
  min_stock: number;
}

interface Sale {
  id: string;
  created_at: string;
  payment_method: string;
  total: number;
  status: string;
}

interface SaleWithItems extends Sale {
  itemCount: number;
}

export default function Dashboard() {
  const [todaySales, setTodaySales] = useState<SaleWithItems[]>([]);
  const [allSales, setAllSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [chartData, setChartData] = useState<{ day: string; value: number }[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [productsRes, salesRes, todaySalesRes] = await Promise.all([
      supabase.from("products").select("*"),
      supabase.from("sales").select("*").eq("status", "Concluída"),
      supabase.from("sales").select("*").gte("created_at", today.toISOString()).eq("status", "Concluída"),
    ]);

    setProducts((productsRes.data as Product[]) || []);
    setAllSales((salesRes.data as Sale[]) || []);

    // Get item counts for today's sales
    const todayData = (todaySalesRes.data as Sale[]) || [];
    const salesWithItems: SaleWithItems[] = [];
    for (const sale of todayData) {
      const { count } = await supabase
        .from("sale_items")
        .select("*", { count: "exact", head: true })
        .eq("sale_id", sale.id);
      salesWithItems.push({ ...sale, itemCount: count || 0 });
    }
    setTodaySales(salesWithItems);

    // Chart data - last 7 days
    const days = [];
    const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const nextD = new Date(d);
      nextD.setDate(nextD.getDate() + 1);

      const dayTotal = ((salesRes.data as Sale[]) || [])
        .filter((s) => {
          const sd = new Date(s.created_at);
          return sd >= d && sd < nextD;
        })
        .reduce((sum, s) => sum + Number(s.total), 0);

      days.push({ day: dayNames[d.getDay()], value: dayTotal });
    }
    setChartData(days);
  }

  const activeProducts = products.filter((p) => p.active);
  const lowStock = products.filter((p) => p.active && p.stock < p.min_stock);
  const todayTotal = todaySales.reduce((s, v) => s + Number(v.total), 0);
  const totalRevenue = allSales.reduce((s, v) => s + Number(v.total), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Painel</h1>
        <p className="text-muted-foreground text-sm">Visão geral da lanchonete</p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-metric flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Vendas Hoje</p>
            <p className="text-2xl font-bold mt-1">{todaySales.length}</p>
            <p className="text-xs text-muted-foreground mt-1">{formatCurrency(todayTotal)}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <ShoppingCart className="w-5 h-5 text-primary" />
          </div>
        </div>

        <div className="card-metric flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Receita Total</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(totalRevenue)}</p>
            <p className="text-xs text-muted-foreground mt-1">{allSales.length} vendas</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-primary" />
          </div>
        </div>

        <div className="card-metric flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Produtos Ativos</p>
            <p className="text-2xl font-bold mt-1">{activeProducts.length}</p>
            <p className="text-xs text-muted-foreground mt-1">{products.length} cadastrados</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Package className="w-5 h-5 text-primary" />
          </div>
        </div>

        <div className="card-metric flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Estoque Baixo</p>
            <p className="text-2xl font-bold mt-1">{lowStock.length}</p>
            <p className="text-xs text-destructive mt-1 font-medium">{lowStock.length > 0 ? "Atenção" : "OK"}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-primary" />
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="card-metric">
        <h2 className="font-semibold text-foreground mb-4">Vendas nos últimos 7 dias</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="day" axisLine={false} tickLine={false} className="text-xs" />
              <YAxis axisLine={false} tickLine={false} className="text-xs" tickFormatter={(v) => `R$${v}`} />
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), "Vendas"]}
                contentStyle={{ borderRadius: "0.5rem", border: "1px solid hsl(var(--border))" }}
              />
              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card-metric">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-foreground">Estoque Baixo</h2>
          </div>
          {lowStock.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum produto com estoque baixo</p>
          ) : (
            <div className="space-y-3">
              {lowStock.map((p) => (
                <div key={p.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-destructive">{p.stock}</p>
                    <p className="text-xs text-muted-foreground">Mínimo: {p.min_stock}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card-metric">
          <div className="flex items-center gap-2 mb-4">
            <Receipt className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-foreground">Vendas de Hoje</h2>
          </div>
          {todaySales.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma venda realizada hoje</p>
          ) : (
            <div className="space-y-3">
              {todaySales.map((s) => (
                <div key={s.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <p className="text-sm text-muted-foreground">{s.itemCount} itens</p>
                    <p className="text-xs text-muted-foreground">{s.payment_method}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-bold text-primary">{formatCurrency(Number(s.total))}</p>
                    <p className="text-xs text-muted-foreground">{formatTime(s.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
