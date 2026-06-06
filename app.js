/* ============================================================
   Smart QR Code Generator — app.js
   Streamlined URL-only generator: QR generation, customization,
   logo upload, download, clipboard, dark/light theme.
   Depends on: qr-code-styling (global QRCodeStyling)
   ============================================================ */
(function () {
  "use strict";

  /* ---------- Defaults & state ---------- */
  const DEFAULTS = {
    type: "url",
    fg: "#111827",
    bg: "#ffffff",
    logoData: null,
    logoSize: 40,
  };

  /* Brand logos for WhatsApp / Telegram — white plate + colored glyph,
     supplied as data URIs so they punch a clean hole in the QR. */
  function brandLogo(color, path) {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">' +
      '<rect width="48" height="48" rx="11" fill="#ffffff"/>' +
      '<path transform="translate(6 6) scale(1.5)" fill="' + color + '" d="' + path + '"/></svg>';
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }
  const BRAND_LOGOS = {
    whatsapp: brandLogo(
      "#25D366",
      "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0 0 20.485 3.488"
    ),
    telegram: brandLogo(
      "#229ED9",
      "M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.5 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212-.07-.062-.174-.041-.249-.024-.106.024-1.793 1.139-5.061 3.345-.479.329-.913.489-1.302.481-.428-.009-1.252-.242-1.865-.44-.752-.244-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"
    ),
  };

  // Fixed styling — keeps the tool lightweight & reliable
  const STYLE = {
    size: 400,
    ec: "Q",
    dotStyle: "rounded",
    cornerStyle: "extra-rounded",
  };

  const state = { ...DEFAULTS };

  /* ---------- Element helpers ---------- */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  const el = {
    urlInput: $("#url-link"),
    fieldError: $("#fieldError"),
    qrCanvas: $("#qrCanvas"),
    qrStage: $("#qrStage"),
    infoContent: $("#infoContent"),
    // type
    typeTabs: $("#typeTabs"),
    // whatsapp
    waCountry: $("#waCountry"),
    waPhone: $("#waPhone"),
    waMsg: $("#waMsg"),
    // telegram
    tgHandle: $("#tgHandle"),
    // wifi
    wifiSsid: $("#wifiSsid"),
    wifiPass: $("#wifiPass"),
    wifiPassToggle: $("#wifiPassToggle"),
    wifiEnc: $("#wifiEnc"),
    wifiHidden: $("#wifiHidden"),
    // color
    swatches: $("#swatches"),
    fgColor: $("#fgColor"),
    bgColor: $("#bgColor"),
    // logo
    logoInput: $("#logoInput"),
    logoThumb: $("#logoThumb"),
    logoSizeField: $("#logoSizeField"),
    logoSize: $("#logoSize"),
    logoSizeValue: $("#logoSizeValue"),
    removeLogo: $("#removeLogo"),
    // actions
    dlPng: $("#dlPng"),
    dlSvg: $("#dlSvg"),
    copyBtn: $("#copyBtn"),
    resetBtn: $("#resetBtn"),
    toast: $("#toast"),
    // theme
    themeToggle: $("#themeToggle"),
  };

  /* ---------- Utilities ---------- */
  function debounce(fn, wait) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  /* ---------- Validation + content building ---------- */
  // Returns { data: string|null, error: string, label: string }
  // `data` is the raw QR payload; `label` is a friendly summary for the info row.
  function buildContent() {
    switch (state.type) {
      case "whatsapp": return buildWhatsApp();
      case "telegram": return buildTelegram();
      case "wifi":     return buildWifi();
      default:         return buildUrl();
    }
  }

  function buildUrl() {
    let url = el.urlInput.value.trim();
    if (!url) return { data: null, error: "" };
    if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(url) && !/^[a-z]+:/i.test(url)) {
      url = "https://" + url;
    }
    return { data: url, error: "", label: url };
  }

  function buildWhatsApp() {
    const cc = el.waCountry.value.replace(/\D/g, "");
    const num = el.waPhone.value.replace(/\D/g, "");
    if (!num) return { data: null, error: "" };
    const full = cc + num;
    if (full.length < 7) return { data: null, error: "Enter a valid phone number with country code." };
    let data = "https://wa.me/" + full;
    const msg = el.waMsg.value.trim();
    if (msg) data += "?text=" + encodeURIComponent(msg);
    return { data, error: "", label: "WhatsApp +" + full };
  }

  function buildTelegram() {
    let h = el.tgHandle.value.trim();
    if (!h) return { data: null, error: "" };
    // Phone number form: leading + or all digits -> t.me/+<digits>
    const digits = h.replace(/[\s()-]/g, "");
    if (/^\+?\d{7,15}$/.test(digits)) {
      const n = digits.replace(/\D/g, "");
      return { data: "https://t.me/+" + n, error: "", label: "Telegram +" + n };
    }
    // Username form
    const user = h.replace(/^@/, "").replace(/^(https?:\/\/)?(t\.me\/)/i, "");
    if (!/^[a-zA-Z]\w{3,31}$/.test(user)) {
      return { data: null, error: "Enter a valid @username or phone number." };
    }
    return { data: "https://t.me/" + user, error: "", label: "Telegram @" + user };
  }

  // Escape per WiFi QR spec: \ ; , : " all need a backslash prefix.
  function wifiEscape(s) {
    return s.replace(/([\\;,:"])/g, "\\$1");
  }
  function buildWifi() {
    const ssid = el.wifiSsid.value;
    if (!ssid.trim()) return { data: null, error: "" };
    const enc = el.wifiEnc.value; // WPA | WEP | nopass
    const pass = el.wifiPass.value;
    if (enc !== "nopass" && !pass) {
      return { data: null, error: "Enter the WiFi password (or choose “None” for an open network)." };
    }
    const hidden = el.wifiHidden.checked ? "true" : "false";
    let data = "WIFI:T:" + enc + ";S:" + wifiEscape(ssid) + ";";
    if (enc !== "nopass") data += "P:" + wifiEscape(pass) + ";";
    data += "H:" + hidden + ";;";
    return { data, error: "", label: "WiFi: " + ssid };
  }

  // User-uploaded logo wins; otherwise WhatsApp/Telegram get their brand logo.
  function activeLogo() {
    return state.logoData || BRAND_LOGOS[state.type] || undefined;
  }

  /* ---------- QR styling options ---------- */
  function buildOptions(data) {
    return {
      width: STYLE.size,
      height: STYLE.size,
      type: "canvas",
      data: data || " ",
      margin: 12,
      qrOptions: { errorCorrectionLevel: STYLE.ec },
      image: activeLogo(),
      dotsOptions: { color: state.fg, type: STYLE.dotStyle },
      backgroundOptions: { color: state.bg },
      cornersSquareOptions: { color: state.fg, type: STYLE.cornerStyle },
      cornersDotOptions: { color: state.fg, type: "dot" },
      imageOptions: {
        crossOrigin: "anonymous",
        margin: 6,
        imageSize: state.logoSize / 100,
        hideBackgroundDots: true,
      },
    };
  }

  /* ---------- QR instance ---------- */
  let qr = null;
  let hasContent = false;

  function renderQR() {
    const { data, error, label } = buildContent();

    el.fieldError.textContent = error || "";

    hasContent = !!data && !error;
    el.qrStage.classList.toggle("has-qr", hasContent);

    el.infoContent.textContent = hasContent ? collapse(label || data) : "—";

    const opts = buildOptions(hasContent ? data : null);

    if (!qr) {
      qr = new QRCodeStyling(opts);
      qr.append(el.qrCanvas);
    } else {
      qr.update(opts);
    }
  }

  function collapse(s) {
    const one = s.replace(/\s+/g, " ").trim();
    return one.length > 70 ? one.slice(0, 70) + "…" : one;
  }

  const renderDebounced = debounce(renderQR, 180);

  /* ---------- Logo handling ---------- */
  function handleLogoFile(file) {
    if (!file) return;
    const okTypes = ["image/png", "image/jpeg", "image/svg+xml"];
    if (!okTypes.includes(file.type)) {
      showToast("Please upload a PNG, JPG or SVG file.", "error");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast("Logo is too large (max 2 MB).", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      state.logoData = e.target.result;
      el.logoThumb.innerHTML = '<img src="' + state.logoData + '" alt="Logo preview" />';
      el.logoSizeField.hidden = false;
      el.removeLogo.hidden = false;
      renderQR();
    };
    reader.readAsDataURL(file);
  }

  const UPLOAD_ICON =
    '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>';

  // Reflect the active logo (uploaded or brand) in the upload thumbnail.
  function refreshLogoThumb() {
    const logo = activeLogo();
    el.logoThumb.innerHTML = logo
      ? '<img src="' + logo + '" alt="Logo preview" />'
      : UPLOAD_ICON;
  }

  function removeLogo() {
    state.logoData = null;
    el.logoInput.value = "";
    el.logoSizeField.hidden = true;
    el.removeLogo.hidden = true;
    refreshLogoThumb();
    renderQR();
  }

  /* ---------- Download & clipboard ---------- */
  function download(extension) {
    if (!hasContent) {
      showToast("Enter a URL first.", "error");
      return;
    }
    qr.download({ name: "qr-code", extension });
    showToast("Downloading " + extension.toUpperCase() + "…", "success");
  }

  async function copyToClipboard() {
    if (!hasContent) {
      showToast("Enter a URL first.", "error");
      return;
    }
    try {
      if (!navigator.clipboard || !window.ClipboardItem) {
        throw new Error("unsupported");
      }
      const blob = await qr.getRawData("png");
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      showToast("Copied to clipboard! ✅", "success");
    } catch (err) {
      showToast("Copy not supported here — use the PNG download instead.", "error");
    }
  }

  let toastTimer;
  function showToast(msg, kind) {
    el.toast.textContent = msg;
    el.toast.className = "toast show " + (kind || "");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.toast.classList.remove("show");
    }, 3200);
  }

  /* ---------- Color swatches ---------- */
  function applyScheme(fg, bg) {
    state.fg = fg;
    state.bg = bg;
    el.fgColor.value = fg;
    el.bgColor.value = bg;
    $$(".swatch", el.swatches).forEach((s) => {
      s.classList.toggle("active", s.dataset.fg === fg && s.dataset.bg === bg);
    });
    renderQR();
  }

  function clearActiveSwatch() {
    $$(".swatch", el.swatches).forEach((s) => s.classList.remove("active"));
  }

  /* ---------- Type switching ---------- */
  const PLACEHOLDERS = {
    url: "Enter a URL to generate your QR code",
    whatsapp: "Enter a phone number to generate your WhatsApp QR",
    telegram: "Enter a username or phone for your Telegram QR",
    wifi: "Enter your WiFi details to generate a connect QR",
  };
  function switchType(type) {
    if (!PLACEHOLDERS[type]) return;
    state.type = type;

    $$(".type-tab", el.typeTabs).forEach((t) => {
      const on = t.dataset.type === type;
      t.classList.toggle("active", on);
      t.setAttribute("aria-selected", on ? "true" : "false");
    });
    $$(".type-panel").forEach((p) => {
      p.hidden = p.dataset.panel !== type;
    });

    const ph = $("#qrPlaceholder");
    if (ph) { const p = $("p", ph); if (p) p.textContent = PLACEHOLDERS[type]; }

    refreshLogoThumb();
    renderQR();

    // Focus the first input of the active panel
    const firstInput = $('.type-panel[data-panel="' + type + '"] input, .type-panel[data-panel="' + type + '"] textarea');
    if (firstInput) firstInput.focus();
  }

  /* ---------- Reset ---------- */
  function resetAll() {
    state.fg = DEFAULTS.fg;
    state.bg = DEFAULTS.bg;
    state.logoSize = DEFAULTS.logoSize;
    // Clear every input
    el.urlInput.value = "";
    el.waCountry.value = "";
    el.waPhone.value = "";
    el.waMsg.value = "";
    el.tgHandle.value = "";
    el.wifiSsid.value = "";
    el.wifiPass.value = "";
    el.wifiEnc.value = "WPA";
    el.wifiHidden.checked = false;
    el.logoSize.value = DEFAULTS.logoSize;
    el.logoSizeValue.textContent = DEFAULTS.logoSize;
    state.logoData = null;
    el.logoInput.value = "";
    el.logoSizeField.hidden = true;
    el.removeLogo.hidden = true;
    switchType(DEFAULTS.type);
    applyScheme(DEFAULTS.fg, DEFAULTS.bg);
    showToast("Reset done.", "success");
  }

  /* ---------- Theme ---------- */
  const THEME_KEY = "qrgen-theme";
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) {}
  }
  function initTheme() {
    let theme;
    try { theme = localStorage.getItem(THEME_KEY); } catch (e) {}
    if (!theme) theme = "dark"; // modern dark theme by default
    document.documentElement.setAttribute("data-theme", theme);
  }

  /* ---------- Wire up events ---------- */
  function bindEvents() {
    // Type tabs
    el.typeTabs.addEventListener("click", (e) => {
      const tab = e.target.closest(".type-tab");
      if (tab) switchType(tab.dataset.type);
    });

    // URL input -> live update
    el.urlInput.addEventListener("input", renderDebounced);
    el.urlInput.addEventListener("change", renderDebounced);

    // WhatsApp / Telegram / WiFi inputs -> live update
    [
      el.waCountry, el.waPhone, el.waMsg, el.tgHandle,
      el.wifiSsid, el.wifiPass,
    ].forEach((node) => node.addEventListener("input", renderDebounced));
    el.wifiEnc.addEventListener("change", renderQR);
    el.wifiHidden.addEventListener("change", renderQR);

    // WiFi password reveal
    el.wifiPassToggle.addEventListener("click", () => {
      const show = el.wifiPass.type === "password";
      el.wifiPass.type = show ? "text" : "password";
      el.wifiPassToggle.classList.toggle("revealed", show);
      el.wifiPassToggle.setAttribute("aria-label", show ? "Hide password" : "Show password");
    });

    // Color swatches
    el.swatches.addEventListener("click", (e) => {
      const btn = e.target.closest(".swatch");
      if (btn) applyScheme(btn.dataset.fg, btn.dataset.bg);
    });

    // Custom color pickers
    el.fgColor.addEventListener("input", () => { state.fg = el.fgColor.value; clearActiveSwatch(); renderDebounced(); });
    el.bgColor.addEventListener("input", () => { state.bg = el.bgColor.value; clearActiveSwatch(); renderDebounced(); });

    // Logo
    el.logoInput.addEventListener("change", (e) => handleLogoFile(e.target.files[0]));
    el.logoSize.addEventListener("input", () => {
      state.logoSize = parseInt(el.logoSize.value, 10);
      el.logoSizeValue.textContent = state.logoSize;
      renderDebounced();
    });
    el.removeLogo.addEventListener("click", removeLogo);

    // Drag & drop logo
    const drop = $("#logoDrop");
    ["dragover", "dragenter"].forEach((ev) =>
      drop.addEventListener(ev, (e) => { e.preventDefault(); drop.style.borderColor = "var(--accent)"; })
    );
    ["dragleave", "drop"].forEach((ev) =>
      drop.addEventListener(ev, (e) => { e.preventDefault(); drop.style.borderColor = ""; })
    );
    drop.addEventListener("drop", (e) => {
      if (e.dataTransfer.files && e.dataTransfer.files[0]) handleLogoFile(e.dataTransfer.files[0]);
    });

    // Actions
    el.dlPng.addEventListener("click", () => download("png"));
    el.dlSvg.addEventListener("click", () => download("svg"));
    el.copyBtn.addEventListener("click", copyToClipboard);
    el.resetBtn.addEventListener("click", resetAll);

    // Theme toggle
    el.themeToggle.addEventListener("click", () => {
      const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      applyTheme(next);
    });
  }

  /* ---------- Init ---------- */
  function init() {
    if (typeof QRCodeStyling === "undefined") {
      console.error("qr-code-styling failed to load.");
      el.fieldError.textContent = "QR library failed to load. Check your internet connection.";
      return;
    }
    bindEvents();
    renderQR();
  }

  initTheme(); // before paint to avoid flash
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
