'use strict';

const PIX_KEY = 'COLE_SUA_CHAVE_PIX_AQUI';

const dialog = document.getElementById('pix');
const amountOut = document.querySelector('[data-amount-out]');
const copyBtn = document.querySelector('[data-copy]');
const copyNote = document.querySelector('[data-copy-note]');
const chips = document.querySelectorAll('[data-amount]');
const qrBox = document.querySelector('.pix-qr');
const qrImg = document.querySelector('.pix-qr img');

let selectedAmount = 'valor livre';

for (const chip of chips) {
  chip.addEventListener('click', function () {
    for (const c of chips) c.setAttribute('aria-pressed', 'false');
    chip.setAttribute('aria-pressed', 'true');
    selectedAmount = chip.getAttribute('data-amount');
    amountOut.textContent = selectedAmount;
  });
}

for (const opener of document.querySelectorAll('[data-open-pix]')) {
  opener.addEventListener('click', function (e) {
    e.preventDefault();
    amountOut.textContent = selectedAmount;
    copyNote.textContent = '';
    dialog.showModal();
  });
}

document.querySelector('.pix-close').addEventListener('click', function () {
  dialog.close();
});

dialog.addEventListener('click', function (e) {
  if (e.target === dialog) dialog.close();
});

qrImg.addEventListener('error', function () {
  qrBox.classList.add('is-broken');
});

if (PIX_KEY.indexOf('COLE_') === 0) {
  copyBtn.hidden = true;
} else {
  copyBtn.addEventListener('click', async function () {
    try {
      await navigator.clipboard.writeText(PIX_KEY);
      copyNote.textContent = 'Chave copiada.';
    } catch (err) {
      copyNote.textContent = PIX_KEY;
    }
  });
}
