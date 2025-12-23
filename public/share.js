/* global JSZip */

document.addEventListener("DOMContentLoaded", () => {
  main().catch((e) => {
    console.error(e);
    alert("Erreur de chargement de la page de partage.");
  });
});

const $ = (id) => document.getElementById(id);

function getIdFromUrl() {
  const url = new URL(window.location.href);
  return url.searchParams.get("id");
}

function formatTimestamp(ts) {
  if (!ts) return "-";
  if (typeof ts === "number") {
    const d = new Date(ts * 1000);
    return isNaN(d.getTime()) ? "-" : d.toISOString();
  }
  const d = new Date(ts);
  return isNaN(d.getTime()) ? String(ts) : d.toISOString();
}

function normalizeUrl(u) {
  if (!u) return "";
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith("/")) return window.location.origin + u;
  return window.location.origin + "/" + u;
}

function isVideo(mime = "", url = "") {
  const m = String(mime || "").toLowerCase();
  return m.startsWith("video/") || /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(url || "");
}

function shortenId(id) {
  return (id || "").slice(0, 6).toUpperCase();
}

async function fetchVerify(id) {
  const origin = window.location.origin;
  const res = await fetch(`${origin}/api/verify/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`API verify error ${res.status}`);
  return res.json();
}

async function fetchAsBlob(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download error ${res.status}`);
  return res.blob();
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function copyToClipboard(text) {
  await navigator.clipboard.writeText(text);
}

function safeFilename(name) {
  return (name || "media").replace(/[^\w.\-]+/g, "_");
}

/* ---------- Badge generator ---------- */

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Capture une frame vidéo -> retourne un dataURL PNG
 * Fonctionne si le mediaUrl est same-origin (ce qui est ton cas via normalizeUrl()).
 */
async function captureVideoFrameToDataUrl(videoUrl) {
  return new Promise((resolve, reject) => {
    const v = document.createElement("video");
    v.crossOrigin = "anonymous";
    v.preload = "auto";
    v.muted = true;
    v.playsInline = true;
    v.src = videoUrl;

    const cleanup = () => {
      v.pause();
      v.removeAttribute("src");
      v.load();
    };

    v.onerror = () => {
      cleanup();
      reject(new Error("Video load error (frame capture)."));
    };

    v.onloadedmetadata = async () => {
      try {
        // seek à 0.3s (ou 0 si très court)
        const t = Math.min(0.3, Math.max(0, (v.duration || 0) - 0.1));
        v.currentTime = t;
      } catch (e) {
        cleanup();
        reject(e);
      }
    };

    v.onseeked = () => {
      try {
        const maxW = 1400;
        const scale = Math.min(1, maxW / v.videoWidth);
        const w = Math.round(v.videoWidth * scale);
        const h = Math.round(v.videoHeight * scale);

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(v, 0, 0, w, h);

        const dataUrl = canvas.toDataURL("image/png");
        cleanup();
        resolve(dataUrl);
      } catch (e) {
        cleanup();
        reject(e);
      }
    };
  });
}

async function generateBadgedPng({ baseImageSrc, qrSrc, proofShortId }) {
  const img = await loadImage(baseImageSrc);

  const maxW = 2800; // 2400 à 3200 selon perf
const scaleImg = Math.min(1, maxW / img.width);
const w = Math.round(img.width * scaleImg);
const h = Math.round(img.height * scaleImg);
  
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, w, h);

// ===== BADGE CERTIFIÉ ÉVIDENCIA (AVEC LOGO) =====

// 1) Charger le logo
let logoImg = null;
try {
  logoImg = await loadImage("/public/logoDTR.PNG"); 
} catch (e) {
  logoImg = null; // si le logo ne charge pas, on affiche juste le texte
}

// 2) Dimensions badge (proportionnelles à l’image)
const pad = Math.round(w * 0.02);
const boxW = Math.round(w * 0.42);
const boxH = Math.round(boxW * 0.32);
const x = w - boxW - pad;
const y = h - boxH - pad;

// 3) Fond badge
ctx.save();
ctx.globalAlpha = 0.94;
ctx.fillStyle = "#0b1220";
roundRect(ctx, x, y, boxW, boxH, Math.round(boxH * 0.18));
ctx.fill();
ctx.restore();

// 4) Dessiner le logo dans le badge
const innerPad = Math.round(boxW * 0.06);
let textLeft = x + innerPad;

if (logoImg) {
  const logoSize = Math.round(boxH * 0.70); // logo bien visible
  const lx = x + innerPad;
  const ly = y + Math.round((boxH - logoSize) / 2);

  ctx.save();
  ctx.globalAlpha = 0.98;
  ctx.drawImage(logoImg, lx, ly, logoSize, logoSize);
  ctx.restore();

  // Texte à droite du logo
  textLeft = lx + logoSize + Math.round(boxW * 0.04);
}

// 5) Texte (sans "ÉVIDENCIA")
const t1 = Math.round(boxH * 0.26); // CERTIFIÉ
const t3 = Math.round(boxH * 0.20); // ID

const line1 = y + Math.round(boxH * 0.42);
const line3 = y + Math.round(boxH * 0.78);

ctx.fillStyle = "#ffffff";
ctx.font = `700 ${t1}px Inter, Arial, sans-serif`;
ctx.fillText("CERTIFIÉ", textLeft, line1);

ctx.fillStyle = "#cbd5e1";
ctx.font = `${t3}px ui-monospace, Menlo, monospace`;
ctx.fillText(`ID: ${proofShortId}`, textLeft, line3);

  // ===== QR CODE À DROITE DU BADGE =====
let qrImg = null;
try {
  qrImg = await loadImage(qrSrc);
} catch (e) {
  qrImg = null;
}

if (qrImg) {
  const innerPad = Math.round(boxW * 0.06);
  const qrSize = Math.round(boxH * 0.78); // GROS QR
  const qx = x + boxW - innerPad - qrSize;
  const qy = y + Math.round((boxH - qrSize) / 2);

  ctx.save();
  ctx.globalAlpha = 1;
  ctx.drawImage(qrImg, qx, qy, qrSize, qrSize);
  ctx.restore();
}


  return canvas.toDataURL("image/png");
}

/* ---------- UI ---------- */

function renderMedia({ mediaUrl, mimetype }) {
  const box = $("mediaBox");
  box.innerHTML = "";

  if (isVideo(mimetype, mediaUrl)) {
    const el = document.createElement("video");
    el.controls = true;
    el.playsInline = true;
    el.src = mediaUrl;
    box.appendChild(el);
  } else {
    const el = document.createElement("img");
    el.alt = "Preuve";
    el.src = mediaUrl;
    box.appendChild(el);
  }
}

async function main() {
  const id = getIdFromUrl();
  if (!id) return alert("ID de preuve manquant.");

  $("backBtn").addEventListener("click", () => history.back());

  const data = await fetchVerify(id);

  const mediaUrl = normalizeUrl(data.mediaUrl || "");
  const qrSrc = data.qrUrl || data.qr || "";
  const verifyUrl = `${window.location.origin}/public/verify.html?id=${encodeURIComponent(id)}`;

  $("verifyUrlBox").textContent = verifyUrl;
  $("metaLine").textContent = `ID ${shortenId(id)} · ${formatTimestamp(data.timestamp)}`;

  if (!mediaUrl) return alert("mediaUrl manquant dans la preuve.");

  renderMedia({ mediaUrl, mimetype: data.mimetype });

  // 1) Partager lien
  $("copyLinkBtn").addEventListener("click", async () => {
    await copyToClipboard(verifyUrl);
    $("copyLinkBtn").textContent = "Lien copié";
    setTimeout(() => ($("copyLinkBtn").textContent = "Copier le lien"), 1200);
  });

  $("nativeShareBtn").addEventListener("click", async () => {
    if (!navigator.share) return alert("Partage natif non disponible ici. Utilise Copier le lien.");
    await navigator.share({
      title: "Preuve certifiée Évidencia",
      text: "Vérifie l’authenticité de cette preuve.",
      url: verifyUrl
    });
  });

  // 2) Télécharger original
  $("downloadOriginalBtn").addEventListener("click", async () => {
    const blob = await fetchAsBlob(mediaUrl);
    const ext = (String(data.mimetype || "").split("/")[1] || "").replace("jpeg","jpg");
    const defaultName = isVideo(data.mimetype, mediaUrl) ? `evidencia_${shortenId(id)}.${ext || "mp4"}` : `evidencia_${shortenId(id)}.${ext || "jpg"}`;
    downloadBlob(blob, safeFilename(defaultName));
  });

  // 3) Télécharger version certifiée (photo badgée / vignette vidéo badgée)
  $("downloadBadgedBtn").addEventListener("click", async () => {
    const proofShortId = shortenId(id);

    // baseImageSrc = image OR captured frame from video
    let baseImageSrc = mediaUrl;

    if (isVideo(data.mimetype, mediaUrl)) {
      // Capture frame vidéo => dataURL image
      baseImageSrc = await captureVideoFrameToDataUrl(mediaUrl);
    }

    const badgedDataUrl = await generateBadgedPng({
      baseImageSrc,
      qrSrc: qrSrc || null,
      proofShortId
    });

    const blob = await (await fetch(badgedDataUrl)).blob();
    downloadBlob(blob, `evidencia_certifie_${proofShortId}.png`);
  });

  // 4) Pack ZIP (inclut copie badgée, y compris vidéo via frame)
  $("downloadPackBtn").addEventListener("click", async () => {
    const zip = new JSZip();

    // original
    const originalBlob = await fetchAsBlob(mediaUrl);
    const ext = (String(data.mimetype || "").split("/")[1] || "").replace("jpeg","jpg");
    const originalName = isVideo(data.mimetype, mediaUrl)
      ? `original_${shortenId(id)}.${ext || "mp4"}`
      : `original_${shortenId(id)}.${ext || "jpg"}`;

    zip.file(safeFilename(originalName), originalBlob);

    // receipt.json
    const receipt = {
      proofId: id,
      hash: data.hash,
      timestamp: data.timestamp,
      txHash: data.txHash,
      mimetype: data.mimetype,
      mediaUrl: data.mediaUrl,
      verifyUrl
    };
    zip.file("receipt.json", JSON.stringify(receipt, null, 2));

    // qr.png si dispo
    if (qrSrc) {
      try {
        const qrBlob = await fetchAsBlob(qrSrc);
        zip.file("qr.png", qrBlob);
      } catch (e) {}
    }

    // copie badgée : photo OU vignette vidéo
    let baseImageSrc = mediaUrl;
    if (isVideo(data.mimetype, mediaUrl)) {
      baseImageSrc = await captureVideoFrameToDataUrl(mediaUrl);
    }
    const badgedDataUrl = await generateBadgedPng({
      baseImageSrc,
      qrSrc: qrSrc || null,
      proofShortId: shortenId(id)
    });
    const badgedBlob = await (await fetch(badgedDataUrl)).blob();
    zip.file(`certifie_${shortenId(id)}.png`, badgedBlob);

    const out = await zip.generateAsync({ type: "blob" });
    downloadBlob(out, `evidencia_pack_${shortenId(id)}.zip`);
  });
}
// ===============================
// MODAL "INFOS PACK"
// ===============================

(function () {
  const modal = document.getElementById("packInfoModal");
  const infoBtn = document.getElementById("packInfoBtn");
  const closeBtn = document.getElementById("packInfoCloseBtn");
  const okBtn = document.getElementById("packInfoOkBtn");

  if (!modal || !infoBtn) {
    console.warn("Modal Infos: éléments manquants");
    return;
  }

  const openModal = () => {
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
  };

  const closeModal = () => {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
  };

  infoBtn.addEventListener("click", openModal);
  closeBtn && closeBtn.addEventListener("click", closeModal);
  okBtn && okBtn.addEventListener("click", closeModal);

  modal.addEventListener("click", (e) => {
    if (e.target && e.target.dataset && e.target.dataset.close) {
      closeModal();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });
})();
