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

  if (pid) pid.textContent = id || "Missing id";
  if (!id) return;

  if (newCaptureBtn) {
    newCaptureBtn.onclick = () => {
      window.location.href = "/public/capture.html";
    };
  }

  hide(imageWrapper);
  hide(videoWrapper);

  const formatTimestamp = (ts) => {
    if (!ts) return "-";
    if (typeof ts === "number") {
      const d = new Date(ts * 1000);
      return isNaN(d.getTime()) ? "-" : d.toISOString();
    }
    const d = new Date(ts);
    return isNaN(d.getTime()) ? String(ts) : d.toISOString();
  };

  const normalizeUrl = (u) => {
    if (!u) return "";
    if (/^https?:\/\//i.test(u)) return u;
    if (u.startsWith("/")) return origin + u;
    return origin + "/" + u;
  };

  try {
    const res = await fetch(`${origin}/api/verify/${encodeURIComponent(id)}`);
    if (!res.ok) {
      console.error("VERIFY API error:", res.status);
      return;
    }

    const data = await res.json();

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

    // ✅ La seule source média attendue
    const mediaUrl = normalizeUrl(data.mediaUrl || "");
    const mime = String(data.mimetype || "").toLowerCase();
    const isVideo =
      mime.startsWith("video/") ||
      /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(mediaUrl);

    console.log("VERIFY media:", { id, mediaUrl, mimetype: data.mimetype, isVideo });

    if (!mediaUrl) return;

    if (isVideo) {
      if (!proofVideo || !videoWrapper) return;

      try {
        proofVideo.pause();
        proofVideo.removeAttribute("src");
        proofVideo.load();
      } catch (e) {}

      proofVideo.src = mediaUrl;
      try { proofVideo.load(); } catch (e) {}

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
