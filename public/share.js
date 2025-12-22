/* global JSZip */

const $ = (id) => document.getElementById(id);

function getIdFromUrl() {
  const url = new URL(window.location.href);
  return url.searchParams.get('id');
}

/**
 * IMPORTANT :
 * Mets ici EXACTEMENT le même endpoint que celui utilisé dans verify.js
 * Option 1 : /api/proofs/:id
 * Option 2 : /api/proofs?id=...
 */
async function fetchProof(id) {
  // OPTION 1 (recommandée)
  // const res = await fetch(`/api/proofs/${encodeURIComponent(id)}`);

  // OPTION 2
  const res = await fetch(`/api/proofs?id=${encodeURIComponent(id)}`);

  if (!res.ok) throw new Error(`Erreur API: ${res.status}`);
  return res.json();
}

function isVideo(mime = "", filename = "") {
  return (mime || "").startsWith("video/") || /\.(mp4|mov|webm)$/i.test(filename || "");
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || "evidencia";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function fetchAsBlob(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Téléchargement impossible: ${res.status}`);
  return res.blob();
}

async function copyToClipboard(text) {
  await navigator.clipboard.writeText(text);
}

function safeFilename(name) {
  return (name || "media").replace(/[^\w.\-]+/g, "_");
}

function shortenId(id) {
  if (!id) return "—";
  return id.slice(0, 6).toUpperCase();
}

/** Chargement image (pour canvas) */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous"; // nécessite que ton serveur serve les images avec CORS si URL externe
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Génère une copie badgée (photo) OU une vignette badgée (vidéo)
 * - mediaSrc : url image (ou poster)
 * - qrSrc : dataURL/URL QR
 * - verifyUrl : lien de vérification
 * - proofShortId : ID court
 */
async function generateBadgedPng({ mediaSrc, qrSrc, verifyUrl, proofShortId }) {
  const img = await loadImage(mediaSrc);

  // Canvas dimensionné sur l'image (limite pour éviter fichiers énormes)
  const maxW = 1400;
  const scale = Math.min(1, maxW / img.width);
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");

  ctx.drawImage(img, 0, 0, w, h);

  // Badge box
  const pad = Math.round(18 * scale + 8);
  const boxW = Math.round(360 * scale);
  const boxH = Math.round(120 * scale);
  const x = w - boxW - pad;
  const y = h - boxH - pad;

  // fond badge
  ctx.save();
  ctx.globalAlpha = 0.92;
  ctx.fillStyle = "#0b1220";
  roundRect(ctx, x, y, boxW, boxH, Math.round(18 * scale));
  ctx.fill();
  ctx.restore();

  // texte
  ctx.fillStyle = "#ffffff";
  ctx.font = `${Math.round(20 * scale)}px Inter, Arial, sans-serif`;
  ctx.fillText("CERTIFIÉ", x + Math.round(16 * scale), y + Math.round(34 * scale));

  ctx.font = `800 ${Math.round(26 * scale)}px Inter, Arial, sans-serif`;
  ctx.fillText("ÉVIDENCIA", x + Math.round(16 * scale), y + Math.round(64 * scale));

  ctx.font = `${Math.round(16 * scale)}px ui-monospace, Menlo, monospace`;
  ctx.fillStyle = "#cbd5e1";
  ctx.fillText(`ID: ${proofShortId}`, x + Math.round(16 * scale), y + Math.round(92 * scale));

  // QR (si dispo)
  if (qrSrc) {
    try {
      const qr = await loadImage(qrSrc);
      const q = Math.round(86 * scale);
      ctx.save();
      ctx.globalAlpha = 0.98;
      ctx.fillStyle = "#ffffff";
      const qx = x + boxW - q - Math.round(14 * scale);
      const qy = y + Math.round(18 * scale);
      roundRect(ctx, qx - Math.round(6 * scale), qy - Math.round(6 * scale), q + Math.round(12 * scale), q + Math.round(12 * scale), Math.round(12 * scale));
      ctx.fill();
      ctx.drawImage(qr, qx, qy, q, q);
      ctx.restore();
    } catch (e) {
      // pas bloquant
    }
  }

  // mini mention "Vérifiez"
  ctx.fillStyle = "#9ca3af";
  ctx.font = `${Math.round(12 * scale)}px Inter, Arial, sans-serif`;
  ctx.fillText("Vérifiez ici", x + Math.round(16 * scale), y + boxH - Math.round(14 * scale));

  // Option : encode l’URL dans metadata ? (pas utile en V1)
  return canvas.toDataURL("image/png");
}

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

function renderMedia(proof) {
  const box = $("mediaBox");
  box.innerHTML = "";

  const video = isVideo(proof.mimetype, proof.filename);

  if (video) {
    const el = document.createElement("video");
    el.controls = true;
    el.playsInline = true;
    el.src = proof.imageUrl || proof.mediaUrl || proof.uri || "";
    box.appendChild(el);
  } else {
    const el = document.createElement("img");
    el.alt = "Preuve";
    el.src = proof.imageUrl || proof.mediaUrl || proof.uri || "";
    box.appendChild(el);
  }
}

async function main() {
  const id = getIdFromUrl();
  if (!id) {
    alert("ID de preuve manquant.");
    return;
  }

  $("backBtn").addEventListener("click", () => history.back());

  const proof = await fetchProof(id);

  // Construis l’URL de vérification (reprend ton existant)
  const verifyUrl = `${window.location.origin}/public/verify.html?id=${encodeURIComponent(id)}`;
  $("verifyUrlBox").textContent = verifyUrl;

  const created = proof.timestamp ? new Date(proof.timestamp).toLocaleString("fr-FR") : "—";
  $("metaLine").textContent = `ID ${shortenId(id)} · ${created}`;

  renderMedia(proof);

  // A) Partager le lien
  $("copyLinkBtn").addEventListener("click", async () => {
    await copyToClipboard(verifyUrl);
    $("copyLinkBtn").textContent = "Lien copié";
    setTimeout(() => ($("copyLinkBtn").textContent = "Copier le lien"), 1200);
  });

  $("nativeShareBtn").addEventListener("click", async () => {
    if (!navigator.share) {
      alert("Partage natif non disponible ici. Utilise 'Copier le lien'.");
      return;
    }
    await navigator.share({
      title: "Preuve certifiée Évidencia",
      text: "Vérifie l’authenticité de cette preuve.",
      url: verifyUrl
    });
  });

  // B) Télécharger l’original
  $("downloadOriginalBtn").addEventListener("click", async () => {
    const mediaUrl = proof.imageUrl || proof.mediaUrl || proof.uri;
    if (!mediaUrl) return alert("URL du média introuvable.");

    const blob = await fetchAsBlob(mediaUrl);
    const extFromMime = (proof.mimetype || "").split("/")[1] || "";
    const filename = safeFilename(proof.filename || `evidencia_original.${extFromMime || "bin"}`);
    downloadBlob(blob, filename);
  });

  // C) Télécharger version certifiée (photo badgée / vignette vidéo badgée)
  $("downloadBadgedBtn").addEventListener("click", async () => {
    const mediaUrl = proof.imageUrl || proof.mediaUrl || proof.uri;
    if (!mediaUrl) return alert("URL du média introuvable.");

    const video = isVideo(proof.mimetype, proof.filename);

    // QR : tu as parfois proof.qr (dataURL) / ou un endpoint QR. Adapte selon ton projet.
    const qrSrc = proof.qr || proof.qrDataUrl || null;

    let baseImageSrc = mediaUrl;

    // Si c’est une vidéo : on fait une vignette (fallback : pas de poster -> on prend une image placeholder impossible)
    if (video) {
      // Si ton backend fournit une thumbnail (idéal), utilise-la : proof.thumbUrl
      if (proof.thumbUrl) baseImageSrc = proof.thumbUrl;
      else {
        alert("Vidéo : pour V1, il faut une vignette (thumbUrl) côté backend ou on ajoute une génération de thumbnail. Dis-moi et je te le code.");
        return;
      }
    }

    const dataUrl = await generateBadgedPng({
      mediaSrc: baseImageSrc,
      qrSrc,
      verifyUrl,
      proofShortId: shortenId(id)
    });

    // convert dataUrl -> blob
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const filename = `evidencia_certifie_${shortenId(id)}.png`;
    downloadBlob(blob, filename);
  });

  // D) Télécharger le pack ZIP
  $("downloadPackBtn").addEventListener("click", async () => {
    const zip = new JSZip();

    const mediaUrl = proof.imageUrl || proof.mediaUrl || proof.uri;
    if (!mediaUrl) return alert("URL du média introuvable.");

    // original
    const originalBlob = await fetchAsBlob(mediaUrl);
    const originalName = safeFilename(proof.filename || `original_${shortenId(id)}`);

    zip.file(originalName, originalBlob);

    // receipt.json (tu peux inclure tout l’objet proof ou un subset)
    const receipt = {
      proofId: proof.id || id,
      hash: proof.hash,
      timestamp: proof.timestamp,
      filename: proof.filename,
      mimetype: proof.mimetype,
      verifyUrl: `${window.location.origin}/public/verify.html?id=${encodeURIComponent(id)}`
    };
    zip.file("receipt.json", JSON.stringify(receipt, null, 2));

    // qr (si dispo)
    if (proof.qr || proof.qrDataUrl) {
      const qrBlob = await (await fetch(proof.qr || proof.qrDataUrl)).blob();
      zip.file("qr.png", qrBlob);
    }

    // copie badgée (photo seulement si pas de thumb video)
    const video = isVideo(proof.mimetype, proof.filename);
    if (!video) {
      const dataUrl = await generateBadgedPng({
        mediaSrc: mediaUrl,
        qrSrc: proof.qr || proof.qrDataUrl || null,
        verifyUrl: receipt.verifyUrl,
        proofShortId: shortenId(id)
      });
      const badgedBlob = await (await fetch(dataUrl)).blob();
      zip.file(`certifie_${shortenId(id)}.png`, badgedBlob);
    }

    const out = await zip.generateAsync({ type: "blob" });
    downloadBlob(out, `evidencia_pack_${shortenId(id)}.zip`);
  });

  $("packInfoBtn").addEventListener("click", () => {
    alert("Le pack ZIP contient : média original + receipt.json + QR (si dispo) + copie badgée (photo). Pour la vidéo, on ajoute une thumbnail côté backend (thumbUrl) en phase 2.");
  });
}

main().catch((e) => {
  console.error(e);
  alert("Erreur de chargement de la preuve. Vérifie l’API utilisée dans share.js (même que verify.js).");
});
