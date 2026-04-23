import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client-original";

export interface StockEntry {
  product_key: string;
  size: string;
  quantity: number;
}

type StockMap = Record<string, Record<string, number>>;

function buildMap(rows: StockEntry[]): StockMap {
  const map: StockMap = {};
  for (const r of rows) {
    if (!map[r.product_key]) map[r.product_key] = {};
    map[r.product_key][r.size] = r.quantity;
  }
  return map;
}

export function useStock() {
  const [stock, setStock] = useState<StockMap>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchStock = async () => {
      const { data } = await supabase.from("product_stock").select("*");
      if (mounted && data) setStock(buildMap(data as StockEntry[]));
      if (mounted) setLoading(false);
    };
    fetchStock();

    const channel = supabase
      .channel(`stock-changes-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "product_stock" },
        () => fetchStock(),
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const getQty = (productKey: string, size: string): number =>
    stock[productKey]?.[size] ?? 0;

  return { stock, loading, getQty };
}
