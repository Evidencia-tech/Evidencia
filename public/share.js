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

async function generateBadgedPng({ baseImageSrc,
