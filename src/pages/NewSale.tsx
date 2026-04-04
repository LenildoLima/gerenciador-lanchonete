import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, getCategoriaBadgeClass } from "@/lib/format";
import { Search, ShoppingCart, Plus, Minus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface Product {
  id: string;
  nome: string;
  categoria: string;
  preco: number;
  estoque: number;
  ativo: boolean;
}

interface CartItem {
  product: Product;
  quantity: number;
}

const allCategories = ["Todos", "Lanches", "Lançamentos", "Éxodo", "Porções", "Sobremesas"];
const paymentMethods = ["Dinheiro", "PIX", "Crédito", "Débito"];

export default function NewSale() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todos");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(1);
  const [orderType, setOrderType] = useState<"Local" | "Entrega">("Local");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [deliveryFee, setDeliveryFee] = useState(0);

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    const { data } = await supabase.from("produtos").select("*").eq("ativo", true).order("nome");
    setProducts((data as Product[]) || []);
  }

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  }

  function updateQuantity(productId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.product.id === productId) {
            return { ...i, quantity: i.quantity + delta };
          }
          return i;
        })
        .filter((i) => i.quantity > 0)
    );
  }

  function removeFromCart(productId: string) {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  }

  const total = cart.reduce((s, i) => s + i.product.preco * i.quantity, 0);

  const filtered = products.filter((p) => {
    const matchSearch = p.nome.toLowerCase().includes(search.toLowerCase());
    const matchCategory = category === "Todos" || p.categoria === category;
    return matchSearch && matchCategory;
  });

  async function handleConfirmSale() {
    if (!paymentMethod) {
      toast.error("Selecione a forma de pagamento");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.rpc("realizar_venda", {
        p_itens: cart.map((i) => ({
          produto_id: i.product.id,
          quantidade: i.quantity,
        })),
        p_pagamento: paymentMethod,
        p_observacao: notes || "",
        p_cliente: customerName || "",
        p_tipo_pedido: orderType,
        p_endereco: orderType === "Entrega" ? address : "",
        p_telefone: orderType === "Entrega" ? phone : "",
        p_taxa_entrega: orderType === "Entrega" ? Number(deliveryFee) : 0,
      });

      if (error) {
        toast.error(error.message || "Erro ao realizar venda");
        return;
      }

      toast.success("Venda realizada com sucesso!");
      setCart([]);
      setModalOpen(false);
      setStep(1);
      setPaymentMethod("");
      setCustomerName("");
      setNotes("");
      setAddress("");
      setPhone("");
      setDeliveryFee(0);
      setOrderType("Local");
      fetchProducts();
    } catch (err) {
      toast.error("Erro inesperado ao realizar venda");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-120px)] overflow-hidden -mt-2">
      {/* Left - Products */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        <div className="flex-none space-y-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Nova Venda</h1>
            <p className="text-sm text-muted-foreground">Selecione os produtos para o pedido</p>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar produtos..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-card" />
          </div>
        </div>

        <div className="flex gap-2 mb-4 flex-wrap pb-2 border-b border-border/50 flex-none">
          {allCategories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                category === c
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-card text-muted-foreground border border-border hover:bg-muted"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-muted-foreground/20">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2 px-1">
          {filtered.map((p) => (
            <button
              key={p.id}
              onClick={() => addToCart(p)}
              disabled={p.estoque <= 0}
              className={`bg-card rounded-lg p-1.5 border border-border text-left transition-all hover:shadow-md ${
                p.estoque <= 0 ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:ring-2 hover:ring-primary/30"
              }`}
            >
              <div className="flex items-start justify-between mb-0.5">
                <span className={`${getCategoriaBadgeClass(p.categoria)} text-[9px] px-1 py-0`}>
                  {p.categoria}
                </span>
                <span className="text-[9px] text-muted-foreground font-medium">
                  {p.estoque} un.
                </span>
              </div>
              <p className="font-semibold text-[11px] leading-tight truncate" title={p.nome}>{p.nome}</p>
              <p className="text-orange-500 font-bold text-xs mt-0.5">{formatCurrency(p.preco)}</p>
            </button>
          ))}
          </div>
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Search className="w-12 h-12 mb-2 opacity-20" />
              <p>Nenhum produto encontrado</p>
            </div>
          )}
        </div>
      </div>

      {/* Right - Cart */}
      <div className="w-full lg:w-96 flex-none h-full">
        <div className="card-metric flex flex-col h-full bg-card shadow-lg border-primary/10">
          <div className="flex items-center justify-between mb-4 flex-none">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <ShoppingCart className="w-5 h-5 text-primary" />
              </div>
              <h2 className="font-bold text-lg">Carrinho</h2>
            </div>
            <span className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-bold">
              {cart.reduce((s, i) => s + i.quantity, 0)} itens
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-2 mb-4 scrollbar-thin scrollbar-thumb-muted-foreground/20">
            {cart.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50 py-12">
                <ShoppingCart className="w-12 h-12 mb-2" />
                <p className="text-sm">Seu carrinho está vazio</p>
              </div>
            )}
            {cart.map((item) => (
              <div key={item.product.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/40 border border-transparent hover:border-primary/20 transition-all">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold truncate text-foreground">{item.product.nome}</p>
                  <p className="text-xs text-muted-foreground">{formatCurrency(item.product.preco)} / un.</p>
                </div>
                <div className="flex items-center gap-2 bg-background p-1.5 rounded-lg border border-border">
                  <button onClick={() => updateQuantity(item.product.id, -1)} className="w-7 h-7 rounded-md hover:bg-muted flex items-center justify-center transition-colors">
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-6 text-center text-sm font-bold">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.product.id, 1)} className="w-7 h-7 rounded-md hover:bg-muted flex items-center justify-center transition-colors">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <button onClick={() => removeFromCart(item.product.id)} className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex-none border-t border-border pt-4 bg-card">
            <div className="flex justify-between items-center mb-4">
              <span className="text-muted-foreground font-medium">Total do Pedido</span>
              <span className="text-2xl font-extrabold text-primary">{formatCurrency(total)}</span>
            </div>
            <Button
              onClick={() => setModalOpen(true)}
              disabled={cart.length === 0}
              className="w-full h-12 text-lg font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
            >
              Finalizar Venda
            </Button>
          </div>
        </div>
      </div>

      {/* Checkout Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Finalizar Venda - Passo {step}</DialogTitle>
          </DialogHeader>
          
          {step === 1 ? (
            <div className="space-y-4">
              <div className="space-y-2">
                {cart.map((i) => (
                  <div key={i.product.id} className="flex justify-between text-sm">
                    <span>{i.quantity}x {i.product.nome}</span>
                    <span>{formatCurrency(i.product.preco * i.quantity)}</span>
                  </div>
                ))}
                <div className="border-t border-border pt-2 flex justify-between font-bold">
                  <span>Subtotal</span>
                  <span className="text-primary">{formatCurrency(total)}</span>
                </div>
              </div>

              <div>
                <Label className="mb-2 block">Forma de Pagamento</Label>
                <div className="grid grid-cols-2 gap-2">
                  {paymentMethods.map((m) => (
                    <button
                      key={m}
                      onClick={() => setPaymentMethod(m)}
                      className={`p-2 rounded-lg text-sm font-medium border transition-colors ${
                        paymentMethod === m
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label>Cliente (opcional)</Label>
                <input 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={customerName} 
                  onChange={(e) => setCustomerName(e.target.value)} 
                  placeholder="Nome do cliente" 
                />
              </div>

              <div>
                <Label>Observações (opcional)</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex: sem cebola, sem maionese..." />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
                <Button onClick={() => setStep(2)} className="bg-primary text-primary-foreground hover:bg-primary/90">
                  Próximo
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="mb-2 block">Tipo de Pedido</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setOrderType("Local")}
                    className={`p-2 rounded-lg text-sm font-medium border transition-colors ${
                      orderType === "Local"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    Consumir no Local
                  </button>
                  <button
                    onClick={() => setOrderType("Entrega")}
                    className={`p-2 rounded-lg text-sm font-medium border transition-colors ${
                      orderType === "Entrega"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    Entrega
                  </button>
                </div>
              </div>

              {orderType === "Entrega" && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div>
                    <Label>Endereço de Entrega</Label>
                    <input 
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={address} 
                      onChange={(e) => setAddress(e.target.value)} 
                      placeholder="Rua, número, bairro..." 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Telefone</Label>
                      <input 
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={phone} 
                        onChange={(e) => setPhone(e.target.value)} 
                        placeholder="(00) 00000-0000" 
                      />
                    </div>
                    <div>
                      <Label>Taxa de Entrega</Label>
                      <input 
                        type="number"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={deliveryFee} 
                        onChange={(e) => setDeliveryFee(Number(e.target.value))} 
                        placeholder="0,00" 
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="border-t border-border pt-4 mt-4">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-medium">Total</span>
                  <div className="text-right">
                    <span className="text-xl font-bold text-primary">
                      {formatCurrency(total + (orderType === "Entrega" ? deliveryFee : 0))}
                    </span>
                    {orderType === "Entrega" && deliveryFee > 0 && (
                      <p className="text-[10px] text-muted-foreground">(Incluso R$ {deliveryFee} de taxa)</p>
                    )}
                  </div>
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setStep(1)} disabled={isSubmitting}>Voltar</Button>
                  <Button onClick={handleConfirmSale} disabled={isSubmitting} className="bg-primary text-primary-foreground hover:bg-primary/90">
                    {isSubmitting ? "Processando..." : "Confirmar Venda"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
