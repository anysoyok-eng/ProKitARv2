import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client-original";
import { useAuth } from "@/context/AuthContext";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Package, LogOut, ShoppingBag, Clock, CheckCircle2, XCircle, Loader2, Settings } from "lucide-react";

interface OrderItem {
  name: string;
  type: string;
  size: string;
  price: number;
  quantity: number;
}

interface Order {
  id: string;
  items: OrderItem[];
  total: number;
  status: string;
  payment_status: string | null;
  created_at: string;
  customer_name: string;
  shipping_zone: string | null;
  shipping_cost: number | null;
}

const formatPrice = (n: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  }).format(n);

const statusConfig: Record<string, { icon: typeof Clock; label: string; className: string }> = {
  pending: { icon: Clock, label: "Pendiente", className: "bg-yellow-600/20 text-yellow-500 border-yellow-600/30" },
  paid: { icon: CheckCircle2, label: "Pagado", className: "bg-green-600/20 text-green-500 border-green-600/30" },
  approved: { icon: CheckCircle2, label: "Pagado", className: "bg-green-600/20 text-green-500 border-green-600/30" },
  preparing: { icon: Package, label: "Preparando", className: "bg-blue-600/20 text-blue-400 border-blue-600/30" },
  shipped: { icon: Package, label: "Enviado", className: "bg-blue-600/20 text-blue-500 border-blue-600/30" },
  delivered: { icon: CheckCircle2, label: "Entregado", className: "bg-green-600/20 text-green-500 border-green-600/30" },
  rejected: { icon: XCircle, label: "Rechazado", className: "bg-destructive/20 text-destructive border-destructive/30" },
  cancelled: { icon: XCircle, label: "Cancelado", className: "bg-destructive/20 text-destructive border-destructive/30" },
};

function getOrderStatus(order: Order): string {
  if (order.status && order.status !== "awaiting_payment") {
    return order.status;
  }
  return order.payment_status || "pending";
}

const Profile = () => {
  const navigate = useNavigate();
  const { user, loading, isAdmin, signOut } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate("/cuenta", { state: { from: "/perfil" } });
      return;
    }
    fetchOrders();
  }, [user, loading, navigate]);

  // Realtime: actualizar estado del pedido en vivo cuando el admin lo cambia
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`profile-orders-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const updated = payload.new as unknown as Order;
          setOrders((prev) => prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o)));
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newOrder = payload.new as unknown as Order;
          setOrders((prev) => (prev.some((o) => o.id === newOrder.id) ? prev : [newOrder, ...prev]));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchOrders = async () => {
    setOrdersLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setOrders(data as unknown as Order[]);
    }
    setOrdersLoading(false);
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="font-heading text-xl font-bold uppercase text-foreground">
              Mi perfil
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={() => navigate("/admin")}>
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">Admin</span>
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">Cerrar sesión</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl bg-card border border-border p-5 mb-8"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
              <span className="font-heading text-lg font-bold text-primary">
                {user.email?.[0]?.toUpperCase() || "U"}
              </span>
            </div>
            <div>
              <p className="font-heading font-bold text-foreground">{user.email}</p>
              <p className="text-xs text-muted-foreground">
                Miembro desde {new Date(user.created_at).toLocaleDateString("es-AR")}
              </p>
            </div>
          </div>
        </motion.div>

        <div className="space-y-2 mb-6">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-2xl font-bold uppercase text-foreground">
              Mis pedidos
            </h2>
            <span className="text-sm text-muted-foreground">{orders.length} pedido{orders.length !== 1 ? "s" : ""}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Acá podés ver el estado actualizado de todos tus pedidos.
          </p>
        </div>

        {ordersLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : orders.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20 space-y-4"
          >
            <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">Todavía no tenés pedidos</p>
            <Button variant="outline" onClick={() => navigate("/")}>
              Ir a comprar
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {orders.map((order, i) => {
              const effectiveStatus = getOrderStatus(order);
              const statusInfo = statusConfig[effectiveStatus] || statusConfig.pending;
              const StatusIcon = statusInfo.icon;

              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-xl bg-card border border-border p-5 space-y-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString("es-AR", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${statusInfo.className}`}>
                        <StatusIcon className="h-3 w-3" />
                        {statusInfo.label}
                      </span>
                      <span className="font-heading text-lg font-bold text-primary">
                        {formatPrice(order.total)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    {order.items.map((item, j) => (
                      <div key={j} className="flex justify-between text-sm text-muted-foreground">
                        <span>{item.name} — Talle {item.size} x{item.quantity}</span>
                        <span>{formatPrice(item.price * item.quantity)}</span>
                      </div>
                    ))}
                    {order.shipping_zone && (
                      <div className="flex justify-between text-sm text-muted-foreground pt-1 border-t border-border/50 mt-2">
                        <span>Envío — {order.shipping_zone}</span>
                        <span>{order.shipping_cost ? formatPrice(order.shipping_cost) : "Gratis"}</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
