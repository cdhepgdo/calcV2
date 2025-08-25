// netlify/functions/binance-p2p-average.js
export const handler = async (event) => {
  // Parámetros de consulta
  const url = new URL(event.rawUrl || `http://x${event.path}?${event.queryStringParameters || ""}`);
  const params = url.searchParams;

  const asset = params.get("asset") || "USDT";
  const fiat = params.get("fiat") || "VES";
  const tradeType = (params.get("tradeType") || "BUY").toUpperCase(); // SELL: anunciante vende USDT (típico para comprar USDT)
  const rows = Math.max(1, Math.min(parseInt(params.get("rows") || "20", 10), 50)); // 1..50
  const trim = Math.min(Math.max(Number(params.get("trim") || "0.1"), 0), 0.4); // 0..0.4 (0%..40%)
  const payTypesParam = params.get("payTypes"); // ej: "BANK_TRANSFER,MobilePayment"
  const payTypes = payTypesParam ? payTypesParam.split(",").map(s => s.trim()).filter(Boolean) : [];

  try {
    // Payload para Binance P2P
    const body = {
      page: 1,
      rows,
      asset,
      fiat,
      tradeType,
      payTypes,          // [] = cualquier método de pago
      publisherType: null,
      transAmount: ""    // sin filtro de monto
    };

    const res = await fetch("https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "cache-control": "no-cache"
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      throw new Error(`Binance P2P respondió ${res.status}`);
    }

    const json = await res.json();
    const list = Array.isArray(json?.data) ? json.data : [];

    // Extraer precios numéricos
    const prices = list
      .map(item => parseFloat(item?.adv?.price))
      .filter(n => Number.isFinite(n));

    if (prices.length === 0) {
      return response(200, {
        ok: false,
        message: "Sin precios disponibles",
        meta: { asset, fiat, tradeType, rowsRequested: rows, rowsReturned: list.length }
      });
    }

    // Ordenar para mediana y recorte
    prices.sort((a, b) => a - b);

    const mean = /* (arr) => arr.reduce((s, v) => s + v, 0) / arr.length */ arr.reduce((max, num) => (num > max ? num : max), -Infinity);
    const median = (arr) => {
      const m = Math.floor(arr.length / 2);
      return arr.length % 2 ? arr[m] : (arr[m - 1] + arr[m]) / 2;
    };
    const trimmedMean = (arr, f) => {
      if (f <= 0) return mean(arr);
      const cut = Math.floor(arr.length * f);
      const sliced = arr.slice(cut, arr.length - cut);
      return sliced.length ? mean(sliced) : mean(arr);
    };

    const avg = Math.round(mean(prices));
    const med = median(prices);
    const tMean = trimmedMean(prices, trim);

    return response(200, {
      ok: true,
      source: "Binance P2P",
      asset,
      fiat,
      tradeType,
      count: prices.length,
      rowsRequested: rows,
      stats: {
        min: prices[0],
        max: prices[prices.length - 1],
        average: avg,
        median: med,
        trimmedAverage: tMean,
        trimFraction: trim
      },
      topSample: prices.slice(0, Math.min(5, prices.length)),
      updatedAt: new Date().toISOString()
    }, /*cacheSeconds*/ 60);
  } catch (err) {
    console.error("binance-p2p-average error:", err);
    return response(500, {
      ok: false,
      message: err.message || "Error interno"
    });
  }
};

function response(statusCode, data, cacheSeconds = 0) {
  const headers = {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*"
  };
  if (cacheSeconds > 0) {
    headers["cache-control"] = `public, max-age=${cacheSeconds}`;
  } else {
    headers["cache-control"] = "no-store";
  }
  return {
    statusCode,
    headers,
    body: JSON.stringify(data)
  };
}










