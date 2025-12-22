document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const origin = window.location.origin;

  const pid = document.getElementById("pid");
  const hashEl = document.getElementById("hash");
  const timeEl = document.getElementById("time");
  const txEl = document.getElementById("tx");
  const qrImg = document.getElementById("qr");
  const viewTxBtn = document.getElementById("viewTx");

  const proofImage = document.getElementById("proofImage");
  const imageWrapper = document.getElementById("imageWrapper");

  const proofVideo = document.getElementById("proofVideo");
  const videoWrapper = document.getElementById("videoWrapper");

  if (pid) pid.textContent = id || "Missing id";
  if (!id) return;

  const hide = (el) => { if (el) el.style.display = "none"; };
  const show = (el) => { if (el) el.style.display = "block"; };

  const isAbsUrl = (u) => /^https?:\/\//i.test(u);
  const normalizeUrl = (u) => {
    if (!u) return "";
    if (isAbsUrl(u)) return u;
    // garantit un slash
    if (u.startsWith("/")) return origin + u;
    return origin + "/" + u;
  };

  const extOf = (u) => {
    try {
      const clean = (u || "").split("?")[0].split("#")[0];
      const m = clean.match(/\.([a-z0-9]+)$/i);
      return m ? m[1].toLowerCase() : "";
    } catch {
      return "";
    }
  };

  const isVideoExt = (ext) => ["webm", "mp4", "mov", "m4v", "avi"].includes(ext);

  // État initial : on cache les 2 (le JS décidera)
  hide(imageWrapper);
  hide(videoWrapper);

  try {
    const res = await fetch(`${origin}/api/verify/${encodeURIComponent(id)}`);
    if (!res.ok) {
      console.error("VERIFY API error:", res.status);
      return;
    }

    const data = await res.json();

    // ---- Meta ----
    if (hashEl) hashEl.textContent = data.hash || "-";

    if (timeEl) {
      if (data.timestamp) {
        const d = typeof data.timestamp === "number"
          ? new Date(data.timestamp * 1000)
          : new Date(data.timestamp);
        timeEl.textContent = isNaN(d.getTime()) ? "-" : d.toISOString();
      } else {
        timeEl.textContent = "-";
      }
    }

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

    // ---- Media (robuste) ----
    const mime = (data.mimetype || "").toLowerCase();
    const uri = data.uri || data.imageUrl || "";
    const mediaUrl = normalizeUrl(uri);

    const ext = extOf(uri) || extOf(data.filename || "");
    const isVideo = mime.startsWith("video/") || isVideoExt(ext);

    // Fallbacks si jamais l’API ne renvoie pas uri
    const fallbackVideo = `${origin}/uploads/${id}.webm`;
    const fallbackImage = `${origin}/uploads/${id}.jpg`;

    if (isVideo) {
      if (!proofVideo || !videoWrapper) return;

      // si pas d’URL, tente fallback direct
      const src = mediaUrl || fallbackVideo;
      proofVideo.src = src;

      // si 404/format non supporté, on tente fallback
      proofVideo.onerror = () => {
        if (proofVideo.src !== fallbackVideo) proofVideo.src = fallbackVideo;
      };

      show(videoWrapper);
      hide(imageWrapper);
    } else {
      if (!proofImage || !imageWrapper) return;

      const src = mediaUrl || fallbackImage;
      proofImage.src = src;

      proofImage.onerror = () => {
        if (proofImage.src !== fallbackImage) proofImage.src = fallbackImage;
      };

      show(imageWrapper);
      hide(videoWrapper);
    }
  } catch (e) {
    console.error("VERIFY JS crash:", e);
  }
});
