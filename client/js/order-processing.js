// order-processing.js
// Expects ?orderId=<id> in the URL. Polls GET /api/orders/:id every 3s,
// up to a max wait, until status flips to 'confirmed' (or 'cancelled').

const POLL_INTERVAL_MS = 3000;
const MAX_WAIT_MS = 60000; // give up showing a spinner after 60s — payment isn't lost, just slow to confirm

function showState(id) {
  ['stateProcessing', 'stateSuccess', 'stateTimeout', 'stateFailed'].forEach((s) => {
    const el = document.getElementById(s);
    if (el) el.style.display = s === id ? 'block' : 'none';
  });
}

async function pollOrder(orderId) {
  const startedAt = Date.now();

  const check = async () => {
    if (Date.now() - startedAt > MAX_WAIT_MS) {
      showState('stateTimeout');
      return;
    }

    try {
      const { order } = await api.get(`/orders/${orderId}`);

      if (order.status === 'confirmed') {
        showState('stateSuccess');
        return;
      }

      if (order.status === 'cancelled') {
        // Payment failed/expired — send them back to try again rather than
        // showing a generic failure with no next step.
        window.location.href = `profile.html`;
        return;
      }

      // Still pending — keep polling.
      setTimeout(check, POLL_INTERVAL_MS);
    } catch (err) {
      // 404 (bad id) or 401 (not logged in / session issue) — can't recover by polling.
      showState('stateFailed');
    }
  };

  check();
}

document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const orderId = params.get('orderId');

  if (!orderId) {
    showState('stateFailed');
    return;
  }

  pollOrder(orderId);
});
