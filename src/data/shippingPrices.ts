export type DeliveryType = "domicilio" | "sucursal";
export type ShippingZoneId = "caba" | "gba" | "interior" | "prueba";
export type ShippingSpeed = "expreso" | "clasico";

export interface ProvinceOption {
  id: string;
  label: string;
}

export const ZONES: { id: ShippingZoneId; label: string }[] = [
  { id: "caba", label: "CABA" },
  { id: "gba", label: "Buenos Aires" },
  { id: "interior", label: "Interior del país" },
  { id: "prueba", label: "Prueba (gratis)" },
];

export const INTERIOR_PROVINCES: ProvinceOption[] = [
  { id: "catamarca", label: "Catamarca" },
  { id: "chaco", label: "Chaco" },
  { id: "chubut", label: "Chubut" },
  { id: "cordoba", label: "Córdoba" },
  { id: "corrientes", label: "Corrientes" },
  { id: "entre_rios", label: "Entre Ríos" },
  { id: "formosa", label: "Formosa" },
  { id: "jujuy", label: "Jujuy" },
  { id: "la_pampa", label: "La Pampa" },
  { id: "la_rioja", label: "La Rioja" },
  { id: "mendoza", label: "Mendoza" },
  { id: "misiones", label: "Misiones" },
  { id: "neuquen", label: "Neuquén" },
  { id: "rio_negro", label: "Río Negro" },
  { id: "salta", label: "Salta" },
  { id: "san_juan", label: "San Juan" },
  { id: "san_luis", label: "San Luis" },
  { id: "santa_cruz", label: "Santa Cruz" },
  { id: "santa_fe", label: "Santa Fe" },
  { id: "santiago_del_estero", label: "Santiago del Estero" },
  { id: "tierra_del_fuego", label: "Tierra del Fuego" },
  { id: "tucuman", label: "Tucumán" },
];

type PricePair = { expreso: number; clasico: number };

const INTERIOR_PRICES: Record<string, { domicilio: PricePair; sucursal: PricePair }> = {
  // Tier 2: nearby provinces
  cordoba:       { domicilio: { expreso: 12512, clasico: 9102 }, sucursal: { expreso: 7540, clasico: 5481 } },
  entre_rios:    { domicilio: { expreso: 12512, clasico: 9102 }, sucursal: { expreso: 7540, clasico: 5481 } },
  la_pampa:      { domicilio: { expreso: 12512, clasico: 9102 }, sucursal: { expreso: 7540, clasico: 5481 } },
  santa_fe:      { domicilio: { expreso: 12512, clasico: 9102 }, sucursal: { expreso: 7540, clasico: 5481 } },

  // Tier 3: mid-distance
  catamarca:           { domicilio: { expreso: 18172, clasico: 9914 }, sucursal: { expreso: 11053, clasico: 6030 } },
  chaco:               { domicilio: { expreso: 18172, clasico: 9914 }, sucursal: { expreso: 11053, clasico: 6030 } },
  corrientes:          { domicilio: { expreso: 18172, clasico: 9914 }, sucursal: { expreso: 11053, clasico: 6030 } },
  formosa:             { domicilio: { expreso: 18172, clasico: 9914 }, sucursal: { expreso: 11053, clasico: 6030 } },
  la_rioja:            { domicilio: { expreso: 18172, clasico: 9914 }, sucursal: { expreso: 11053, clasico: 6030 } },
  mendoza:             { domicilio: { expreso: 18172, clasico: 9914 }, sucursal: { expreso: 11053, clasico: 6030 } },
  misiones:            { domicilio: { expreso: 18172, clasico: 9914 }, sucursal: { expreso: 11053, clasico: 6030 } },
  neuquen:             { domicilio: { expreso: 18172, clasico: 9914 }, sucursal: { expreso: 11053, clasico: 6030 } },
  rio_negro:           { domicilio: { expreso: 18172, clasico: 9914 }, sucursal: { expreso: 11053, clasico: 6030 } },
  san_juan:            { domicilio: { expreso: 18172, clasico: 9914 }, sucursal: { expreso: 11053, clasico: 6030 } },
  san_luis:            { domicilio: { expreso: 18172, clasico: 9914 }, sucursal: { expreso: 11053, clasico: 6030 } },
  santiago_del_estero: { domicilio: { expreso: 18172, clasico: 9914 }, sucursal: { expreso: 11053, clasico: 6030 } },
  tucuman:             { domicilio: { expreso: 18172, clasico: 9914 }, sucursal: { expreso: 11053, clasico: 6030 } },

  // Tier 4: Patagonia + Jujuy/Salta
  chubut:          { domicilio: { expreso: 22895, clasico: 9987 }, sucursal: { expreso: 14435, clasico: 6299 } },
  jujuy:           { domicilio: { expreso: 22895, clasico: 9987 }, sucursal: { expreso: 14435, clasico: 6299 } },
  salta:           { domicilio: { expreso: 22895, clasico: 9987 }, sucursal: { expreso: 14435, clasico: 6299 } },
  santa_cruz:      { domicilio: { expreso: 22895, clasico: 9987 }, sucursal: { expreso: 14435, clasico: 6299 } },
  tierra_del_fuego:{ domicilio: { expreso: 22895, clasico: 9987 }, sucursal: { expreso: 14435, clasico: 6299 } },
};

const CABA_GBA_PRICES: { domicilio: PricePair; sucursal: PricePair } = {
  domicilio: { expreso: 8352, clasico: 7591 },
  sucursal:  { expreso: 4854, clasico: 4415 },
};

const PRUEBA_PRICES: { domicilio: PricePair; sucursal: PricePair } = {
  domicilio: { expreso: 1, clasico: 1 },
  sucursal:  { expreso: 1, clasico: 1 },
};

export function getShippingPrices(
  deliveryType: DeliveryType,
  zone: ShippingZoneId,
  provinceId?: string | null
): PricePair | null {
  if (zone === "caba" || zone === "gba") {
    return CABA_GBA_PRICES[deliveryType];
  }
  if (zone === "interior" && provinceId && INTERIOR_PRICES[provinceId]) {
    return INTERIOR_PRICES[provinceId][deliveryType];
  }
  if (zone === "prueba") {
    return PRUEBA_PRICES[deliveryType];
  }
  return null;
}

export function getShippingLabel(
  zone: ShippingZoneId,
  speed: ShippingSpeed,
  provinceId?: string | null
): string {
  if (zone === "prueba") {
    return "Prueba (gratis)";
  }
  const speedLabel = speed === "expreso" ? "Expreso" : "Clásico";
  if (zone === "interior" && provinceId) {
    const prov = INTERIOR_PROVINCES.find((p) => p.id === provinceId);
    return `${prov?.label || "Interior"} — PAQ.AR ${speedLabel}`;
  }
  const zoneLabel = ZONES.find((z) => z.id === zone)?.label || "";
  return `${zoneLabel} — PAQ.AR ${speedLabel}`;
}
