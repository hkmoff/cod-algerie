/**
 * Worker cod-algerie-api
 *
 * Rôle : tout ce qui a besoin d'un secret (identifiants transporteur) passe
 * par ici. Le reste (lire une boutique, lire des produits, créer une
 * commande) se fait directement depuis le frontend vers Supabase, protégé
 * par les policies RLS déjà en place.
 *
 * Route :
 *   POST /api/rate   → calcule le frais de livraison réel pour une commande
 */

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

async function supabaseRest(
  env: Env,
  path: string,
): Promise<any> {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });
  if (!res.ok) {
    throw new Error(`Supabase REST error (${res.status}) on ${path}`);
  }
  return res.json();
}

interface RateRequestBody {
  shop_id: string;
  wilaya_code: number;
  delivery_mode: "home" | "stopdesk";
}

async function handleRate(request: Request, env: Env): Promise<Response> {
  let body: RateRequestBody;
  try {
    body = await request.json();
  } catch {
    return json({ error: "JSON invalide" }, 400);
  }

  const { shop_id, wilaya_code, delivery_mode } = body;
  if (!shop_id || !wilaya_code || !delivery_mode) {
    return json(
      { error: "shop_id, wilaya_code et delivery_mode sont requis" },
      400,
    );
  }

  // 1. Boutique : wilaya d'origine (public, mais on le lit ici pour rester
  //    dans un seul aller-retour serveur)
  const shops = await supabaseRest(
    env,
    `shops?id=eq.${shop_id}&select=origin_wilaya_code`,
  );
  if (!shops.length || !shops[0].origin_wilaya_code) {
    return json({ error: "Boutique introuvable ou wilaya d'origine non configurée" }, 404);
  }
  const fromWilaya = shops[0].origin_wilaya_code;

  // 2. Identifiants transporteur de cette boutique (jamais exposés au client)
  const creds = await supabaseRest(
    env,
    `shop_courier_credentials?shop_id=eq.${shop_id}&select=courier,api_id,api_token`,
  );
  if (!creds.length) {
    return json(
      { error: "Aucun transporteur connecté pour cette boutique" },
      404,
    );
  }
  const { courier, api_id, api_token } = creds[0];

  // 3. Appel dzship (agrégateur transporteurs, gratuit, sans clé propre)
  const rateRes = await fetch("https://freeship.dzbuild.com/v1/rates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      courier,
      credentials: { apiId: api_id, apiToken: api_token },
      query: { fromWilaya, toWilaya: wilaya_code, deliveryType: delivery_mode },
    }),
  });

  if (!rateRes.ok) {
    return json({ error: "Le transporteur n'a pas pu être contacté" }, 502);
  }

  const rate = await rateRes.json();
  return json({
    deliveryFee: rate.deliveryFee,
    returnFee: rate.returnFee,
    currency: rate.currency ?? "DZD",
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    if (url.pathname === "/api/rate" && request.method === "POST") {
      try {
        return await handleRate(request, env);
      } catch (err) {
        return json({ error: (err as Error).message }, 500);
      }
    }

    return json({ error: "Not found" }, 404);
  },
};
