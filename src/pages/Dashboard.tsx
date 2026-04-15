import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, formatTime } from "@/lib/format";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ShoppingCart, DollarSign, Package, AlertTriangle, Receipt, TrendingUp, ChevronLeft, ChevronRight } from "lucide-react";

interface Product {
  id: string;
  nome: string;
  categoria_id: string;
  categorias?: { nome: string };
  ativo: boolean;
  estoque_minimo: number;
  estoque?: { saldo: number };
}

interface Sale {
  id: string;
  criado_em: string;
  forma_pagamento_id: string;
  formas_pagamento?: { nome: string };
  total: number;
  situacao: string;
  entregas?: {
    taxa_entrega: number;
    tipo_pedido: string;
  }[];
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
  const [chartData, setChartData] = useState<{ dia: string; valor: number }[]>([]);
  const [mostSoldProduct, setMostSoldProduct] = useState<{ nome: string; qtd: number } | null>(null);
  const [mesSelecionado, setMesSelecionado] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  useEffect(() => {
    fetchData();

    // Inscrição em tempo real
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
  }, [mesSelecionado]);

  async function fetchData() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const primeiroDiaMes = new Date(mesSelecionado.getFullYear(), mesSelecionado.getMonth(), 1);
    const ultimoDiaMes = new Date(mesSelecionado.getFullYear(), mesSelecionado.getMonth() + 1, 0);
    ultimoDiaMes.setHours(23, 59, 59, 999);

    const [productsRes, allNeededSalesRes, todaySalesRes] = await Promise.all([
      supabase.from("produtos").select("*, categorias(nome), estoque(saldo)"),
      supabase
        .from("vendas")
        .select("*, formas_pagamento(nome), entregas(*)")
        .gte("criado_em", primeiroDiaMes.toISOString())
        .lte("criado_em", ultimoDiaMes.toISOString())
        .eq("situacao", "Concluída"),
      supabase
        .from("vendas")
        .select("*, formas_pagamento(nome), entregas(*)")
        .gte("criado_em", today.toISOString())
        .eq("situacao", "Concluída"),
    ]);

    const salesList = (allNeededSalesRes.data as any[]) || [];
    setProducts((productsRes.data as any[]) || []);
    
    setAllSales(salesList);

    const todayData = (todaySalesRes.data as any[]) || [];
    const salesWithItems: SaleWithItems[] = [];
    const itemsCount: Record<string, { nome: string; qtd: number }> = {};

    for (const sale of todayData) {
      const { data: items } = await supabase
        .from("itens_venda")
        .select("*")
        .eq("venda_id", sale.id);
      
      const itemList = (items as ItemVenda[]) || [];
      salesWithItems.push({ ...sale, itemCount: itemList.length });

      for (const item of itemList) {
        if (!itemsCount[item.produto_id]) {
          itemsCount[item.produto_id] = { nome: item.nome_produto, qtd: 0 };
        }
        itemsCount[item.produto_id].qtd += item.quantidade;
      }
    }

    setTodaySales(salesWithItems);

    const sortedItems = Object.values(itemsCount).sort((a, b) => b.qtd - a.qtd);
    setMostSoldProduct(sortedItems[0] || null);

    // Gerar dados para o gráfico (todos os dias do mês)
    const diasNoMes = ultimoDiaMes.getDate();
    const dadosGrafico = [];

    for (let dia = 1; dia <= diasNoMes; dia++) {
      const dataInicio = new Date(mesSelecionado.getFullYear(), mesSelecionado.getMonth(), dia, 0, 0, 0);
      const dataFim = new Date(mesSelecionado.getFullYear(), mesSelecionado.getMonth(), dia, 23, 59, 59);

      const totalDoDia = salesList
        .filter((s) => {
          const dataVenda = new Date(s.criado_em);
          return dataVenda >= dataInicio && dataVenda <= dataFim;
        })
        .reduce((soma, s) => soma + Number(s.total), 0);

      dadosGrafico.push({ dia: dia.toString(), valor: totalDoDia });
    }
    setChartData(dadosGrafico);
  }

  const navegarMes = (direcao: number) => {
    const novoMes = new Date(mesSelecionado.getFullYear(), mesSelecionado.getMonth() + direcao, 1);
    const agora = new Date();
    const mesAtual = new Date(agora.getFullYear(), agora.getMonth(), 1);

    if (novoMes <= mesAtual) {
      setMesSelecionado(novoMes);
    }
  };

  const formatarMesAno = (data: Date) => {
    return data.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
      .replace(/^\w/, (c) => c.toUpperCase());
  };

  const activeProducts = products.filter((p) => p.ativo);
  const lowStock = products.filter((p) => p.ativo && (p.estoque?.saldo ?? 0) < p.estoque_minimo);
  const todayTotal = todaySales.reduce((s, v) => s + Number(v.total), 0);
  const totalRevenue = allSales.reduce((s, v) => s + Number(v.total), 0);

  return (
    <div className="space-y-6">
      <div className="sticky top-20 z-30 -mx-4 px-4 py-4 -mt-4 bg-background/95 backdrop-blur shadow-sm md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
        <h1 className="text-2xl font-bold text-foreground">Painel</h1>
        <p className="text-muted-foreground text-sm">Visão geral da lanchonete</p>
      </div>

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

      <div className="bg-[#fff7ed] rounded-2xl shadow-[0_2px_8px_rgba(249,115,22,0.08)] border border-[#fed7aa] p-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
          <h2 className="text-xl font-bold text-[#1e3a8a]">Vendas do Mês</h2>
          
          <div className="flex items-center gap-4 bg-[#1e3a8a]/5 p-1 rounded-xl">
            <button
              onClick={() => navegarMes(-1)}
              className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all text-gray-600 active:scale-95"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm font-semibold text-gray-700 min-w-[120px] text-center">
              {formatarMesAno(mesSelecionado)}
            </span>
            <button
              onClick={() => navegarMes(1)}
              disabled={new Date(mesSelecionado.getFullYear(), mesSelecionado.getMonth() + 1, 1) > new Date()}
              className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all text-gray-600 disabled:opacity-30 disabled:hover:bg-transparent active:scale-95"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorValor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.7} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis 
                dataKey="dia" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fill: '#9ca3af' }}
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fill: '#9ca3af' }}
                tickFormatter={(v) => `R$${v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v}`}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-[#fff7ed] p-4 shadow-xl border border-[#fed7aa] rounded-xl">
                        <p className="text-xs text-gray-400 font-medium mb-1">Dia {label}</p>
                        <p className="text-sm font-bold text-orange-600">
                          {formatCurrency(payload[0].value as number)}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area 
                type="monotone" 
                dataKey="valor" 
                stroke="#f97316" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorValor)" 
                animationDuration={1500}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

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
                    <p className="text-xs text-muted-foreground">{p.categorias?.nome || 'Geral'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-destructive">{p.estoque?.saldo ?? 0}</p>
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
                    <p className="text-sm text-muted-foreground">{s.itemCount} {s.itemCount === 1 ? 'item' : 'itens'}</p>
                    <p className="text-xs text-muted-foreground">{s.formas_pagamento?.nome || '-'}</p>
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
