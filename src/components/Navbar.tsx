import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Receipt, 
  Menu, 
  X, 
  Bike, 
  LogOut, 
  UserCircle, 
  Shield, 
  Wallet, 
  ShoppingBag, 
  ChevronDown, 
  Settings, 
  UserCog,
  User,
  PackagePlus,
  ChefHat
} from "lucide-react";
import { useLocation, Link } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

const dropdownGroups = [
  {
    name: "Vendas",
    icon: ShoppingBag,
    items: [
      { title: "Nova Venda", url: "/nova-venda", icon: ShoppingCart, color: "#16a34a", perfis: ["admin", "atendente"] },
      { title: "Cozinha (KDS)", url: "/cozinha", icon: ChefHat, color: "#f59e0b", perfis: ["admin", "atendente", "cozinheiro"] },
      { title: "Vendas", url: "/vendas", icon: Receipt, color: "#2563eb", perfis: ["admin", "atendente"] },
      { title: "Entregas", url: "/entregas", icon: Bike, color: "#db2777", perfis: ["admin", "atendente"] },
    ]
  },
  {
    name: "Gestão",
    icon: Package,
    items: [
      { title: "Produtos", url: "/produtos", icon: Package, color: "#d97706", perfis: ["admin"] },
      { title: "Entradas", url: "/entradas", icon: PackagePlus, color: "#059669", perfis: ["admin"] },
      { title: "Entregadores", url: "/entregadores", icon: Bike, color: "#0891b2", perfis: ["admin"] },
    ]
  },
  {
    name: "Financeiro",
    icon: Wallet,
    items: [
      { title: "Caixa", url: "/caixa", icon: Wallet, color: "#15803d", perfis: ["admin", "atendente"] },
    ]
  }
];

export function Navbar() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const { usuario, logout } = useAuth();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setOpenDropdown(null);
    setIsOpen(false);
  }, [location.pathname]);

  const getFilteredGroups = () => {
    return dropdownGroups.map(group => ({
      ...group,
      items: group.items.filter(item => !usuario || item.perfis.includes(usuario.perfil))
    })).filter(group => group.items.length > 0);
  };

  const filteredGroups = getFilteredGroups();
  const primeiroNome = usuario?.nome?.split(" ")[0] ?? "";
  const iniciais = (usuario?.nome?.[0] || "U").toUpperCase();
  const isAdmin = usuario?.perfil === "admin";

  const isGroupActive = (items: { url: string }[]) => {
    return items.some(item => location.pathname === item.url);
  };

  return (
    <nav className="sticky top-0 z-50 w-full bg-gradient-to-r from-[#f97316] to-[#ea580c] shadow-[0_4px_20px_rgba(249,115,22,0.4)] border-none h-16">
      <div className="container mx-auto px-4 h-full">
        <div className="flex h-full items-center justify-between">
          {/* ESQUERDA - apenas o logo */}
          <Link to={usuario?.perfil === "cozinheiro" ? "/cozinha" : "/"} className="flex flex-col group transition-all duration-300">
            <div className="flex items-center gap-3">
              {/* Logo com Emoji e Efeito de Vidro Azulado */}
              <div className="w-12 h-12 rounded-2xl bg-[#1e3a8a]/20 backdrop-blur-sm shadow-xl flex items-center justify-center text-[28px] border border-white/10 transition-all duration-500 group-hover:scale-110 group-hover:rotate-6">
                🍔
              </div>
              
              {/* Tipografia de Marca com Amarelo Vibrante */}
              <div>
                <div className="flex items-baseline leading-none">
                  <span className="font-black text-[26px] tracking-tighter text-[#FACC15] drop-shadow-md">Launch</span>
                  <span className="font-light text-[26px] tracking-tighter text-white ml-0.5">App</span>
                </div>
                <p className="text-[8.5px] text-[#FACC15] font-black uppercase tracking-[0.35em] mt-0.5 opacity-90">
                  GESTÃO DE LANCHONETE
                </p>
              </div>
            </div>
          </Link>

          {/* DIREITA - todos os menus */}
          <div className="flex items-center gap-4 h-full">
            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-1 h-full" ref={dropdownRef}>
              {usuario?.perfil !== "cozinheiro" && (
                <Link
                  to="/"
                  className={`flex items-center gap-[0.4rem] h-[48px] px-4 rounded-[0.65rem] transition-all duration-200 text-[0.875rem] font-bold text-white bg-[#7c3aed] ${
                    location.pathname === "/"
                      ? "brightness-[85%] shadow-[0_2px_8px_rgba(0,0,0,0.2)]"
                      : "hover:brightness-[115%]"
                  }`}
                >
                  <LayoutDashboard size={20} className="text-white" />
                  Painel
                </Link>
              )}

              {filteredGroups.map((group) => {
                const active = openDropdown === group.name;
                const containsPage = isGroupActive(group.items);

                return (
                  <div key={group.name} className="relative h-full flex items-center">
                    <button
                      onClick={() => setOpenDropdown(active ? null : group.name)}
                      className={`flex items-center gap-[0.4rem] h-[48px] px-4 rounded-[0.65rem] transition-all duration-200 text-[0.875rem] font-bold text-white ${
                        containsPage || active
                          ? "brightness-[85%] shadow-[0_2px_8px_rgba(0,0,0,0.2)]"
                          : "hover:brightness-[115%]"
                      }`}
                      style={{ 
                        backgroundColor: 
                          group.name === "Vendas" ? "#16a34a" : 
                          group.name === "Gestão" ? "#0891b2" : 
                          "#15803d" // Financeiro
                      }}
                    >
                      <group.icon size={20} className="text-white" />
                      {group.name}
                      <ChevronDown size={18} className={`text-white transition-transform duration-200 ${active ? "rotate-180" : ""}`} />
                    </button>

                    {active && (
                      <div className="absolute top-[calc(100%-8px)] right-0 w-64 bg-white rounded-[0.75rem] shadow-[0_8px_24px_rgba(0,0,0,0.12)] p-2 animate-in fade-in zoom-in-95 duration-200 z-50">
                        {group.items.map((item) => {
                          const isActive = location.pathname === item.url;
                          return (
                            <Link
                              key={item.title}
                              to={item.url}
                              className={`flex items-center gap-3 p-2 rounded-[0.5rem] transition-all group ${
                                isActive
                                  ? "bg-[#f97316] text-white"
                                  : "text-[#1e3a8a] whitespace-nowrap hover:bg-[#fff7ed] hover:text-[#f97316]"
                              }`}
                            >
                              <div 
                                style={{ backgroundColor: item.color }} 
                                className="w-8 h-8 flex items-center justify-center rounded-[0.5rem] text-white shadow-sm"
                              >
                                <item.icon size={16} />
                              </div>
                              <span className="font-bold text-sm tracking-tight">{item.title}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Menu Administração / Usuário (Desktop) */}
              {usuario && (
                <div className="relative h-full flex items-center">
                  <button
                    onClick={() => setOpenDropdown(openDropdown === "UserMenu" ? null : "UserMenu")}
                    className={`flex items-center gap-[0.4rem] h-[48px] px-4 rounded-[0.65rem] transition-all duration-200 text-[0.875rem] font-bold text-white bg-[#dc2626] ${
                      openDropdown === "UserMenu" || (isAdmin ? isGroupActive([{url: "/usuarios"}, {url: "/auditoria"}, {url: "/perfil"}]) : location.pathname === "/perfil")
                        ? "brightness-[85%] shadow-[0_2px_8px_rgba(0,0,0,0.2)]"
                        : "hover:brightness-[115%]"
                    }`}
                  >
                    <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-white font-black text-[10px] border border-white/30 shadow-sm">
                      {iniciais}
                    </div>
                    <span>{isAdmin ? "Administração" : primeiroNome}</span>
                    <ChevronDown size={18} className={`text-white transition-transform duration-200 ${openDropdown === "UserMenu" ? "rotate-180" : ""}`} />
                  </button>

                  {openDropdown === "UserMenu" && (
                    <div className="absolute top-[calc(100%-8px)] right-0 w-64 bg-white rounded-[0.75rem] shadow-[0_8px_24px_rgba(0,0,0,0.12)] p-2 animate-in fade-in zoom-in-95 duration-200 z-50">
                      {isAdmin && (
                        <>
                          <Link
                            to="/usuarios"
                            className={`flex items-center gap-3 p-2 rounded-[0.5rem] transition-all group ${
                              location.pathname === "/usuarios" ? "bg-[#f97316] text-white" : "text-[#1e3a8a] hover:bg-[#fff7ed] hover:text-[#f97316]"
                            }`}
                          >
                            <div className="w-8 h-8 flex items-center justify-center rounded-[0.5rem] bg-[#dc2626] text-white shadow-sm">
                              <UserCog size={16} />
                            </div>
                            <span className="font-bold text-sm tracking-tight">Usuários</span>
                          </Link>
                          <Link
                            to="/auditoria"
                            className={`flex items-center gap-3 p-2 rounded-[0.5rem] transition-all group mt-1 ${
                              location.pathname === "/auditoria" ? "bg-[#f97316] text-white" : "text-[#1e3a8a] hover:bg-[#fff7ed] hover:text-[#f97316]"
                            }`}
                          >
                            <div className="w-8 h-8 flex items-center justify-center rounded-[0.5rem] bg-[#374151] text-white shadow-sm">
                              <Shield size={16} />
                            </div>
                            <span className="font-bold text-sm tracking-tight">Auditoria</span>
                          </Link>
                          <div className="h-px bg-gray-100 my-2 mx-1" />
                        </>
                      )}
                      
                      <Link
                        to="/perfil"
                        className={`flex items-center gap-3 p-2 rounded-[0.5rem] transition-all group ${
                          location.pathname === "/perfil" ? "bg-[#f97316] text-white" : "text-[#1e3a8a] hover:bg-[#fff7ed] hover:text-[#f97316]"
                        }`}
                      >
                        <div className="w-8 h-8 flex items-center justify-center rounded-[0.5rem] bg-[#7c3aed] text-white shadow-sm">
                          <User size={16} />
                        </div>
                        <span className="font-bold text-sm tracking-tight">Meu Perfil</span>
                      </Link>

                      <div className="h-px bg-gray-100 my-2 mx-1" />

                      <button
                        onClick={logout}
                        className="w-full flex items-center gap-3 p-2 rounded-[0.5rem] transition-all group text-red-600 hover:bg-red-50"
                      >
                        <div className="w-8 h-8 flex items-center justify-center rounded-[0.5rem] bg-[#dc2626] text-white shadow-sm">
                          <LogOut size={16} />
                        </div>
                        <span className="font-bold text-sm tracking-tight">Sair</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsOpen(!isOpen)}
                className="w-10 h-10 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-all border border-white/20"
              >
                {isOpen ? <X size={20} /> : <Menu size={20} />}
              </Button>
            </div>
          </div>
        </div>

        {isOpen && (
          <div className="md:hidden pb-6 space-y-4 animate-in slide-in-from-top-4 duration-300">
            {usuario?.perfil !== "cozinheiro" && (
              <Link
                to="/"
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-4 rounded-xl transition-all shadow-md ${
                  location.pathname === "/"
                    ? "bg-white text-orange-600 font-black"
                    : "bg-white/10 text-white hover:bg-white/20 font-bold"
                }`}
              >
                <LayoutDashboard size={20} />
                <span>Painel</span>
              </Link>
            )}

            {filteredGroups.map((group) => (
              <div key={group.name} className="space-y-2">
                <p className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em] px-3">{group.name}</p>
                <div className="grid grid-cols-1 gap-2">
                  {group.items.map((item) => {
                    const isActive = location.pathname === item.url;
                    return (
                      <Link
                        key={item.title}
                        to={item.url}
                        onClick={() => setIsOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all shadow-md ${
                          isActive
                            ? "bg-white text-[#1e3a8a] font-black"
                            : "bg-white/10 text-white hover:bg-white/20 font-bold"
                        }`}
                      >
                        <div 
                          style={{ backgroundColor: item.color }} 
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-white"
                        >
                          <item.icon size={18} />
                        </div>
                        <span className="text-sm">{item.title}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
            
            {usuario && (
              <div className="pt-4 mt-4 border-t border-white/20 space-y-2">
                <p className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em] px-3">Conta</p>
                
                {isAdmin && (
                  <>
                    <Link
                      to="/usuarios"
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold ${
                        location.pathname === "/usuarios" ? "bg-white text-[#1e3a8a]" : "bg-white/10 text-white"
                      }`}
                    >
                      <UserCog size={18} />
                      Usuários
                    </Link>
                    <Link
                      to="/auditoria"
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold ${
                        location.pathname === "/auditoria" ? "bg-white text-[#1e3a8a]" : "bg-white/10 text-white"
                      }`}
                    >
                      <Shield size={18} />
                      Auditoria
                    </Link>
                  </>
                )}

                <Link
                  to="/perfil"
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold ${
                    location.pathname === "/perfil" ? "bg-white text-[#1e3a8a]" : "bg-white/10 text-white"
                  }`}
                >
                  <UserCircle size={18} />
                  Meu Perfil
                </Link>
                
                <Button
                  onClick={() => { setIsOpen(false); logout(); }}
                  variant="outline"
                  className="w-full h-12 flex items-center justify-center gap-3 rounded-xl bg-red-600/20 border-red-500/50 text-white hover:bg-red-600 font-black transition-all"
                >
                  <LogOut size={18} />
                  SAIR DO SISTEMA
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
