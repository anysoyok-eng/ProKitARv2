import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client-original";
import { useAuth } from "@/context/AuthContext";
import { products } from "@/data/products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Loader2, Save, Package } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface StockRow {
  product_key: string;
  size: string;
  quantity: number;
}

const AdminStock = () => {
  const navigate = useNavigate();
  const { user, loading, isAdmin } = useAuth();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [originalQuantities, setOriginalQuantities] = useState<Record<string, number>>({});
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user || !isAdmin) {
      navigate("/");
      return;
    }
    fetchStock();
  }, [user, loading, isAdmin, navigate]);

  const fetchStock = async () => {
    setFetching(true);
    const { data, error } = await supabase.from("product_stock").select("*");
    if (error) {
      toast.error("No se pudo cargar el stock");
      setFetching(false);
      return;
    }
    const map: Record<string, number> = {};
    (data as StockRow[]).forEach((r) => {
      map[`${r.product_key}::${r.size}`] = r.quantity;
    });
    // Asegurar que todos los talles existan en el state (aunque la DB no los tenga)
    products.forEach((p) => {
      p.sizes.forEach((s) => {
        const key = `${p.productKey}::${s}`;
        if (!(key in map)) map[key] = 0;
      });
    });
    setQuantities(map);
    setOriginalQuantities({ ...map });
    setFetching(false);
  };

  const setQty = (productKey: string, size: string, value: number) => {
    const key = `${productKey}::${size}`;
    setQuantities((prev) => ({ ...prev, [key]: Math.max(0, value) }));
  };

  const saveOne = async (productKey: string, size: string) => {
    const key = `${productKey}::${size}`;
    const qty = quantities[key] ?? 0;
    setSaving(key);
    const { error } = await supabase
      .from("product_stock")
      .upsert(
        { product_key: productKey, size, quantity: qty, updated_at: new Date().toISOString() } as never,
        { onConflict: "product_key,size" },
      );
    setSaving(null);
    if (error) {
      toast.error("No se pudo guardar");
      return;
    }
    setOriginalQuantities((prev) => ({ ...prev, [key]: qty }));
    toast.success("Stock actualizado");
  };

  const saveAll = async () => {
    const changes = Object.entries(quantities).filter(
      ([k, v]) => originalQuantities[k] !== v,
    );
    if (changes.length === 0) {
      toast.info("No hay cambios para guardar");
      return;
    }
    setSaving("all");
    const rows = changes.map(([k, qty]) => {
      const [product_key, size] = k.split("::");
      return { product_key, size, quantity: qty, updated_at: new Date().toISOString() };
    });
    const { error } = await supabase
      .from("product_stock")
      .upsert(rows as never, { onConflict: "product_key,size" });
    setSaving(null);
    if (error) {
      toast.error("No se pudo guardar");
      return;
    }
    setOriginalQuantities({ ...quantities });
    toast.success(`${changes.length} cambio${changes.length > 1 ? "s" : ""} guardado${changes.length > 1 ? "s" : ""}`);
  };

  const hasUnsavedChanges = Object.keys(quantities).some(
    (k) => originalQuantities[k] !== quantities[k],
  );

  if (loading || fetching) {
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
            <button
              onClick={() => navigate("/admin")}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="font-heading text-xl font-bold uppercase text-foreground">
              Control de stock
            </h1>
          </div>
          <Button onClick={saveAll} disabled={!hasUnsavedChanges || saving === "all"}>
            {saving === "all" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span className="ml-2 hidden sm:inline">Guardar todo</span>
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-6">
        <p className="text-muted-foreground text-sm">
          Editá la cantidad disponible por talle. Si un talle queda en{" "}
          <span className="text-destructive font-semibold">0</span>, no se va a poder
          comprar en la web.
        </p>

        {products.map((product, i) => (
          <motion.div
            key={product.productKey}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-xl bg-card border border-border overflow-hidden"
          >
            <div className="flex items-center gap-4 p-4 border-b border-border">
              <img
                src={product.images[0]}
                alt={product.name}
                className="w-16 h-16 rounded-lg object-cover bg-background"
              />
              <div className="flex-1">
                <h2 className="font-heading text-lg font-bold uppercase text-foreground">
                  {product.name}
                </h2>
                <p className="text-xs text-muted-foreground">
                  Clave: <span className="font-mono">{product.productKey}</span>
                </p>
              </div>
              <Package className="h-5 w-5 text-muted-foreground hidden sm:block" />
            </div>

            <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {product.sizes.map((size) => {
                const key = `${product.productKey}::${size}`;
                const qty = quantities[key] ?? 0;
                const changed = originalQuantities[key] !== qty;
                return (
                  <div
                    key={size}
                    className={`rounded-lg border p-3 space-y-2 ${
                      qty === 0
                        ? "border-destructive/40 bg-destructive/5"
                        : changed
                        ? "border-primary/50 bg-primary/5"
                        : "border-border bg-background"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-heading font-bold text-sm uppercase">
                        Talle {size}
                      </span>
                      {qty === 0 && (
                        <span className="text-[10px] font-bold uppercase text-destructive">
                          Sin stock
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0 shrink-0"
                        onClick={() => setQty(product.productKey, size, qty - 1)}
                      >
                        −
                      </Button>
                      <Input
                        type="number"
                        min={0}
                        value={qty}
                        onChange={(e) =>
                          setQty(product.productKey, size, parseInt(e.target.value) || 0)
                        }
                        className="h-8 text-center px-1"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0 shrink-0"
                        onClick={() => setQty(product.productKey, size, qty + 1)}
                      >
                        +
                      </Button>
                    </div>
                    <Button
                      variant={changed ? "default" : "outline"}
                      size="sm"
                      className="w-full h-7 text-xs"
                      disabled={!changed || saving === key}
                      onClick={() => saveOne(product.productKey, size)}
                    >
                      {saving === key ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : changed ? (
                        "Guardar"
                      ) : (
                        "Guardado"
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default AdminStock;
