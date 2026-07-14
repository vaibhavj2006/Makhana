// Sends transactional emails via Resend (https://resend.com).
// Uses native fetch (Node 18+) so no extra dependency is needed.
// If RESEND_API_KEY isn't set, emails are skipped (logged) instead of breaking the app —
// this keeps signup/checkout working even before you've set up email.

async function sendEmail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || 'Pond & Puff <onboarding@resend.dev>';

  if (!apiKey) {
    console.log(`[email skipped — no RESEND_API_KEY set] Would have sent "${subject}" to ${to}`);
    return { skipped: true };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ from, to, subject, html })
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`Email failed to send (${res.status}): ${errText}`);
      return { success: false };
    }
    return { success: true };
  } catch (err) {
    // Never let an email failure break the actual request (signup/checkout should still work)
    console.error('Email sending error:', err.message);
    return { success: false };
  }
}

module.exports = { sendEmail };
