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

  // Bouton nouvelle capture
  if (newCaptureBtn) {
    newCaptureBtn.onclick = () => {
      window.location.href = "/public/capture.html";
    };
  }

  const hide = el => el && (el.style.display = "none");
  const show = el => el && (el.style.display = "block");

  hide(imageWrapper);
  hide(videoWrapper);

  try {
    const res = await fetch(`${origin}/api/verify/${encodeURIComponent(id)}`);
    if (!res.ok) return;

    const data = await res.json();

    if (hashEl) hashEl.textContent = data.hash || "-";

    if (timeEl) {
      if (data.timestamp) {
        const d = typeof data.timestamp === "number"
          ? new Date(data.timestamp * 1000)
          : new Date(data.timestamp);
        timeEl.textContent = isNaN(d.getTime()) ? "-" : d.toISOString();
      } else timeEl.textContent = "-";
    }

    if (txEl) txEl.textContent = data.txHash || "-";

    if (qrImg) qrImg.src = data.qrUrl || data.qr || "";

    const mime = (data.mimetype || "").toLowerCase();
    const uri = data.uri || data.imageUrl || "";
    const isVideo = mime.startsWith("video/");
    const mediaUrl = uri.startsWith("http") ? uri : origin + uri;

    if (isVideo) {
      proofVideo.src = mediaUrl;
      show(videoWrapper);
    } else {
      proofImage.src = mediaUrl;
      show(imageWrapper);
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

  } catch (e) {
    console.error("VERIFY error:", e);
  }
});
