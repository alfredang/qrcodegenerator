/* ============================================================
   Smart QR Code Generator — app.js
   All client-side logic: QR generation, type switching,
   customization, logo upload, download, clipboard, theme.
   Depends on: qr-code-styling (global QRCodeStyling)
   ============================================================ */
(function () {
  "use strict";

  /* ---------- Defaults & state ---------- */
  const DEFAULTS = {
    type: "url",
    fg: "#5b2be0",
    bg: "#ffffff",
    size: 320,
    ec: "Q",
    dotStyle: "rounded",
    cornerStyle: "extra-rounded",
    roundedDots: true,
    transparent: false,
    logoData: null,
    logoSize: 40,
  };

  const state = { ...DEFAULTS };

  const TYPE_LABELS = {
    url: "URL / Website",
    text: "Plain Text",
    email: "Email",
    phone: "Phone Number",
    sms: "SMS",
    whatsapp: "WhatsApp",
    wifi: "WiFi Login",
    vcard: "vCard / Contact",
  };

  /* ---------- Element helpers ---------- */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  const el = {
    typeSelector: $("#typeSelector"),
    fieldGroups: $$(".field-group"),
    fieldError: $("#fieldError"),
    qrCanvas: $("#qrCanvas"),
    qrStage: $("#qrStage"),
    infoType: $("#infoType"),
    infoContent: $("#infoContent"),
    // design
    fgColor: $("#fgColor"),
    bgColor: $("#bgColor"),
    qrSize: $("#qrSize"),
    sizeValue: $("#sizeValue"),
    ecLevel: $("#ecLevel"),
    dotStyle: $("#dotStyle"),
    cornerStyle: $("#cornerStyle"),
    roundedCorners: $("#roundedCorners"),
    transparentBg: $("#transparentBg"),
    // logo
    logoInput: $("#logoInput"),
    logoThumb: $("#logoThumb"),
    logoSizeField: $("#logoSizeField"),
    logoSize: $("#logoSize"),
    logoSizeValue: $("#logoSizeValue"),
    removeLogo: $("#removeLogo"),
    // actions
    dlPng: $("#dlPng"),
    dlJpg: $("#dlJpg"),
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

  const val = (id) => {
    const node = document.getElementById(id);
    return node ? node.value.trim() : "";
  };

  // vCard / WiFi escaping
  function escapeWifi(s) {
    return String(s).replace(/([\\;,:"])/g, "\\$1");
  }
  function escapeVCard(s) {
    return String(s).replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
  }

  /* ---------- Validation + content building ---------- */
  // Returns { data: string|null, error: string }
  function buildContent() {
    const t = state.type;

    switch (t) {
      case "url": {
        let url = val("url-link");
        if (!url) return { data: null, error: "" };
        if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(url) && !/^[a-z]+:/i.test(url)) {
          url = "https://" + url;
        }
        return { data: url, error: "" };
      }

      case "text": {
        const txt = val("text-content");
        return { data: txt || null, error: "" };
      }

      case "email": {
        const to = val("email-to");
        if (!to) return { data: null, error: "" };
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
          return { data: null, error: "Please enter a valid email address." };
        }
        const subject = val("email-subject");
        const body = val("email-body");
        const params = [];
        if (subject) params.push("subject=" + encodeURIComponent(subject));
        if (body) params.push("body=" + encodeURIComponent(body));
        return { data: "mailto:" + to + (params.length ? "?" + params.join("&") : ""), error: "" };
      }

      case "phone": {
        const num = val("phone-number");
        if (!num) return { data: null, error: "" };
        if (!/^[+]?[\d\s().-]{4,}$/.test(num)) {
          return { data: null, error: "Please enter a valid phone number." };
        }
        return { data: "tel:" + num.replace(/[\s().-]/g, ""), error: "" };
      }

      case "sms": {
        const num = val("sms-number");
        if (!num) return { data: null, error: "" };
        if (!/^[+]?[\d\s().-]{4,}$/.test(num)) {
          return { data: null, error: "Please enter a valid phone number." };
        }
        const clean = num.replace(/[\s().-]/g, "");
        const msg = val("sms-message");
        return { data: "SMSTO:" + clean + (msg ? ":" + msg : ""), error: "" };
      }

      case "whatsapp": {
        const num = val("wa-number");
        if (!num) return { data: null, error: "" };
        const clean = num.replace(/[^\d]/g, "");
        if (clean.length < 6) {
          return { data: null, error: "Enter the number with country code (digits only)." };
        }
        const msg = val("wa-message");
        return { data: "https://wa.me/" + clean + (msg ? "?text=" + encodeURIComponent(msg) : ""), error: "" };
      }

      case "wifi": {
        const ssid = val("wifi-ssid");
        if (!ssid) return { data: null, error: "" };
        const enc = val("wifi-encryption") || "WPA";
        const pwd = val("wifi-password");
        const hidden = $("#wifi-hidden").checked;
        let s = "WIFI:T:" + enc + ";S:" + escapeWifi(ssid) + ";";
        if (enc !== "nopass" && pwd) s += "P:" + escapeWifi(pwd) + ";";
        if (hidden) s += "H:true;";
        s += ";";
        return { data: s, error: "" };
      }

      case "vcard": {
        const first = val("vc-first");
        const last = val("vc-last");
        if (!first && !last) return { data: null, error: "" };
        const org = val("vc-org");
        const title = val("vc-title");
        const phone = val("vc-phone");
        const email = val("vc-email");
        const website = val("vc-website");
        const address = val("vc-address");

        const lines = ["BEGIN:VCARD", "VERSION:3.0"];
        lines.push("N:" + escapeVCard(last) + ";" + escapeVCard(first) + ";;;");
        lines.push("FN:" + escapeVCard((first + " " + last).trim()));
        if (org) lines.push("ORG:" + escapeVCard(org));
        if (title) lines.push("TITLE:" + escapeVCard(title));
        if (phone) lines.push("TEL;TYPE=CELL:" + escapeVCard(phone));
        if (email) lines.push("EMAIL:" + escapeVCard(email));
        if (website) lines.push("URL:" + escapeVCard(website));
        if (address) lines.push("ADR;TYPE=WORK:;;" + escapeVCard(address) + ";;;;");
        lines.push("END:VCARD");
        return { data: lines.join("\n"), error: "" };
      }

      default:
        return { data: null, error: "" };
    }
  }

  /* ---------- QR styling options ---------- */
  function dotsType() {
    return state.dotStyle;
  }
  function cornersSquareType() {
    // corner outer style
    return state.cornerStyle; // square | extra-rounded | dot
  }
  function cornersDotType() {
    return state.roundedDots ? "dot" : "square";
  }

  function buildOptions(data) {
    return {
      width: state.size,
      height: state.size,
      type: "canvas",
      data: data || " ",
      margin: 12,
      qrOptions: { errorCorrectionLevel: state.ec },
      image: state.logoData || undefined,
      dotsOptions: { color: state.fg, type: dotsType() },
      backgroundOptions: { color: state.transparent ? "rgba(0,0,0,0)" : state.bg },
      cornersSquareOptions: { color: state.fg, type: cornersSquareType() },
      cornersDotOptions: { color: state.fg, type: cornersDotType() },
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
    const { data, error } = buildContent();

    // error display
    el.fieldError.textContent = error || "";

    hasContent = !!data && !error;
    el.qrStage.classList.toggle("has-qr", hasContent);

    // info summary
    el.infoType.textContent = TYPE_LABELS[state.type] || state.type;
    el.infoContent.textContent = hasContent ? collapse(data) : "—";

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

  /* ---------- Type switching ---------- */
  function setType(type) {
    state.type = type;
    $$(".type-btn", el.typeSelector).forEach((b) => {
      const active = b.dataset.type === type;
      b.classList.toggle("active", active);
      b.setAttribute("aria-selected", active ? "true" : "false");
    });
    el.fieldGroups.forEach((g) => g.classList.toggle("active", g.dataset.group === type));
    el.fieldError.textContent = "";
    renderQR();
  }

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

  function removeLogo() {
    state.logoData = null;
    el.logoInput.value = "";
    el.logoThumb.innerHTML =
      '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>';
    el.logoSizeField.hidden = true;
    el.removeLogo.hidden = true;
    renderQR();
  }

  /* ---------- Download & clipboard ---------- */
  function download(extension) {
    if (!hasContent) {
      showToast("Enter some content first.", "error");
      return;
    }
    // qr-code-styling uses "jpeg" not "jpg"
    qr.download({ name: "qr-" + state.type, extension });
    showToast("Downloading " + extension.toUpperCase() + "…", "success");
  }

  async function copyToClipboard() {
    if (!hasContent) {
      showToast("Enter some content first.", "error");
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

  /* ---------- Reset ---------- */
  function resetAll() {
    Object.assign(state, DEFAULTS, { logoData: null });
    // reset DOM inputs
    $$("input, textarea, select").forEach((node) => {
      if (node.id === "themeToggle") return;
      if (node.type === "checkbox") {
        // restore checkbox defaults
        if (node.id === "roundedCorners") node.checked = true;
        else node.checked = false;
      } else if (node.type === "color") {
        node.value = node.id === "fgColor" ? DEFAULTS.fg : DEFAULTS.bg;
      } else if (node.type === "range") {
        node.value = node.id === "qrSize" ? DEFAULTS.size : DEFAULTS.logoSize;
      } else if (node.tagName === "SELECT") {
        // set defaults explicitly
        if (node.id === "ecLevel") node.value = DEFAULTS.ec;
        else if (node.id === "dotStyle") node.value = DEFAULTS.dotStyle;
        else if (node.id === "cornerStyle") node.value = DEFAULTS.cornerStyle;
        else if (node.id === "wifi-encryption") node.value = "WPA";
        else node.selectedIndex = 0;
      } else if (node.id !== "logoInput") {
        node.value = "";
      }
    });
    el.sizeValue.textContent = DEFAULTS.size;
    el.logoSizeValue.textContent = DEFAULTS.logoSize;
    removeLogo();
    setType("url");
    showToast("All settings reset.", "success");
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
    if (!theme) {
      theme = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    document.documentElement.setAttribute("data-theme", theme);
  }

  /* ---------- Accordion ---------- */
  function initAccordions() {
    $$(".accordion-head").forEach((head) => {
      head.addEventListener("click", () => {
        const item = head.closest(".accordion-item");
        const isOpen = item.classList.toggle("open");
        head.setAttribute("aria-expanded", isOpen ? "true" : "false");
      });
    });
  }

  /* ---------- Wire up events ---------- */
  function bindEvents() {
    // Type buttons
    el.typeSelector.addEventListener("click", (e) => {
      const btn = e.target.closest(".type-btn");
      if (btn) setType(btn.dataset.type);
    });

    // All content inputs -> live update
    el.fieldGroups.forEach((group) => {
      group.querySelectorAll("input, textarea, select").forEach((node) => {
        node.addEventListener("input", renderDebounced);
        node.addEventListener("change", renderDebounced);
      });
    });

    // Design controls
    el.fgColor.addEventListener("input", () => { state.fg = el.fgColor.value; renderDebounced(); });
    el.bgColor.addEventListener("input", () => { state.bg = el.bgColor.value; renderDebounced(); });
    el.qrSize.addEventListener("input", () => {
      state.size = parseInt(el.qrSize.value, 10);
      el.sizeValue.textContent = state.size;
      renderDebounced();
    });
    el.ecLevel.addEventListener("change", () => { state.ec = el.ecLevel.value; renderQR(); });
    el.dotStyle.addEventListener("change", () => { state.dotStyle = el.dotStyle.value; renderQR(); });
    el.cornerStyle.addEventListener("change", () => { state.cornerStyle = el.cornerStyle.value; renderQR(); });
    el.roundedCorners.addEventListener("change", () => { state.roundedDots = el.roundedCorners.checked; renderQR(); });
    el.transparentBg.addEventListener("change", () => { state.transparent = el.transparentBg.checked; renderQR(); });

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
    el.dlJpg.addEventListener("click", () => download("jpeg"));
    el.dlSvg.addEventListener("click", () => download("svg"));
    el.copyBtn.addEventListener("click", copyToClipboard);
    el.resetBtn.addEventListener("click", resetAll);

    // Theme
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
    initAccordions();
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
