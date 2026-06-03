# Smart QR Code Generator

A modern, fully client-side QR Code Generator web app — no backend, no framework, just **HTML, CSS & JavaScript**. Create beautiful, customized QR codes for websites, WiFi, contacts, WhatsApp, email and more.

🔗 Built with [qr-code-styling](https://github.com/kozakdenys/qr-code-styling).

## Features

- **8 QR types** — URL, Plain Text, Email, Phone, SMS, WhatsApp, WiFi login, vCard contact card
- **Live preview** — the QR code updates instantly as you type, with input validation
- **Customization** — foreground/background colors, size, error-correction level, dot style, corner style, rounded dots, transparent background
- **Logo upload** — drop a PNG/JPG/SVG logo into the center, adjustable size
- **Export** — download as PNG, JPG or SVG, or copy the image to your clipboard
- **Dark / light mode** — toggle persisted in `localStorage`
- **Responsive & private** — works on mobile, and everything runs locally in your browser

## Usage

It's a static site — just open `index.html`, or serve the folder:

```bash
python -m http.server 8000
# then visit http://localhost:8000
```

> Tip: serving over `localhost` (or HTTPS) enables the **Copy to clipboard** feature, which browsers block on `file://` pages.

## Project structure

```
qrcodegenerator/
├── index.html   # markup: header, hero, generator, features, FAQ, footer
├── styles.css   # glassmorphism theme with light/dark tokens
└── app.js       # QR generation, type switching, customization, download, theme
```

---

Powered by **Tertiary Infotech Academy**.
