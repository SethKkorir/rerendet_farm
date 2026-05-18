// utils/realSendEmail.js
import nodemailer from 'nodemailer';
import Settings from '../models/Settings.js';

const realSendEmail = async (options) => {
  try {
    console.log('[Direct SMTP] Attempting to send email to:', options.email || options.to);

    // Fetch dynamic settings from DB
    const settings = await Settings.getSettings();
    const emailConfig = settings.email;
    const isMock = options.mock || false;

    // Determine config source: DB or ENV
    let transporterConfig = null;
    let fromEmail = process.env.EMAIL_FROM || '"Rerendet Coffee" <noreply@rerendetcoffee.com>';

    if (emailConfig && emailConfig.enabled && emailConfig.host) {
      console.log('🔧 Using DB SMTP Configuration:', emailConfig.host);
      transporterConfig = {
        host: emailConfig.host,
        port: emailConfig.port,
        secure: emailConfig.secure,
        auth: {
          user: emailConfig.auth.user,
          pass: emailConfig.auth.pass,
        },
      };
      if (emailConfig.from) {
        fromEmail = emailConfig.from;
      }
    } else if (process.env.EMAIL_USER && (process.env.EMAIL_PASS || process.env.EMAIL_PASSWORD)) {
      console.log('🔧 Using ENV SMTP Configuration (Gmail Fallback)');
      transporterConfig = {
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS || process.env.EMAIL_PASSWORD,
        },
      };
    } else {
      console.warn('⚠️ No email credentials found (DB or ENV).');
      transporterConfig = null;
    }

    if (!transporterConfig || isMock) {
      console.log('📝 [MOCK EMAIL]');
      console.log('   From:', fromEmail);
      console.log('   To:', options.to || options.email);
      console.log('   Subject:', options.subject);

      const codeMatch = options.html ? options.html.match(/>(\d{6})</) : null;
      if (codeMatch) {
        console.log('   🔑 Verification Code:', codeMatch[1]);
      }

      console.log('✅ Mock email "sent" successfully.');
      return { messageId: 'mock-email-id-123' };
    }

    const transporter = nodemailer.createTransport(transporterConfig);

    const mailOptions = {
      from: fromEmail,
      to: options.to || options.email,
      subject: options.subject,
      text: options.text,
      html: options.html,
      attachments: options.attachments,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ REAL EMAIL SENT SUCCESSFULLY via SMTP!');
    console.log('📧 Message ID:', info.messageId);

    return info;

  } catch (error) {
    console.error('❌ Direct SMTP FAILED:', error.message);

    if (options.html && process.env.NODE_ENV === 'development') {
      const codeMatch = options.html.match(/>(\d{6})</);
      if (codeMatch) {
        console.log('\n----------------------------------------');
        console.log('🔢 FALLBACK 2FA CODE (Terminal Only):', codeMatch[1]);
        console.log('----------------------------------------\n');
      }
    }

    throw new Error(process.env.NODE_ENV === 'production' ? 'Email service currently unavailable' : error.message);
  }
};

export default realSendEmail;
