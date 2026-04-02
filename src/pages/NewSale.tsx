import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, getCategoryBadgeClass } from "@/lib/format";
import { Search, ShoppingCart, Plus, Minus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  active: boolean;
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

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    const { data } = await supabase.from("products").select("*").eq("active", true).order("name");
    setProducts((data as Product[]) || []);
  }

  function addToCart(product: Product) {
    if (product.stock <= 0) return;
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          toast.error("Estoque insuficiente");
          return prev;
        }
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
            const newQty = i.quantity + delta;
            if (newQty > i.product.stock) {
              toast.error("Estoque insuficiente");
              return i;
            }
            return { ...i, quantity: newQty };
          }
          return i;
        })
        .filter((i) => i.quantity > 0)
    );
  }

  function removeFromCart(productId: string) {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  }

  const total = cart.reduce((s, i) => s + i.product.price * i.quantity, 0);

  const filtered = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchCategory = category === "Todos" || p.category === category;
    return matchSearch && matchCategory;
  });

  async function handleConfirmSale() {
    if (!paymentMethod) {
      toast.error("Selecione a forma de pagamento");
      return;
    }

    const { data: sale, error } = await supabase
      .from("sales")
      .insert({
        payment_method: paymentMethod,
        customer_name: customerName || null,
        notes: notes || null,
        total,
        status: "Concluída",
      })
      .select()
      .single();

    if (error || !sale) {
      toast.error("Erro ao criar venda");
      return;
    }

    const items = cart.map((i) => ({
      sale_id: (sale as any).id,
      product_id: i.product.id,
      product_name: i.product.name,
      quantity: i.quantity,
      unit_price: i.product.price,
      subtotal: i.product.price * i.quantity,
    }));

    await supabase.from("sale_items").insert(items);

    // Decrement stock
    for (const item of cart) {
      await supabase
        .from("products")
        .update({ stock: item.product.stock - item.quantity })
        .eq("id", item.product.id);
    }

    toast.success("Venda realizada com sucesso!");
    setCart([]);
    setModalOpen(false);
    setPaymentMethod("");
    setCustomerName("");
    setNotes("");
    fetchProducts();
  }

  return (
    <div className="flex gap-6 h-[calc(100vh-7rem)]">
      {/* Left - Products */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-foreground">Nova Venda</h1>
          <p className="text-sm text-muted-foreground">Selecione os produtos</p>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>

        <div className="flex gap-2 mb-4 flex-wrap">
          {allCategories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                category === c
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground border border-border hover:bg-muted"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 overflow-auto flex-1">
          {filtered.map((p) => (
            <button
              key={p.id}
              onClick={() => addToCart(p)}
              disabled={p.stock <= 0}
              className={`card-metric text-left transition-all hover:shadow-md ${
                p.stock <= 0 ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:ring-2 hover:ring-primary/30"
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <span className={getCategoryBadgeClass(p.category)}>{p.category}</span>
                <span className="text-xs text-muted-foreground">{p.stock} un.</span>
              </div>
              <p className="font-medium text-sm mt-2">{p.name}</p>
              <p className="text-primary font-bold text-sm mt-1">{formatCurrency(p.price)}</p>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="col-span-full text-center text-muted-foreground py-8">Nenhum produto encontrado</p>
          )}
        </div>
      </div>

      {/* Right - Cart */}
      <div className="w-80 flex-shrink-0 card-metric flex flex-col">
        <div className="flex items-center gap-2 mb-4">
          <ShoppingCart className="w-5 h-5 text-primary" />
          <h2 className="font-semibold">Carrinho</h2>
        </div>

        <div className="flex-1 overflow-auto space-y-3">
          {cart.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">Carrinho vazio</p>
          )}
          {cart.map((item) => (
            <div key={item.product.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/50">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{item.product.name}</p>
                <p className="text-xs text-muted-foreground">{formatCurrency(item.product.price * item.quantity)}</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => updateQuantity(item.product.id, -1)} className="w-6 h-6 rounded bg-card border border-border flex items-center justify-center">
                  <Minus className="w-3 h-3" />
                </button>
                <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                <button onClick={() => updateQuantity(item.product.id, 1)} className="w-6 h-6 rounded bg-card border border-border flex items-center justify-center">
                  <Plus className="w-3 h-3" />
                </button>
                <button onClick={() => removeFromCart(item.product.id)} className="w-6 h-6 rounded flex items-center justify-center hover:bg-destructive/10">
                  <X className="w-3 h-3 text-destructive" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-border pt-4 mt-4">
          <div className="flex justify-between items-center mb-4">
            <span className="font-medium">Total</span>
            <span className="text-xl font-bold text-primary">{formatCurrency(total)}</span>
          </div>
          <Button
            onClick={() => setModalOpen(true)}
            disabled={cart.length === 0}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Finalizar Venda
          </Button>
        </div>
      </div>

      {/* Checkout Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Finalizar Venda</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              {cart.map((i) => (
                <div key={i.product.id} className="flex justify-between text-sm">
                  <span>{i.quantity}x {i.product.name}</span>
                  <span>{formatCurrency(i.product.price * i.quantity)}</span>
                </div>
              ))}
              <div className="border-t border-border pt-2 flex justify-between font-bold">
                <span>Total</span>
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
              <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Nome do cliente" />
            </div>

            <div>
              <Label>Observações (opcional)</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex: sem cebola, sem maionese..." />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setModalOpen(false)}>Voltar</Button>
              <Button onClick={handleConfirmSale} className="bg-primary text-primary-foreground hover:bg-primary/90">
                Confirmar Venda
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
