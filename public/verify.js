const params = new URLSearchParams(window.location.search);
const id = params.get('id');
const apiBase = window.location.origin;
document.getElementById('pid').textContent = id || 'Missing id';

async function load() {
  if (!id) return;
  const res = await fetch(apiBase + '/api/verify/' + id);
  if (!res.ok) return;
  const data = await res.json();
  document.getElementById('hash').textContent = data.hash;
  document.getElementById('time').textContent = new Date(data.timestamp * 1000).toISOString();
  document.getElementById('tx').textContent = data.txHash || 'N/A';
  if (data.qr) document.getElementById('qr').src = data.qr;
  const btn = document.getElementById('viewTx');
  if (data.txHash && data.txHash !== 'demo-no-chain') {
    btn.disabled = false;
    btn.onclick = function() {
      window.open('https://mumbai.polygonscan.com/tx/' + data.txHash, '_blank');
    };
  }
}

load();
