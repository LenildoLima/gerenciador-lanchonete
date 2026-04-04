import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, formatTime } from "@/lib/format";
import { ShoppingCart, DollarSign, Package, AlertTriangle, Receipt, TrendingUp, PiggyBank } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface Product {
  id: string;
  nome: string;
  categoria: string;
  ativo: boolean;
  estoque: number;
  estoque_minimo: number;
}

interface Sale {
  id: string;
  criado_em: string;
  forma_pagamento: string;
  total: number;
  situacao: string;
}

interface SaleWithItems extends Sale {
  itemCount: number;
}

interface ItemVenda {
  id: string;
  produto_id: string;
  nome_produto: string;
  quantidade: number;
  preco_unitario: number;
  venda_id: string;
}

export default function Dashboard() {
  const [todaySales, setTodaySales] = useState<SaleWithItems[]>([]);
  const [allSales, setAllSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [chartData, setChartData] = useState<{ day: string; value: number }[]>([]);
  const [mostSoldProduct, setMostSoldProduct] = useState<{ nome: string; qtd: number } | null>(null);

  useEffect(() => {
    fetchData();

    // Realtime subscription
    const channel = supabase
      .channel("dashboard-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vendas" },
        () => fetchData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "itens_venda" },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchData() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const firstDayMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    // Get the earliest between 1st day of month and 7 days ago to ensure chart and monthly total both work
    const minDate = firstDayMonth < sevenDaysAgo ? firstDayMonth : sevenDaysAgo;

    const [productsRes, allNeededSalesRes, todaySalesRes] = await Promise.all([
      supabase.from("produtos").select("*"),
      supabase.from("vendas").select("*").gte("criado_em", minDate.toISOString()).eq("situacao", "Concluída"),
      supabase.from("vendas").select("*").gte("criado_em", today.toISOString()).eq("situacao", "Concluída"),
    ]);

    const salesList = (allNeededSalesRes.data as Sale[]) || [];
    setProducts((productsRes.data as Product[]) || []);
    
    // Monthly sales filter
    const monthlySales = salesList.filter(s => new Date(s.criado_em) >= firstDayMonth);
    setAllSales(monthlySales);

    // Get item counts and calculate most sold for today's sales
    const todayData = (todaySalesRes.data as Sale[]) || [];
    const salesWithItems: SaleWithItems[] = [];
    const itemsCount: Record<string, { nome: string; qtd: number }> = {};

    for (const sale of todayData) {
      const { data: items } = await supabase
        .from("itens_venda")
        .select("*")
        .eq("venda_id", sale.id);
      
      const itemList = (items as ItemVenda[]) || [];
      salesWithItems.push({ ...sale, itemCount: itemList.length });

      // Count most sold
      for (const item of itemList) {
        if (!itemsCount[item.produto_id]) {
          itemsCount[item.produto_id] = { nome: item.nome_produto, qtd: 0 };
        }
        itemsCount[item.produto_id].qtd += item.quantidade;
      }
    }

    setTodaySales(salesWithItems);

    // Find most sold
    const sortedItems = Object.values(itemsCount).sort((a, b) => b.qtd - a.qtd);
    setMostSoldProduct(sortedItems[0] || null);

    // Chart data - last 7 days
    const days = [];
    const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const nextD = new Date(d);
      nextD.setDate(nextD.getDate() + 1);

      const dayTotal = (salesList)
        .filter((s) => {
          const sd = new Date(s.criado_em);
          return sd >= d && sd < nextD;
        })
        .reduce((sum, s) => sum + Number(s.total), 0);

      days.push({ day: dayNames[d.getDay()], value: dayTotal });
    }
    setChartData(days);
  }

  const activeProducts = products.filter((p) => p.ativo);
  const lowStock = products.filter((p) => p.ativo && p.estoque < p.estoque_minimo);
  const todayTotal = todaySales.reduce((s, v) => s + Number(v.total), 0);
  const totalRevenue = allSales.reduce((s, v) => s + Number(v.total), 0);

  return (
    <div className="space-y-6">
      <div className="sticky top-20 z-30 -mx-4 px-4 py-4 -mt-4 bg-background/95 backdrop-blur shadow-sm md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
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
            <p className="text-sm text-muted-foreground">Receita Total Mensal</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(totalRevenue)}</p>
            <p className="text-xs text-muted-foreground mt-1">{allSales.length} vendas no mês</p>
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

        <div className="card-metric flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Produto +Vendido</p>
            <p className="text-lg font-bold mt-1 truncate max-w-[150px]" title={mostSoldProduct?.nome || "Nenhum"}>
              {mostSoldProduct ? mostSoldProduct.nome : "Nenhum"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{mostSoldProduct ? `${mostSoldProduct.qtd} unidades vendidas` : "Sem vendas hoje"}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
        </div>

        <div className="card-metric flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Arrecadação Diária</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(todayTotal)}</p>
            <p className="text-xs text-muted-foreground mt-1 font-medium">Total bruto hoje</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-primary" />
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
            <div className="space-y-3 max-h-[300px] overflow-auto pr-2 scrollbar-thin">
              {lowStock.map((p) => (
                <div key={p.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{p.nome}</p>
                    <p className="text-xs text-muted-foreground">{p.categoria}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-destructive">{p.estoque}</p>
                    <p className="text-xs text-muted-foreground">Mínimo: {p.estoque_minimo}</p>
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
            <div className="space-y-3 max-h-[300px] overflow-auto pr-2 scrollbar-thin">
              {todaySales.map((s) => (
                <div key={s.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <p className="text-sm text-muted-foreground">{s.itemCount} itens</p>
                    <p className="text-xs text-muted-foreground">{s.forma_pagamento}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-bold text-primary">{formatCurrency(Number(s.total))}</p>
                    <p className="text-xs text-muted-foreground">{formatTime(s.criado_em)}</p>
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
