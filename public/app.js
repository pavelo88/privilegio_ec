const chat = document.querySelector('.chat');
const backdrop = document.querySelector('.chat-backdrop');
const messages = document.querySelector('.chat-messages');
const form = document.querySelector('.chat-form');
const input = form.querySelector('input');

function openChat() { chat.classList.add('open'); backdrop.classList.add('show'); chat.setAttribute('aria-hidden', 'false'); setTimeout(() => input.focus(), 300); }
function closeChat() { chat.classList.remove('open'); backdrop.classList.remove('show'); chat.setAttribute('aria-hidden', 'true'); }
function addMessage(text, type) { const item = document.createElement('div'); item.className = `message ${type}`; item.textContent = text; messages.append(item); messages.scrollTop = messages.scrollHeight; return item; }
document.querySelectorAll('[data-open-chat]').forEach(el => { el.addEventListener('click', openChat); el.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') openChat(); }); });
document.querySelector('.close-chat').addEventListener('click', closeChat); backdrop.addEventListener('click', closeChat);
document.querySelectorAll('.chat-suggestions button').forEach(button => button.addEventListener('click', () => { input.value = button.textContent; form.requestSubmit(); }));

form.addEventListener('submit', async event => {
  event.preventDefault(); const message = input.value.trim(); if (!message) return;
  addMessage(message, 'user'); input.value = ''; input.disabled = true;
  const pending = addMessage('Aurea está preparando una orientación…', 'assistant');
  try {
    const response = await fetch('/api/concierge', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message }) });
    const data = await response.json(); pending.textContent = data.reply || data.error || 'No pude responder en este momento. Puedes solicitar una asesoría personalizada.';
  } catch { pending.textContent = 'No pude conectarme en este momento. Puedes solicitar una asesoría personalizada.'; }
  input.disabled = false; input.focus(); messages.scrollTop = messages.scrollHeight;
});

const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('in'); observer.unobserve(entry.target); } }), { threshold: 0.13 });
document.querySelectorAll('.reveal').forEach(element => observer.observe(element));
document.querySelector('#year').textContent = new Date().getFullYear();
