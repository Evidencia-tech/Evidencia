document.addEventListener("DOMContentLoaded", () => {
  const photoInput = document.getElementById('photoInput');
  const captureButton = document.getElementById('captureButton');
  const statusBox = document.getElementById('statusBox');
  const resultEl = document.getElementById('result');
  const proofIdEl = document.getElementById('proofId');
  const hashEl = document.getElementById('hash');
  const timestampEl = document.getElementById('timestamp');
  const openProofBtn = document.getElementById('openProof');
  const shareProofBtn = document.getElementById('shareProof');
  const previewWrapper = document.getElementById('previewWrapper');
  const previewImage = document.getElementById('previewImage');
  const apiKeyInput = document.getElementById('apiKey');

  // Sécurité minimale : si un élément clé manque, on affiche une erreur visible
  if (!photoInput || !captureButton || !statusBox) {
    const badge = document.createElement("div");
    badge.textContent = "ERREUR: élément HTML manquant (id)";
    badge.style.cssText =
      "position:fixed;bottom:10px;left:10px;background:#b91c1c;color:#fff;padding:6px 10px;border-radius:10px;z-index:999999";
    document.body.appendChild(badge);
    return;
  }

  captureButton.disabled = false;

  function setStatus(message, type) {
    statusBox.textContent = message;
    statusBox.classList.remove('success', 'error');
    if (type) statusBox.classList.add(type);
  }

  function resetInput() {
    photoInput.value = '';
  }

  async function uploadFile(file) {
    setStatus('Photo détectée ✅ envoi...', 'success');
    captureButton.disabled = true;

    const formData = new FormData();
    formData.append('file', file, file.name || 'capture.jpg');

    const headers = {};
    const key = apiKeyInput && apiKeyInput.value ? apiKeyInput.value.trim() : "";
    if (key) headers['x-api-key'] = key;

    try {
      const response = await fetch(`${window.location.origin}/api/certify`, {
        method: 'POST',
        headers: Object.keys(headers).length ? headers : undefined,
        body: formData
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ message: 'Erreur API' }));
        throw new Error(err.message || 'Erreur API');
      }

      const data = await response.json();

      if (proofIdEl) proofIdEl.textContent = data.id || '';
      if (hashEl) hashEl.textContent = data.hash || '';
      if (timestampEl && data.timestamp) {
        timestampEl.textContent = new Date(data.timestamp * 1000).toISOString();
      }

      if (resultEl) resultEl.style.display = 'block';
      if (openProofBtn) openProofBtn.disabled = false;

      const verifyUrl = data.verifyUrl || `/public/verify.html?id=${data.id}`;
      if (openProofBtn) openProofBtn.onclick = () => window.location.href = verifyUrl;

      if (data.imageUrl && previewImage && previewWrapper) {
        previewImage.src = data.imageUrl;
        previewWrapper.style.display = 'block';
      }

      if (shareProofBtn && navigator.share) {
        shareProofBtn.style.display = 'inline-block';
        shareProofBtn.onclick = async () => {
          try { await navigator.share({ title: 'Preuve Évidencia', url: verifyUrl }); } catch (e) {}
        };
      }

      setStatus('Photo certifiée avec succès. Redirection...', 'success');
      setTimeout(() => window.location.href = verifyUrl, 1200);
    } catch (err) {
      setStatus(err.message || 'Erreur lors de la certification', 'error');
      captureButton.disabled = false;
    } finally {
      resetInput();
    }
  }

  function handleFileSelection() {
    const file = photoInput.files && photoInput.files[0];
    if (!file) {
      setStatus('Aucune photo détectée, veuillez réessayer.', 'error');
      return;
    }

    // Preview local immédiat
    if (previewImage && previewWrapper) {
      const localUrl = URL.createObjectURL(file);
      previewImage.src = localUrl;
      previewWrapper.style.display = 'block';
    }

    uploadFile(file);
  }

  // Quand un fichier est sélectionné
  photoInput.addEventListener('change', handleFileSelection);

  // ✅ Bouton capture: ouvre le sélecteur/caméra (direct, sans setTimeout)
  captureButton.addEventListener('click', () => {
    resetInput();
    setStatus('Ouverture de la caméra...', undefined);
    photoInput.click();
  });
});
