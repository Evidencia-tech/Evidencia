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

  if (pid) pid.textContent = id || "Missing id";
  if (!id) return;

  if (newCaptureBtn) {
    newCaptureBtn.onclick = () => {
      window.location.href = "/public/capture.html";
    };
  }

  const hide = (el) => el && (el.style.display = "none");
  const show = (el) => el && (el.style.display = "block");

  const normalizeUrl = (u) => {
    if (!u) return "";
    // déjà absolu
    if (/^https?:\/\//i.test(u)) return u;
    // commence par /
    if (u.startsWith("/")) return origin + u;
    // sinon on ajoute / entre origin et chemin
    return origin + "/" + u;
  };

  // on cache tout au début
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

    // ---- Media (photo + vidéo) ----
    const mime = (data.mimetype || "").toLowerCase();
    const isVideo = mime.startsWith("video/");

    // chez toi, les champs fiables sont: uri + imageUrl
    const rawUrl = data.uri || data.imageUrl || "";
    const mediaUrl = normalizeUrl(rawUrl);

    // DEBUG utile si ça ne charge pas (tu peux supprimer après)
    console.log("VERIFY media:", { rawUrl, mediaUrl, mimetype: data.mimetype });

    // IMPORTANT : si mediaUrl est vide, on ne touche pas l’affichage (sinon ça “disparaît”)
    if (!mediaUrl) return;

    if (isVideo) {
      if (!proofVideo || !videoWrapper) return;
      proofVideo.src = mediaUrl;
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
