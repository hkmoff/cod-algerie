import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { resetToAdminTheme } from "../lib/themes";

const STATUS_STYLES = {
  en_attente: "bg-amber-500/15 text-amber-400",
  confirmee: "bg-blue-500/15 text-blue-400",
  expediee: "bg-teal-500/15 text-teal-400",
  livree: "bg-green-500/15 text-green-400",
  retournee: "bg-orange-500/15 text-orange-400",
  annulee: "bg-red-500/15 text-red-400",
};

const STATUS_LABELS = {
  en_attente: "en attente",
  confirmee: "confirmée",
  expediee: "expédiée",
  livree: "livrée",
  retournee: "retournée",
  annulee: "annulée",
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [shop, setShop] = useState(null);
  const [orders, setOrders] = useState([]);

  async function loadData() {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      navigate("/dashboard/login");
      return;
    }

    const { data: shopData } = await supabase
      .from("shops")
      .select("id, name, status, subdomain")
      .eq("owner_id", sessionData.session.user.id)
      .maybeSingle();

    if (!shopData) {
      setLoading(false);
      return;
    }
    setShop(shopData);

    if (shopData.status !== "active") {
      setLoading(false);
      return;
    }

    const { data: ordersData } = await supabase
      .from("orders")
      .select("id, customer_name, customer_phone, status, call_status, total_amount, created_at, wilayas(name_fr)")
      .eq("shop_id", shopData.id)
      .order("created_at", { ascending: false });

    setOrders(ordersData ?? []);
    setLoading(false);
  }

  useEffect(() => {
    resetToAdminTheme();
    loadData();
  }, []);

  async function updateOrder(id, fields) {
    await supabase.from("orders").update(fields).eq("id", id);
    loadData();
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/dashboard/login");
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted text-sm">Chargement...</div>;
  }

  if (!shop) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center text-muted text-sm">
        Aucune boutique associée à ce compte.
      </div>
    );
  }

  if (shop.status !== "active") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center gap-4">
        <div className="max-w-sm bg-surface rounded-card p-6">
          <div className="font-heading font-bold text-lg text-ink mb-2">
            {shop.status === "pending" ? "En attente de validation" : "Boutique suspendue"}
          </div>
          <p className="text-sm text-muted">
            {shop.status === "pending"
              ? "Un administrateur doit approuver ta boutique avant que tu puisses accéder au tableau de bord."
              : "Contacte l'administrateur de la plateforme pour plus d'informations."}
          </p>
        </div>
        <button onClick={handleLogout} className="text-xs text-muted hover:text-ink">
          Déconnexion
        </button>
      </div>
    );
  }

  const totalCA = orders
    .filter((o) => o.status !== "annulee")
    .reduce((sum, o) => sum + Number(o.total_amount), 0);
  const enAttente = orders.filter((o) => o.status === "en_attente").length;
  const traitees = orders.filter((o) => o.status !== "en_attente").length;
  const confirmees = orders.filter((o) => o.status !== "en_attente" && o.status !== "annulee").length;
  const tauxConfirmation = traitees ? Math.round((confirmees / traitees) * 100) : 0;

  return (
    <div className="min-h-screen px-4 py-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <span className="font-heading font-bold text-ink">
          {shop.name}
          <span className="text-accent">.</span>
        </span>
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="text-xs text-accent font-semibold">Commandes</Link>
          <Link to="/dashboard/products" className="text-xs text-muted hover:text-ink">Produits</Link>
          <Link to="/dashboard/settings" className="text-xs text-muted hover:text-ink">Thème</Link>
          <button onClick={handleLogout} className="text-xs text-muted hover:text-ink">
            Déconnexion
          </button>
        </div>
      </div>

      <div className="bg-surface rounded-card p-4 mb-4 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="text-xs text-muted mb-1">Adresse de ta boutique</div>
          
            href={`/s/${shop.subdomain}`}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-accent break-all hover:underline"
          >
            {window.location.origin}/s/{shop.subdomain}
          </a>
        </div>
        <button
          onClick={() => navigator.clipboard.writeText(`${window.location.origin}/s/${shop.subdomain}`)}
          className="text-xs px-3 py-2 rounded-lg bg-white/5 text-muted hover:bg-white/10"
        >
          Copier le lien
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-surface rounded-card p-4">
          <div className="text-xs text-muted mb-1">CA total</div>
          <div className="font-heading font-bold text-lg text-ink">{totalCA} DA</div>
        </div>
        <div className="bg-surface rounded-card p-4">
          <div className="text-xs text-muted mb-1">Commandes</div>
          <div className="font-heading font-bold text-lg text-ink">{orders.length}</div>
        </div>
        <div className="bg-surface rounded-card p-4">
          <div className="text-xs text-muted mb-1">En attente</div>
          <div className="font-heading font-bold text-lg text-accent">{enAttente}</div>
        </div>
        <div className="bg-surface rounded-card p-4">
          <div className="text-xs text-muted mb-1">Taux de confirmation</div>
          <div className="font-heading font-bold text-lg text-ink">{tauxConfirmation}%</div>
        </div>
      </div>

      <div className="bg-surface rounded-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted text-xs border-b border-white/10">
              <th className="p-3 font-normal">Client</th>
              <th className="p-3 font-normal">Wilaya</th>
              <th className="p-3 font-normal">Statut</th>
              <th className="p-3 font-normal text-right">Montant</th>
              <th className="p-3 font-normal text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-white/5 last:border-0">
                <td className="p-3 text-ink">
                  {o.customer_name}
                  <div className="text-xs text-muted">{o.customer_phone}</div>
                </td>
                <td className="p-3 text-muted">{o.wilayas?.name_fr}</td>
                <td className="p-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${STATUS_STYLES[o.status]}`}>
                    {STATUS_LABELS[o.status]}
                  </span>
                </td>
                <td className="p-3 text-right text-ink">{o.total_amount} DA</td>
                <td className="p-3 text-right">
                  {o.status === "en_attente" && (
                    <div className="flex gap-1 justify-end">
                      <button
                        onClick={() =>
                          updateOrder(o.id, {
                            status: "confirmee",
                            call_status: "confirme",
                            confirmed_at: new Date().toISOString(),
                          })
                        }
                        className="text-xs px-2 py-1 rounded bg-accent/15 text-accent hover:bg-accent/25"
                      >
                        Confirmer
                      </button>
                      <button
                        onClick={() => updateOrder(o.id, { call_status: "injoignable" })}
                        className="text-xs px-2 py-1 rounded bg-white/5 text-muted hover:bg-white/10"
                      >
                        Injoignable
                      </button>
                      <button
                        onClick={() => updateOrder(o.id, { status: "annulee" })}
                        className="text-xs px-2 py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20"
                      >
                        Annuler
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-muted text-sm">
                  Aucune commande pour le moment.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
