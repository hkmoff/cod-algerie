import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "./lib/supabase";
import OrderForm from "./components/OrderForm";
import { applyTheme } from "./lib/themes";

// Boutique affichée par défaut sur la racine "/" (utile pour une démo).
const DEMO_SHOP_ID = import.meta.env.VITE_DEMO_SHOP_ID;

export default function App() {
  const { subdomain } = useParams(); // présent sur /s/:subdomain
  const [shop, setShop] = useState(null);
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      // La boutique se trouve soit par son sous-domaine (dans l'URL), soit
      // par l'id de démo quand on est sur la racine du site.
      let query = supabase
        .from("shops")
        .select("id, name, logo_url, theme, accent_color")
        .eq("status", "active");

      query = subdomain ? query.eq("subdomain", subdomain) : query.eq("id", DEMO_SHOP_ID);

      const { data: shopData } = await query.maybeSingle();

      if (!shopData) {
        setLoading(false);
        return;
      }

      applyTheme(shopData.theme, shopData.accent_color);

      const { data: productData } = await supabase
        .from("products")
        .select("id, name, description, price, compare_at_price, images")
        .eq("shop_id", shopData.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();

      setShop(shopData);
      setProduct(productData ?? null);
      setLoading(false);
    }
    load();
  }, [subdomain]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted text-sm">Chargement...</div>;
  }

  if (!shop) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center">
        <div className="max-w-sm">
          <div className="font-heading font-bold text-lg text-ink mb-2">
            Boutique introuvable
          </div>
          <p className="text-muted text-sm">
            Cette boutique n'existe pas ou n'est pas encore active.
          </p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center">
        <div className="max-w-sm">
          <div className="font-heading font-bold text-lg text-ink mb-2">
            {shop.name}
          </div>
          <p className="text-muted text-sm">
            Aucun produit disponible pour le moment.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex justify-center py-8 px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-between mb-4 px-1">
          <span className="font-heading font-bold text-ink flex items-center gap-2">
            {shop.logo_url && (
              <img src={shop.logo_url} alt="" className="w-6 h-6 rounded object-cover" />
            )}
            {shop.name}
            <span className="text-accent">.</span>
          </span>
          <span className="text-xs text-muted bg-surface px-3 py-1 rounded-full">
            58 wilayas
          </span>
        </div>

        <div className="bg-surface rounded-card overflow-hidden mb-4">
          <div className="h-56 bg-canvas flex items-center justify-center">
            {product.images?.[0] ? (
              <img
                src={product.images[0]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-muted text-sm">Photo produit</span>
            )}
          </div>
          <div className="p-5">
            <h1 className="font-heading font-bold text-xl text-ink mb-2">
              {product.name}
            </h1>
            {product.description && (
              <p className="text-sm text-muted mb-3">{product.description}</p>
            )}
            <div className="flex items-baseline gap-2">
              <span className="font-heading font-bold text-2xl text-accent">
                {product.price} DA
              </span>
              {product.compare_at_price && (
                <span className="text-sm text-muted line-through">
                  {product.compare_at_price} DA
                </span>
              )}
            </div>
          </div>
        </div>

        <OrderForm shopId={shop.id} product={product} />
      </div>
    </div>
  );
}
