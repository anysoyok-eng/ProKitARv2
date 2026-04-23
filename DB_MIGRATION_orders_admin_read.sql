-- ============================================================
-- Migración para que el panel /admin tenga "no leídos / leídos"
-- y para que cliente vea cambios de estado en tiempo real.
--
-- COPIÁ Y PEGÁ ESTE SQL en el editor SQL de Lovable Cloud
-- (Cloud → Database → SQL Editor) y ejecutalo UNA SOLA VEZ.
-- ============================================================

-- 1) Columnas de "leído" para el panel admin
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS admin_read boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS admin_read_at timestamptz;

-- 2) Habilitar Realtime (INSERT cuando llega pedido nuevo,
--    UPDATE cuando cambia el estado y el cliente está mirando su perfil)
ALTER TABLE public.orders REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'orders'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.orders';
  END IF;
END $$;
