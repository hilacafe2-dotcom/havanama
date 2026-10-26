
import { CapacitorHttp } from "@capacitor/core";

/* ============ تنظیمات منبع داده ============
   DOE_URL: آدرس JSON سامانه کیفیت هوای سازمان حفاظت محیط زیست (aqms.doe.ir).
   مرورگر معمولاً درخواست مستقیم به آن را (CORS) مسدود می‌کند؛ پس آدرس یک پروکسی
   خودت را بگذار (مثلاً Cloudflare Worker). اگر خالی باشد، برنامه از Open-Meteo
   (داده مدل‌سازی‌شده) استفاده می‌کند و روی صفحه همین را نشان می‌دهد. */
const DOE_URL = "https://aqms.doe.ir/Home/LoadAQIMap?id=3";

const CITIES = {
  "اصفهان":[32.6546,51.6680], "تهران":[35.6892,51.3890], "مشهد":[36.2605,59.6168],
  "شیراز":[29.5918,52.5837], "تبریز":[38.0962,46.2738], "کرج":[35.8400,50.9391],
  "اهواز":[31.3183,48.6706], "قم":[34.6416,50.8746], "اراک":[34.0954,49.7013],
  "کرمان":[30.2839,57.0834], "ارومیه":[37.5527,45.0760], "کرمانشاه":[34.3277,47.0778],
  "یزد":[31.8974,54.3569], "قزوین":[36.2688,50.0041], "زاهدان":[29.4963,60.8629],
  "بندر عباس":[27.1832,56.2666], "رشت":[37.2808,49.5832], "همدان":[34.7992,48.5146]
};

const LEVELS = [
  {max:50,  name:"پاک",                      color:"#2fa56a", ink:"#157a4a", emoji:"😊", h:["#1f6b3f","#5aa273"],
   tip:"هوا عالی است؛ هر فعالیتی در فضای باز بلامانع است.",
   chips:["🏃 ورزش بیرون مناسب است","🪟 پنجره‌ها را باز بگذار"]},
  {max:100, name:"قابل قبول",                color:"#d4b400", ink:"#8a6d00", emoji:"🙂", h:["#b08d00","#e6cc4e"],
   tip:"برای افراد بسیار حساس ممکن است کمی ناسالم باشد.",
   chips:["🏃 ورزش سبک مشکلی ندارد","👶 افراد حساس مراقب باشند"]},
  {max:150, name:"ناسالم برای گروه‌های حساس", color:"#e8832a", ink:"#b25a14", emoji:"😷", h:["#b25a14","#f0a04b"],
   tip:"کودکان، سالمندان و بیماران قلبی و تنفسی فعالیت بیرونی را کم کنند.",
   chips:["😷 گروه‌های حساس ماسک بزنند","⏱️ فعالیت بیرون را کم کن"]},
  {max:200, name:"ناسالم",                   color:"#d63c3c", ink:"#a42a2a", emoji:"🤒", h:["#9c2626","#e46a6a"],
   tip:"فعالیت سنگین در فضای باز توصیه نمی‌شود؛ ماسک N95 بزنید.",
   chips:["😷 ماسک N95","🚫 ورزش در فضای باز نکن"]},
  {max:300, name:"خیلی ناسالم",              color:"#8e44ad", ink:"#6b2c85", emoji:"🤢", h:["#5f2478","#a46bc2"],
   tip:"تا حد امکان در خانه بمانید و پنجره‌ها را ببندید.",
   chips:["🏠 در خانه بمان","🪟 پنجره‌ها بسته باشد"]},
  {max:9999,name:"خطرناک",                   color:"#7a1f35", ink:"#7a1f35", emoji:"🚨", h:["#4e1022","#a03a58"],
   tip:"وضعیت اضطراری؛ از خانه بیرون نروید.",
   chips:["🚨 از خانه بیرون نرو","🏠 در خانه بمان"]}
];
const level = a => LEVELS.find(l => a <= l.max);
const $ = id => document.getElementById(id);
const fa = n => String(n).replace(/\d/g, d => "۰۱۲۳۴۵۶۷۸۹"[d]);

/* ---------- گیج نیم‌دایره ---------- */
function gauge({value, max, color, big}) {
  const r = 120, L = Math.PI * r, cx = 150, cy = 150;
  const path = `M ${cx-r} ${cy} A ${r} ${r} 0 0 1 ${cx+r} ${cy}`;
  const sw = big ? 20 : 24;
  let segs = "";
  if (big) {
    const bounds = [0,50,100,150,200,300];
    const cols = ["#2fa56a","#d4b400","#e8832a","#d63c3c","#8e44ad"];
    cols.forEach((c,i) => {
      const a = bounds[i]/300*L, b = bounds[i+1]/300*L;
      segs += `<path d="${path}" fill="none" stroke="${c}" stroke-opacity=".22" stroke-width="${sw}" stroke-dasharray="0 ${a} ${b-a} ${L}"/>`;
    });
  }
  const f = value == null ? 0 : Math.max(0, Math.min(1, value / max));
  const px = cx - r * Math.cos(f * Math.PI), py = cy - r * Math.sin(f * Math.PI);
  return `<svg viewBox="0 0 300 175" aria-hidden="true">
    <path d="${path}" fill="none" stroke="#eceeed" stroke-width="${sw}" stroke-linecap="round"/>
    ${segs}
    ${value == null ? "" : `<path d="${path}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-dasharray="${f*L} ${L}"/>
    <circle cx="${px}" cy="${py}" r="${big?5:6}" fill="#fff" stroke="${color}" stroke-width="3"/>`}
  </svg>`;
}
function drawGauge(el, {value, max, big, label, unit, colorValue = value}) {
  const lv = (value == null || colorValue == null) ? null : level(colorValue);
  const color = lv ? lv.color : "#9aa5a0";
  el.innerHTML = gauge({value, max, color, big}) +
    `<div class="center"><div class="num">${value == null ? "—" : fa(Math.round(value))}</div>` +
    (big ? `<div class="lvl" style="color:${color}">${label}</div><div class="sub">شاخص کیفیت هوا (AQI)</div>`
         : `<div class="unit" style="color:${color}">${unit}</div>`) + `</div>`;
}

/* ---------- گیج بزرگ با عقربه متحرک ---------- */
function drawBig(el, value, label, emoji) {
  const r = 120, L = Math.PI * r, cx = 150, cy = 150, sw = 18, pad = sw / 2 + 1.5;
  const path = `M ${cx-r} ${cy} A ${r} ${r} 0 0 1 ${cx+r} ${cy}`;
  const bounds = [0,50,100,150,200,300];
  const cols = ["#2fa56a","#d4b400","#e8832a","#d63c3c","#8e44ad"];
  let segs = "";
  cols.forEach((c, i) => {
    const a = bounds[i]/300*L + pad, b = bounds[i+1]/300*L - pad;
    segs += `<path d="${path}" fill="none" stroke="${c}" stroke-width="${sw}" stroke-linecap="round" stroke-dasharray="${b-a} ${L*2}" stroke-dashoffset="${-a}"/>`;
  });
  const has = value != null;
  const lv = has ? level(value) : null;
  const color = lv ? lv.color : "#9aa5a0";
  const deg = has ? Math.min(1, value / 300) * 180 : 0;
  el.innerHTML = `<svg viewBox="0 0 300 182" aria-hidden="true">${segs}
    <text x="30" y="176" text-anchor="middle" font-size="12" fill="#8a9a93">${fa(0)}</text>
    <text x="270" y="176" text-anchor="middle" font-size="12" fill="#8a9a93">${fa(300)}+</text>
    <g class="knob" style="transform-origin:150px 150px;transform:rotate(0deg)">
      <circle cx="30" cy="150" r="13" fill="#fff" stroke="${color}" stroke-width="5"/>
    </g></svg>
    <div class="center"><div class="num" style="color:${color}">—</div>
    <div class="lvl-pill" style="background:${color}22;color:${lv ? lv.ink : color}">${has ? emoji + " " : ""}${label}</div>
    <div class="sub">شاخص کیفیت هوا (AQI)</div></div>`;
  if (!has) return;
  const knob = el.querySelector(".knob"), num = el.querySelector(".num");
  requestAnimationFrame(() => requestAnimationFrame(() => { knob.style.transform = `rotate(${deg}deg)`; }));
  const t0 = performance.now(), dur = 1000;
  (function tick(t) {
    const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
    num.textContent = fa(Math.round(value * e));
    if (k < 1) requestAnimationFrame(tick);
  })(t0);
}

/* ---------- تم رنگی بر اساس وضعیت هوا ---------- */
function applyTheme(lv) {
  const hd = lv ? lv.h : ["#1f6b3f","#5aa273"];
  document.querySelector("header").style.background = `linear-gradient(135deg,${hd[0]},${hd[1]})`;
  $("bigCard").style.background = lv ? `linear-gradient(180deg,${lv.color}22 0%,#fff 52%)` : "#fff";
  $("chips").innerHTML = lv ? lv.chips.map(c => `<span class="chip" style="background:${lv.color}1f;color:${lv.ink}">${c}</span>`).join("") : "";
  try { document.querySelector('meta[name=theme-color]')?.setAttribute("content", hd[0]); } catch (e) {}
  try { window.Capacitor?.Plugins?.StatusBar?.setBackgroundColor({color: hd[0]}); } catch (e) {}
}

/* ---------- منبع ۱: DOE ---------- */
async function fromDOE(city) {
  if (!DOE_URL) throw new Error("آدرس منبع رسمی تنظیم نشده است");
  let raw, status = 200, transport = "fetch";
  const nativeHttp = CapacitorHttp;
  try {
    if (nativeHttp && typeof nativeHttp.get === "function") {
      // در اپ Capacitor از HTTP بومی اندروید استفاده کن؛ این مسیر تحت CORS مرورگر نیست.
      transport = "CapacitorHttp";
      const response = await nativeHttp.get({
        url: DOE_URL,
        headers: {"Accept":"application/json"},
        connectTimeout: 15000,
        readTimeout: 20000,
        responseType: "text"
      });
      status = Number(response?.status ?? 200);
      raw = response?.data;
      if (typeof raw !== "string") raw = JSON.stringify(raw);
    } else {
      // در مرورگر، درخواست مستقیم ممکن است به‌دلیل CORS مسدود شود.
      const response = await fetch(DOE_URL, {cache:"no-store", headers:{"Accept":"application/json"}});
      status = response.status;
      raw = await response.text();
    }
  } catch (e) {
    const msg = e && e.message ? e.message : String(e || "unknown");
    throw new Error("دریافت داده از DOE ناموفق بود (" + transport + "): " + msg +
      (transport === "fetch" ? "؛ اگر صفحه را در مرورگر باز کرده‌ای، محدودیت CORS محتمل است. در اپ اندروید باید CapacitorHttp در APK به‌روز و نصب شده باشد." : "؛ دسترسی شبکه یا پاسخ سرور DOE را بررسی کن."));
  }
  if (status < 200 || status >= 300) throw new Error("پاسخ DOE: HTTP " + status);
  if (raw && typeof raw === "object") raw = JSON.stringify(raw);
  if (typeof raw !== "string" || !raw.trim()) throw new Error("پاسخ DOE خالی بود");
  let j;
  try { j = JSON.parse(raw); }
  catch (_) { throw new Error("پاسخ DOE JSON نیست؛ احتمالاً صفحهٔ HTML یا خطای دسترسی برگشته است"); }

  const norm = s => String(s ?? "").replace(/ي/g,"ی").replace(/ك/g,"ک")
    .replace(/[ً-ٰٟ]/g,"").replace(/\u200c/g," ").replace(/\s+/g," ").trim();
  const num = v => {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string") {
      const x = v.replace(/[۰-۹]/g, d => "۰۱۲۳۴۵۶۷۸۹".indexOf(d))
                 .replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d))
                 .replace(/,/g,"").trim();
      if (x !== "" && Number.isFinite(Number(x))) return Number(x);
    }
    return null;
  };
  const rows = Array.isArray(j) ? j :
    Array.isArray(j?.D) ? j.D :
    Array.isArray(j?.data) ? j.data :
    Array.isArray(j?.Data) ? j.Data :
    Array.isArray(j?.stations) ? j.stations : null;
  if (!rows) throw new Error("ساختار پاسخ DOE ناشناخته است؛ فیلدهای دریافت‌شده: " + Object.keys(j || {}).join(", "));

  const want = norm(city);
  const mine = rows.map(r => {
    const name = norm(r.S ?? r.station ?? r.stationName ?? r.name ?? r.StationName);
    const region = norm(r.R ?? r.region ?? r.city ?? r.cityName ?? r.RegionName ?? r.CityName);
    const rawAqi = r.A ?? r.aqi ?? r.AQI ?? r.Aqi ?? r.index;
    const aqi = num(rawAqi);
    const pol = norm(r.P ?? r.pollutant ?? r.Pollutant ?? r.dominantPollutant ?? "");
    const valid = r.V ?? r.valid ?? r.isValid ?? r.Valid;
    return {name, region, aqi, pol, valid};
  }).filter(r => {
    if (!r.name || r.aqi === null || r.aqi < 0) return false;
    if (r.valid === false || r.valid === 0 || String(r.valid).toLowerCase() === "false") return false;
    const regionParts = r.region.split(/[-–—,،]/).map(norm);
    return regionParts.some(part => part === want) || r.region === want;
  }).map(r => ({name:r.name, aqi:r.aqi, pol:r.pol || "نامشخص"}))
    .sort((a,b) => b.aqi-a.aqi);

  if (!mine.length) throw new Error("پاسخ DOE دریافت شد، اما ایستگاه معتبری برای «" + city + "» پیدا نشد؛ قالب واقعی پاسخ یا نام شهر باید بررسی شود");
  const avg = a => a.reduce((x,y)=>x+y,0)/a.length;
  const pols = s => s.pol.split(",").map(x=>x.trim()).filter(Boolean);
  const count = {};
  mine.forEach(s => pols(s).forEach(p => count[p] = (count[p] || 0) + 1));
  const top = Object.keys(count).sort((a,b) => count[b] - count[a])[0];
  const topRows = mine.filter(s => pols(s).includes(top));
  return {source:"doe", time:j.T ?? j.time ?? j.timestamp ?? j.updatedAt ?? null,
    aqi:avg(mine.map(s => s.aqi)), prev:null, daily:[], stations:mine,
    pol:{title:"آلاینده غالب", label:top || "—", value:topRows.length ? avg(topRows.map(s => s.aqi)) : null,
         max:300, unit:"شاخص آلاینده"}};
}

/* ---------- منبع ۲: Open-Meteo (مدل‌سازی‌شده) ---------- */
async function fromOpenMeteo(city) {
  const [lat, lon] = CITIES[city];
  const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi,pm2_5&hourly=us_aqi&past_days=7&forecast_days=1&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Open-Meteo " + res.status);
  const j = await res.json();
  if (j.current?.us_aqi == null) throw new Error("no data");
  const byDay = {};
  j.hourly.time.forEach((t, i) => {
    const v = j.hourly.us_aqi[i]; if (v == null) return;
    (byDay[t.slice(0,10)] ||= []).push(v);
  });
  const days = Object.keys(byDay).sort();
  const daily = days.map(d => ({date:d, aqi: byDay[d].reduce((a,b)=>a+b,0)/byDay[d].length}));
  const today = j.current.time.slice(0,10);
  const past = daily.filter(d => d.date < today);
  return {source:"model", aqi:j.current.us_aqi,
          pol:{title:"ذرات ریز معلق", label:"PM2.5", value:j.current.pm2_5, max:150, unit:"µg/m³", colorValue:j.current.us_aqi},
          prev: past.length ? past[past.length-1].aqi : null,
          daily: daily.slice(-7), stations:[]};
}

/* ---------- رندر ---------- */
let current = null;
function render(city, d) {
  current = d;
  const lv = level(d.aqi);
  $("hdrCity").textContent = city;
  $("cityName").textContent = city;
  $("tip").textContent = lv.tip;
  $("dotCol").style.background = lv.color;
  drawBig($("bigGauge"), d.aqi, lv.name, lv.emoji);
  applyTheme(lv);
  drawGauge($("prevGauge"), {value:d.prev, max:300, unit: d.prev == null ? "بدون داده" : level(d.prev).name});
  $("polTitle").textContent = d.pol.title;
  $("polName").textContent = d.pol.label;
  drawGauge($("pmGauge"), {value:d.pol.value, max:d.pol.max, unit:d.pol.unit, colorValue:d.pol.colorValue});

  const doe = d.source === "doe";
  $("badge").textContent = doe ? "داده رسمی DOE" : "مدل‌سازی‌شده";
  $("badge").className = "badge" + (doe ? "" : " warn");
  $("srcLabel").textContent = doe ? "منبع: سازمان حفاظت محیط زیست" : "منبع: Open-Meteo";
  $("foot").textContent = doe ? `آخرین به‌روزرسانی DOE: ${fa(String(d.time).slice(0,16))} · میانگین ${fa(d.stations.length)} ایستگاه` :
    "اتصال به داده رسمی DOE برقرار نیست؛ عدد نمایش‌داده‌شده مدل‌سازی‌شده است و ممکن است با ایستگاه‌های رسمی فرق داشته باشد.";

  // روند / وضعیت ایستگاه‌ها
  const bars = $("bars"), te = $("trendEmpty"), dist = $("dist");
  bars.classList.add("hide"); te.classList.add("hide"); dist.classList.add("hide");
  if (d.daily.length) {
    $("trendTitle").textContent = "روند تغییرات ۷ روز اخیر";
    bars.classList.remove("hide");
    const mx = Math.max(100, ...d.daily.map(x => x.aqi));
    bars.innerHTML = d.daily.map(x => {
      const dt = new Date(x.date + "T12:00:00");
      return `<div class="bar"><b style="font-size:12px">${fa(Math.round(x.aqi))}</b>
        <i style="height:${Math.max(4, x.aqi/mx*140)}px;background:${level(x.aqi).color}"></i>
        <span>${dt.toLocaleDateString("fa-IR",{weekday:"short"})}</span></div>`;
    }).join("");
  } else if (d.stations.length) {
    $("trendTitle").textContent = "وضعیت ایستگاه‌های " + city;
    dist.classList.remove("hide");
    const total = d.stations.length;
    dist.innerHTML = LEVELS.map(l => {
      const lo = LEVELS[LEVELS.indexOf(l) - 1]?.max ?? -1;
      const n = d.stations.filter(s => s.aqi > lo && s.aqi <= l.max).length;
      return n ? `<div class="row"><span class="nm">${l.name}</span><span class="tr"><i style="width:${n/total*100}%;background:${l.color}"></i></span><span class="ct">${fa(n)}</span></div>` : "";
    }).join("") + `<p class="foot" style="margin-top:6px">تاریخچه روزانه از منبع DOE در دسترس نیست.</p>`;
  } else {
    $("trendTitle").textContent = "روند تغییرات";
    te.classList.remove("hide");
    te.textContent = "تاریخچه برای این منبع در دسترس نیست.";
  }

  // ایستگاه‌ها
  $("stList").innerHTML = d.stations.length
    ? d.stations.map(s => `<div class="st"><span>${s.name}<small style="display:block;margin-top:2px;font-size:11px;color:var(--muted)">${s.pol || ""}</small></span><span class="pill" style="background:${level(s.aqi).color}">${fa(Math.round(s.aqi))}</span></div>`).join("")
    : `<div class="empty">فهرست ایستگاه‌ها فقط با اتصال به داده رسمی DOE نمایش داده می‌شود.</div>`;
}

function renderError(city, reason) {
  $("hdrCity").textContent = city;
  $("cityName").textContent = city;
  $("badge").textContent = "خطا"; $("badge").className = "badge warn";
  drawBig($("bigGauge"), null, "داده‌ای دریافت نشد");
  applyTheme(null);
  drawGauge($("prevGauge"), {value:null, max:300, unit:"بدون داده"});
  drawGauge($("pmGauge"), {value:null, max:150, unit:"µg/m³"});
  $("tip").textContent = reason || "اتصال به داده رسمی DOE برقرار نشد. اینترنت را بررسی کن و دوباره تلاش کن.";
  $("foot").textContent = "هیچ دادهٔ جایگزینی نمایش داده نمی‌شود؛ برای جلوگیری از اشتباه، فقط دادهٔ رسمی نمایش داده خواهد شد.";
  $("srcLabel").textContent = "";
  $("dotCol").style.background = "#9aa5a0";
  $("polTitle").textContent = "آلاینده غالب"; $("polName").textContent = "—";
  $("trendTitle").textContent = "روند تغییرات";
  $("bars").classList.add("hide"); $("dist").classList.add("hide");
  $("trendEmpty").classList.remove("hide"); $("trendEmpty").textContent = "داده‌ای برای نمایش نیست.";
  $("stList").innerHTML = `<div class="empty">داده‌ای برای نمایش نیست.</div>`;
}

let reqId = 0;
async function load() {
  const city = $("city").value;
  const id = ++reqId;
  try { localStorage.setItem("havanama_city", city); } catch (e) {}
  const btn = $("refresh");
  btn.classList.add("spin"); btn.disabled = true;
  $("hdrCity").textContent = city;
  $("badge").textContent = "در حال دریافت…"; $("badge").className = "badge warn";
  try {
    const d = await fromDOE(city);
    if (id !== reqId) return;
    render(city, d);
  } catch (e) {
    console.error("DOE:", e);
    if (id === reqId) renderError(city, e && e.message ? e.message : "خطای نامشخص در دریافت داده رسمی");
  } finally {
    if (id === reqId) { btn.classList.remove("spin"); btn.disabled = false; }
  }
}

/* ---------- راه‌اندازی ---------- */
$("city").innerHTML = Object.keys(CITIES).map(c => `<option>${c}</option>`).join("");
try { const sv = localStorage.getItem("havanama_city"); if (sv && CITIES[sv]) $("city").value = sv; } catch (e) {}
$("city").addEventListener("change", load);
$("refresh").addEventListener("click", load);
document.querySelectorAll("nav button").forEach(b => b.addEventListener("click", () => {
  document.querySelectorAll("nav button").forEach(x => x.classList.toggle("on", x === b));
  ["home","trend","stations"].forEach(t => $("tab-"+t).classList.toggle("hide", t !== b.dataset.tab));
  window.scrollTo(0, 0);
}));
drawBig($("bigGauge"), null, "منتظر داده");
drawGauge($("prevGauge"), {value:null, max:300, unit:"بدون داده"});
drawGauge($("pmGauge"), {value:null, max:150, unit:"µg/m³"});
load();
