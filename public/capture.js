// capture.js — VERSION CORRIGÉE (anti %3F, URL safe, preview stable)
// Remplace TOUT le contenu de ton capture.js par ce fichier.

document.addEventListener("DOMContentLoaded", () => {
  // ---------------------------
  // 1) Récupération des éléments
  // ---------------------------
  const photoInput = document.getElementById("photoInput");
  const videoInput = document.getElementById("videoInput");

  const capturePhotoBtn = document.getElementById("capturePhotoBtn");
  const captureVideoBtn = document.getElementById("captureVideoBtn");

  const statusBox = document.getElementById("statusBox");
  const resultEl = document.getElementById("result");

  const proofIdEl = document.getElementById("proofId");
  const hashEl = document.getElementById("hash");
  const timestampEl = document.getElementById("timestamp");

  const openProofBtn = document.getElementById("openProof");
  const shareProofBtn = document.getElementById("shareProof");

  const previewWrapper = document.getElementById("previewWrapper");
  const videoPreviewWrapper = document.getElementById("videoPreviewWrapper");
  const previewImage = document.getElementById("previewImage");
  const previewVideo = document.getElementById("previewVideo");

  const apiKeyInput = document.getElementById("apiKey");

  // ---------------------------
  // 2) Garde-fous (anti page cassée)
  // ---------------------------
  if (!photoInput || !videoInput || !capturePhotoBtn || !captureVideoBtn || !statusBox) {
    const badge = document.createElement("div");
    badge.textContent = "ERREUR: élément HTML manquant (id)";
    badge.style.cssText =
      "position:fixed;bottom:10px;left:10px;background:#b91c1c;color:#fff;padding:6px 10px;border-radius:10px;z-index:999999";
    document.body.appendChild(badge);
    return;
  }

  capturePhotoBtn.disabled = false;
  captureVideoBtn.disabled = false;

  // ---------------------------
  // 3) Helpers UI
  // ---------------------------
  function setStatus(message, type) {
    statusBox.textContent = message;
    statusBox.classList.remove("success", "error");
    if (type) statusBox.classList.add(type);
  }

  function resetInputs() {
    photoInput.value = "";
    videoInput.value = "";
  }

  function setButtonsDisabled(disabled) {
    capturePhotoBtn.disabled = disabled;
    captureVideoBtn.disabled = disabled;
  }

  // ⚠️ Important : éviter les fuites mémoire des previews (URL.createObjectURL)
  let lastPreviewUrl = null;
  function setPreviewObjectUrl(url) {
    try {
      if (lastPreviewUrl) URL.revokeObjectURL(lastPreviewUrl);
    } catch (e) {}
    lastPreviewUrl = url;
  }

  // ---------------------------
  // 4) Construction URL verify "blindée"
  //    - corrige le bug verify.html%3Fid=...
  //    - encode l'id correctement
  //    - accepte verifyUrl backend encodée ou non
  // ---------------------------
  function buildVerifyUrl(data) {
    const id = data && data.id ? String(data.id) : "";
    const fallback = `/public/verify.html?id=${encodeURIComponent(id)}`;

    let url = (data && data.verifyUrl) ? String(data.verifyUrl) : fallback;

    // Si le backend renvoie /public/verify.html%3Fid=xxx on le "dé-encode"
    if (url.includes("%3F")) {
      try {
        url = decodeURIComponent(url);
      } catch (e) {
        // si decode échoue, on garde tel quel
      }
    }

    // Si l'URL ne contient pas id= mais qu'on a un id, on force le fallback
    if (!url.includes("id=") && id) {
      url = fallback;
    }

    return url;
  }

  // ---------------------------
  // 5) Upload + certification
  // ---------------------------
  async function uploadFile(file, kind) {
    setStatus(`${kind === "video" ? "Vidéo" : "Photo"} détectée ⏳ envoi...`, "success");
    setButtonsDisabled(true);

    const formData = new FormData();
    formData.append("file", file, file.name || (kind === "video" ? "capture.webm" : "capture.jpg"));
    formData.append("type", kind);

    const headers = {};
    const key = apiKeyInput && apiKeyInput.value ? apiKeyInput.value.trim() : "";
    if (key) headers["x-api-key"] = key;

    try {
      const response = await fetch(`${window.location.origin}/api/certify`, {
        method: "POST",
        headers: Object.keys(headers).length ? headers : undefined,
        body: formData
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ message: "Erreur API" }));
        throw new Error(err.message || "Erreur API");
      }

      const data = await response.json();

      // Affichage métadonnées
      if (proofIdEl) proofIdEl.textContent = data.id || "";
      if (hashEl) hashEl.textContent = data.hash || "";

      // Selon backend : timestamp parfois en secondes (epoch)
      if (timestampEl && data.timestamp) {
        // si data.timestamp ressemble à un epoch en secondes
        const t = Number(data.timestamp);
        if (!Number.isNaN(t) && t > 1000000000 && t < 9999999999) {
          timestampEl.textContent = new Date(t * 1000).toISOString();
        } else {
          // sinon on tente affichage brut (ISO déjà fourni, etc.)
          try {
            timestampEl.textContent = new Date(data.timestamp).toISOString();
          } catch (e) {
            timestampEl.textContent = String(data.timestamp);
          }
        }
      }

      if (resultEl) resultEl.style.display = "block";
      if (openProofBtn) openProofBtn.disabled = false;

      // ✅ URL de vérification robustifiée
      const verifyUrl = buildVerifyUrl(data);

      if (openProofBtn) openProofBtn.onclick = () => (window.location.href = verifyUrl);

      if (shareProofBtn && navigator.share) {
        shareProofBtn.style.display = "inline-block";
        shareProofBtn.onclick = async () => {
          try {
            await navigator.share({ title: "Preuve Évidencia", url: verifyUrl });
          } catch (e) {}
        };
      }

      setStatus(`${kind === "video" ? "Vidéo" : "Photo"} certifiée ✅ Redirection...`, "success");
      setTimeout(() => (window.location.href = verifyUrl), 1200);
    } catch (err) {
      setStatus(err.message || "❌ Erreur lors de la certification", "error");
      setButtonsDisabled(false);
    } finally {
      resetInputs();
    }
  }

  // ---------------------------
  // 6) Gestion sélection fichier + preview local immédiat
  // ---------------------------
  function handleFileSelection(e) {
    const input = e.target;
    const file = input.files && input.files[0];

    if (!file) {
      setStatus("Aucun fichier détecté, veuillez réessayer.", "error");
      return;
    }

    const isVideo = file.type && file.type.startsWith("video/");

    // Preview local immédiat (BLOB)
    const objectUrl = URL.createObjectURL(file);
    setPreviewObjectUrl(objectUrl);

    if (isVideo) {
      if (previewWrapper) previewWrapper.style.display = "none";
      if (videoPreviewWrapper) videoPreviewWrapper.style.display = "block";
      if (previewVideo) {
        previewVideo.src = objectUrl;
        // iOS/webview: forcer
        try { previewVideo.load(); } catch (e) {}
      }
    } else {
      if (videoPreviewWrapper) videoPreviewWrapper.style.display = "none";
      if (previewWrapper) previewWrapper.style.display = "block";
      if (previewImage) previewImage.src = objectUrl;
    }

    uploadFile(file, isVideo ? "video" : "photo");
  }

  // ---------------------------
  // 7) Events
  // ---------------------------
  photoInput.addEventListener("change", handleFileSelection);
  videoInput.addEventListener("change", handleFileSelection);

  capturePhotoBtn.addEventListener("click", () => {
    resetInputs();
    setStatus("Ouverture de la caméra photo...", undefined);
    photoInput.click();
  });

  captureVideoBtn.addEventListener("click", () => {
    resetInputs();
    setStatus("Ouverture de la caméra vidéo...", undefined);
    videoInput.click();
  });
});
