const nodemailer = require('nodemailer');

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const getMailTransporter = () => {
  const host = process.env.SMTP_HOST || process.env.SMTP_SERVER_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT || process.env.SMTP_SERVER_PORT || 587);
  const user = process.env.SMTP_USER || process.env.SMTP_ACCOUNT_USERNAME;
  const pass = process.env.SMTP_PASS || process.env.SMTP_ACCOUNT_PASSWORD;
  const securityMode = (process.env.SMTP_SECURE || process.env.SMTP_SECURITY_MODE || '').toLowerCase();

  if (!user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465 || securityMode === 'ssl',
    auth: { user, pass },
  });
};

const buildNotificationEmail = ({ title, message }) => {
  const safeTitle = escapeHtml(title || 'Notifikasi SKBDN');
  const safeMessage = escapeHtml(message || 'Ada pembaruan dokumen SKBDN.');
  return `<!doctype html><html><body style="margin:0;padding:30px;background:#f3f6fb;font-family:Arial,Helvetica,sans-serif;color:#202124;"><div style="max-width:620px;margin:auto;background:white;border:1px solid #dce3ee;border-radius:16px;overflow:hidden;"><div style="height:5px;background:#1a73e8;"></div><div style="padding:30px;"><div style="font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#6b778c;">SKBDN</div><h1 style="margin:10px 0 16px;font-size:26px;">${safeTitle}</h1><p style="font-size:15px;line-height:1.75;color:#344054;">${safeMessage}</p><a href="https://skbdn.vercel.app/" target="_blank" style="display:inline-block;margin-top:18px;padding:13px 18px;background:#1a73e8;color:#fff;text-decoration:none;border-radius:10px;font-weight:800;">Buka Dashboard SKBDN</a></div></div></body></html>`;
};

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const { to, subject, message, title } = req.body || {};
  const recipients = Array.isArray(to) ? to : [to].filter(Boolean);
  const validRecipients = recipients.filter((email) => typeof email === 'string' && email.includes('@'));

  if (validRecipients.length === 0) {
    return res.status(400).json({ error: 'Recipient email is required.' });
  }

  const transporter = getMailTransporter();
  if (!transporter) {
    return res.status(503).json({
      error: 'SMTP is not configured.',
      message: 'Set SMTP_USER and SMTP_PASS in Vercel Environment Variables, then redeploy.'
    });
  }

  const from = process.env.SMTP_FROM || process.env.SENDER_ADDRESS || `SKBDN NOTIFIKASI <${process.env.SMTP_USER || process.env.SMTP_ACCOUNT_USERNAME}>`;
  const safeTitle = title || subject || 'Notifikasi SKBDN';
  const safeMessage = message || 'Ada pembaruan dokumen SKBDN.';

  try {
    await transporter.sendMail({
      from,
      to: validRecipients.join(','),
      subject: subject || safeTitle,
      text: `${safeTitle}\n\n${safeMessage}\n\nBuka Dashboard SKBDN:\nhttps://skbdn.vercel.app/`,
      html: buildNotificationEmail({ title: safeTitle, message: safeMessage }),
    });
    return res.status(200).json({ ok: true });
  } catch (error) {
    const isBadGmailCredential = error?.code === 'EAUTH' || error?.responseCode === 535;
    return res.status(500).json({
      error: 'Failed to send email notification.',
      message: isBadGmailCredential
        ? 'Login SMTP Gmail ditolak. Gunakan Gmail App Password 16 digit, bukan password login Gmail biasa.'
        : error?.message || 'SMTP server rejected the email request.',
      code: error?.code,
      command: error?.command,
      responseCode: error?.responseCode
    });
  }
};
