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

  // Debug visible (pour être sûr que le JS tourne)
  const badge = document.createElement("div");
  badge.textContent = "VERIFY JS OK";
  badge.style.cssText =
    "position:fixed;bottom:10px;left:10px;background:#111;color:#fff;padding:6px 10px;border-radius:10px;z-index:999999";
  document.body.appendChild(badge);

  if (pid) pid.textContent = id || "Missing id";

  async function load() {
    if (!id) return;

    const res = await fetch(`${apiBase}/api/verify/${encodeURIComponent(id)}`);
    if (!res.ok) {
      badge.textContent = "VERIFY: API erreur";
      return;
    }

    const data = await res.json();
    console.log("VERIFY DATA:", data);
badge.textContent = "KEYS: " + Object.keys(data).join(", ");

    if (hashEl) hashEl.textContent = data.hash || "";
    if (timeEl && data.timestamp) timeEl.textContent = new Date(data.timestamp * 1000).toISOString();
    if (txEl) txEl.textContent = data.txHash || "N/A";

    if (qrImg && (data.qrUrl || data.qr)) qrImg.src = data.qrUrl || data.qr;

  // Media: image ou vidéo (V1)
const mediaType = data.type; // "photo" | "video" (si dispo)
const imageUrl = data.imageUrl;
const videoUrl = data.videoUrl || data.mediaUrl || data.fileUrl; // selon ce que renvoie ton API

// reset affichage
if (imageWrapper) imageWrapper.style.display = "none";
if (videoWrapper) videoWrapper.style.display = "none";

if ((mediaType === "video" || (videoUrl && !imageUrl)) && proofVideo && videoWrapper) {
  proofVideo.src = videoUrl;
  videoWrapper.style.display = "block";
} else if (imageUrl && proofImage && imageWrapper) {
  proofImage.src = imageUrl;
  imageWrapper.style.display = "block";
}
    if (viewTxBtn) {
      if (data.txHash && data.txHash !== "demo-no-chain") {
        viewTxBtn.disabled = false;
        viewTxBtn.onclick = () => window.open(`https://mumbai.polygonscan.com/tx/${data.txHash}`, "_blank");
      } else {
        viewTxBtn.disabled = true;
      }
    }
}
  load();
});
