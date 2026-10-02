const TROY_OZ_GRAMS = 31.1034768;

// Free keyless APIs used by the buttons.
// Gold: XAU/USD spot price.
// FX: USD -> PKR daily exchange rate.
const GOLD_API = "https://api.gold-api.com/price/XAU";
const FX_API = "https://cdn.jsdelivr.net/gh/irfanokr/currency-api@main/v1/currencies/usd.json";

const $ = id => document.getElementById(id);

function num(id) {
  const n = parseFloat($(id).value);
  return Number.isFinite(n) ? n : 0;
}

function money(value) {
  return "PKR " + value.toLocaleString("en-PK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function calculate() {
  const internationalPkrTola = num("internationalRate");
  const karat = num("karat");
  const weight = num("weight");
  const makingAmount = num("polish");

  const rate24kPerGram = internationalPkrTola > 0
    ? internationalPkrTola / 11.6638125
    : 0;

  const selectedRate = rate24kPerGram * (karat / 24);
  const goldValue = selectedRate * weight;

  let wastageMashaPerTola = 0;
  if ($("wastage").value === "yes") {
    wastageMashaPerTola = num("defaultWastage");
  } else if ($("wastage").value === "manual") {
    wastageMashaPerTola = num("wastagePercent");
  }

  // 1 Tola = 12 Masha.
  // Example: 6.420g × 2 Masha ÷ 12 = 1.070g wastage.
  const wastageGramsPerTola =
    11.6638125 * (wastageMashaPerTola / 12);

  const wastageGrams =
    weight * (wastageMashaPerTola / 12);

  const wastageAmount =
    selectedRate * wastageGrams;

  // Making is the exact amount entered in the textbox.
  const total = goldValue + wastageAmount + makingAmount;

  $("goldRate").value =
    selectedRate ? selectedRate.toFixed(2) : "";

  $("wastageGramsDisplay").value =
    wastageGramsPerTola ? wastageGramsPerTola.toFixed(3) : "0.000";

  $("outTolaRate").textContent =
    money(selectedRate * 11.6638125) + " / tola";

  $("outRate").textContent =
    money(selectedRate) + " / g";

  $("outGold").textContent =
    money(goldValue);

  $("outWastage").textContent =
    money(wastageAmount) +
    " (" + wastageMashaPerTola.toFixed(2) +
    " Masha/Tola = " + wastageGrams.toFixed(3) + " g for this weight)";

  $("outPolish").textContent =
    money(makingAmount);

  $("outTotal").textContent =
    money(total);
}

async function getGoldRate() {
  const btn = $("goldBtn");
  const status = $("status");
  btn.disabled = true;
  btn.textContent = "Loading...";
  status.textContent = "Fetching live XAU/USD and latest USD/PKR rates...";

  try {
    const [goldResponse, fxResponse] = await Promise.all([
      fetch(GOLD_API, { cache: "no-store" }),
      fetch(FX_API, { cache: "no-store" })
    ]);

    if (!goldResponse.ok) throw new Error("Gold API returned HTTP " + goldResponse.status);
    if (!fxResponse.ok) throw new Error("FX API returned HTTP " + fxResponse.status);

    const goldData = await goldResponse.json();
    const fxData = await fxResponse.json();

    const usdPerTroyOz = Number(goldData.price);
    const usdPkr = Number(fxData.usd && fxData.usd.pkr);

    if (!Number.isFinite(usdPerTroyOz) || !Number.isFinite(usdPkr)) {
      throw new Error("Invalid market rate received.");
    }

    // XAU/USD = USD per troy ounce.
    // 1 Pakistani tola = 11.6638125 g; 1 troy oz = 31.1034768 g.
    const pkrPerTola =
      usdPerTroyOz * usdPkr * (11.6638125 / TROY_OZ_GRAMS);

    $("xauUsd").value = usdPerTroyOz.toFixed(2);
    $("usdPkr").value = usdPkr.toFixed(2);
    $("internationalRate").value = pkrPerTola.toFixed(0);

    const fetchedAt = new Date().toLocaleTimeString("en-PK", {
      hour: "2-digit", minute: "2-digit", second: "2-digit"
    });
    status.textContent =
      "Live gold rate updated at " + fetchedAt + ". XAU/USD: $" +
      usdPerTroyOz.toFixed(2) + " | USD/PKR: " + usdPkr.toFixed(2);

    calculate();
  } catch (error) {
    status.textContent =
      "Could not fetch live rates. Please try Refresh Live Rate. " + error.message;
  } finally {
    btn.disabled = false;
    btn.textContent = "Refresh Live Rate";
  }
}

async function getFxRate() {
  const btn = $("fxBtn");
  const status = $("status");
  btn.disabled = true;
  btn.textContent = "Loading...";
  status.textContent = "Getting today's USD/PKR exchange rate...";

  try {
    const response = await fetch(FX_API, { cache: "no-store" });
    if (!response.ok) throw new Error("FX API returned HTTP " + response.status);
    const data = await response.json();

    const rate = Number(data.usd && data.usd.pkr);
    if (!Number.isFinite(rate)) throw new Error("Invalid USD/PKR rate received.");

    $("usdPkr").value = rate.toFixed(2);

    const usdPerTroyOz = num("xauUsd");
    if (usdPerTroyOz > 0) {
      const pkrPerTola = usdPerTroyOz * rate * (11.6638125 / TROY_OZ_GRAMS);
      $("internationalRate").value = pkrPerTola.toFixed(0);
    }

    status.textContent = "USD/PKR rate updated and PKR/tola recalculated.";
    calculate();
  } catch (error) {
    status.textContent = "Could not fetch USD/PKR rate. Enter it manually. " + error.message;
  } finally {
    btn.disabled = false;
    btn.textContent = "Get Today's Rate";
  }
}

$("goldBtn").addEventListener("click", getGoldRate);
$("fxBtn").addEventListener("click", getFxRate);

["internationalRate", "usdPkr", "polish", "karat", "weight",
 "defaultWastage", "wastagePercent"].forEach(id => {
  $(id).addEventListener("input", calculate);
  $(id).addEventListener("change", calculate);
});

$("wastage").addEventListener("change", () => {
  const mode = $("wastage").value;
  $("wastageBox").classList.toggle("hidden", mode !== "manual");
  $("defaultWastageBox").classList.toggle("hidden", mode !== "yes");
  calculate();
});

// Automatically fetch market rates when the page opens.
getGoldRate();

// Refresh periodically so the displayed XAU/USD and calculated PKR/tola stay current.
// FX data may update less frequently than gold because the free FX source is a latest/daily reference feed.
setInterval(getGoldRate, 60000);


// Automatically refresh market rates every 60 seconds.
let autoRefreshTimer = null;

async function refreshLiveRates() {
  if (typeof getGoldRate === "function") {
    await getGoldRate();
  }
}

function startAutoRefresh() {
  if (autoRefreshTimer) clearInterval(autoRefreshTimer);
  autoRefreshTimer = setInterval(refreshLiveRates, 60 * 1000);
}

// Load live rates automatically when the page opens.
refreshLiveRates().finally(startAutoRefresh);
