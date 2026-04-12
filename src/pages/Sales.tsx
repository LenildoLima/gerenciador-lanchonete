import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { Search, Eye, Ban } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { registrarAuditoria } from "@/lib/auditoria";
import { useAuth } from "@/hooks/use-auth";

interface Venda {
  id: string;
  criado_em: string;
  forma_pagamento_id: string;
  formas_pagamento?: { nome: string };
  nome_cliente: string | null;
  cliente_id: string | null;
  clientes?: { nome: string; telefone: string | null } | null;
  observacoes: string | null;
  total: number;
  situacao: string;
  entregas?: {
    taxa: number;
    tipo_pedido?: string;
    endereco: string;
    telefone: string;
  }[];
}

interface ItemVenda {
  id: string;
  nome_produto: string;
  quantidade: number;
  preco_unitario: number;
}

interface VendaComContagem extends Venda {
  itemCount: number;
}

export default function Vendas() {
  const { usuario } = useAuth();
  const [vendas, setVendas] = useState<VendaComContagem[]>([]);
  const [search, setSearch] = useState("");
  const [detalheVenda, setDetalheVenda] = useState<Venda | null>(null);
  const [detalheItens, setDetalheItens] = useState<ItemVenda[]>([]);
  const [filterRange, setFilterRange] = useState<"hoje" | "semana" | "mes" | "todos">("todos");

  useEffect(() => {
    fetchVendas();
  }, []);

  async function fetchVendas() {
    const { data } = await supabase
      .from("vendas")
      .select(`
        *,
        formas_pagamento(nome),
        clientes(nome, telefone),
        entregas(*)
      `)
      .order("criado_em", { ascending: false });
      
    const vendasData = (data as any[]) || [];
    console.log("Vendas carregadas:", vendasData);

    const withCounts: VendaComContagem[] = [];
    for (const venda of vendasData) {
      const { count } = await supabase
        .from("itens_venda")
        .select("*", { count: "exact", head: true })
        .eq("venda_id", venda.id);
      withCounts.push({ ...venda, itemCount: count || 0 });
    }
    setVendas(withCounts);
  }

  async function viewDetails(venda: Venda) {
    const { data } = await supabase.from("itens_venda").select("*").eq("venda_id", venda.id);
    setDetalheItens((data as ItemVenda[]) || []);
    setDetalheVenda(venda);
  }

  async function cancelVenda(id: string) {
    if (!confirm("Deseja cancelar esta venda? O estoque NÃO será estornado.")) return;
    const { error } = await supabase.from("vendas").update({ situacao: "Cancelada" }).eq("id", id);
    if (error) {
      toast.error("Erro ao cancelar venda");
      return;
    }

    const v = vendas.find(x => x.id === id);
    if (usuario && v) {
      await registrarAuditoria({
        usuario_id: usuario.id,
        usuario_nome: usuario.nome,
        tipo: "venda",
        acao: "Venda cancelada",
        detalhes: { venda_id: id, total: v.total }
      });

      await registrarAuditoria({
        usuario_id: usuario.id,
        usuario_nome: usuario.nome,
        tipo: "estoque",
        acao: "Estorno de estoque (cancelamento)",
        detalhes: { venda_id: id }
      });
    }

    toast.success("Venda cancelada");
    fetchVendas();
  }

  const filtered = vendas.filter((v) => {
    const term = search.toLowerCase();
    const formaPgto = v.formas_pagamento?.nome?.toLowerCase() || "";
    const matchesSearch = (
      v.nome_cliente?.toLowerCase().includes(term) ||
      formaPgto.includes(term) ||
      formatDateTime(v.criado_em).includes(term)
    );

    if (!matchesSearch) return false;

    const dataVenda = new Date(v.criado_em);
    const agora = new Date();
    
    if (filterRange === "hoje") {
      return dataVenda.toDateString() === agora.toDateString();
    }
    
    if (filterRange === "semana") {
      const umaSemanaAtras = new Date();
      umaSemanaAtras.setDate(agora.getDate() - 7);
      return dataVenda >= umaSemanaAtras;
    }

    if (filterRange === "mes") {
      return dataVenda.getMonth() === agora.getMonth() && dataVenda.getFullYear() === agora.getFullYear();
    }

    return true;
  });

  const totals = filtered.reduce((acc, v) => {
    const taxa = Number(v.entregas?.[0]?.taxa || 0);
    const subtotalItens = Number(v.total);
    
    return {
      venda: acc.venda + subtotalItens,
      taxa: acc.taxa + taxa,
      total: acc.total + subtotalItens + taxa
    };
  }, { venda: 0, taxa: 0, total: 0 });

  return (
    <div className="space-y-6">
      <div className="sticky top-20 z-30 -mx-4 px-4 py-4 -mt-4 bg-background/95 backdrop-blur shadow-sm md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
        <h1 className="text-2xl font-bold text-foreground">Vendas</h1>
        <p className="text-sm text-muted-foreground">Histórico de vendas realizadas</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar vendas..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>

        <div className="flex bg-muted p-1 rounded-lg self-end sm:self-auto">
          {(["hoje", "semana", "mes", "todos"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setFilterRange(r)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-all ${
                filterRange === r 
                  ? "bg-background text-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="card-metric p-0 overflow-hidden relative">
        <div className="max-h-[60vh] overflow-auto scrollbar-thin scrollbar-thumb-muted-foreground/20">
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 z-20 bg-background/95 backdrop-blur shadow-sm">
              <tr className="border-b border-border">
              <th className="text-left p-3 font-medium text-muted-foreground">DATA</th>
              <th className="text-left p-3 font-medium text-muted-foreground">ITENS</th>
              <th className="text-left p-3 font-medium text-muted-foreground">PAGAMENTO</th>
              <th className="text-left p-3 font-medium text-muted-foreground">CLIENTE</th>
              <th className="text-left p-3 font-medium text-muted-foreground">VALOR VENDA</th>
              <th className="text-left p-3 font-medium text-muted-foreground">TAXA</th>
              <th className="text-left p-3 font-medium text-muted-foreground">TOTAL</th>
              <th className="text-left p-3 font-medium text-muted-foreground">STATUS</th>
              <th className="text-right p-3 font-medium text-muted-foreground">AÇÕES</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((v) => {
              const taxa = v.entregas?.[0]?.taxa || 0;
              return (
              <tr key={v.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                <td className="p-3">{formatDateTime(v.criado_em)}</td>
                <td className="p-3 text-muted-foreground">{v.itemCount} itens</td>
                <td className="p-3">{v.formas_pagamento?.nome || '-'}</td>
                <td className="p-3 text-muted-foreground">{v.clientes?.nome || v.nome_cliente || "-"}</td>
                <td className="p-3">{formatCurrency(Number(v.total))}</td>
                <td className="p-3 text-muted-foreground">
                  {taxa > 0 ? formatCurrency(taxa) : "-"}
                </td>
                <td className="p-3 font-bold text-primary">{formatCurrency(Number(v.total) + taxa)}</td>
                <td className="p-3">
                  <span className={v.situacao === "Concluída" ? "badge-completed" : "badge-cancelled"}>
                    {v.situacao}
                  </span>
                </td>
                <td className="p-3 text-right">
                  <button onClick={() => viewDetails(v)} className="p-1.5 hover:bg-muted rounded-md mr-1">
                    <Eye className="w-4 h-4 text-muted-foreground" />
                  </button>
                  {v.situacao === "Concluída" && (
                    <button onClick={() => cancelVenda(v.id)} className="p-1.5 hover:bg-destructive/10 rounded-md">
                      <Ban className="w-4 h-4 text-destructive" />
                    </button>
                  )}
                </td>
              </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="p-8 text-center text-muted-foreground">
                  Nenhuma venda encontrada
                </td>
              </tr>
            )}
          </tbody>
          {filtered.length > 0 && (
            <tfoot className="sticky bottom-0 z-20 bg-background/95 backdrop-blur border-t-2 border-border font-bold">
              <tr>
                <td colSpan={4} className="p-3 text-right text-muted-foreground uppercase text-xs">Totais do Período</td>
                <td className="p-3 text-foreground">{formatCurrency(totals.venda)}</td>
                <td className="p-3 text-muted-foreground font-medium">{formatCurrency(totals.taxa)}</td>
                <td className="p-3 text-primary text-base">{formatCurrency(totals.total)}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>

      <Dialog open={!!detalheVenda} onOpenChange={() => setDetalheVenda(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Detalhes da Venda</DialogTitle>
          </DialogHeader>
          {detalheVenda && (
            <div className="space-y-4">
              <div className="text-sm space-y-1">
                <p><span className="text-muted-foreground">Data:</span> {formatDateTime(detalheVenda.criado_em)}</p>
                <p><span className="text-muted-foreground">Pagamento:</span> {detalheVenda.formas_pagamento?.nome || '-'}</p>
                <p><span className="text-muted-foreground">Cliente:</span> {detalheVenda.clientes?.nome || detalheVenda.nome_cliente || "-"}</p>
                {detalheVenda.clientes?.telefone && <p><span className="text-muted-foreground">Telefone:</span> {detalheVenda.clientes.telefone}</p>}
                {detalheVenda.entregas?.[0]?.endereco && <p><span className="text-muted-foreground">Endereço:</span> {detalheVenda.entregas[0].endereco}</p>}
                {detalheVenda.observacoes && <p><span className="text-muted-foreground">Obs:</span> {detalheVenda.observacoes}</p>}
              </div>
              <div className="border-t border-border pt-3 space-y-2">
                {detalheItens.map((i) => (
                  <div key={i.id} className="flex justify-between text-sm">
                    <span>{i.quantidade}x {i.nome_produto}</span>
                    <span>{formatCurrency(i.quantidade * i.preco_unitario)}</span>
                  </div>
                ))}
                  <div className="flex justify-between text-sm font-medium pt-1">
                    <span>Subtotal (Itens)</span>
                    <span>{formatCurrency(Number(detalheVenda.total))}</span>
                  </div>
                  {detalheVenda.entregas?.[0]?.taxa && detalheVenda.entregas[0].taxa > 0 && (
                    <div className="flex justify-between text-sm text-primary">
                      <span>Taxa de Entrega</span>
                      <span>+ {formatCurrency(detalheVenda.entregas[0].taxa)}</span>
                    </div>
                  )}
                  <div className="border-t border-border pt-2 flex justify-between font-bold text-lg">
                    <span>Total Geral</span>
                    <span className="text-primary">{formatCurrency(Number(detalheVenda.total) + (detalheVenda.entregas?.[0]?.taxa || 0))}</span>
                  </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
