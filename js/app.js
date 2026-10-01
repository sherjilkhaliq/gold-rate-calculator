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
  let wastageGrams = 0;

  if ($("wastage").value === "yes") {
    // Yes = Masha per Tola. 1 Tola = 12 Masha.
    wastageMashaPerTola = num("defaultWastage");
    wastageGrams = weight * (wastageMashaPerTola / 12);
  } else if ($("wastage").value === "manual") {
    // Manual = exact grams entered by the user.
    wastageGrams = num("wastagePercent");
  }

  const wastageGramsPerTola = weight > 0
    ? wastageGrams * (11.6638125 / weight)
    : 0;

  const wastageAmount =
    selectedRate * wastageGrams;

  // Making is the exact amount entered in the textbox.
  const total = goldValue + wastageAmount + makingAmount;

  $("goldRate").value =
    selectedRate ? selectedRate.toFixed(2) : "";

  $("wastageGramsDisplay").value =
    $("wastage").value === "manual"
      ? wastageGrams.toFixed(3)
      : (wastageGramsPerTola ? wastageGramsPerTola.toFixed(3) : "0.000");

  $("outTolaRate").textContent =
    money(selectedRate * 11.6638125) + " / tola";

  $("outRate").textContent =
    money(selectedRate) + " / g";

  $("outGold").textContent =
    money(goldValue);

  $("outWastage").textContent =
    money(wastageAmount) +
    (wastageMashaPerTola > 0
      ? " (" + wastageMashaPerTola.toFixed(2) + " Masha/Tola = " + wastageGrams.toFixed(3) + " g)"
      : " (" + wastageGrams.toFixed(3) + " g)");

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
  status.textContent = "Getting today's gold and USD/PKR rates...";

  try {
    const [goldResponse, fxResponse] = await Promise.all([
      fetch("https://api.gold-api.com/price/XAU", { cache: "no-store" }),
      fetch("https://cdn.jsdelivr.net/gh/irfanokr/currency-api@main/v1/currencies/usd.json", { cache: "no-store" })
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

    // XAU is USD per troy ounce. Convert it to PKR per Pakistani tola.
    const pkrPerTola = usdPerTroyOz * usdPkr * (11.6638125 / 31.1034768);

    $("internationalRate").value = pkrPerTola.toFixed(0);
    $("usdPkr").value = usdPkr.toFixed(2);
    status.textContent = "Today's international gold rate and USD/PKR rate updated.";
    calculate();
  } catch (error) {
    status.textContent = "Could not fetch live rates. Enter the PKR/tola rate manually. " + error.message;
  } finally {
    btn.disabled = false;
    btn.textContent = "Get Today's Rate";
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
    status.textContent = "USD/PKR rate updated.";
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
  $("wastageGramsBox").querySelector("label").textContent =
    mode === "manual" ? "Wastage (grams)" : "Wastage (grams per Tola)";
  $("wastageBox").classList.toggle("hidden", mode !== "manual");
  $("defaultWastageBox").classList.toggle("hidden", mode !== "yes");
  calculate();
});

calculate();
