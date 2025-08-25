// scripts/main.js
let currentPrice = 0;
let currentCurrency = 'USD';

// Formateo numérico en español
function formatNumber(number) {
  return number.toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

// Elementos del DOM
const productSelect    = document.getElementById('productSelect');
const customPriceDiv   = document.getElementById('customPriceDiv');
const customPrice      = document.getElementById('customPrice');
const customCurrency   = document.getElementById('customCurrency');
const transferRate     = document.getElementById('transferRate');
const apiValueInput    = document.getElementById('apiValue');
const paymentMethod    = document.getElementById('paymentMethod');
const transferAmount   = document.getElementById('transferAmount');
const resultsDiv       = document.getElementById('results');
const comparisonDiv    = document.getElementById('comparison');
const comparisonContent= document.getElementById('comparisonContent');
const lastUpdateSpan   = document.getElementById('lastUpdate');

const batteryFullCheckbox = document.getElementById('batteryFullCheckbox');


// Función reusable para obtener la tasa promedio de Binance P2P
async function fetchBinanceP2PAverage() {
  try {
    const res = await fetch('/.netlify/functions/binance-p2p-average/* ?asset=USDT&fiat=VES&tradeType=SELL&rows=12&trim=0.1 */');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    if (!data.ok) throw new Error(data.message || 'Respuesta no válida');

    // Tomamos el promedio recortado o el promedio simple
    const promedio = data.stats.trimmedAverage || data.stats.average;

    // Asignamos el valor al input
    transferRate.value = promedio.toFixed(2)  | 0;

    return promedio;
  } catch (err) {
    console.error('Error obteniendo tasa:', err);
    // Si falla, mantenemos el valor por defecto (15) o cualquier otro
    return null;
  }
}
document.addEventListener('DOMContentLoaded', async () => {
  //transferRate = document.getElementById('transferRate');

  // Inicializamos la tasa de Binance P2P
  const binanceRate = await fetchBinanceP2PAverage();
});


// Listeners para inputs
productSelect.addEventListener('change', onProductChange);
customPrice.addEventListener('input', () => updatePrice('custom'));
customCurrency.addEventListener('change', () => updatePrice('currency'));
transferRate.addEventListener('input', calculateRealTime);
apiValueInput.addEventListener('input', calculateRealTime);
paymentMethod.addEventListener('change', onMethodChange);
transferAmount.addEventListener('input', calculateRealTime);



// Listener para el checkbox:
batteryFullCheckbox.addEventListener('change', () => {
  if (productSelect.value === 'custom') {
    updatePrice('custom');
  } else {
    onProductChange();
  }
});

function getAdjustedPrice(basePrice) {
  let price = basePrice;
  if (batteryFullCheckbox && batteryFullCheckbox.checked) {
    price += 20;
  }
  return price;
}
/* // Manejo de selección de producto
function onProductChange() {
  const val = productSelect.value;
  if (val === 'custom') {
    customPriceDiv.classList.remove('hidden');
    currentPrice = 0;
    currentCurrency = customCurrency.value;
  } else if (!val) {
    customPriceDiv.classList.add('hidden');
    currentPrice = 0;
    currentCurrency = 'USD';
  } else {
    customPriceDiv.classList.add('hidden');
    const opt = productSelect.selectedOptions[0];
    currentPrice = parseFloat(opt.dataset.price) || 0;
    currentCurrency = opt.dataset.currency || 'USD';
  }
  calculateRealTime();
} */
// Modifica onProductChange:
function onProductChange() {
  const val = productSelect.value;
  if (val === 'custom') {
    customPriceDiv.classList.remove('hidden');
    currentPrice = getAdjustedPrice(parseFloat(customPrice.value) || 0);
    currentCurrency = customCurrency.value;
  } else if (!val) {
    customPriceDiv.classList.add('hidden');
    currentPrice = 0;
    currentCurrency = 'USD';
  } else {
    customPriceDiv.classList.add('hidden');
    const opt = productSelect.selectedOptions[0];
    const basePrice = parseFloat(opt.dataset.price) || 0;
    currentPrice = getAdjustedPrice(basePrice);
    currentCurrency = opt.dataset.currency || 'USD';
  }
  calculateRealTime();
}

/* // Actualiza el precio cuando cambias el input personalizado
function updatePrice(type) {
  if (type === 'custom') {
    currentPrice = parseFloat(customPrice.value) || 0;
  } else {
    currentCurrency = customCurrency.value;
  }
  calculateRealTime();
} */
// Modifica updatePrice:
function updatePrice(type) {
  if (type === 'custom') {
    currentPrice = getAdjustedPrice(parseFloat(customPrice.value) || 0);
  } else {
    currentCurrency = customCurrency.value;
    currentPrice = getAdjustedPrice(parseFloat(customPrice.value) || 0);
  }
  calculateRealTime();
}


// Mostrar u ocultar sección de pago mixto
function onMethodChange() {
  if (paymentMethod.value === 'mixed') {
    transferAmount.parentElement.classList.remove('hidden');
  } else {
    transferAmount.parentElement.classList.add('hidden');
  }
  calculateRealTime();
}

// Simula llamada a API para obtener divisor dinámico

// 🌐 Obtener tasa USD → VES real desde open.er-api.com
async function fetchExchangeRate() {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    const data = await res.json();
    if (data.result === 'success' && data.rates.VES) {
      return parseFloat(data.rates.VES);
    } else {
      console.error('Error al obtener tasa:', data);
      return null;
    }
  } catch (err) {
    console.error('Fetch error:', err);
    return null;
  }
}


// Nuevo updateApiValue: consulta la API en vez de generar un valor random
// 🔁 Actualiza el campo de tasa usando fetchExchangeRate()
async function updateApiValue() {
  const rate = await fetchExchangeRate();
  const binanceRate = await fetchBinanceP2PAverage();
  if (rate !== null) {
    apiValueInput.value = rate.toFixed(2);
    transferRate.value = binanceRate.toFixed(2) | 0;
    calculateRealTime(); // recalcula con el nuevo valor
  }
}
updateApiValue();                      // al cargar
setInterval(updateApiValue, 30_000);   // cada 30 segundos




// Limpia el área de resultados
function clearResults() {
  resultsDiv.innerHTML = `
    <div class="text-center text-gray-500 py-8">
      <div class="text-6xl mb-4">🧮</div>
      <p>Configura los parámetros para ver los resultados en tiempo real</p>
    </div>`;
  comparisonDiv.classList.add('hidden');
}

// Reset visual
function resetVisualEffects() {
  resultsDiv.style.opacity   = '1';
  resultsDiv.style.transform = 'scale(1)';
  resultsDiv.style.transition= 'all 0.3s ease';
}

// Cálculo en tiempo real con animación
function calculateRealTime() {
  if (currentPrice <= 0) {
    clearResults();
    return;
  }

  resultsDiv.style.opacity   = '0.7';
  resultsDiv.style.transform = 'scale(0.98)';

  setTimeout(() => {
    const rate      = parseFloat(transferRate.value) || 0;
    const apiValue  = parseFloat(apiValueInput.value) || 1;
    const method    = paymentMethod.value;
    const tAmount   = parseFloat(transferAmount.value) || 0;
    let results     = {};

    switch (method) {
      case 'cash':
      case 'zelle':
      case 'binance':
        results = calculateDirectPayment();
        break;
      case 'transfer':
        results = calculateTransferPayment(rate, apiValue);
        break;
      case 'mixed':
        if (tAmount > 0 && tAmount < currentPrice) {
          results = calculateMixedPayment(tAmount, rate, apiValue);
        } else {
          clearResults();
          return;
        }
        break;
    }

    displayResults(results, method);
    showComparison(rate, apiValue);
    resetVisualEffects();
  }, 150);
}

// Métodos de cálculo
function calculateDirectPayment() {
  return { originalPrice: currentPrice, finalPrice: currentPrice };
}

function calculateTransferPayment(rate, api) {
  const totalWithRate    = currentPrice * rate;
  const convertedAmount  = totalWithRate / api;
  return {
    originalPrice: currentPrice,
    finalPrice:    totalWithRate,
    convertedAmount,
    rate,
    apiValue: api
  };
}

function calculateMixedPayment(tAmount, rate, api) {
  const cashPart         = currentPrice - tAmount;
  const transferWithRate = tAmount * rate;
  const convertedTransf  = transferWithRate / api;
  return {
    originalPrice:   currentPrice,
    cashAmount:      cashPart,
    transferAmount:  tAmount,
    transferWithRate,
    convertedTransfer: convertedTransf,
    totalConverted:  cashPart + convertedTransf,
    rate,
    apiValue: api
  };
}

// Mostrar resultados en pantalla
function displayResults(res, method) {
  const sym = '$'
  let html = ''

  //––– Directo: sin recargos
  if (['cash','zelle','binance'].includes(method)) {
    html = `
      <div class="bg-green-50 border border-green-200 rounded-lg p-4">
        <h3 class="font-semibold text-green-800 mb-2">✅ Pago Directo</h3>
        <div class="text-2xl font-bold text-green-600">
          ${sym}${res.finalPrice.toFixed(2)}
        </div>
        <p class="text-green-700 text-sm mt-1">Sin recargos adicionales</p>
      </div>`
  }

  //––– Transferencia completa
  else if (method === 'transfer') {
    html = `
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <h3 class="font-semibold text-blue-800 mb-3">🏦 Transferencia Completa</h3>
        <div class="space-y-2">
          <div class="flex justify-between">
            <span class="text-gray-600">Precio descuento en (USD):</span>
            <span class="font-semibold">${sym}${res.originalPrice.toFixed(2)}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">BNCUSDT95:</span>
            <span class="font-semibold">${res.rate}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">
              Costo base del equipo en Bs:
            </span>
            <span class="font-bold text-blue-600 text-lg">
              Bs ${res.finalPrice.toLocaleString()}
            </span>
          </div>
          <div class="flex justify-between border-t pt-2">
            <span class="text-gray-600">
              Equivalente BCV:
            </span>
            <span class="font-bold text-purple-600 text-lg">
              ${sym}${res.convertedAmount.toFixed(2)}
            </span>
          </div>
          <div class="flex justify-between bg-yellow-50 border border-yellow-200 rounded p-2 mt-2">
            <span class="text-yellow-700 font-medium">Diferencia vs precio base:</span>
            <span class="font-bold text-yellow-600">
              +${sym}${(res.convertedAmount - res.originalPrice).toFixed(3)}
            </span>
          </div>
        </div>
      </div>`
  }

  //––– Pago mixto
  else if (method === 'mixed') {
    html = `
      <div class="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
        <h3 class="font-semibold text-purple-800 mb-3">🔄 Pago Mixto</h3>
        <div class="space-y-3">
          <div class="bg-white rounded p-3">
            <h4 class="font-medium text-gray-700 mb-2">
              💵 Parte en Efectivo/Divisas/Zelle/Binance
            </h4>
            <div class="text-lg font-bold text-green-600">
              ${sym}${res.cashAmount.toFixed(2)}
            </div>
            
          </div>
          <div class="bg-white rounded p-3">
            <h4 class="font-medium text-gray-700 mb-2">🏦 Parte en Transferencia</h4>
            <div class="text-sm text-gray-600 mb-1">
               ${res.transferAmount.toFixed(2)}RT×TR${res.rate}
            </div>
            <div class="text-lg font-bold text-blue-600">
              Bs ${res.transferWithRate.toLocaleString()}
            </div>
            <div class="text-sm text-purple-600">
              Equivalente bcv(${res.apiValue}): 
              ${sym}${res.convertedTransfer.toFixed(2)}
            </div>
          </div>
          <div class="bg-gradient-to-r from-purple-100 to-blue-100 rounded p-3 border-t-2 border-purple-300">
            <div class="flex justify-between items-center">
              <span class="font-semibold text-gray-700">Total Final:</span>
              <span class="font-bold text-purple-700 text-xl">
                ${sym}${res.totalConverted.toFixed(3)}
              </span>
            </div>
            <div class="text-xs text-gray-600 mt-1">Efectivo + Transferencia convertida</div>
            <div class="flex justify-between bg-yellow-50 border border-yellow-200 rounded p-2 mt-2">
              <span class="text-yellow-700 font-medium text-sm">
                Diferencia vs precio base:
              </span>
              <span class="font-bold text-yellow-600 text-sm">
                +${sym}${(res.totalConverted - res.originalPrice).toFixed(3)}
              </span>
            </div>
          </div>
        </div>
      </div>`
  }

  resultsDiv.innerHTML = html
}

// Comparativa de métodos
function showComparison(rate, api) {
  const sym = currentCurrency === 'EUR' ? '€' : '$';
  const methods = [
    { name: 'Efectivo/Divisas', price: currentPrice, icon: '💵' },
    { name: 'Zelle',           price: currentPrice, icon: '💳' },
    { name: 'Binance',         price: currentPrice, icon: '₿' },
    { name: 'Transferencia',   price: (currentPrice * rate) / api, icon: '🏦' }
  ];

  methods.sort((a, b) => a.price - b.price);

  comparisonContent.innerHTML = methods.map((m, i) => {
    const diff    = m.price - currentPrice;
    const isBest  = i === 0;
    return `
      <div class="flex justify-between items-center p-3 rounded-lg ${
        isBest ? 'bg-green-50 border border-green-200' : 'bg-gray-50'
      }">
        <div class="flex items-center gap-2">
          <span>${m.icon}</span>
          <span class="font-medium">${m.name}</span>
          ${isBest ? '<span class="text-xs bg-green-500 text-white px-2 py-1 rounded-full ml-2">MEJOR</span>' : ''}
        </div>
        <div class="text-right">
          <div class="font-bold ${
            isBest ? 'text-green-600' : 'text-gray-700'
          }">${sym}${m.price.toFixed(2)} ${currentCurrency}</div>
          ${diff > 0 ? `<div class="text-xs text-red-500">+${sym}${diff.toFixed(2)}</div>` : ''}
        </div>
      </div>`;
  }).join('');

  comparisonDiv.classList.remove('hidden');
}

// Nombre legible de cada método
function getMethodName(key) {
  const map = {
    cash:     'Efectivo/Divisas',
    zelle:    'Zelle',
    binance:  'Binance',
    transfer: 'Transferencia',
    mixed:    'Pago Mixto'
  };
  return map[key] || key;
}


/* //const productSelect = document.getElementById('productSelect');
const batteryFullCheckbox = document.getElementById('batteryFullCheckbox');

productSelect.addEventListener('change', updatePrice);
batteryFullCheckbox.addEventListener('change', updatePrice);

function updatePrice() {
  const selectedOption = productSelect.options[productSelect.selectedIndex];
  if (!selectedOption || !selectedOption.dataset.price) {
    console.log('No producto seleccionado');
    return;
  }

  let basePrice = parseFloat(selectedOption.dataset.price);
  if (batteryFullCheckbox.checked) {
    basePrice += 20; // Suma $20 si tiene 100% batería
  }

  console.log(`Precio ajustado: $${basePrice} USD`);
  // Aquí puedes actualizar la UI o precio mostrado según tu app
}
 */



// Inicialización
updateApiValue();
lastUpdateSpan.textContent = new Date().toLocaleTimeString('es-ES');
calculateRealTime();









