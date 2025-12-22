document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const apiBase = window.location.origin;

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

  if (pid) pid.textContent = id || "Missing id";
  if (!id) return;

  try {
    const res = await fetch(`${apiBase}/api/verify/${encodeURIComponent(id)}`);
    if (!res.ok) {
      console.error("VERIFY API error:", res.status);
      return;
    }

    const data = await res.json();

    // meta
    if (hashEl) hashEl.textContent = data.hash || "-";

    if (timeEl) {
      if (data.timestamp) {
        // timestamp renvoyé chez toi = secondes (number). Si un jour c’est ISO, ça marche aussi.
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
      const q = data.qrUrl || data.qr;
      qrImg.src = q || "";
    }

    // media (TES champs: mimetype + uri)
    const mime = data.mimetype || "";
    const isVideo = mime.startsWith("video/");
    const mediaUrl = data.uri || data.imageUrl || "";

    if (imageWrapper) imageWrapper.style.display = "none";
    if (videoWrapper) videoWrapper.style.display = "none";

    if (isVideo) {
      if (proofVideo && videoWrapper && mediaUrl) {
        proofVideo.src = mediaUrl;
        videoWrapper.style.display = "block";
      }
    } else {
      if (proofImage && imageWrapper && mediaUrl) {
        proofImage.src = mediaUrl;
        imageWrapper.style.display = "block";
      }
    }

    // polygonscan
    if (viewTxBtn) {
      if (data.txHash && data.txHash !== "demo-no-chain") {
        viewTxBtn.disabled = false;
        viewTxBtn.onclick = () =>
          window.open(`https://mumbai.polygonscan.com/tx/${data.txHash}`, "_blank");
      } else {
        viewTxBtn.disabled = true;
      }
    }
  } catch (e) {
    console.error("VERIFY JS crash:", e);
  }
});
