// verify.js — VERSION CORRIGÉE INTÉGRALE
// Objectif: NE JAMAIS utiliser data.uri si c’est un lien vers verify.html
// Priorité: mediaUrl / imageUrl (fichier) -> sinon filename -> sinon uri (si et seulement si c’est un fichier)

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

  // Bouton nouvelle capture
  if (newCaptureBtn) {
    newCaptureBtn.onclick = () => {
      window.location.href = "/public/capture.html";
    };
  }

  // Cache tout au début
  hide(imageWrapper);
  hide(videoWrapper);

  // ---------------------------
  // Helpers
  // ---------------------------
  const formatTimestamp = (ts) => {
    if (!ts) return "-";
    if (typeof ts === "number") {
      const d = new Date(ts * 1000);
      return isNaN(d.getTime()) ? "-" : d.toISOString();
    }
    const d = new Date(ts);
    return isNaN(d.getTime()) ? String(ts) : d.toISOString();
  };

  const normalizeMediaUrl = (u) => {
    if (!u) return "";

    // absolu http(s)
    if (/^https?:\/\//i.test(u)) return u;

    // chemin disque / file:// (mauvais retour backend) => on tente /uploads/<filename>
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

    // public/... => /public/...
    if (u.startsWith("public/")) u = "/" + u;
    // uploads/... => /uploads/...
    if (u.startsWith("uploads/")) u = "/" + u;

    // si on a /uploads/ au milieu
    const idx = u.indexOf("/uploads/");
    if (idx > 0) u = u.slice(idx);

    // si on a /public/ au milieu
    const idx2 = u.indexOf("/public/");
    if (idx2 > 0) u = u.slice(idx2);

    if (u.startsWith("/")) return origin + u;
    return origin + "/" + u;
  };

  const looksLikeVerifyPage = (u) => {
    if (!u) return false;
    const s = String(u);
    return s.includes("/public/verify.html") || s.includes("verify.html?id=");
  };

  const looksLikeMediaFile = (u) => {
    if (!u) return false;
    const s = String(u).toLowerCase();
    // extensions médias courantes (ajuste si besoin)
    return /\.(jpg|jpeg|png|gif|webp|mp4|webm|mov|m4v)(\?.*)?$/.test(s);
  };

  // ---------------------------
  // Main
  // ---------------------------
  try {
    const res = await fetch(`${origin}/api/verify/${encodeURIComponent(id)}`);
    if (!res.ok) {
      console.error("VERIFY API error:", res.status);
      return;
    }

    const data = await res.json();

    // ---- Meta ----
    if (hashEl) hashEl.textContent = data.hash || "-";
    if (timeEl) timeEl.textContent = formatTimestamp(data.timestamp);
    if (txEl) txEl.textContent = data.txHash || "-";

    if (qrImg) {
      const q = data.qrUrl || data.qr || "";
      qrImg.src = q;
    }

    if (viewTxBtn) {
      if (data.txHash && data.txHash !== "demo-no-chain") {
        viewTxBtn.disabled = false;
        viewTxBtn.onclick = () =>
          window.open(`https://mumbai.polygonscan.com/tx/${data.txHash}`, "_blank");
      } else {
        viewTxBtn.disabled = true;
      }
    }

    // ---- Media ----
    const mime = String(data.mimetype || "").toLowerCase();

    // Priorité: mediaUrl / imageUrl (doivent être des fichiers)
    let candidate =
      data.mediaUrl ||
      data.imageUrl ||
      data.fileUrl ||
      data.url ||
      "";

    // Si le backend ne renvoie pas d’URL fichier, on tente filename (si existant)
    // (selon ton backend, filename est l’originalname; ça peut ne pas aider)
    if (!candidate && data.filename && looksLikeMediaFile(data.filename)) {
      candidate = `uploads/${data.filename}`;
    }

    // En dernier recours seulement: data.uri, MAIS PAS si c’est verify.html
    if (!candidate && data.uri && !looksLikeVerifyPage(data.uri)) {
      // on ne prend uri que si ça ressemble à un fichier
      if (looksLikeMediaFile(data.uri)) candidate = data.uri;
    }

    // Normalisation
    const mediaUrl = normalizeMediaUrl(candidate);

    // Détection vidéo
    const isVideo =
      mime.startsWith("video/") ||
      /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(mediaUrl);

    console.log("VERIFY media:", {
      id,
      mimetype: data.mimetype,
      // ce que le backend donne
      mediaUrlFromApi: data.mediaUrl,
      imageUrlFromApi: data.imageUrl,
      uriFromApi: data.uri,
      // ce que le front choisit
      chosenCandidate: candidate,
      resolvedMediaUrl: mediaUrl,
      isVideo
    });

    // Stop si on n’a toujours pas un fichier
    if (!mediaUrl || looksLikeVerifyPage(mediaUrl) || !looksLikeMediaFile(mediaUrl)) {
      console.error("NO VALID MEDIA URL (backend must return mediaUrl/imageUrl pointing to a file).");
      return;
    }

    if (isVideo) {
      if (!proofVideo || !videoWrapper) return;

      // reset iOS/webviews
      try {
        proofVideo.pause();
        proofVideo.removeAttribute("src");
        proofVideo.load();
      } catch (e) {}

      proofVideo.src = mediaUrl;

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
