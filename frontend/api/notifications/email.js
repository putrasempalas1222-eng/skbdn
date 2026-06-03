import nodemailer from 'nodemailer';

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const getMailTransporter = () => {
  const host = process.env.SMTP_HOST || process.env.SMTP_SERVER_HOST;
  const port = Number(process.env.SMTP_PORT || process.env.SMTP_SERVER_PORT || 587);
  const user = process.env.SMTP_USER || process.env.SMTP_ACCOUNT_USERNAME;
  const pass = process.env.SMTP_PASS || process.env.SMTP_ACCOUNT_PASSWORD;
  const securityMode = (process.env.SMTP_SECURE || process.env.SMTP_SECURITY_MODE || '').toLowerCase();

  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465 || securityMode === 'ssl',
    auth: { user, pass },
  });
};

const getEmailAccent = (title = '') => {
  const normalizedTitle = title.toLowerCase();
  if (normalizedTitle.includes('tolak') || normalizedTitle.includes('gagal')) {
    return { color: '#ea4335', soft: '#fce8e6', label: 'Perlu Revisi' };
  }
  if (normalizedTitle.includes('setuju') || normalizedTitle.includes('verified') || normalizedTitle.includes('berhasil')) {
    return { color: '#34a853', soft: '#e6f4ea', label: 'Disetujui' };
  }
  if (normalizedTitle.includes('keuangan')) {
    return { color: '#fbbc04', soft: '#fef7e0', label: 'Menunggu Keuangan' };
  }
  return { color: '#1a73e8', soft: '#e8f0fe', label: 'Update SKBDN' };
};

const buildNotificationEmail = ({ title, message }) => {
  const safeTitle = escapeHtml(title || 'Notifikasi SKBDN');
  const safeMessage = escapeHtml(message || 'Ada pembaruan dokumen SKBDN.');
  const accent = getEmailAccent(title);
  const appUrl = 'https://skbdn.vercel.app/';

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${safeTitle}</title>
  </head>
  <body style="margin:0;padding:0;background:#f3f6fb;font-family:Arial,Helvetica,sans-serif;color:#202124;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f6fb;padding:34px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border:1px solid #dce3ee;border-radius:16px;overflow:hidden;box-shadow:0 18px 48px rgba(32,33,36,0.10);">
            <tr><td style="height:5px;background:${accent.color};font-size:0;line-height:0;">&nbsp;</td></tr>
            <tr>
              <td style="padding:30px 34px 24px;border-bottom:1px solid #edf1f7;">
                <div style="font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#6b778c;">SKBDN</div>
                <div style="margin-top:10px;font-size:26px;line-height:1.25;font-weight:800;color:#1f2937;">${safeTitle}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 34px 10px;">
                <div style="display:inline-block;padding:7px 12px;border-radius:999px;background:${accent.soft};color:${accent.color};font-size:12px;font-weight:800;">${accent.label}</div>
                <p style="margin:18px 0 0;font-size:15px;line-height:1.75;color:#344054;">${safeMessage}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 34px 30px;">
                <a href="${appUrl}" target="_blank" style="display:inline-block;padding:13px 18px;font-size:14px;font-weight:800;color:#ffffff;background:#1a73e8;text-decoration:none;border-radius:10px;">Buka Dashboard SKBDN</a>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 34px;background:#f8fafd;border-top:1px solid #edf1f7;">
                <div style="font-size:12px;line-height:1.6;color:#6b778c;">Email otomatis dari <strong style="color:#202124;">SKBDN Digital Approval Workspace</strong>.<br>Mohon tidak membalas email ini.</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
};

export default async function handler(req, res) {
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
      message: 'Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM in Vercel Environment Variables.'
    });
  }

  const from = process.env.SMTP_FROM || process.env.SENDER_ADDRESS || process.env.SMTP_USER || process.env.SMTP_ACCOUNT_USERNAME;
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
}
