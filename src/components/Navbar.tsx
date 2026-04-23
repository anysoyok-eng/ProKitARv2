import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, Menu, X, User, LogOut, Settings } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/logo.png";

const navLinks = [
  { label: "Productos", href: "#productos" },
  { label: "Envíos", href: "#envios" },
  { label: "Contacto", href: "#contacto" },
];

const Navbar = () => {
  const { totalItems, setIsOpen } = useCart();
  const { user, isAdmin, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleProfileClick = () => {
    if (user) {
      navigate("/perfil");
    } else {
      navigate("/cuenta");
    }
    setMenuOpen(false);
  };

  const handleLogout = async () => {
    await signOut();
    setMenuOpen(false);
  };

  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50"
    >
      {/* Main nav bar */}
      <div className="bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 rounded-lg text-foreground hover:bg-secondary transition-colors"
              aria-label="Abrir menú"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            <button
              onClick={() => { window.scrollTo({ top: 0, behavior: "smooth" }); setMenuOpen(false); }}
              className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
            >
              <img
                src={logo}
              alt="PROKITAR logo"
                className="h-7 sm:h-9 w-auto object-contain"
              />
              <span className="font-heading text-sm sm:text-base font-bold uppercase tracking-wide">
                <span className="text-foreground">PROKIT</span>
                <span className="text-sky-400">AR</span>
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setIsOpen(true)}
              className="relative inline-flex items-center gap-2 rounded-full bg-secondary border border-border px-3 py-2 text-sm font-semibold text-foreground hover:border-primary/50 transition-colors"
            >
              <ShoppingBag className="h-4 w-4" />
              <span className="hidden sm:inline font-heading uppercase tracking-wider text-xs">Carrito</span>
              {totalItems > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center"
                >
                  {totalItems}
                </motion.span>
              )}
            </button>

            <button
              onClick={handleProfileClick}
              className="relative inline-flex items-center gap-2 rounded-full bg-secondary border border-border px-3 py-2 text-sm font-semibold text-foreground hover:border-primary/50 transition-colors"
            >
              <User className="h-4 w-4" />
              <span className="hidden sm:inline font-heading uppercase tracking-wider text-xs">
                {user ? "Perfil" : "Cuenta"}
              </span>
              {user && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-background" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Divider bar */}
      <div className="h-1 bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden border-t border-border/50 bg-background/95 backdrop-blur-xl"
          >
            <div className="container mx-auto px-4 py-4 flex flex-col gap-2">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="py-2 px-3 rounded-lg text-sm font-heading uppercase tracking-wider font-semibold text-foreground hover:bg-secondary transition-colors"
                >
                  {link.label}
                </a>
              ))}

              <button
                onClick={handleProfileClick}
                className="py-2 px-3 rounded-lg text-sm font-heading uppercase tracking-wider font-semibold text-foreground hover:bg-secondary transition-colors text-left"
              >
                {user ? "Mi perfil" : "Iniciar sesión"}
              </button>

              {isAdmin && (
                <button
                  onClick={() => { navigate("/admin"); setMenuOpen(false); }}
                  className="py-2 px-3 rounded-lg text-sm font-heading uppercase tracking-wider font-semibold text-primary hover:bg-secondary transition-colors text-left flex items-center gap-2"
                >
                  <Settings className="h-4 w-4" />
                  Admin
                </button>
              )}

              {user && (
                <button
                  onClick={handleLogout}
                  className="py-2 px-3 rounded-lg text-sm font-heading uppercase tracking-wider font-semibold text-muted-foreground hover:bg-secondary transition-colors text-left flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Cerrar sesión
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

export default Navbar;
