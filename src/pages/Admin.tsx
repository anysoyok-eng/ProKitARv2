import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import {
  LogOut, Package, RefreshCw, ArrowLeft, ChevronDown, ChevronUp,
  Mail, Phone, MapPin, Loader2, Volume2, VolumeX, CheckCheck,
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

// ---- Persistencia local de "leído" y "visto" (no toca la DB) ----
const READ_KEY = "prokitarg_admin_read_orders";
const SOUND_KEY = "prokitarg_admin_sound_enabled";
const LAST_SEEN_KEY = "prokitarg_admin_last_seen_at";

const loadReadIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(READ_KEY);
    return new Set<string>(raw ? JSON.parse(raw) : []);
  } catch { return new Set(); }
};
const saveReadIds = (s: Set<string>) => {
  try { localStorage.setItem(READ_KEY, JSON.stringify(Array.from(s))); } catch { /* noop */ }
};

// Beep usando Web Audio API (sin assets)
const playBeep = () => {
  try {
    const Ctx = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = 880;
    o.connect(g); g.connect(ctx.destination);
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45);
    o.start();
    o.stop(ctx.currentTime + 0.5);
    setTimeout(() => ctx.close().catch(() => {}), 700);
  } catch { /* noop */ }
};

const Admin = () => {
  const navigate = useNavigate();
  const { user, loading, isAdmin, signOut } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [readFilter, setReadFilter] = useState<"unread" | "read" | "all">("unread");

  const [readIds, setReadIds] = useState<Set<string>>(() => loadReadIds());
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try { return localStorage.getItem(SOUND_KEY) !== "false"; } catch { return true; }
  });

  const knownIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);

  useEffect(() => {
    if (loading) return;
    if (!user || !isAdmin) {
      navigate("/");
      return;
    }
    fetchOrders();
    // Polling cada 20s para detectar pedidos nuevos
    const id = window.setInterval(() => fetchOrders(true), 20000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading, isAdmin]);

  useEffect(() => {
    try { localStorage.setItem(SOUND_KEY, soundEnabled ? "true" : "false"); } catch { /* noop */ }
  }, [soundEnabled]);

  const fetchOrders = async (silent = false) => {
    if (!silent) setOrdersLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      const list = data as unknown as Order[];

      // Detectar pedidos nuevos vs los que ya conocíamos en sesión
      if (initializedRef.current) {
        const newIncoming = list.filter(o => !knownIdsRef.current.has(o.id));
        if (newIncoming.length > 0) {
          if (soundEnabled) playBeep();
          toast.success(`${newIncoming.length} nuevo${newIncoming.length > 1 ? "s" : ""} pedido${newIncoming.length > 1 ? "s" : ""}`);
        }
      } else {
        initializedRef.current = true;
      }
      knownIdsRef.current = new Set(list.map(o => o.id));
      setOrders(list);
    }
    if (!silent) setOrdersLoading(false);
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

    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    toast.success(`Estado actualizado a "${statusConfig[newStatus]?.label || newStatus}"`);
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const markAsRead = (orderId: string) => {
    setReadIds(prev => {
      if (prev.has(orderId)) return prev;
      const next = new Set(prev); next.add(orderId); saveReadIds(next); return next;
    });
  };

  const toggleRead = (orderId: string) => {
    setReadIds(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId); else next.add(orderId);
      saveReadIds(next);
      return next;
    });
  };

  const markAllAsSeen = () => {
    const next = new Set(readIds);
    orders.forEach(o => next.add(o.id));
    saveReadIds(next);
    setReadIds(next);
    try { localStorage.setItem(LAST_SEEN_KEY, new Date().toISOString()); } catch { /* noop */ }
    toast.success("Todos los pedidos marcados como vistos");
  };

  const handleToggleRow = (orderId: string) => {
    const opening = expandedId !== orderId;
    setExpandedId(opening ? orderId : null);
    if (opening) markAsRead(orderId);
  };

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      const isRead = readIds.has(o.id);
      if (readFilter === "unread" && isRead) return false;
      if (readFilter === "read" && !isRead) return false;
      return true;
    });
  }, [orders, statusFilter, readFilter, readIds]);

  const unreadCount = useMemo(
    () => orders.reduce((acc, o) => acc + (readIds.has(o.id) ? 0 : 1), 0),
    [orders, readIds]
  );

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

  const readFilters: { value: "unread" | "read" | "all"; label: string; count?: number }[] = [
    { value: "unread", label: "No leídos", count: unreadCount },
    { value: "read", label: "Leídos" },
    { value: "all", label: "Todos" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="font-heading text-xl font-bold uppercase text-foreground">
              <span className="text-foreground">PROKIT</span><span className="text-primary">AR</span>G Admin
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSoundEnabled(s => !s)}
              title={soundEnabled ? "Silenciar notificaciones" : "Activar sonido"}
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={markAllAsSeen}
              disabled={unreadCount === 0}
              title="Marcar todos como vistos"
            >
              <CheckCheck className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">Marcar visto</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => fetchOrders()}>
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
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h2 className="font-heading text-2xl font-bold uppercase text-foreground">
            Pedidos ({filteredOrders.length})
          </h2>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex gap-2 flex-wrap">
              {readFilters.map(f => (
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
                  {typeof f.count === "number" && f.count > 0 && (
                    <span className={`min-w-[18px] h-[18px] inline-flex items-center justify-center rounded-full text-[10px] font-bold ${
                      readFilter === f.value ? "bg-primary-foreground/20" : "bg-primary text-primary-foreground"
                    }`}>
                      {f.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div className="h-6 w-px bg-border hidden sm:block" />
            <div className="flex gap-2 flex-wrap">
              {[
                { value: "all", label: "Todos" },
                { value: "pending", label: "Pendientes" },
                { value: "paid", label: "Pagados" },
                { value: "preparing", label: "Preparando" },
                { value: "shipped", label: "Enviados" },
                { value: "delivered", label: "Entregados" },
                { value: "cancelled", label: "Cancelados" },
              ].map(f => (
                <button
                  key={f.value}
                  onClick={() => setStatusFilter(f.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold font-heading uppercase tracking-wider border transition-colors ${
                    statusFilter === f.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-secondary text-muted-foreground border-border hover:border-primary/50"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {ordersLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            <Package className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">
              No hay pedidos
              {readFilter === "unread" ? " sin leer" : readFilter === "read" ? " leídos" : ""}
              {statusFilter !== "all" ? ` con estado "${statusConfig[statusFilter]?.label}"` : ""}
            </p>
          </div>
        ) : (
          <>
            <div className="hidden md:block rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-secondary/50 border-b border-border">
                    <th className="px-3 py-3"></th>
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
                  {filteredOrders.map((order) => {
                    const isRead = readIds.has(order.id);
                    return (
                    <>
                      <tr
                        key={order.id}
                        onClick={() => handleToggleRow(order.id)}
                        className={`border-b border-border hover:bg-secondary/30 cursor-pointer transition-colors ${!isRead ? "bg-primary/5" : ""}`}
                      >
                        <td className="px-3 py-3">
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleRead(order.id); }}
                            title={isRead ? "Marcar como no leído" : "Marcar como leído"}
                            className="flex items-center justify-center"
                          >
                            <span className={`h-2.5 w-2.5 rounded-full ${!isRead ? "bg-primary shadow-[0_0_8px_hsl(var(--primary))]" : "bg-muted-foreground/30"}`} />
                          </button>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{order.id.slice(0, 8)}…</td>
                        <td className={`px-4 py-3 ${!isRead ? "font-bold text-foreground" : "text-foreground font-medium"}`}>
                          {order.customer_email || order.customer_name}
                        </td>
                        <td className="px-4 py-3 text-primary font-bold font-heading">{formatPrice(order.total)}</td>
                        <td className="px-4 py-3">{getStatusBadge(order.payment_status || "pending")}</td>
                        <td className="px-4 py-3">{getStatusBadge(order.status)}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(order.created_at).toLocaleDateString("es-AR")}</td>
                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                          <Select value={order.status} onValueChange={(v) => updateStatus(order.id, v)}>
                            <SelectTrigger className="w-[140px] h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ORDER_STATUSES.map(s => (
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
                  );})}
                </tbody>
              </table>
            </div>

            <div className="md:hidden space-y-4">
              {filteredOrders.map((order, i) => {
                const isRead = readIds.has(order.id);
                return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className={`rounded-xl bg-card border overflow-hidden ${!isRead ? "border-primary/40" : "border-border"}`}
                >
                  <button
                    onClick={() => handleToggleRow(order.id)}
                    className="w-full p-4 text-left"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2">
                        <span className={`mt-1.5 h-2.5 w-2.5 rounded-full shrink-0 ${!isRead ? "bg-primary shadow-[0_0_8px_hsl(var(--primary))]" : "bg-muted-foreground/30"}`} />
                        <div className="space-y-1">
                          <p className={`text-sm ${!isRead ? "font-bold text-foreground" : "text-foreground font-medium"}`}>
                            {order.customer_email || order.customer_name}
                          </p>
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
                          <div onClick={e => e.stopPropagation()} className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => toggleRead(order.id)}>
                              {isRead ? "Marcar no leído" : "Marcar leído"}
                            </Button>
                          </div>
                          <div onClick={e => e.stopPropagation()}>
                            <label className="text-xs text-muted-foreground font-heading uppercase tracking-wider">Cambiar estado</label>
                            <Select value={order.status} onValueChange={(v) => updateStatus(order.id, v)}>
                              <SelectTrigger className="w-full h-9 mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ORDER_STATUSES.map(s => (
                                  <SelectItem key={s} value={s}>{statusConfig[s].label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <OrderDetail order={order} />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );})}
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
