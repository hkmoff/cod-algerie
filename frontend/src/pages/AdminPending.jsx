import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { resetToAdminTheme } from "../lib/themes";

export default function AdminPending() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [shops, setShops] = useState([]);

  async function loadData() {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      navigate("/dashboard/login");
      return;
    }

    const { data: adminRow } = await supabase
      .from("admins")
      .select("user_id")
      .eq("user_id", sessionData.session.user.id)
      .maybeSingle();

    if (!adminRow) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }
    setIsAdmin(true);

    const { data: shopsData } = await supabase
      .from("shops")
      .select("id, name, subdomain, status, created_at")
      .order("created_at", { ascending: false });

    setShops(shopsData ?? []);
    setLoading(false);
  }

  useEffect(() => {
    resetToAdminTheme();
    loadData();
  }, []);

  async function setStatus(id, status) {
    await supabase.from("shops").update({ status }).eq("id", id);
    loadData();
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/dashboard/login");
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted text-sm">Chargement...</div>;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center text-muted text-sm">
        Cette page est réservée aux administrateurs de la plateforme.
      </div>
    );
  }

  const pending = shops.filter((s) => s.status === "pending");
  const others = shops.filter((s) => s.status !== "pending");

  return (
    <div className="min-h-screen px-4 py-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="font-heading font-bold text-ink">
          Administration
        </div>
        <button onClick={handleLogout} className="text-xs text-muted hover:text-ink">
          Déconnexion
        </button>
      </div>

      <div className="text-sm font-heading font-bold text-ink mb-3">
        En attente d'approbation ({pending.length})
      </div>
      <div className="bg-surface rounded-card overflow-hidden mb-8">
        <table className="w-full text-sm">
          <tbody>
            {pending.map((s) => (
              <tr key={s.id} className="border-b border-white/5 last:border-0">
                <td className="p-3 text-ink">{s.name}</td>
                <td className="p-3 text-muted">{s.subdomain}</td>
                <td className="p-3 text-right">
                  <button
                    onClick={() => setStatus(s.id, "active")}
                    className="text-xs px-2 py-1 rounded bg-accent/15 text-accent hover:bg-accent/25 mr-1"
                  >
                    Approuver
                  </button>
                  <button
                    onClick={() => setStatus(s.id, "suspended")}
                    className="text-xs px-2 py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20"
                  >
                    Refuser
                  </button>
                </td>
              </tr>
            ))}
            {pending.length === 0 && (
              <tr>
                <td className="p-6 text-center text-muted text-sm">Aucune demande en attente.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="text-sm font-heading font-bold text-ink mb-3">Autres boutiques</div>
      <div className="bg-surface rounded-card overflow-hidden">
        <table className="w-full text-sm">
          <tbody>
            {others.map((s) => (
              <tr key={s.id} className="border-b border-white/5 last:border-0">
                <td className="p-3 text-ink">{s.name}</td>
                <td className="p-3 text-muted">{s.subdomain}</td>
                <td className="p-3 text-right">
                  <span className="text-xs px-2 py-1 rounded-full bg-white/5 text-muted">{s.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
