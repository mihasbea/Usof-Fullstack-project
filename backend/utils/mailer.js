const nodemailer = require('nodemailer');

const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const MAILTRAP_USER = process.env.MAILTRAP_USER;
const MAILTRAP_PASS = process.env.MAILTRAP_PASS;
const SENDER = '"USOF Support" <noreply@usof.com>';
const BRAND_COLORS = {
    background: '#f3f0ed',
    navy: '#182a49',
    orange: '#ef7d2f',
    text: '#1a2c42',
    muted: '#66758b',
    border: '#e7e1dc',
};

function parsePort(value, fallback, name) {
    const port = value === undefined || value === '' ? fallback : Number(value);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error(`${name} must be a valid TCP port`);
    }
    return port;
}

const transporter = nodemailer.createTransport({
    host: process.env.MAILTRAP_HOST || 'sandbox.smtp.mailtrap.io',
    port: parsePort(process.env.MAILTRAP_PORT, 2525, 'MAILTRAP_PORT'),
    auth: {
        user: MAILTRAP_USER,
        pass: MAILTRAP_PASS,
    },
});

async function sendMail(message) {
    if (!MAILTRAP_USER || !MAILTRAP_PASS) {
        throw new Error('Email is not configured. Set MAILTRAP_USER and MAILTRAP_PASS in .env');
    }
    return transporter.sendMail({ ...message, from: SENDER });
}

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => {
        const entities = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
        };
        return entities[character];
    });
}

function renderEmail({ preheader, title, message, actionLabel, actionUrl, note }) {
    const safeUrl = escapeHtml(actionUrl);

    return `<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light">
    <style>@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');</style>
    <title>${escapeHtml(title)} | Usof</title>
</head>
<body style="margin:0;padding:0;background-color:${BRAND_COLORS.background};font-family:Outfit,'Segoe UI',Arial,sans-serif;color:${BRAND_COLORS.text};">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:${BRAND_COLORS.background};">
        <tr>
            <td align="center" style="padding:40px 16px;">
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background-color:#ffffff;border:1px solid ${BRAND_COLORS.border};border-radius:16px;overflow:hidden;">
                    <tr>
                        <td style="padding:24px 32px;background-color:${BRAND_COLORS.navy};">
                            <div style="font-family:Outfit,'Segoe UI',Arial,sans-serif;font-size:27px;font-weight:800;letter-spacing:-1.5px;line-height:1;color:#ffffff;">USOF<span style="padding-left:2px;color:${BRAND_COLORS.orange};font-size:39px;line-height:0.5;vertical-align:-4px;">;</span></div>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:36px 32px 24px;">
                            <h1 style="margin:0 0 16px;color:${BRAND_COLORS.navy};font-family:Outfit,'Segoe UI',Arial,sans-serif;font-size:25px;font-weight:700;line-height:1.25;">${escapeHtml(title)}</h1>
                            <p style="margin:0 0 26px;color:${BRAND_COLORS.text};font-family:Outfit,'Segoe UI',Arial,sans-serif;font-size:16px;line-height:1.65;">${escapeHtml(message)}</p>
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                <tr>
                                    <td align="center" style="border-radius:9px;background-color:${BRAND_COLORS.orange};">
                                        <a href="${safeUrl}" style="display:inline-block;padding:14px 24px;border:1px solid ${BRAND_COLORS.orange};border-radius:9px;color:#ffffff;font-family:Outfit,'Segoe UI',Arial,sans-serif;font-size:16px;font-weight:700;line-height:1;text-decoration:none;">${escapeHtml(actionLabel)}</a>
                                    </td>
                                </tr>
                            </table>
                            <p style="margin:24px 0 8px;color:${BRAND_COLORS.muted};font-family:Outfit,'Segoe UI',Arial,sans-serif;font-size:13px;line-height:1.6;">If the button does not work, copy and paste this link into your browser:</p>
                            <p style="margin:0;overflow-wrap:anywhere;font-family:Arial,sans-serif;font-size:13px;line-height:1.6;"><a href="${safeUrl}" style="color:${BRAND_COLORS.navy};">${safeUrl}</a></p>
                            <p style="margin:24px 0 0;padding:16px;border-radius:8px;background-color:${BRAND_COLORS.background};color:${BRAND_COLORS.muted};font-family:Outfit,'Segoe UI',Arial,sans-serif;font-size:13px;line-height:1.6;">${escapeHtml(note)}</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:20px 32px;border-top:1px solid ${BRAND_COLORS.border};">
                            <p style="margin:0;color:${BRAND_COLORS.muted};font-family:Outfit,'Segoe UI',Arial,sans-serif;font-size:12px;line-height:1.6;">USOF; &mdash; Share knowledge. Help each other grow.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
}

async function sendResetPasswordEmail(toEmail, rawToken) {
    const resetUrl = `${CLIENT_URL}/password-reset/${rawToken}`;

    await sendMail({
        to: toEmail,
        subject: 'Reset your Usof password',
        text: `You requested a password reset for your Usof account.\n\nSet a new password here: ${resetUrl}\n\nThis link is valid for 1 hour. If you did not request this, you can ignore this email.`,
        html: renderEmail({
            preheader: 'Choose a new password for your Usof account.',
            title: 'Reset your password',
            message:
                'We received a request to reset the password for your Usof account. Use the button below to choose a new password.',
            actionLabel: 'Choose a new password',
            actionUrl: resetUrl,
            note: 'This link is valid for 1 hour. If you did not request a password reset, you can safely ignore this email.',
        }),
    });
}

async function sendConfirmationEmail(toEmail, rawToken) {
    const confirmUrl = `${APP_URL}/api/auth/confirm-email/${rawToken}`;

    await sendMail({
        to: toEmail,
        subject: 'Confirm your Usof email address',
        text: `Welcome to Usof!\n\nConfirm your email address here: ${confirmUrl}\n\nIf you did not create a Usof account, you can ignore this email.`,
        html: renderEmail({
            preheader: 'Confirm your email address to finish creating your Usof account.',
            title: 'Welcome to Usof',
            message:
                'Thanks for joining the Usof community. Confirm your email address to finish creating your account.',
            actionLabel: 'Confirm email address',
            actionUrl: confirmUrl,
            note: 'If you did not create a Usof account, you can safely ignore this email.',
        }),
    });
}

module.exports = {
    sendResetPasswordEmail,
    sendConfirmationEmail,
};
