const nodemailer = require('nodemailer');
const config = require('../config/env');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initTransporter();
  }

  initTransporter() {
    if (config.email.host && config.email.user) {
      const isGmail = config.email.host.includes('gmail.com');
      this.transporter = nodemailer.createTransport({
        ...(isGmail ? { service: 'gmail' } : {
          host: config.email.host,
          port: config.email.port,
          secure: config.email.secure,
        }),
        auth: {
          user: config.email.user,
          pass: config.email.pass
        },
        tls: {
          rejectUnauthorized: false
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000
      });
      console.log(`[EMAIL] Initialized configured SMTP transport for host ${config.email.host}`);
    } else if (process.env.NODE_ENV === 'test' || !config.email.host) {
      // Local dev / test environment json stream transport
      this.transporter = nodemailer.createTransport({
        jsonTransport: true
      });
      console.log('[EMAIL] Initialized dynamic local transport (ready for SMTP credentials in .env)');
    } else {
      // Standard dynamic transport
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        connectionTimeout: 3000,
        greetingTimeout: 3000,
        socketTimeout: 4000,
        auth: {
          user: process.env.ETHEREAL_USER || 'ethereal.user@ethereal.email',
          pass: process.env.ETHEREAL_PASS || 'ethereal_pass'
        },
        tls: {
          rejectUnauthorized: false
        }
      });
      console.log('[EMAIL] Configured standard dynamic mailer transport.');
    }
  }

  /**
   * Send email with error handling and fallback
   */
  async sendMail({ to, subject, html, text, eventType = 'SYSTEM_EMAIL' }) {
    if (!to) {
      throw new Error('Recipient email address (to) is required');
    }

    const cleanTo = to.trim().toLowerCase();
    const mailOptions = {
      from: config.email.from || '"Swasthya Health" <' + (config.email.user || 'no-reply@swasthya.org') + '>',
      to: cleanTo,
      subject,
      html,
      text: text || html.replace(/<[^>]*>?/gm, '')
    };

    // Optional asynchronous background webhook notification (non-blocking)
    if (config.n8nWebhookUrl) {
      try {
        const axios = require('axios');
        axios.post(config.n8nWebhookUrl, {
          event: eventType,
          to: cleanTo,
          subject: mailOptions.subject,
          html: mailOptions.html,
          text: mailOptions.text,
          timestamp: new Date().toISOString()
        }, { timeout: 3000 }).catch(whErr => {
          // Log softly without blocking
        });
      } catch (e) {}
    }

    try {
      if (!this.transporter) {
        this.initTransporter();
      }

      const info = await this.transporter.sendMail(mailOptions);
      const previewUrl = nodemailer.getTestMessageUrl(info);

      console.log(`📧 [EMAIL SENT SUCCESS] Direct email delivered to ${cleanTo}. MessageId: ${info?.messageId || 'local'}`);
      if (previewUrl) {
        console.log(`[EMAIL] Preview URL (Ethereal): ${previewUrl}`);
      }

      return {
        success: true,
        messageId: info?.messageId || 'local',
        recipient: cleanTo,
        previewUrl: previewUrl || null
      };
    } catch (err) {
      console.error(`❌ [EMAIL SMTP ERROR] Failed to send email to ${cleanTo}:`, err.message);

      return {
        success: false,
        error: err.message,
        recipient: cleanTo
      };
    }
  }


  /**
   * Send Family Connection Invitation Email
   */
  async sendFamilyInvitationEmail({
    to,
    requesterName,
    requesterEmail,
    relationshipType = 'Family Member',
    permissionScope = 'REFERRAL_STATUS',
    token,
    verificationCode,
    expiresAt
  }) {
    const appUrl = config.email.appUrl.replace(/\/$/, '');
    const acceptUrl = `${appUrl}/family/accept?token=${encodeURIComponent(token)}`;
    const formattedExpiry = new Date(expiresAt).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });

    const subject = `Swasthya: ${requesterName} wants to connect with you as a Family Member`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Swasthya Family Connection Request</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F2F2F7; margin: 0; padding: 20px; color: #1C1C1E; }
    .container { max-width: 560px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
    .header { background: linear-gradient(135deg, #007AFF 0%, #0051A8 100%); padding: 32px 24px; text-align: center; color: #FFFFFF; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
    .header p { margin: 8px 0 0; opacity: 0.9; font-size: 14px; }
    .content { padding: 32px 24px; }
    .invitation-card { background: #F8F9FA; border: 1px solid #E5E5EA; border-radius: 12px; padding: 20px; margin: 20px 0; }
    .invitation-card p { margin: 6px 0; font-size: 14px; color: #3A3A3C; }
    .invitation-card strong { color: #1C1C1E; }
    .btn { display: inline-block; background-color: #007AFF; color: #FFFFFF !important; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 28px; border-radius: 10px; margin: 20px 0; text-align: center; }
    .code-box { background: #EBF3FF; border: 1px dashed #007AFF; border-radius: 8px; padding: 12px; text-align: center; margin: 16px 0; }
    .code-box .code { font-size: 24px; font-weight: 700; letter-spacing: 4px; color: #007AFF; }
    .footer { padding: 20px 24px; background: #F8F9FA; border-top: 1px solid #E5E5EA; font-size: 12px; color: #8E8E93; text-align: center; line-height: 1.5; }
    .badge { display: inline-block; background: #E5E5EA; color: #3A3A3C; font-size: 12px; font-weight: 600; padding: 2px 8px; border-radius: 6px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Swasthya Family Health</h1>
      <p>Consent-Based Family Caregiver Connection</p>
    </div>
    <div class="content">
      <p>Hello,</p>
      <p><strong>${requesterName}</strong> (${requesterEmail || 'Patient'}) has invited you to connect as their <strong>${relationshipType}</strong> on Swasthya.</p>
      
      <div class="invitation-card">
        <p><strong>Requester:</strong> ${requesterName}</p>
        <p><strong>Relationship:</strong> <span class="badge">${relationshipType}</span></p>
        <p><strong>Access Permission Scope:</strong> <span class="badge">${permissionScope}</span></p>
        <p><strong>Expires:</strong> ${formattedExpiry}</p>
      </div>

      <p style="font-size: 14px; color: #636366; line-height: 1.5;">
        Connecting allows you to coordinate care and view authorized health records according to Swasthya's privacy guidelines. No medical data is shared until you explicitly accept this connection.
      </p>

      <div style="text-align: center;">
        <a href="${acceptUrl}" class="btn">Accept Connection Request</a>
      </div>

      <div class="code-box">
        <div style="font-size: 12px; color: #007AFF; margin-bottom: 4px; font-weight: 600;">OR ENTER THIS 6-DIGIT CODE IN SWASTHYA APP:</div>
        <div class="code">${verificationCode}</div>
      </div>

      <p style="font-size: 13px; color: #8E8E93; text-align: center; margin-top: 24px;">
        If you did not expect this invitation or wish to decline, you can safely ignore this email or click Decline inside the app.
      </p>
    </div>
    <div class="footer">
      This is an automated verification email sent by SwasthyaSetu Healthcare Platform.<br>
      © ${new Date().getFullYear()} Swasthya. All rights reserved.
    </div>
  </div>
</body>
</html>
        `;

    const text = `
Swasthya Family Health Connection Request
==========================================
${requesterName} (${requesterEmail}) has invited you to connect as their ${relationshipType} on Swasthya.

Permission Scope: ${permissionScope}
Expires: ${formattedExpiry}

To accept the connection, open the following link:
${acceptUrl}

Or enter this 6-digit verification code in your Swasthya App under Family Health:
Verification Code: ${verificationCode}

If you do not recognize this request, you can safely ignore this message.
        `;

    return this.sendMail({ to, subject, html, text });
  }

  /**
   * Send Confirmation Email upon Successful Acceptance
   */
  async sendFamilyConnectedConfirmationEmail({ to, requesterName, memberName, relationshipType }) {
    const subject = `Swasthya: Family connection with ${requesterName} is now Active`;
    const html = `
<div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background: #FFF; border-radius: 12px; border: 1px solid #E5E5EA;">
  <h2 style="color: #34C759; margin-top: 0;">✓ Family Connection Active</h2>
  <p>Hello ${memberName || 'User'},</p>
  <p>Your family proxy relationship with <strong>${requesterName}</strong> as <strong>${relationshipType}</strong> has been successfully established and verified.</p>
  <hr style="border: none; border-top: 1px solid #E5E5EA; margin: 20px 0;">
  <p style="font-size: 12px; color: #8E8E93;">SwasthyaSetu Healthcare Platform</p>
</div>
        `;

    return this.sendMail({ to, subject, html });
  }

  /**
   * Send Direct Password Reset Verification Link Email
   */
  async sendPasswordResetEmail({ to, resetUrl, otp, userName = 'Swasthya User' }) {
    const subject = 'Swasthya: Reset Your Password / अपना पासवर्ड रीसेट करें';
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Swasthya Password Reset</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; margin: 0; padding: 20px; color: #0F172A; }
    .container { max-width: 540px; margin: 0 auto; background: #FFFFFF; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 24px rgba(15,23,42,0.08); border: 1px solid #E2E8F0; }
    .header { background: linear-gradient(135deg, #0D9488 0%, #0284C7 100%); padding: 32px 24px; text-align: center; color: #FFFFFF; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
    .header p { margin: 6px 0 0; opacity: 0.92; font-size: 13.5px; }
    .content { padding: 32px 24px; }
    .btn { display: block; background: linear-gradient(135deg, #0D9488 0%, #0284C7 100%); color: #FFFFFF !important; font-size: 16px; font-weight: 700; text-decoration: none; padding: 14px 28px; border-radius: 12px; margin: 24px 0; text-align: center; box-shadow: 0 4px 14px rgba(13,148,136,0.35); }
    .code-box { background: #F0FDF4; border: 1.5px dashed #16A34A; border-radius: 12px; padding: 16px; text-align: center; margin: 20px 0; }
    .code-box .label { font-size: 12px; font-weight: 700; color: #15803D; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
    .code-box .code { font-size: 28px; font-weight: 800; letter-spacing: 6px; color: #166534; font-family: monospace; }
    .link-box { background: #F1F5F9; border: 1px solid #CBD5E1; border-radius: 10px; padding: 12px; font-size: 11.5px; word-break: break-all; color: #475569; margin-top: 16px; }
    .footer { padding: 20px 24px; background: #F8FAFC; border-top: 1px solid #E2E8F0; font-size: 12px; color: #64748B; text-align: center; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Swasthya Health</h1>
      <p>Password Reset Verification / पासवर्ड रीसेट सत्यापन</p>
    </div>
    <div class="content">
      <p style="font-size: 15px; margin: 0 0 12px 0;">Hello <strong>${userName}</strong>,</p>
      <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 16px 0;">
        We received a request to reset the password for your Swasthya account (<strong style="color: #0F172A;">${to}</strong>). Click the button below to set your new password:
      </p>

      <div style="text-align: center;">
        <a href="${resetUrl}" class="btn">Reset My Password (पासवर्ड बदलें)</a>
      </div>

      ${otp ? `
      <div class="code-box">
        <div class="label">OR USE THIS 6-DIGIT VERIFICATION CODE / सत्यापन कोड:</div>
        <div class="code">${otp}</div>
      </div>
      ` : ''}

      <p style="font-size: 13px; color: #64748B; line-height: 1.5; margin: 16px 0 0 0;">
        This link and code are valid for <strong>30 minutes</strong>. If you did not request a password reset, please ignore this email.
      </p>

      <div class="link-box">
        <strong>Direct Reset Link:</strong><br>
        <a href="${resetUrl}" style="color: #0284C7;">${resetUrl}</a>
      </div>
    </div>
    <div class="footer">
      Swasthya Healthcare & EHR Platform<br>
      © ${new Date().getFullYear()} Swasthya. Secure & Confidential.
    </div>
  </div>
</body>
</html>
    `;

    const text = `
Swasthya Password Reset
=======================
Hello ${userName},

To reset your password for ${to}, please open the following link:
${resetUrl}

${otp ? `Your 6-digit verification code is: ${otp}\n` : ''}
This link is valid for 30 minutes.

If you did not request this, please ignore this email.
    `;

    return this.sendMail({ to, subject, html, text, eventType: 'PASSWORD_RESET_EMAIL' });
  }
}

module.exports = new EmailService();
