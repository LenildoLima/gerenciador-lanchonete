import { LayoutDashboard, Package, ShoppingCart, ClipboardList, Menu, X, Users, LogOut, UserCircle, Activity } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, Link } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

const todosItems = [
  { title: "Painel", url: "/", icon: LayoutDashboard, perfis: ["admin"] },
  { title: "Produtos", url: "/produtos", icon: Package, perfis: ["admin"] },
  { title: "Nova Venda", url: "/nova-venda", icon: ShoppingCart, perfis: ["admin", "atendente"] },
  { title: "Vendas", url: "/vendas", icon: ClipboardList, perfis: ["admin", "atendente"] },
  { title: "Usuários", url: "/usuarios", icon: Users, perfis: ["admin"] },
  { title: "Auditoria", url: "/auditoria", icon: Activity, perfis: ["admin"] },
];

export function Navbar() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const { usuario, logout } = useAuth();

  const items = todosItems.filter(
    (item) => !usuario || item.perfis.includes(usuario.perfil)
  );

  const primeiroNome = usuario?.nome?.split(" ")[0] ?? "";

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-20 items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary shadow-lg shadow-primary/20 flex items-center justify-center text-2xl transition-transform hover:scale-105">
              🍔
            </div>
            <div className="hidden sm:block">
              <h1 className="font-black text-2xl tracking-tight leading-none text-foreground">LaunchApp</h1>
              <p className="text-sm text-muted-foreground font-medium">Gestão de Lanchonete</p>
            </div>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-1">
            {items.map((item) => {
              const isActive = location.pathname === item.url;
              return (
                <NavLink
                  key={item.title}
                  to={item.url}
                  end
                  className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <item.icon className="w-4 h-4 mr-2" />
                  {item.title}
                </NavLink>
              );
            })}
          </div>

          {/* Usuário + Sair (desktop) */}
          {usuario && (
            <div className="hidden md:flex items-center gap-3">
              <Link 
                to="/perfil" 
                title="Meu perfil"
                style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "0.6rem", 
                  textDecoration: "none",
                  padding: "0.4rem 0.8rem",
                  borderRadius: "0.6rem",
                  border: "1px solid #f3f4f6",
                  background: "#f9fafb",
                  transition: "all 0.2s"
                }} 
                className="hover:bg-gray-100 hover:border-gray-200"
              >
                <UserCircle size={28} color="#ea580c" strokeWidth={1.5} />
                <div style={{ textAlign: "left" }}>
                  <p style={{ fontSize: "0.85rem", fontWeight: 700, color: "#111827", lineHeight: 1.1 }}>
                    {primeiroNome}
                  </p>
                  <p style={{ fontSize: "0.7rem", color: "#6b7280", marginTop: "0.1rem", fontWeight: 500 }}>
                    Ver perfil
                  </p>
                </div>
              </Link>
              <button
                onClick={logout}
                title="Sair"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  padding: "0.45rem 0.9rem",
                  borderRadius: "0.6rem",
                  border: "1.5px solid #e5e7eb",
                  background: "#fff",
                  color: "#6b7280",
                  fontWeight: 600,
                  fontSize: "0.82rem",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "#fef2f2";
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "#fecaca";
                  (e.currentTarget as HTMLButtonElement).style.color = "#dc2626";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "#fff";
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "#e5e7eb";
                  (e.currentTarget as HTMLButtonElement).style.color = "#6b7280";
                }}
              >
                <LogOut size={15} />
                Sair
              </button>
            </div>
          )}

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(!isOpen)}>
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden pb-4 space-y-1 animate-in slide-in-from-top-2 duration-200">
            {items.map((item) => {
              const isActive = location.pathname === item.url;
              return (
                <NavLink
                  key={item.title}
                  to={item.url}
                  end
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.title}
                </NavLink>
              );
            })}
            {/* Perfil e Sair mobile */}
            {usuario && (
              <>
                <Link
                  to="/perfil"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center px-4 py-3 text-sm font-medium rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  style={{ textDecoration: "none" }}
                >
                  <UserCircle className="w-5 h-5 mr-3" />
                  Meu Perfil
                </Link>
                <button
                  onClick={() => { setIsOpen(false); logout(); }}
                  className="flex items-center w-full px-4 py-3 text-sm font-medium rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-5 h-5 mr-3" />
                  Sair
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
