document.addEventListener("DOMContentLoaded", () => {
  const photoInput = document.getElementById('photoInput');
  const videoInput = document.getElementById('videoInput');

  const capturePhotoBtn = document.getElementById('capturePhotoBtn');
  const captureVideoBtn = document.getElementById('captureVideoBtn');

  const statusBox = document.getElementById('statusBox');
  const resultEl = document.getElementById('result');
  const proofIdEl = document.getElementById('proofId');
  const hashEl = document.getElementById('hash');
  const timestampEl = document.getElementById('timestamp');
  const openProofBtn = document.getElementById('openProof');
  const shareProofBtn = document.getElementById('shareProof');

  const previewWrapper = document.getElementById('previewWrapper');
  const videoPreviewWrapper = document.getElementById('videoPreviewWrapper');
  const previewImage = document.getElementById('previewImage');
  const previewVideo = document.getElementById('previewVideo');

  const apiKeyInput = document.getElementById('apiKey');

  // Sécurité minimale : si un élément clé manque, on affiche une erreur visible
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

  function setStatus(message, type) {
    statusBox.textContent = message;
    statusBox.classList.remove('success', 'error');
    if (type) statusBox.classList.add(type);
  }

  function resetInputs() {
    photoInput.value = '';
    videoInput.value = '';
  }

  function setButtonsDisabled(disabled) {
    capturePhotoBtn.disabled = disabled;
    captureVideoBtn.disabled = disabled;
  }

  async function uploadFile(file, kind) {
    setStatus(`${kind === 'video' ? 'Vidéo' : 'Photo'} détectée ⏳ envoi...`, 'success');
    setButtonsDisabled(true);

    const formData = new FormData();
    formData.append('file', file, file.name || (kind === 'video' ? 'capture.webm' : 'capture.jpg'));
    formData.append('type', kind); // utile si ton backend veut différencier

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

      if (shareProofBtn && navigator.share) {
        shareProofBtn.style.display = 'inline-block';
        shareProofBtn.onclick = async () => {
          try { await navigator.share({ title: 'Preuve Évidencia', url: verifyUrl }); } catch (e) {}
        };
      }

      setStatus(`${kind === 'video' ? 'Vidéo' : 'Photo'} certifiée ✅ Redirection...`, 'success');
      setTimeout(() => window.location.href = verifyUrl, 1200);
    } catch (err) {
      setStatus(err.message || '❌ Erreur lors de la certification', 'error');
      setButtonsDisabled(false);
    } finally {
      resetInputs();
    }
  }

  function handleFileSelection(e) {
    const input = e.target; // photoInput ou videoInput
    const file = input.files && input.files[0];

    if (!file) {
      setStatus('Aucun fichier détecté, veuillez réessayer.', 'error');
      return;
    }

    const isVideo = file.type && file.type.startsWith('video/');

    // Preview local immédiat
    if (isVideo) {
      if (previewWrapper) previewWrapper.style.display = 'none';
      if (videoPreviewWrapper) videoPreviewWrapper.style.display = 'block';
      if (previewVideo) previewVideo.src = URL.createObjectURL(file);
    } else {
      if (videoPreviewWrapper) videoPreviewWrapper.style.display = 'none';
      if (previewWrapper) previewWrapper.style.display = 'block';
      if (previewImage) previewImage.src = URL.createObjectURL(file);
    }

    uploadFile(file, isVideo ? 'video' : 'photo');
  }

  // Quand un fichier est sélectionné
  photoInput.addEventListener('change', handleFileSelection);
  videoInput.addEventListener('change', handleFileSelection);

  // Boutons : ouvre caméra / sélecteur
  capturePhotoBtn.addEventListener('click', () => {
    resetInputs();
    setStatus('Ouverture de la caméra photo...', undefined);
    photoInput.click();
  });

  captureVideoBtn.addEventListener('click', () => {
    resetInputs();
    setStatus('Ouverture de la caméra vidéo...', undefined);
    videoInput.click();
  });
});
