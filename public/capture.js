document.addEventListener("DOMContentLoaded", () => {
  const badge = document.createElement("div");
  badge.textContent = "JS EXTERNE OK";
  badge.style.cssText =
    "position:fixed;bottom:10px;left:10px;background:#111;color:#fff;padding:6px 10px;border-radius:10px;z-index:999999";
  document.body.appendChild(badge);

  const btn = document.getElementById("captureButton");
  const input = document.getElementById("photoInput");

  if (!btn) badge.textContent = "JS OK mais bouton introuvable";
  if (!input) badge.textContent = "JS OK mais input introuvable";

  if (btn && input) {
    btn.addEventListener("click", () => {
      badge.textContent = "CLIC OK → ouverture";
      input.value = "";
      input.click();
    });

    input.addEventListener("change", () => {
      badge.textContent = input.files?.length ? "FICHIER OK" : "AUCUN FICHIER";
    });
  }
});
