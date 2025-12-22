// Verify.js — VERSION CORRIGÉE (URLs médias robustes + iOS/webview load() + fallback champs)
// Remplace TOUT le contenu de ton Verify.js par ce fichier.

document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const origin = window.location.origin;

  const pid = document.getElementById("pid");
  const hashEl = document.getElementById("hash");
  const timeEl = document.getElementById("time");
  const txEl = document.getElementById("tx");
  const qrImg = document.getElementById("qr");

  const proofImage = document.getElementById("proofImage");
  const imageWrapper = document.getElementById("imageWrapper");

  const proofVideo = document.getElementById("proofVideo");
  const videoWrapper = document.getElementById("videoWrapper");

  const viewTxBtn = document.getElementById("viewTx");
  const newCaptureBtn = document.getElementById("newCapture");

  const hide = (el) => el && (el.style.display = "none");
  const show = (el) => el && (el.style.display = "block");

  // Affichage id
  if (pid) pid.textContent = id || "Missing id";
  if (!id) return;

  // Bouton "nouvelle capture"
  if (newCaptureBtn) {
    newCaptureBtn.onclick = () => {
      window.location.href = "/public/capture.html";
    };
  }

  // On cache tout au début
  hide(imageWrapper);
  hide(videoWrapper);

  // ---------------------------
  // NORMALISATION URL MEDIA (clé)
  // ---------------------------
  const normalizeMediaUrl = (u) => {
    if (!u) return "";

    // 1) Déjà absolu http(s)
    if (/^https?:\/\//i.test(u)) return u;

    // 2) Si backend renvoie un chemin disque ou file:// (mauvais)
    // ex: /home/runner/.../uploads/abc.mp4 -> /uploads/abc.mp4
    // ex: C:\...\uploads\abc.jpg -> /uploads/abc.jpg
    if (
      u.startsWith("file:") ||
      u.includes("/home/") ||
      u.includes("\\") ||
      u.includes(":\\")
    ) {
      const fileName = (u.split("/").pop() || "").split("\\").pop();
      if (!fileName) return "";
      return `${origin}/uploads/${encodeURIComponent(fileName)}`;
    }

    // 3) Nettoyage chemins fréquents
    // public/uploads/xxx -> /public/uploads/xxx
    if (u.startsWith("public/")) u = "/" + u;
    // uploads/xxx -> /uploads/xxx
    if (u.startsWith("uploads/")) u = "/" + u;

    // 4) Si ça contient déjà "/uploads/" quelque part, on coupe au bon endroit
    const idx = u.indexOf("/uploads/");
    if (idx > 0) u = u.slice(idx);

    // 5) Si commence par /
    if (u.startsWith("/")) return origin + u;

    // 6) fallback
    return origin + "/" + u;
  };

  // ---------------------------
  // Helpers timestamp (epoch/sec vs ISO)
  // ---------------------------
  const formatTimestamp = (ts) => {
    if (!ts) return "-";

    // Nombre => probablement epoch en secondes
    if (typeof ts === "number") {
      const d = new Date(ts * 1000);
      return isNaN(d.getTime()) ? "-" : d.toISOString();
    }

    // String => essayer parse ISO
    const d = new Date(ts);
    return isNaN(d.getTime()) ? String(ts) : d.toISOString();
  };

  try {
    // API verify
    const res = await fetch(`${origin}/api/verify/${encodeURIComponent(id)}`);
    if (!res.ok) {
      console.error("VERIFY API error:", res.status);
      return;
    }

    const data = await res.json();

    // ---------------------------
    // META
    // ---------------------------
    if (hashEl) hashEl.textContent = data.hash || "-";
    if (timeEl) timeEl.textContent = formatTimestamp(data.timestamp);
    if (txEl) txEl.textContent = data.txHash || "-";

    // QR : certains backends renvoient déjà une url absolue ou un dataURL
    if (qrImg) {
      const q = data.qrUrl || data.qr || "";
      qrImg.src = q;
    }

    // Bouton Polygonscan (si txHash réel)
    if (viewTxBtn) {
      if (data.txHash && data.txHash !== "demo-no-chain") {
        viewTxBtn.disabled = false;
        viewTxBtn.onclick = () =>
          window.open(`https://mumbai.polygonscan.com/tx/${data.txHash}`, "_blank");
      } else {
        viewTxBtn.disabled = true;
      }
    }

    // ---------------------------
    // MEDIA (photo + vidéo)
    // ---------------------------
    const mime = String(data.mimetype || "").toLowerCase();

    // Détection vidéo plus robuste:
    // - mimetype video/*
    // - ou extension dans l'url
    const rawUrl =
      data.uri ||
      data.imageUrl ||
      data.mediaUrl ||
      data.fileUrl ||
      data.url ||
      "";

    // Si backend renvoie juste un filename
    const candidate = rawUrl || (data.filename ? `uploads/${data.filename}` : "");

    const mediaUrl = normalizeMediaUrl(candidate);

    // Détection vidéo par mime ou extension
    const isVideo =
      mime.startsWith("video/") ||
      /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(mediaUrl);

    // DEBUG (à garder 1-2 jours)
    console.log("VERIFY media:", {
      id,
      rawUrl,
      candidate,
      mediaUrl,
      mimetype: data.mimetype,
      isVideo
    });

    // Si pas d'URL, on ne peut pas afficher de preview
    if (!mediaUrl) return;

    if (isVideo) {
      if (!proofVideo || !videoWrapper) return;

      // Certains webviews iOS ont besoin d’un reset + load()
      try {
        proofVideo.pause();
        proofVideo.removeAttribute("src");
        proofVideo.load();
      } catch (e) {}

      proofVideo.src = mediaUrl;

      // IMPORTANT iOS / Instagram webview : force chargement
      try {
        proofVideo.load();
      } catch (e) {}

      proofVideo.onerror = () => console.error("VIDEO LOAD ERROR:", mediaUrl);

      show(videoWrapper);
      hide(imageWrapper);
    } else {
      if (!proofImage || !imageWrapper) return;

      proofImage.src = mediaUrl;
      proofImage.onerror = () => console.error("IMAGE LOAD ERROR:", mediaUrl);

      show(imageWrapper);
      hide(videoWrapper);
    }
  } catch (e) {
    console.error("VERIFY JS crash:", e);
  }
});
