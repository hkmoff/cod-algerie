import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

const EMPTY_FORM = {
  id: null,
  name: "",
  description: "",
  price: "",
  compare_at_price: "",
  stock: "",
  status: "active",
  images: [],
};

export default function Products() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [shop, setShop] = useState(null);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(null); // null = liste, sinon formulaire ouvert
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function loadData() {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      navigate("/dashboard/login");
      return;
    }

    const { data: shopData } = await supabase
      .from("shops")
      .select("id, name")
      .eq("owner_id", sessionData.session.user.id)
      .maybeSingle();

    if (!shopData) {
      setLoading(false);
      return;
    }
    setShop(shopData);

    const { data: productsData } = await supabase
      .from("products")
      .select("id, name, price, stock, status, images")
      .eq("shop_id", shopData.id)
      .order("created_at", { ascending: false });

    setProducts(productsData ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file || !shop) return;

    setUploading(true);
    const path = `${shop.id}/${crypto.randomUUID()}-${file.name}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file);
    setUploading(false);

    if (error) return;
    const { data: publicUrl } = supabase.storage.from("product-images").getPublicUrl(path);
    setForm((f) => ({ ...f, images: [...f.images, publicUrl.publicUrl] }));
  }

  function removeImage(url) {
    setForm((f) => ({ ...f, images: f.images.filter((img) => img !== url) }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);

    const payload = {
      shop_id: shop.id,
      name: form.name,
      description: form.description,
      price: Number(form.price),
      compare_at_price: form.compare_at_price ? Number(form.compare_at_price) : null,
      stock: Number(form.stock) || 0,
      status: form.status,
      images: form.images,
    };

    if (form.id) {
      await supabase.from("products").update(payload).eq("id", form.id);
    } else {
      await supabase.from("products").insert(payload);
    }

    setSaving(false);
    setForm(null);
    loadData();
  }

  async function handleDelete(id) {
    await supabase.from("products").delete().eq("id", id);
    loadData();
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

  return (
    <div className="min-h-screen px-4 py-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <span className="font-heading font-bold text-ink">
          {shop.name}
          <span className="text-accent">.</span>
        </span>
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="text-xs text-muted hover:text-ink">Commandes</Link>
          <Link to="/dashboard/products" className="text-xs text-accent font-semibold">Produits</Link>
        </div>
      </div>

      {!form && (
        <>
          <button
            onClick={() => setForm(EMPTY_FORM)}
            className="mb-4 h-10 px-4 rounded-lg bg-accent text-accent-ink font-heading font-bold text-sm"
          >
            + Ajouter un produit
          </button>

          <div className="bg-surface rounded-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted text-xs border-b border-white/10">
                  <th className="p-3 font-normal">Produit</th>
                  <th className="p-3 font-normal">Prix</th>
                  <th className="p-3 font-normal">Stock</th>
                  <th className="p-3 font-normal">Statut</th>
                  <th className="p-3 font-normal text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-b border-white/5 last:border-0">
                    <td className="p-3 text-ink flex items-center gap-2">
                      {p.images?.[0] ? (
                        <img src={p.images[0]} alt="" className="w-8 h-8 rounded object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded bg-canvas" />
                      )}
                      {p.name}
                    </td>
                    <td className="p-3 text-ink">{p.price} DA</td>
                    <td className="p-3 text-muted">{p.stock}</td>
                    <td className="p-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${p.status === "active" ? "bg-green-500/15 text-green-400" : "bg-white/5 text-muted"}`}>
                        {p.status === "active" ? "actif" : "brouillon"}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => setForm({ ...p, price: String(p.price), stock: String(p.stock), compare_at_price: "", description: p.description ?? "" })}
                        className="text-xs px-2 py-1 rounded bg-white/5 text-muted hover:bg-white/10 mr-1"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="text-xs px-2 py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20"
                      >
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
                {products.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-muted text-sm">
                      Aucun produit pour le moment.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {form && (
        <form onSubmit={handleSave} className="bg-surface rounded-card p-5 flex flex-col gap-3 max-w-md">
          <div className="font-heading font-bold text-sm text-ink mb-1">
            {form.id ? "Modifier le produit" : "Nouveau produit"}
          </div>

          <input
            type="text" placeholder="Nom du produit" required
            value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="h-11 rounded-lg bg-canvas border border-white/10 px-3 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <textarea
            placeholder="Description" rows={3}
            value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="rounded-lg bg-canvas border border-white/10 px-3 py-2 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number" placeholder="Prix (DA)" required
              value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })}
              className="h-11 rounded-lg bg-canvas border border-white/10 px-3 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <input
              type="number" placeholder="Prix barré (optionnel)"
              value={form.compare_at_price} onChange={(e) => setForm({ ...form, compare_at_price: e.target.value })}
              className="h-11 rounded-lg bg-canvas border border-white/10 px-3 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number" placeholder="Stock" required
              value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })}
              className="h-11 rounded-lg bg-canvas border border-white/10 px-3 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <select
              value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="h-11 rounded-lg bg-canvas border border-white/10 px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="active">Actif</option>
              <option value="draft">Brouillon</option>
            </select>
          </div>

          <div className="flex flex-wrap gap-2">
            {form.images.map((url) => (
              <div key={url} className="relative">
                <img src={url} alt="" className="w-16 h-16 rounded object-cover" />
                <button type="button" onClick={() => removeImage(url)} className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs">×</button>
              </div>
            ))}
          </div>
          <label className="text-xs text-muted">
            {uploading ? "Envoi de la photo..." : "Ajouter une photo"}
            <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} className="block mt-1 text-xs" />
          </label>

          <div className="flex gap-2 mt-2">
            <button type="submit" disabled={saving} className="flex-1 h-11 rounded-lg bg-accent text-accent-ink font-heading font-bold text-sm disabled:opacity-40">
              {saving ? "Enregistrement..." : "Enregistrer"}
            </button>
            <button type="button" onClick={() => setForm(null)} className="h-11 px-4 rounded-lg bg-white/5 text-muted text-sm">
              Annuler
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
