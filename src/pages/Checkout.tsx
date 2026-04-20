import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { motion } from "framer-motion";
import {
  Loader2,
  ShoppingBag,
  ArrowLeft,
  User,
  Shield,
  CreditCard,
  MapPin,
  Truck,
  Package,
  Phone,
} from "lucide-react";
import {
  type DeliveryType,
  type ShippingZoneId,
  type ShippingSpeed,
  ZONES,
  INTERIOR_PROVINCES,
  getShippingPrices,
  getShippingLabel,
} from "@/data/shippingPrices";
import { getBranchesFor } from "@/data/branches";

const formatPrice = (n: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  }).format(n);

/* ───── Empty cart ───── */
const EmptyCart = ({ onBack }: { onBack: () => void }) => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="text-center space-y-4">
      <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground" />
      <h1 className="font-heading text-2xl font-bold text-foreground">Carrito vacío</h1>
      <Button variant="outline" onClick={onBack}>
        Volver a la tienda
      </Button>
    </div>
  </div>
);

/* ───── Auth required ───── */
const AuthRequired = ({ onLogin, onBack }: { onLogin: () => void; onBack: () => void }) => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center space-y-6 max-w-sm mx-auto px-4"
    >
      <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
        <User className="h-8 w-8 text-primary" />
      </div>
      <h1 className="font-heading text-2xl font-bold text-foreground">
        Iniciá sesión para comprar
      </h1>
      <p className="text-muted-foreground text-sm">
        Necesitás una cuenta para completar tu compra y poder seguir tus pedidos.
      </p>
      <div className="flex flex-col gap-3">
        <Button onClick={onLogin} className="w-full h-12 font-heading uppercase tracking-wider">
          Iniciar sesión / Registrarse
        </Button>
        <Button variant="ghost" onClick={onBack} className="text-sm">
          Volver a la tienda
        </Button>
      </div>
    </motion.div>
  </div>
);

/* ───── Radio button helper ───── */
const RadioOption = ({
  selected,
  onClick,
  label,
  description,
  icon,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  description?: string;
  icon?: React.ReactNode;
}) => (
  <button
    onClick={onClick}
    className={`flex items-center justify-between rounded-lg border p-3 text-left transition-all ${
      selected
        ? "border-primary bg-primary/5 ring-1 ring-primary/30"
        : "border-border hover:border-primary/40"
    }`}
  >
    <div className="flex items-center gap-3">
      <div
        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
          selected ? "border-primary" : "border-muted-foreground/40"
        }`}
      >
        {selected && <div className="w-2 h-2 rounded-full bg-primary" />}
      </div>
      {icon}
      <span className="text-sm font-medium text-foreground">{label}</span>
    </div>
    {description && (
      <span
        className={`text-sm font-semibold ${
          description === "Gratis" ? "text-green-500" : "text-foreground"
        }`}
      >
        {description}
      </span>
    )}
  </button>
);

/* ───── Order Summary (reusable) ───── */
const OrderSummary = ({
  items,
  totalPrice,
  shippingCost,
  shippingReady,
  shippingLabel,
  finalTotal,
  compact = false,
}: {
  items: { id: string; name: string; size: string; price: number; quantity: number }[];
  totalPrice: number;
  shippingCost: number;
  shippingReady: boolean;
  shippingLabel: string | null;
  finalTotal: number;
  compact?: boolean;
}) => (
  <div className="space-y-3">
    {!compact &&
      items.map((item) => (
        <div key={item.id} className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            {item.name} ({item.size}) x{item.quantity}
          </span>
          <span className="text-foreground font-medium">
            {formatPrice(item.price * item.quantity)}
          </span>
        </div>
      ))}
    {!compact && <div className="border-t border-border" />}
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">Subtotal</span>
      <span className="text-foreground font-medium">{formatPrice(totalPrice)}</span>
    </div>
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground flex items-center gap-1.5">
        <Truck className="h-3.5 w-3.5" />
        Envío
        {shippingLabel && <span className="text-xs">({shippingLabel})</span>}
      </span>
      <span
        className={`font-medium ${
          shippingCost === 0 && shippingReady ? "text-green-500" : "text-foreground"
        }`}
      >
        {!shippingReady ? "Seleccioná envío" : formatPrice(shippingCost)}
      </span>
    </div>
    <div className="border-t border-border pt-3">
      <div className="flex justify-between items-baseline">
        <span className="font-heading font-bold text-foreground text-lg">Total</span>
        <span className="font-heading text-2xl md:text-3xl font-bold text-accent">
          {formatPrice(finalTotal)}
        </span>
      </div>
    </div>
  </div>
);

/* ───── Helpers for validation ───── */
const extractDigits = (str: string) => str.replace(/\D/g, "");

/* ───── Main Checkout ───── */
const Checkout = () => {
  const { items, totalPrice } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [deliveryType, setDeliveryType] = useState<DeliveryType | null>(null);
  const [shippingZone, setShippingZone] = useState<ShippingZoneId | null>(null);
  const [provinceId, setProvinceId] = useState<string | null>(null);
  const [shippingSpeed, setShippingSpeed] = useState<ShippingSpeed | null>(null);

  const [fullAddress, setFullAddress] = useState("");
  const [addressNumber, setAddressNumber] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [phone, setPhone] = useState("");
  const [branch, setBranch] = useState("");
  const [branchSearch, setBranchSearch] = useState("");
  const [branchError, setBranchError] = useState("");
  const [addressError, setAddressError] = useState("");
  const [addressNumberError, setAddressNumberError] = useState("");
  const [postalCodeError, setPostalCodeError] = useState("");
  const [phoneError, setPhoneError] = useState("");

  const handleDeliveryTypeChange = (type: DeliveryType) => {
    setDeliveryType(type);
    setShippingSpeed(null);
    setBranch("");
    setBranchSearch("");
    setBranchError("");
  };

  const handleZoneChange = (zone: ShippingZoneId) => {
    setShippingZone(zone);
    setDeliveryType(null);
    setProvinceId(null);
    setShippingSpeed(null);
    setBranch("");
    setBranchSearch("");
    setBranchError("");
  };

  const handleProvinceChange = (id: string) => {
    setProvinceId(id);
    setShippingSpeed(null);
    setBranch("");
    setBranchSearch("");
    setBranchError("");
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = extractDigits(e.target.value);
    if (digits.length <= 10) {
      setPhone(digits);
      if (phoneError) setPhoneError("");
    }
  };

  const handleAddressNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = extractDigits(e.target.value);
    if (digits.length <= 6) {
      setAddressNumber(digits);
      if (addressNumberError) setAddressNumberError("");
    }
  };

  const handlePostalCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    if (value.length <= 8) {
      setPostalCode(value);
      if (postalCodeError) setPostalCodeError("");
    }
  };

  if (items.length === 0) return <EmptyCart onBack={() => navigate("/")} />;

  if (!user)
    return (
      <AuthRequired
        onLogin={() => navigate("/cuenta", { state: { from: "/checkout" } })}
        onBack={() => navigate("/")}
      />
    );

  const prices =
    deliveryType && shippingZone
      ? getShippingPrices(deliveryType, shippingZone, provinceId)
      : null;

  const shippingCost = prices && shippingSpeed ? prices[shippingSpeed] : 0;
  const finalTotal = totalPrice + shippingCost;

  const shippingReady =
    !!deliveryType &&
    !!shippingZone &&
    !!shippingSpeed &&
    (shippingZone !== "interior" || !!provinceId);

  const shippingLabel = shippingReady
    ? getShippingLabel(shippingZone!, shippingSpeed!, provinceId)
    : null;

  const showSpeeds =
    deliveryType &&
    (shippingZone === "caba" ||
      shippingZone === "gba" ||
      (shippingZone === "interior" && provinceId)) &&
    prices !== null;

  const needsAddress = deliveryType === "domicilio";
  const needsBranch = deliveryType === "sucursal";

  // Lista curada de sucursales según zona (CABA / Buenos Aires).
  // Para Interior no hay listado: el usuario escribe el nombre de la sucursal.
  const branchList = needsBranch && shippingZone
    ? getBranchesFor(shippingZone, provinceId)
    : null;
  const filteredBranches = branchList
    ? branchList.filter((b) =>
        b.toLowerCase().includes(branchSearch.trim().toLowerCase())
      )
    : null;

  const validateForm = () => {
    let valid = true;

    if (needsAddress) {
      if (fullAddress.trim().length < 5) {
        setAddressError("Ingresá tu calle (mínimo 5 caracteres)");
        valid = false;
      } else {
        setAddressError("");
      }

      if (addressNumber.trim().length < 1) {
        setAddressNumberError("Ingresá el número de tu dirección");
        valid = false;
      } else {
        setAddressNumberError("");
      }

      if (postalCode.trim().length < 4) {
        setPostalCodeError("Ingresá un código postal válido (mínimo 4 caracteres)");
        valid = false;
      } else {
        setPostalCodeError("");
      }

      const phoneDigits = extractDigits(phone);
      if (phoneDigits.length !== 10) {
        setPhoneError("El teléfono debe tener exactamente 10 números (ej: 1123456789)");
        valid = false;
      } else {
        setPhoneError("");
      }
    }

    if (needsBranch) {
      if (branch.trim().length < 2) {
        setBranchError("Seleccioná o ingresá una sucursal");
        valid = false;
      } else {
        setBranchError("");
      }

      const phoneDigits = extractDigits(phone);
      if (phoneDigits.length !== 10) {
        setPhoneError("El teléfono debe tener exactamente 10 números (ej: 1123456789)");
        valid = false;
      } else {
        setPhoneError("");
      }
    }

    return valid;
  };

  const isFormComplete =
    shippingReady &&
    (!needsAddress || (
      fullAddress.trim().length >= 5 &&
      addressNumber.trim().length >= 1 &&
      postalCode.trim().length >= 4 &&
      extractDigits(phone).length === 10
    )) &&
    (!needsBranch || (
      branch.trim().length >= 2 &&
      extractDigits(phone).length === 10
    ));

  const handleCheckout = async () => {
    if (!shippingReady || !validateForm()) return;
    setLoading(true);
    setCheckoutError("");

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        console.error("No hay sesión activa:", sessionError);
        throw new Error("Sesión expirada. Iniciá sesión de nuevo.");
      }
      const accessToken = sessionData.session.access_token;

      const orderItems = items.map((i) => ({
        name: i.name,
        type: i.type || "",
        size: i.size,
        price: i.price,
        quantity: i.quantity,
      }));

      const requestBody = {
        items: orderItems,
        shippingCost,
        shippingZone: shippingZone || "",
        shippingLabel: shippingLabel || "",
        address: needsAddress
          ? `${fullAddress} ${addressNumber}, CP ${postalCode}`
          : needsBranch
          ? `Retiro en sucursal: ${branch}`
          : "",
        branch: needsBranch ? branch : "",
        phone,
        siteUrl: window.location.origin,
      };

      console.log("Checkout request body:", requestBody);

      const SUPABASE_URL = "https://wepyjpvcaxzuzzzwtglo.supabase.co";
      const response = await fetch(`${SUPABASE_URL}/functions/v1/create-preference`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(requestBody),
      });

      console.log("Checkout response status:", response.status);
      console.log("Checkout response:", response);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Error del servidor:", errorData);
        throw new Error(errorData?.error || `Error ${response.status}`);
      }

      const data = await response.json();
      console.log("Checkout response data:", data);

      if (data?.init_point) {
        console.log("Redirigiendo a Mercado Pago:", data.init_point);
        window.location.href = data.init_point;
        return;
      }

      console.error("No se recibió init_point en la respuesta:", data);
      throw new Error("No se recibió link de pago");
    } catch (err) {
      console.error("Checkout error:", err);
      const message = err instanceof Error ? err.message : "No pudimos iniciar el pago";
      setCheckoutError(message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-28 lg:pb-8">
      <div className="container mx-auto px-4 py-6 lg:py-8 max-w-5xl">
        {/* Header */}
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">Volver</span>
        </button>

        <h1 className="font-heading text-2xl lg:text-3xl font-bold uppercase text-foreground mb-1">
          Checkout
        </h1>
        <p className="text-sm text-muted-foreground mb-6 lg:mb-8">
          Comprando como{" "}
          <span className="text-foreground font-medium">{user.email}</span>
        </p>

        {checkoutError && (
          <Alert variant="destructive" className="mb-6">
            <AlertTitle>No pudimos iniciar el pago</AlertTitle>
            <AlertDescription>{checkoutError}</AlertDescription>
          </Alert>
        )}

        {/* Two-column layout on desktop */}
        <div className="lg:flex lg:gap-8">
          {/* LEFT COLUMN — Form */}
          <div className="lg:flex-1 space-y-4">
            {/* 1. Productos (compact on mobile) */}
            <div className="rounded-xl bg-card border border-border p-4 lg:p-5 space-y-2">
              <h2 className="font-heading text-xs uppercase tracking-wider font-bold text-muted-foreground mb-2">
                Productos ({items.length})
              </h2>
              {items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-foreground">
                    {item.name} ({item.size}) x{item.quantity}
                  </span>
                  <span className="text-foreground font-semibold">
                    {formatPrice(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            {/* 2. Envío */}
            <div className="rounded-xl bg-card border border-border p-4 lg:p-5 space-y-4">
              <h2 className="font-heading text-xs uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-2">
                <Truck className="h-4 w-4 text-primary" />
                Envío
              </h2>

              {/* Zona */}
              <div className="space-y-2 pt-2 border-t border-border">
                <h3 className="font-heading text-xs uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                  Zona
                </h3>
                <div className="grid gap-2">
                  {ZONES.map((zone) => (
                    <RadioOption
                      key={zone.id}
                      selected={shippingZone === zone.id}
                      onClick={() => handleZoneChange(zone.id)}
                      label={zone.label}
                    />
                  ))}
                </div>
              </div>

              {/* Provincia (Interior) */}
              {shippingZone === "interior" && (
                <div className="space-y-2 pt-2 border-t border-border">
                  <h3 className="font-heading text-xs uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    Provincia
                  </h3>
                  <div className="grid gap-2 max-h-48 overflow-y-auto pr-1">
                    {INTERIOR_PROVINCES.map((prov) => (
                      <RadioOption
                        key={prov.id}
                        selected={provinceId === prov.id}
                        onClick={() => handleProvinceChange(prov.id)}
                        label={prov.label}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Método de entrega */}
              {shippingZone && (
                <div className="space-y-2 pt-2 border-t border-border">
                  <h3 className="font-heading text-xs uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-2">
                    <Package className="h-3.5 w-3.5 text-primary" />
                    Método de entrega
                  </h3>
                  <div className="grid gap-2">
                    <RadioOption
                      selected={deliveryType === "domicilio"}
                      onClick={() => handleDeliveryTypeChange("domicilio")}
                      label="Entrega en domicilio"
                      icon={<Truck className="h-4 w-4 text-muted-foreground" />}
                    />
                    <RadioOption
                      selected={deliveryType === "sucursal"}
                      onClick={() => handleDeliveryTypeChange("sucursal")}
                      label="Entrega en sucursal"
                      icon={<Package className="h-4 w-4 text-muted-foreground" />}
                    />
                  </div>
                </div>
              )}

              {/* Datos de domicilio (solo para entrega en domicilio) */}
              {deliveryType === "domicilio" && (
                <div className="space-y-4 pt-2 border-t border-border">
                  <h3 className="font-heading text-xs uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    Datos de entrega
                  </h3>

                  {/* Calle */}
                  <div className="space-y-1.5">
                    <Label htmlFor="fullAddress" className="text-sm font-medium text-foreground flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-primary" />
                      Calle
                    </Label>
                    <Input
                      id="fullAddress"
                      value={fullAddress}
                      onChange={(e) => {
                        setFullAddress(e.target.value);
                        if (addressError) setAddressError("");
                      }}
                      placeholder="Ej: Av Corrientes"
                      className="h-11 text-sm"
                      maxLength={100}
                    />
                    {addressError && <p className="text-xs text-destructive font-medium">{addressError}</p>}
                  </div>

                  {/* Número y CP */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="addressNumber" className="text-sm font-medium text-foreground">
                        Número
                      </Label>
                      <Input
                        id="addressNumber"
                        value={addressNumber}
                        onChange={handleAddressNumberChange}
                        placeholder="Ej: 1234"
                        className="h-11 text-sm"
                        inputMode="numeric"
                      />
                      {addressNumberError && <p className="text-xs text-destructive font-medium">{addressNumberError}</p>}
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="postalCode" className="text-sm font-medium text-foreground">
                        Código postal
                      </Label>
                      <Input
                        id="postalCode"
                        value={postalCode}
                        onChange={handlePostalCodeChange}
                        placeholder="Ej: C1043"
                        className="h-11 text-sm"
                      />
                      {postalCodeError && <p className="text-xs text-destructive font-medium">{postalCodeError}</p>}
                    </div>
                  </div>

                  {/* Teléfono */}
                  <div className="space-y-1.5">
                    <Label htmlFor="phone" className="text-sm font-medium text-foreground flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-primary" />
                      Teléfono (10 dígitos)
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={handlePhoneChange}
                      placeholder="Ej: 1123456789"
                      className="h-11 text-sm"
                      inputMode="numeric"
                    />
                    <p className="text-xs text-muted-foreground">
                      {extractDigits(phone).length}/10 dígitos
                    </p>
                    {phoneError && <p className="text-xs text-destructive font-medium">{phoneError}</p>}
                  </div>
                </div>
              )}

              {/* Sucursal (solo para entrega en sucursal) */}
              {deliveryType === "sucursal" && (
                <div className="space-y-4 pt-2 border-t border-border">
                  <h3 className="font-heading text-xs uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-2">
                    <Package className="h-3.5 w-3.5 text-primary" />
                    Sucursal de retiro
                  </h3>

                  {filteredBranches ? (
                    <div className="space-y-2">
                      <Label htmlFor="branchSearch" className="text-sm font-medium text-foreground">
                        Buscar sucursal
                      </Label>
                      <Input
                        id="branchSearch"
                        value={branchSearch}
                        onChange={(e) => setBranchSearch(e.target.value)}
                        placeholder="Escribí para filtrar (ej: PALERMO)"
                        className="h-11 text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        {filteredBranches.length} sucursales
                        {branch && (
                          <>
                            {" · "}
                            <span className="text-foreground font-medium">
                              Seleccionada: {branch}
                            </span>
                          </>
                        )}
                      </p>
                      <div className="grid gap-1.5 max-h-64 overflow-y-auto pr-1 rounded-lg border border-border p-2 bg-background/40">
                        {filteredBranches.length === 0 && (
                          <p className="text-xs text-muted-foreground p-2">
                            No encontramos sucursales con ese nombre.
                          </p>
                        )}
                        {filteredBranches.map((b) => (
                          <RadioOption
                            key={b}
                            selected={branch === b}
                            onClick={() => {
                              setBranch(b);
                              if (branchError) setBranchError("");
                            }}
                            label={b}
                          />
                        ))}
                      </div>
                      {branchError && (
                        <p className="text-xs text-destructive font-medium">{branchError}</p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <Label htmlFor="branch" className="text-sm font-medium text-foreground">
                        Nombre de la sucursal
                      </Label>
                      <Input
                        id="branch"
                        value={branch}
                        onChange={(e) => {
                          setBranch(e.target.value);
                          if (branchError) setBranchError("");
                        }}
                        placeholder="Ej: CORDOBA UP 2"
                        className="h-11 text-sm"
                        maxLength={120}
                      />
                      <p className="text-xs text-muted-foreground">
                        Indicá la sucursal del Correo Argentino donde querés retirar.
                      </p>
                      {branchError && (
                        <p className="text-xs text-destructive font-medium">{branchError}</p>
                      )}
                    </div>
                  )}

                  {/* Teléfono también para retiro en sucursal */}
                  <div className="space-y-1.5">
                    <Label htmlFor="phoneBranch" className="text-sm font-medium text-foreground flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-primary" />
                      Teléfono (10 dígitos)
                    </Label>
                    <Input
                      id="phoneBranch"
                      type="tel"
                      value={phone}
                      onChange={handlePhoneChange}
                      placeholder="Ej: 1123456789"
                      className="h-11 text-sm"
                      inputMode="numeric"
                    />
                    <p className="text-xs text-muted-foreground">
                      {extractDigits(phone).length}/10 dígitos
                    </p>
                    {phoneError && <p className="text-xs text-destructive font-medium">{phoneError}</p>}
                  </div>
                </div>
              )}

              {showSpeeds && (
                <div className="space-y-2 pt-2 border-t border-border">
                  <h3 className="font-heading text-xs uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-2">
                    <Package className="h-3.5 w-3.5 text-primary" />
                    Tipo de envío
                  </h3>
                  <div className="grid gap-2">
                    <RadioOption
                      selected={shippingSpeed === "expreso"}
                      onClick={() => setShippingSpeed("expreso")}
                      label="PAQ.AR Expreso (1 a 3 días hábiles)"
                      description={formatPrice(prices!.expreso)}
                    />
                    <RadioOption
                      selected={shippingSpeed === "clasico"}
                      onClick={() => setShippingSpeed("clasico")}
                      label="PAQ.AR Clásico (2 a 5 días hábiles)"
                      description={formatPrice(prices!.clasico)}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN — Desktop sticky summary */}
          <div className="hidden lg:block lg:w-[360px]">
            <div className="sticky top-8 space-y-4">
              <div className="rounded-xl bg-card border border-border p-5 space-y-3">
                <h2 className="font-heading text-xs uppercase tracking-wider font-bold text-muted-foreground mb-3">
                  Resumen de compra
                </h2>
                <OrderSummary
                  items={items}
                  totalPrice={totalPrice}
                  shippingCost={shippingCost}
                  shippingReady={shippingReady}
                  shippingLabel={shippingLabel}
                  finalTotal={finalTotal}
                />
              </div>

              {/* Trust badges */}
              <div className="flex items-center gap-4 justify-center text-muted-foreground">
                <div className="flex items-center gap-1.5 text-xs">
                  <Shield className="h-4 w-4 text-primary" />
                  <span>Pago seguro</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <CreditCard className="h-4 w-4 text-primary" />
                  <span>MercadoPago</span>
                </div>
              </div>

              {/* Desktop CTA */}
              <Button
                variant="default"
                onClick={handleCheckout}
                disabled={loading || !isFormComplete}
                className="w-full h-14 rounded-xl"
              >
                {loading ? (
                  <motion.div className="flex items-center gap-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Procesando...
                  </motion.div>
                ) : !isFormComplete ? (
                  "Completá los datos de envío"
                ) : (
                  <>
                    <CreditCard className="h-5 w-5 mr-2" />
                    Finalizar compra — {formatPrice(finalTotal)}
                  </>
                )}
              </Button>

              {loading && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
                  <p className="text-sm text-muted-foreground">Redirigiendo a MercadoPago...</p>
                  <div className="mt-3 flex justify-center">
                    <div className="w-10 h-10 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile-only: inline summary before sticky bar */}
        <div className="lg:hidden mt-4">
          <div className="rounded-xl bg-card border border-border p-4 space-y-3">
            <h2 className="font-heading text-xs uppercase tracking-wider font-bold text-muted-foreground">
              Resumen
            </h2>
            <OrderSummary
              items={items}
              totalPrice={totalPrice}
              shippingCost={shippingCost}
              shippingReady={shippingReady}
              shippingLabel={shippingLabel}
              finalTotal={finalTotal}
              compact
            />
          </div>

          <div className="flex items-center gap-4 justify-center mt-3 text-muted-foreground">
            <div className="flex items-center gap-1.5 text-xs">
              <Shield className="h-4 w-4 text-primary" />
              <span>Pago seguro</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <CreditCard className="h-4 w-4 text-primary" />
              <span>MercadoPago</span>
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE STICKY BOTTOM BAR */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border px-4 py-3 safe-area-bottom">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <div className="flex-shrink-0">
            <p className="text-xs text-muted-foreground leading-none mb-0.5">Total</p>
            <p className="font-heading text-xl font-bold text-accent leading-none">
              {formatPrice(finalTotal)}
            </p>
          </div>
          <Button
            variant="default"
            onClick={handleCheckout}
            disabled={loading || !isFormComplete}
            className="flex-1 h-12 rounded-xl text-sm"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Procesando...
              </span>
            ) : !isFormComplete ? (
              "Completá envío"
            ) : (
              "Finalizar compra"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
