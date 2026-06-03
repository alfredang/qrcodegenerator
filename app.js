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
    fg: "#111827",
    bg: "#ffffff",
    logoData: null,
    logoSize: 40,
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
  // Returns { data: string|null, error: string }
  function buildContent() {
    let url = el.urlInput.value.trim();
    if (!url) return { data: null, error: "" };
    if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(url) && !/^[a-z]+:/i.test(url)) {
      url = "https://" + url;
    }
    return { data: url, error: "" };
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
      image: state.logoData || undefined,
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
    const { data, error } = buildContent();

    el.fieldError.textContent = error || "";

    hasContent = !!data && !error;
    el.qrStage.classList.toggle("has-qr", hasContent);

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

  /* ---------- Reset ---------- */
  function resetAll() {
    state.fg = DEFAULTS.fg;
    state.bg = DEFAULTS.bg;
    state.logoSize = DEFAULTS.logoSize;
    el.urlInput.value = "";
    el.logoSize.value = DEFAULTS.logoSize;
    el.logoSizeValue.textContent = DEFAULTS.logoSize;
    applyScheme(DEFAULTS.fg, DEFAULTS.bg);
    removeLogo();
    el.urlInput.focus();
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
    // URL input -> live update
    el.urlInput.addEventListener("input", renderDebounced);
    el.urlInput.addEventListener("change", renderDebounced);

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
