import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client-original";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import {
  LogOut,
  Package,
  RefreshCw,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Mail,
  Phone,
  MapPin,
  Loader2,
  Volume2,
  VolumeX,
  CheckCheck,
} from "lucide-react";
import { toast } from "sonner";

interface OrderItem {
  name: string;
  type: string;
  size: string;
  price: number;
  quantity: number;
}

interface Order {
  id: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  items: OrderItem[];
  total: number;
  status: string;
  payment_id: string | null;
  payment_status: string | null;
  shipping_zone: string | null;
  shipping_cost: number | null;
  created_at: string;
  admin_read: boolean;
  admin_read_at: string | null;
}

const ORDER_STATUSES = ["pending", "paid", "preparing", "shipped", "delivered", "cancelled"] as const;

const statusConfig: Record<string, { label: string; bg: string; text: string; border: string }> = {
  pending:   { label: "Pendiente",  bg: "bg-[hsl(var(--status-pending)/.15)]",   text: "text-[hsl(var(--status-pending))]",   border: "border-[hsl(var(--status-pending)/.3)]" },
  paid:      { label: "Pagado",     bg: "bg-[hsl(var(--status-paid)/.15)]",      text: "text-[hsl(var(--status-paid))]",      border: "border-[hsl(var(--status-paid)/.3)]" },
  preparing: { label: "Preparando", bg: "bg-[hsl(var(--status-preparing)/.15)]", text: "text-[hsl(var(--status-preparing))]", border: "border-[hsl(var(--status-preparing)/.3)]" },
  shipped:   { label: "Enviado",    bg: "bg-[hsl(var(--status-shipped)/.15)]",   text: "text-[hsl(var(--status-shipped))]",   border: "border-[hsl(var(--status-shipped)/.3)]" },
  delivered: { label: "Entregado",  bg: "bg-[hsl(var(--status-delivered)/.15)]", text: "text-[hsl(var(--status-delivered))]", border: "border-[hsl(var(--status-delivered)/.3)]" },
  cancelled: { label: "Cancelado",  bg: "bg-[hsl(var(--status-cancelled)/.15)]", text: "text-[hsl(var(--status-cancelled))]", border: "border-[hsl(var(--status-cancelled)/.3)]" },
};

const formatPrice = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 }).format(n);

// Beep sintético (sin assets externos) para notificación de nuevo pedido
function playBeep() {
  try {
    const Ctx = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.42);
  } catch {
    /* noop */
  }
}

const Admin = () => {
  const navigate = useNavigate();
  const { user, loading, isAdmin, signOut } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [readFilter, setReadFilter] = useState<"unread" | "read" | "all">("unread");
  const [soundOn, setSoundOn] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("admin_sound_on") !== "0";
  });
  const soundOnRef = useRef(soundOn);
  soundOnRef.current = soundOn;

  useEffect(() => {
    if (loading) return;
    if (!user || !isAdmin) {
      navigate("/");
      return;
    }
    fetchOrders();
  }, [user, loading, isAdmin, navigate]);

  // Realtime: nuevos pedidos y cambios de estado
  useEffect(() => {
    if (!user || !isAdmin) return;
    const channel = supabase
      .channel("admin-orders")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload) => {
          const newOrder = payload.new as unknown as Order;
          setOrders((prev) => {
            if (prev.some((o) => o.id === newOrder.id)) return prev;
            return [newOrder, ...prev];
          });
          if (soundOnRef.current) playBeep();
          toast.success("Nuevo pedido recibido", {
            description: newOrder.customer_email || newOrder.customer_name,
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        (payload) => {
          const updated = payload.new as unknown as Order;
          setOrders((prev) => prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o)));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, isAdmin]);

  const fetchOrders = async () => {
    setOrdersLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setOrders(data as unknown as Order[]);
    }
    setOrdersLoading(false);
  };

  const updateStatus = async (orderId: string, newStatus: string) => {
    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", orderId);

    if (error) {
      toast.error("Error al actualizar estado");
      return;
    }

    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)));
    toast.success(`Estado actualizado a "${statusConfig[newStatus]?.label || newStatus}"`);
  };

  const markVisibleAsRead = async () => {
    const ids = visibleOrders.filter((o) => !o.admin_read).map((o) => o.id);
    if (ids.length === 0) {
      toast.info("No hay pedidos sin leer en esta vista");
      return;
    }
    const nowIso = new Date().toISOString();
    const { error } = await supabase
      .from("orders")
      .update({ admin_read: true, admin_read_at: nowIso } as never)
      .in("id", ids);
    if (error) {
      toast.error("No se pudo marcar como leído");
      return;
    }
    setOrders((prev) =>
      prev.map((o) => (ids.includes(o.id) ? { ...o, admin_read: true, admin_read_at: nowIso } : o)),
    );
    toast.success(`${ids.length} pedido${ids.length > 1 ? "s" : ""} marcado${ids.length > 1 ? "s" : ""} como leído${ids.length > 1 ? "s" : ""}`);
  };

  const toggleRead = async (order: Order) => {
    const newRead = !order.admin_read;
    const { error } = await supabase
      .from("orders")
      .update({ admin_read: newRead, admin_read_at: newRead ? new Date().toISOString() : null } as never)
      .eq("id", order.id);
    if (error) {
      toast.error("No se pudo actualizar");
      return;
    }
    setOrders((prev) =>
      prev.map((o) => (o.id === order.id ? { ...o, admin_read: newRead, admin_read_at: newRead ? new Date().toISOString() : null } : o)),
    );
  };

  const toggleSound = () => {
    setSoundOn((s) => {
      const next = !s;
      try {
        localStorage.setItem("admin_sound_on", next ? "1" : "0");
      } catch {
        /* noop */
      }
      return next;
    });
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const unreadCount = orders.filter((o) => !o.admin_read).length;

  const visibleOrders = orders.filter((o) => {
    if (readFilter === "unread" && o.admin_read) return false;
    if (readFilter === "read" && !o.admin_read) return false;
    return true;
  });

  const getStatusBadge = (status: string) => {
    const cfg = statusConfig[status] || statusConfig.pending;
    return (
      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
        {cfg.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="font-heading text-xl font-bold uppercase text-foreground">
              <span className="text-foreground">PROKIT</span><span className="text-primary">ARG</span> Admin
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleSound}
              title={soundOn ? "Silenciar notificaciones" : "Activar sonido"}
            >
              {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="sm" onClick={markVisibleAsRead} disabled={unreadCount === 0}>
              <CheckCheck className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">Marcar visto</span>
            </Button>
            <Button variant="outline" size="sm" onClick={fetchOrders}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">Salir</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <h2 className="font-heading text-2xl font-bold uppercase text-foreground">
            Pedidos ({visibleOrders.length})
          </h2>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filtro Leído / No leído */}
            <div className="flex gap-2 flex-wrap">
              {([
                { value: "unread", label: "No leídos", count: unreadCount },
                { value: "read", label: "Leídos", count: null },
                { value: "all", label: "Todos", count: null },
              ] as const).map((f) => (
                <button
                  key={f.value}
                  onClick={() => setReadFilter(f.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold font-heading uppercase tracking-wider border transition-colors flex items-center gap-1.5 ${
                    readFilter === f.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-secondary text-muted-foreground border-border hover:border-primary/50"
                  }`}
                >
                  {f.label}
                  {f.count != null && f.count > 0 && (
                    <span className={`text-[10px] rounded-full px-1.5 py-0.5 ${
                      readFilter === f.value ? "bg-primary-foreground/20" : "bg-primary text-primary-foreground"
                    }`}>
                      {f.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <Button variant="outline" size="sm" onClick={() => navigate("/admin/stock")}>
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">Stock</span>
            </Button>
          </div>
        </div>

        {ordersLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : visibleOrders.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            <Package className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">
              No hay pedidos
              {readFilter === "unread" ? " sin leer" : readFilter === "read" ? " leídos" : ""}
            </p>
          </div>
        ) : (
          <>
            <div className="hidden md:block rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-secondary/50 border-b border-border">
                    <th className="w-8 px-3 py-3"></th>
                    <th className="text-left px-4 py-3 font-heading uppercase tracking-wider text-xs text-muted-foreground">ID</th>
                    <th className="text-left px-4 py-3 font-heading uppercase tracking-wider text-xs text-muted-foreground">Cliente</th>
                    <th className="text-left px-4 py-3 font-heading uppercase tracking-wider text-xs text-muted-foreground">Total</th>
                    <th className="text-left px-4 py-3 font-heading uppercase tracking-wider text-xs text-muted-foreground">Pago</th>
                    <th className="text-left px-4 py-3 font-heading uppercase tracking-wider text-xs text-muted-foreground">Estado</th>
                    <th className="text-left px-4 py-3 font-heading uppercase tracking-wider text-xs text-muted-foreground">Fecha</th>
                    <th className="text-left px-4 py-3 font-heading uppercase tracking-wider text-xs text-muted-foreground">Acción</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {visibleOrders.map((order) => (
                    <>
                      <tr
                        key={order.id}
                        onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                        className={`border-b border-border hover:bg-secondary/30 cursor-pointer transition-colors ${
                          !order.admin_read ? "bg-primary/[0.03]" : ""
                        }`}
                      >
                        <td className="px-3 py-3" onClick={(e) => { e.stopPropagation(); toggleRead(order); }}>
                          {!order.admin_read ? (
                            <span
                              className="block h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))] cursor-pointer"
                              title="Sin leer · click para marcar leído"
                            />
                          ) : (
                            <span
                              className="block h-2.5 w-2.5 rounded-full bg-transparent border border-muted-foreground/30 cursor-pointer hover:border-primary/60"
                              title="Leído · click para marcar sin leer"
                            />
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{order.id.slice(0, 8)}…</td>
                        <td className={`px-4 py-3 font-medium ${!order.admin_read ? "text-foreground" : "text-muted-foreground"}`}>
                          {order.customer_email || order.customer_name}
                        </td>
                        <td className="px-4 py-3 text-primary font-bold font-heading">{formatPrice(order.total)}</td>
                        <td className="px-4 py-3">{getStatusBadge(order.payment_status || "pending")}</td>
                        <td className="px-4 py-3">{getStatusBadge(order.status)}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(order.created_at).toLocaleDateString("es-AR")}</td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <Select value={order.status} onValueChange={(v) => updateStatus(order.id, v)}>
                            <SelectTrigger className="w-[140px] h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ORDER_STATUSES.map((s) => (
                                <SelectItem key={s} value={s}>{statusConfig[s].label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {expandedId === order.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </td>
                      </tr>
                      <AnimatePresence>
                        {expandedId === order.id && (
                          <tr key={`${order.id}-detail`}>
                            <td colSpan={9} className="p-0">
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <OrderDetail order={order} />
                              </motion.div>
                            </td>
                          </tr>
                        )}
                      </AnimatePresence>
                    </>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden space-y-4">
              {visibleOrders.map((order, i) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className={`rounded-xl bg-card border overflow-hidden ${
                    !order.admin_read ? "border-primary/40" : "border-border"
                  }`}
                >
                  <button
                    onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                    className="w-full p-4 text-left"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 flex items-start gap-2">
                        {!order.admin_read && (
                          <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                        )}
                        <div>
                          <p className="text-foreground font-medium text-sm">{order.customer_email || order.customer_name}</p>
                          <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString("es-AR")}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="font-heading text-primary font-bold">{formatPrice(order.total)}</span>
                        {getStatusBadge(order.status)}
                      </div>
                    </div>
                  </button>

                  <AnimatePresence>
                    {expandedId === order.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 space-y-3">
                          <div onClick={(e) => e.stopPropagation()}>
                            <label className="text-xs text-muted-foreground font-heading uppercase tracking-wider">Cambiar estado</label>
                            <Select value={order.status} onValueChange={(v) => updateStatus(order.id, v)}>
                              <SelectTrigger className="w-full h-9 mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ORDER_STATUSES.map((s) => (
                                  <SelectItem key={s} value={s}>{statusConfig[s].label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={(e) => { e.stopPropagation(); toggleRead(order); }}
                          >
                            {order.admin_read ? "Marcar como no leído" : "Marcar como leído"}
                          </Button>
                          <OrderDetail order={order} />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const OrderDetail = ({ order }: { order: Order }) => (
  <div className="bg-secondary/30 rounded-xl p-4 space-y-4">
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {order.customer_email && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Mail className="h-4 w-4 shrink-0" />
          <span>{order.customer_email}</span>
        </div>
      )}
      {order.customer_phone && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Phone className="h-4 w-4 shrink-0" />
          <span>{order.customer_phone}</span>
        </div>
      )}
      {order.shipping_zone && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 shrink-0" />
          <span>{order.shipping_zone}</span>
        </div>
      )}
    </div>

    <div>
      <p className="text-xs text-muted-foreground font-heading uppercase tracking-wider mb-2">Productos</p>
      <div className="space-y-1">
        {order.items.map((item, j) => (
          <div key={j} className="flex justify-between text-sm">
            <span className="text-foreground">
              {item.name} — {item.type} — Talle {item.size} x{item.quantity}
            </span>
            <span className="text-muted-foreground">{formatPrice(item.price * item.quantity)}</span>
          </div>
        ))}
      </div>
    </div>

    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pt-2 border-t border-border">
      {order.shipping_cost != null && <span>Envío: {formatPrice(order.shipping_cost)}</span>}
      <span>Pago: {order.payment_status || "pending"}</span>
      {order.payment_id && <span>Payment ID: {order.payment_id}</span>}
      <span className="ml-auto text-foreground font-bold font-heading text-sm">Total: {formatPrice(order.total)}</span>
    </div>
  </div>
);

export default Admin;
