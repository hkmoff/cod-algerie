import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const API_URL = import.meta.env.VITE_API_URL;

/**
 * Formulaire de commande COD : nom, téléphone, wilaya → commune, mode de
 * livraison. Le frais de livraison est demandé en direct au transporteur
 * (jamais une grille figée) dès que wilaya + mode sont choisis.
 */
export default function OrderForm({ shopId, product }) {
  const [wilayas, setWilayas] = useState([]);
  const [communes, setCommunes] = useState([]);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [wilayaCode, setWilayaCode] = useState("");
  const [commune, setCommune] = useState("");
  const [deliveryMode, setDeliveryMode] = useState("home");

  const [rate, setRate] = useState(null);
  const [rateLoading, setRateLoading] = useState(false);
  const [rateError, setRateError] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Charge la liste des wilayas une seule fois
  useEffect(() => {
    supabase
      .from("wilayas")
      .select("code, name_fr")
      .order("name_fr")
      .then(({ data, error }) => {
        if (!error) setWilayas(data);
      });
  }, []);

  // Recharge les communes quand la wilaya change
  useEffect(() => {
    setCommune("");
    setCommunes([]);
    if (!wilayaCode) return;
    supabase
      .from("communes")
      .select("id, name_fr")
      .eq("wilaya_code", wilayaCode)
      .order("name_fr")
      .then(({ data, error }) => {
        if (!error) setCommunes(data);
      });
  }, [wilayaCode]);

  // Redemande le tarif dès que wilaya ou mode de livraison changent
  useEffect(() => {
    if (!wilayaCode || !deliveryMode) {
      setRate(null);
      return;
    }
    setRateLoading(true);
    setRateError("");
    fetch(`${API_URL}/api/rate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shop_id: shopId,
        wilaya_code: Number(wilayaCode),
        delivery_mode: deliveryMode,
      }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `Erreur ${res.status}`);
        }
        return res.json();
      })
      .then((data) => setRate(data))
      .catch((err) => setRateError(err.message || "Impossible de calculer le frais de livraison pour le moment."))
      .finally(() => setRateLoading(false));
  }, [wilayaCode, deliveryMode, shopId]);

  const productAmount = product.price;
  const total = rate ? productAmount + rate.deliveryFee : null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name || !phone || !wilayaCode || !commune || !rate) return;

    setSubmitting(true);
    setSubmitError("");

    const { error } = await supabase.from("orders").insert({
      shop_id: shopId,
      product_id: product.id,
      quantity: 1,
      customer_name: name,
      customer_phone: phone,
      wilaya_code: Number(wilayaCode),
      commune,
      delivery_mode: deliveryMode,
      delivery_fee: rate.deliveryFee,
      return_fee: rate.returnFee ?? 0,
      product_amount: productAmount,
      total_amount: total,
    });

    setSubmitting(false);
    if (error) {
      setSubmitError("La commande n'a pas pu être envoyée. Réessaie dans un instant.");
      return;
    }
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="bg-surface rounded-card p-6 text-center">
        <div className="text-accent font-heading font-bold text-lg mb-2">
          Commande envoyée
        </div>
        <p className="text-muted text-sm">
          On t'appelle au {phone} pour confirmer. Paiement en espèces à la
          réception.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-surface rounded-card p-5 flex flex-col gap-3">
      <div className="font-heading font-bold text-sm text-ink mb-1">
        Commander maintenant
      </div>

      <input
        type="text"
        placeholder="Nom complet"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        className="h-11 rounded-lg bg-canvas border border-white/10 px-3 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
      />
      <input
        type="tel"
        placeholder="Téléphone"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        required
        className="h-11 rounded-lg bg-canvas border border-white/10 px-3 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
      />

      <select
        value={wilayaCode}
        onChange={(e) => setWilayaCode(e.target.value)}
        required
        className="h-11 rounded-lg bg-canvas border border-white/10 px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent"
      >
        <option value="">Wilaya</option>
        {wilayas.map((w) => (
          <option key={w.code} value={w.code}>
            {w.name_fr}
          </option>
        ))}
      </select>

      <select
        value={commune}
        onChange={(e) => setCommune(e.target.value)}
        required
        disabled={!wilayaCode}
        className="h-11 rounded-lg bg-canvas border border-white/10 px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-40"
      >
        <option value="">Commune</option>
        {communes.map((c) => (
          <option key={c.id} value={c.name_fr}>
            {c.name_fr}
          </option>
        ))}
      </select>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setDeliveryMode("home")}
          className={`h-11 rounded-lg text-sm border ${
            deliveryMode === "home"
              ? "border-accent bg-accent/10 text-ink"
              : "border-white/10 text-muted"
          }`}
        >
          À domicile
        </button>
        <button
          type="button"
          onClick={() => setDeliveryMode("stopdesk")}
          className={`h-11 rounded-lg text-sm border ${
            deliveryMode === "stopdesk"
              ? "border-accent bg-accent/10 text-ink"
              : "border-white/10 text-muted"
          }`}
        >
          Stop desk
        </button>
      </div>

      <div className="text-sm mt-1">
        <div className="flex justify-between text-muted">
          <span>Frais de livraison</span>
          <span>
            {rateLoading
              ? "calcul..."
              : rate
                ? `${rate.deliveryFee} DA`
                : "—"}
          </span>
        </div>
        <div className="flex justify-between text-ink font-heading font-bold mt-1">
          <span>Total à payer</span>
          <span>{total ? `${total} DA` : "—"}</span>
        </div>
        {rateError && <p className="text-xs text-red-400 mt-1">{rateError}</p>}
      </div>

      <button
        type="submit"
        disabled={submitting || !rate}
        className="h-12 rounded-lg bg-accent text-accent-ink font-heading font-bold text-sm mt-2 disabled:opacity-40"
      >
        {submitting ? "Envoi..." : "Confirmer ma commande"}
      </button>
      {submitError && <p className="text-xs text-red-400">{submitError}</p>}
      <p className="text-xs text-muted text-center">
        Aucune carte requise · payez à la réception
      </p>
    </form>
  );
}
