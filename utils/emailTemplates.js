let FRONTEND_URL = process.env.FRONTEND_URL;

// Force healing: If FRONTEND_URL is empty or points to localhost/127.0.0.1, prioritize the hosted Vercel address
if (!FRONTEND_URL || FRONTEND_URL.includes('localhost') || FRONTEND_URL.includes('127.0.0.1')) {
  FRONTEND_URL = 'https://rerendet-farm.vercel.app';
}

const ADMIN_PANEL_URL = FRONTEND_URL;
const DEFAULT_LOGO_URL = 'https://res.cloudinary.com/dln2pifwf/image/upload/v1779294419/rerendet-coffee/products/pb7indr2rhu7fnhh3jjh.png';
const INSTAGRAM_URL = 'https://www.instagram.com/rerendetcoffee';
const SUPPORT_PHONE = '+254 705 684 984';
const SUPPORT_EMAIL = 'hello@rerendetcoffee.com';
const STORE_LOCATION = 'Bomet, Kenya';

/**
 * Centered Official Brand Header Lockup
 */
const getBrandLockup = (logoUrl) => {
  const imgSource = logoUrl || `${FRONTEND_URL}/rerendet-logo.png` || DEFAULT_LOGO_URL;
  return `
    <table align="center" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto; text-align: center;">
      <tr>
        <td align="center" style="vertical-align: middle; text-align: center;">
          <img src="${imgSource}" alt="Rerendet Coffee" width="140" style="display: block; max-width: 145px; height: auto; margin: 0 auto; border: 0; outline: none; text-decoration: none;" />
        </td>
      </tr>
    </table>
  `;
};

/**
 * Base Email Template — Clean, Editorial & Minimal
 * Consistent header, green accent line, official logo, typography,
 * Instagram-only follow section, policy links, and Bomet, Kenya footer.
 */
const getBaseTemplate = (title, content, options = {}) => {
  const logoUrl = options.logoUrl || DEFAULT_LOGO_URL;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
        body, table, td, p, a, li, blockquote {
          -webkit-text-size-adjust: 100%;
          -ms-text-size-adjust: 100%;
        }
        body { 
          margin: 0; 
          padding: 0; 
          background-color: #F8F9FA; 
          font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; 
          -webkit-font-smoothing: antialiased; 
          color: #374151;
        }
        .outer-wrapper {
          width: 100%;
          background-color: #F8F9FA;
          padding: 40px 16px;
          box-sizing: border-box;
        }
        .card-container { 
          max-width: 580px; 
          margin: 0 auto; 
          background-color: #FFFFFF; 
          border-top: 4px solid #1E3D2F;
          border-radius: 4px; 
          overflow: hidden; 
          border-left: 1px solid #E5E7EB;
          border-right: 1px solid #E5E7EB;
          border-bottom: 1px solid #E5E7EB;
        }
        .brand-header { 
          padding: 36px 32px 20px; 
          text-align: center; 
        }
        .card-body { 
          padding: 8px 36px 32px; 
          color: #374151; 
          line-height: 1.65; 
          font-size: 14.5px; 
          background-color: #FFFFFF; 
        }
        .hero-title { 
          font-family: 'Playfair Display', Georgia, 'Times New Roman', serif;
          font-size: 32px; 
          font-weight: 400; 
          color: #1F2937; 
          text-align: center; 
          margin: 0 0 12px 0; 
          line-height: 1.25; 
          letter-spacing: -0.2px;
        }
        .hero-subtitle { 
          font-size: 14.5px; 
          color: #6B7280; 
          text-align: center; 
          margin: 0 auto 24px auto; 
          line-height: 1.6; 
          max-width: 480px;
        }
        .pill-btn { 
          display: inline-block; 
          background-color: #1E3D2F; 
          color: #FFFFFF !important; 
          padding: 12px 34px; 
          border-radius: 9999px; 
          text-decoration: none; 
          font-weight: 600; 
          text-align: center; 
          font-size: 14px; 
          letter-spacing: 0.2px; 
        }
        .code-pill-card { 
          background-color: #F9FAFB; 
          border: 1px solid #E5E7EB; 
          border-radius: 8px; 
          padding: 22px 20px; 
          text-align: center; 
          margin: 20px auto; 
          max-width: 360px;
        }
        .code-digits { 
          font-family: 'JetBrains Mono', 'SF Mono', Consolas, monospace; 
          font-size: 36px; 
          font-weight: 700; 
          letter-spacing: 10px; 
          color: #111827; 
          display: block; 
          padding-left: 10px; 
        }
        .code-caption-pill { 
          display: inline-block; 
          color: #6B7280; 
          font-size: 11.5px; 
          font-weight: 600; 
          text-transform: uppercase; 
          letter-spacing: 0.8px; 
          margin-top: 8px; 
        }
        .feature-card { 
          background-color: #FFFFFF; 
          border-radius: 8px; 
          padding: 18px 20px; 
          margin: 20px 0; 
          border: 1px solid #E5E7EB; 
        }
        .social-pill {
          display: inline-block;
          border: 1px solid #D1D5DB;
          border-radius: 9999px;
          padding: 7px 22px;
          color: #374151 !important;
          font-size: 13.5px;
          text-decoration: none;
          font-weight: 600;
        }
        @media only screen and (max-width: 600px) {
          .outer-wrapper { padding: 12px 6px !important; }
          .card-container { width: 100% !important; }
          .brand-header { padding: 24px 18px 14px !important; }
          .card-body { padding: 6px 18px 24px !important; }
          .hero-title { font-size: 26px !important; }
          .hero-subtitle { font-size: 13.5px !important; }
          .code-digits { font-size: 28px !important; letter-spacing: 6px !important; }
          .pill-btn { width: 100% !important; box-sizing: border-box !important; }
        }
      </style>
    </head>
    <body>
      <div class="outer-wrapper">
        <div class="card-container">
          
          <!-- Top Forest Green Line & Centered Logo -->
          <div class="brand-header">
            <a href="${FRONTEND_URL}" target="_blank" style="text-decoration: none;">
              ${getBrandLockup(logoUrl)}
            </a>
          </div>

          <!-- Main Email Body -->
          <div class="card-body">
            ${content}

            <!-- Divider -->
            <div style="border-top: 1px solid #E5E7EB; margin: 34px 0 24px;"></div>

            <!-- Questions Note -->
            <p style="text-align: center; color: #6B7280; font-size: 13.5px; margin: 0 0 32px;">
              Questions? Reply to this email and we will help.
            </p>

            <!-- Follow Rerendet Coffee Section (Instagram Only) -->
            <div style="text-align: center; margin: 0 0 32px;">
              <h3 style="font-family: 'Playfair Display', Georgia, 'Times New Roman', serif; font-size: 21px; font-weight: 500; color: #111827; margin: 0 0 6px;">
                Follow Rerendet Coffee
              </h3>
              <p style="color: #6B7280; font-size: 13.5px; margin: 0 0 16px;">
                New roasts, brewing tips and offers.
              </p>
              <div style="text-align: center;">
                <a href="${INSTAGRAM_URL}" target="_blank" class="social-pill">
                  Instagram
                </a>
              </div>
            </div>

            <!-- Policy Links Section -->
            <div style="border-top: 1px solid #E5E7EB; padding-top: 20px; text-align: center; margin: 0 0 24px;">
              <div style="font-size: 12.5px; color: #6B7280; line-height: 2;">
                <a href="${FRONTEND_URL}/shipping-policy" target="_blank" style="color: #1E3D2F; text-decoration: underline; font-weight: 600; margin: 0 8px;">Shipping &amp; Delivery</a> &bull;
                <a href="${FRONTEND_URL}/refund-policy" target="_blank" style="color: #1E3D2F; text-decoration: underline; font-weight: 600; margin: 0 8px;">Refund Policy</a> &bull;
                <a href="${FRONTEND_URL}/terms-conditions" target="_blank" style="color: #1E3D2F; text-decoration: underline; font-weight: 600; margin: 0 8px;">Terms of Service</a> &bull;
                <a href="${FRONTEND_URL}/privacy-policy" target="_blank" style="color: #1E3D2F; text-decoration: underline; font-weight: 600; margin: 0 8px;">Privacy Policy</a>
              </div>
            </div>

            <!-- Brand Footer (Bomet, Kenya & Phone & Unsubscribe) -->
            <div style="border-top: 1px solid #E5E7EB; padding-top: 22px; text-align: center; font-size: 12.5px; color: #9CA3AF; line-height: 1.8;">
              <p style="margin: 0 0 4px; color: #6B7280;">
                Rerendet Coffee &middot; ${STORE_LOCATION}
              </p>
              <p style="margin: 0 0 8px; color: #6B7280;">
                ${SUPPORT_PHONE} &middot; <a href="mailto:${SUPPORT_EMAIL}" style="color: #6B7280; text-decoration: none;">${SUPPORT_EMAIL}</a>
              </p>
              <p style="margin: 0;">
                <a href="${FRONTEND_URL}/account" style="color: #9CA3AF; text-decoration: underline;">Unsubscribe</a>
              </p>
            </div>

          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

// ── 1. VERIFICATION EMAIL ────────────────────────────────────────────────────
export const getVerificationEmail = (name, code, logoUrl) => {
  const content = `
    <h1 class="hero-title">Your verification code.</h1>
    <p class="hero-subtitle">
      Hi ${name || 'there'}, enter the 6-digit one-time code below to verify your email and secure your account.
    </p>

    <div class="code-pill-card">
      <span class="code-digits">${code}</span>
      <span class="code-caption-pill">Valid for 10 minutes</span>
    </div>

    <p style="text-align: center; font-size: 13px; color: #6B7280; margin-top: 18px; line-height: 1.6;">
      If you did not request this verification code, you can safely ignore this email. No action is required.
    </p>
  `;
  return getBaseTemplate('Verify Your Email - Rerendet Coffee', content, { logoUrl });
};

// ── 2. WELCOME EMAIL (MATCHES EXACT REFERENCE TEMPLATE) ─────────────────────
export const getWelcomeEmail = (name, loginUrl, logoUrl) => {
  const firstName = name || 'Friend';
  const content = `
    <h1 class="hero-title">Karibu, ${firstName}.</h1>
    <p class="hero-subtitle">
      Your Rerendet Coffee account is ready. Freshly roasted coffee, grown in Kenya and delivered to your door.
    </p>

    <div style="margin: 0 0 20px; font-size: 14.5px; color: #374151; line-height: 1.6;">
      <p style="margin: 0 0 8px;">Hi ${firstName},</p>
      <p style="margin: 0;">Thank you for joining us. Here is what you can do now that you are in:</p>
    </div>

    <!-- 3 Action Feature Cards in Row -->
    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin: 20px 0 28px;">
      <tr>
        <td width="31%" valign="top" style="border: 1px solid #E5E7EB; border-radius: 8px; padding: 16px 14px; background: #FFFFFF;">
          <div style="font-weight: 700; color: #111827; font-size: 13.5px; margin-bottom: 6px;">Order in minutes</div>
          <div style="color: #6B7280; font-size: 12.5px; line-height: 1.45;">Pay with M-Pesa at checkout.</div>
        </td>
        <td width="3.5%">&nbsp;</td>
        <td width="31%" valign="top" style="border: 1px solid #E5E7EB; border-radius: 8px; padding: 16px 14px; background: #FFFFFF;">
          <div style="font-weight: 700; color: #111827; font-size: 13.5px; margin-bottom: 6px;">Track delivery</div>
          <div style="color: #6B7280; font-size: 12.5px; line-height: 1.45;">See every order from roast to doorstep.</div>
        </td>
        <td width="3.5%">&nbsp;</td>
        <td width="31%" valign="top" style="border: 1px solid #E5E7EB; border-radius: 8px; padding: 16px 14px; background: #FFFFFF;">
          <div style="font-weight: 700; color: #111827; font-size: 13.5px; margin-bottom: 6px;">Reorder fast</div>
          <div style="color: #6B7280; font-size: 12.5px; line-height: 1.45;">Your past orders are saved.</div>
        </td>
      </tr>
    </table>

    <div style="text-align: center; margin: 28px 0 22px;">
      <a href="${loginUrl || `${FRONTEND_URL}/#coffee-shop`}" class="pill-btn">Shop our coffee</a>
    </div>
  `;
  return getBaseTemplate('Welcome to Rerendet Coffee', content, { logoUrl });
};

// ── 3. RESET PASSWORD EMAIL ──────────────────────────────────────────────────
export const getResetPasswordEmail = (name, code, logoUrl, resetUrl = '') => {
  const content = `
    <h1 class="hero-title">Reset your password.</h1>
    <p class="hero-subtitle">
      Hi ${name || 'there'}, we received a request to reset your password. You can reset it instantly using the link or code below:
    </p>

    ${resetUrl ? `
      <div style="text-align: center; margin: 24px 0 24px 0;">
        <a href="${resetUrl}" class="pill-btn">Reset My Password</a>
      </div>
    ` : ''}

    <div class="code-pill-card">
      <span class="code-digits">${code}</span>
      <span class="code-caption-pill">Or enter this 6-digit code manually</span>
    </div>

    <p style="text-align: center; font-size: 13px; color: #6B7280; margin-top: 18px; line-height: 1.6;">
      This security link and code expire in 15 minutes. If you did not request a password reset, you can safely ignore this message.
    </p>
  `;
  return getBaseTemplate('Reset Your Password - Rerendet Coffee', content, { logoUrl });
};

// ── 4. ORDER CONFIRMATION EMAIL ──────────────────────────────────────────────
export const getOrderConfirmationEmail = (name, orderNumber, items = [], total = 0, trackingNumber, logoUrl, orderId = null) => {
  const content = `
    <h1 class="hero-title">Order receipt #${orderNumber}.</h1>
    <p class="hero-subtitle">
      Thank you, ${name || 'Valued Customer'}! We have received your order. Our roastery in Bomet is preparing your fresh highland beans.
    </p>

    ${trackingNumber ? `
      <div style="background-color: #F0FDF4; border: 1.5px solid #BBF7D0; border-radius: 8px; padding: 14px 18px; text-align: center; margin-bottom: 22px;">
        <span style="font-size: 11px; font-weight: 700; color: #166534; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 4px;">Tracking Code</span>
        <span style="font-family: monospace; font-size: 26px; font-weight: 800; color: #111827; letter-spacing: 4px;">${trackingNumber}</span>
        <span style="font-size: 12px; color: #166534; display: block; margin-top: 4px;">Save this code or your Order Number #${orderNumber} to track live</span>
      </div>
    ` : ''}

    <!-- Order Items Card -->
    <div style="border: 1px solid #E5E7EB; border-radius: 8px; padding: 18px 20px; margin: 20px 0;">
      <span style="font-size: 11.5px; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: 0.8px; display: block; margin-bottom: 12px;">Order Summary</span>
      ${items.map(item => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #F3F4F6;">
          <div>
            <strong style="color: #111827; font-size: 13.5px;">${item.name}</strong>
            <span style="display: block; font-size: 12px; color: #6B7280;">${item.size || 'Standard'} &bull; Qty: ${item.quantity}</span>
          </div>
          <strong style="color: #111827; font-size: 13.5px;">KES ${(item.price * item.quantity).toLocaleString()}</strong>
        </div>
      `).join('')}
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 14px; padding-top: 8px;">
        <span style="font-size: 14.5px; font-weight: 700; color: #111827;">Total Amount</span>
        <span style="font-size: 18px; font-weight: 700; color: #1E3D2F;">KES ${Number(total).toLocaleString()}</span>
      </div>
    </div>

    <div style="text-align: center; margin: 28px 0 20px;">
      <a href="${FRONTEND_URL}/order-tracking/${orderId || orderNumber}" class="pill-btn">Track Order Live</a>
    </div>
  `;
  return getBaseTemplate(`Order Receipt #${orderNumber} - Rerendet Coffee`, content, { logoUrl });
};

// ── 5. ORDER STATUS UPDATE EMAIL ─────────────────────────────────────────────
export const getOrderStatusEmail = (name, orderNumber, status, trackingNumber, message, logoUrl, orderId = null) => {
  let statusTitle = "Order Update";
  if (status === 'shipped') statusTitle = "In Transit";
  else if (status === 'delivered') statusTitle = "Delivered";
  else if (status === 'cancelled') statusTitle = "Order Cancelled";

  const content = `
    <h1 class="hero-title">${statusTitle} &middot; #${orderNumber}</h1>
    <p class="hero-subtitle">
      Hi ${name || 'there'}, your coffee order <strong>#${orderNumber}</strong> has an update on its delivery journey.
    </p>

    <div style="border: 1px solid #E5E7EB; border-radius: 8px; padding: 18px 20px; text-align: center; margin: 20px 0;">
      <span style="font-size: 11px; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 6px;">Current Status</span>
      <span style="font-size: 20px; font-weight: 700; color: #111827; text-transform: uppercase; letter-spacing: 1px;">${status}</span>
      ${message ? `
        <p style="margin: 14px 0 0 0; font-size: 13.5px; color: #4B5563; background: #F9FAFB; padding: 12px; border-radius: 6px; border: 1px solid #E5E7EB;">
          "${message}"
        </p>
      ` : ''}
    </div>

    ${trackingNumber ? `
      <div style="background-color: #F0FDF4; border: 1.5px solid #BBF7D0; border-radius: 8px; padding: 14px 18px; text-align: center; margin: 20px 0;">
        <span style="font-size: 11px; font-weight: 700; color: #166534; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 4px;">Tracking Code</span>
        <span style="font-family: monospace; font-size: 24px; font-weight: 800; color: #111827; letter-spacing: 4px;">${trackingNumber}</span>
      </div>
    ` : ''}

    <div style="text-align: center; margin-top: 26px;">
      <a href="${FRONTEND_URL}/order-tracking/${orderId || orderNumber}" class="pill-btn">Track Live Status</a>
    </div>
  `;
  return getBaseTemplate(`Order ${statusTitle} - #${orderNumber}`, content, { logoUrl });
};

// ── 6. NEWSLETTER WELCOME EMAIL ──────────────────────────────────────────────
export const getNewsletterWelcomeEmail = (logoUrl) => {
  const content = `
    <h1 class="hero-title">Karibu to Rerendet roasts.</h1>
    <p class="hero-subtitle">
      Thanks for subscribing! You will be the first to know about new micro-lot roasts, brewing tips, and seasonal offers.
    </p>

    <div style="text-align: center; margin: 26px 0;">
      <a href="${FRONTEND_URL}/#coffee-shop" class="pill-btn">Discover Our Coffee</a>
    </div>
  `;
  return getBaseTemplate('Welcome to Rerendet Coffee Updates', content, { logoUrl });
};

// ── 7. NEWSLETTER BROADCAST EMAIL ────────────────────────────────────────────
export const getNewsletterEmail = (title, bodyContent, logoUrl) => {
  const content = `
    <h1 class="hero-title">${title}</h1>

    <div style="margin: 22px 0; color: #374151; line-height: 1.8; font-size: 14.5px;">
      ${bodyContent}
    </div>

    <div style="text-align: center; margin-top: 28px;">
      <a href="${FRONTEND_URL}/#coffee-shop" class="pill-btn">Discover Rerendet</a>
    </div>
  `;
  return getBaseTemplate(title, content, { logoUrl });
};

// ── 8. SECURITY ALERT EMAIL ──────────────────────────────────────────────────
export const getSecurityAlertEmail = (name, action, logoUrl) => {
  const content = `
    <h1 class="hero-title" style="color: #991B1B;">Security Notice</h1>
    <p class="hero-subtitle">
      Hi ${name || 'there'}, this is an automated confirmation of a security event regarding your account:
    </p>

    <div style="border: 1px solid #FCA5A5; border-left: 4px solid #DC2626; border-radius: 6px; padding: 16px 18px; margin: 20px 0; background: #FEF2F2;">
      <span style="font-size: 11px; font-weight: 700; color: #DC2626; text-transform: uppercase; letter-spacing: 0.8px; display: block; margin-bottom: 4px;">Event Details</span>
      <strong style="font-size: 15px; color: #111827; display: block; margin-bottom: 4px;">${action}</strong>
      <span style="font-size: 12px; color: #6B7280;">Timestamp: ${new Date().toLocaleString()}</span>
    </div>

    <div style="background-color: #FFFBEB; border: 1px solid #FDE68A; padding: 14px 18px; border-radius: 6px; margin: 20px 0;">
      <strong style="color: #92400E; font-size: 13px; display: block; margin-bottom: 4px;">Did not make this change?</strong>
      <span style="font-size: 12.5px; color: #78350F; line-height: 1.5;">
        If you did not initiate this action, please reset your password immediately or contact our support team at ${SUPPORT_EMAIL}.
      </span>
    </div>

    <div style="text-align: center; margin-top: 24px;">
      <a href="${FRONTEND_URL}/account" class="pill-btn">Review Account Security</a>
    </div>
  `;
  return getBaseTemplate('Security Notification - Rerendet Coffee', content, { logoUrl });
};

// ── 9. STORE MAINTENANCE & RESOLVED EMAILS ────────────────────────────────────
export const getMaintenanceEmail = (message, logoUrl) => {
  const content = `
    <h1 class="hero-title">Store Maintenance</h1>
    <p class="hero-subtitle">
      Dear Valued Customer, our store is currently undergoing a brief tune-up to improve your coffee experience.
    </p>

    <div style="border: 1px solid #E5E7EB; border-radius: 8px; padding: 18px 20px; text-align: center; margin: 20px 0;">
      <span style="font-size: 11px; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 6px;">A Note from Our Team</span>
      <p style="margin: 0; font-size: 14.5px; color: #111827; font-style: italic;">
        "${message || 'We are updating our storefront. We will be back online shortly.'}"
      </p>
    </div>

    <p style="text-align: center; font-size: 13px; color: #6B7280; margin-top: 20px;">
      Thank you for your patience while we brew something better.
    </p>
  `;
  return getBaseTemplate('Maintenance Update - Rerendet Coffee', content, { logoUrl });
};

export const getMaintenanceResolvedEmail = (logoUrl) => {
  const content = `
    <h1 class="hero-title">We're back online!</h1>
    <p class="hero-subtitle">
      Our storefront updates are complete. All fresh coffees and ordering features are fully available.
    </p>

    <div style="text-align: center; margin-top: 28px;">
      <a href="${FRONTEND_URL}" class="pill-btn">Return to Shop</a>
    </div>
  `;
  return getBaseTemplate('We are Back Online - Rerendet Coffee', content, { logoUrl });
};

// ── 10. ACCOUNT DELETION REGRET EMAIL ─────────────────────────────────────────
export const getRegretEmail = (name, logoUrl) => {
  const content = `
    <h1 class="hero-title">Account Deleted</h1>
    <p class="hero-subtitle">
      Hi ${name || 'there'}, your account and personal history have been permanently deleted as requested. We're sorry to see you go.
    </p>

    <div style="border: 1px solid #E5E7EB; border-radius: 8px; padding: 18px 20px; text-align: center; margin: 20px 0;">
      <p style="margin: 0; font-style: italic; color: #4B5563; font-size: 14px;">
        "Whenever you crave fresh highland coffee from Bomet, Kenya, our doors are always open for your return."
      </p>
    </div>
  `;
  return getBaseTemplate('Account Deleted - Rerendet Coffee', content, { logoUrl });
};

// ── 11. ADMIN MISUSE ALERT (SUPER-ADMIN) ─────────────────────────────────────
export const getAdminMisuseAlert = ({ adminName, adminEmail, action, entityName, ipAddress, timestamp, details, logoUrl }) => {
  const content = `
    <h1 class="hero-title" style="color: #991B1B;">Admin Security Alert</h1>
    <p class="hero-subtitle">
      An administrative action flagged as high-risk was performed and requires your attention.
    </p>

    <div style="border: 1px solid #FCA5A5; border-left: 4px solid #DC2626; border-radius: 6px; padding: 16px; margin: 20px 0; background-color: #FEF2F2;">
      <strong style="color: #DC2626; font-size: 12.5px; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 10px;">High-Risk Activity Detected</strong>
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <tr><td style="padding: 5px 0; color: #6B7280; width: 35%;">Admin User</td><td style="font-weight: 700; color: #111827;">${adminName} (${adminEmail})</td></tr>
        <tr><td style="padding: 5px 0; color: #6B7280;">Action</td><td style="font-weight: 700; color: #DC2626;">${action}</td></tr>
        <tr><td style="padding: 5px 0; color: #6B7280;">Target Entity</td><td style="font-weight: 700; color: #111827;">${entityName || '—'}</td></tr>
        <tr><td style="padding: 5px 0; color: #6B7280;">IP Address</td><td style="font-family: monospace;">${ipAddress || 'Unknown'}</td></tr>
        <tr><td style="padding: 5px 0; color: #6B7280;">Timestamp</td><td>${timestamp}</td></tr>
        ${details ? `<tr><td style="padding: 5px 0; color: #6B7280; vertical-align: top;">Details</td><td style="font-size: 12px; font-family: monospace;">${JSON.stringify(details, null, 2)}</td></tr>` : ''}
      </table>
    </div>

    <div style="text-align: center; margin-top: 24px;">
      <a href="${ADMIN_PANEL_URL}/admin" class="pill-btn" style="background: #DC2626;">Review Admin Logs</a>
    </div>
  `;
  return getBaseTemplate('Admin Security Alert - Rerendet', content, { logoUrl });
};

// ── 12. FRAUD RISK ALERT (SUPER-ADMIN) ───────────────────────────────────────
export const getFraudAlert = ({ userName, userEmail, userId, failureCount, totalAttempted, paymentMethods, timeWindow, logoUrl }) => {
  const content = `
    <h1 class="hero-title" style="color: #B45309;">Fraud Risk Detected</h1>
    <p class="hero-subtitle">
      Automated monitoring detected repeated payment failure anomalies for a customer account.
    </p>

    <div style="border: 1px solid #FCD34D; border-left: 4px solid #D97706; border-radius: 6px; padding: 16px; margin: 20px 0; background-color: #FFFBEB;">
      <strong style="color: #D97706; font-size: 12.5px; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 10px;">Payment Anomaly Signals</strong>
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <tr><td style="padding: 5px 0; color: #6B7280; width: 40%;">Customer</td><td style="font-weight: 700; color: #111827;">${userName}</td></tr>
        <tr><td style="padding: 5px 0; color: #6B7280;">Email</td><td>${userEmail}</td></tr>
        <tr><td style="padding: 5px 0; color: #6B7280;">User ID</td><td style="font-family: monospace; font-size: 12px;">${userId}</td></tr>
        <tr><td style="padding: 5px 0; color: #6B7280;">Failed Attempts</td><td style="font-weight: 700; color: #DC2626;">${failureCount} failures in ${timeWindow}</td></tr>
        <tr><td style="padding: 5px 0; color: #6B7280;">Attempted Total</td><td style="font-weight: 700;">KES ${(totalAttempted || 0).toLocaleString()}</td></tr>
        <tr><td style="padding: 5px 0; color: #6B7280;">Methods</td><td>${(paymentMethods || []).join(', ')}</td></tr>
      </table>
    </div>

    <div style="text-align: center; margin-top: 24px;">
      <a href="${ADMIN_PANEL_URL}/admin/users" class="pill-btn" style="background: #D97706;">Review Customer Account</a>
    </div>
  `;
  return getBaseTemplate('Fraud Risk Alert - Rerendet', content, { logoUrl });
};

// ── 16. ORDER AWAITING PAYMENT (MANUAL PAYBILL) ─────────────────────────────
export const getOrderAwaitingPaymentEmail = (name, orderNumber, items = [], total = 0, trackingNumber, logoUrl, orderId = null, paybillNumber = '516600', paybillAccount = '934558', whatsappNumber = '254705684984') => {
  const cleanPhone = String(whatsappNumber).replace(/\D/g, '');
  const encodedMsg = encodeURIComponent(`Hi Rerendet Coffee, I have placed order #${orderNumber} (KES ${Number(total).toLocaleString()}).`);
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMsg}`;

  const content = `
    <h1 class="hero-title">Order reserved #${orderNumber}.</h1>
    <p class="hero-subtitle">
      Thank you, ${name || 'Valued Customer'}! Your fresh beans are reserved for <strong>24 hours</strong>. Complete payment via M-Pesa Paybill below:
    </p>

    ${trackingNumber ? `
      <!-- Tracking Code Badge -->
      <div style="background-color: #FEF3C7; border: 1.5px solid #FCD34D; border-radius: 8px; padding: 14px 18px; text-align: center; margin: 18px 0 22px;">
        <span style="font-size: 11px; font-weight: 700; color: #92400E; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 4px;">Tracking Code</span>
        <span style="font-family: monospace; font-size: 26px; font-weight: 800; color: #78350F; letter-spacing: 4px;">${trackingNumber}</span>
        <span style="font-size: 12px; color: #92400E; display: block; margin-top: 4px;">Save this code or your Order Number #${orderNumber} to track live anytime.</span>
      </div>
    ` : ''}

    <!-- M-Pesa Instructions Card -->
    <div style="background-color: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 8px; padding: 18px 20px; margin: 20px 0; text-align: left;">
      <span style="font-size: 11px; font-weight: 700; color: #166534; text-transform: uppercase; letter-spacing: 0.8px; display: block; margin-bottom: 10px;">Lipa na M-Pesa Paybill Steps</span>
      <ol style="margin: 0; padding-left: 20px; color: #166534; font-size: 13.5px; line-height: 1.8;">
        <li>Go to <strong>M-Pesa</strong> &rarr; Select <strong>Lipa na M-Pesa</strong> &rarr; <strong>Paybill</strong></li>
        <li>Enter Business Number (Paybill): <strong style="font-family: monospace; font-size: 15px; color: #111827;">${paybillNumber}</strong> &nbsp;(Paybill Name: <strong>Rerendet Farm</strong>)</li>
        <li>Enter Account Number: <strong style="font-family: monospace; font-size: 15px; color: #111827;">${paybillAccount}</strong> <span style="font-size: 12px; color: #4B5563;">(Reference: <strong>${orderNumber}</strong>)</span></li>
        <li>Enter Amount: <strong style="font-size: 15px; color: #1E3D2F;">KES ${Number(total).toLocaleString()}</strong></li>
        <li>Enter your M-Pesa PIN and press Send</li>
      </ol>
    </div>

    <!-- WhatsApp Support / Guide Button -->
    <div style="text-align: center; margin: 22px 0;">
      <a href="${whatsappUrl}" target="_blank" style="display: inline-block; background-color: #25D366; color: #FFFFFF !important; padding: 12px 30px; border-radius: 9999px; text-decoration: none; font-weight: 600; font-size: 13.5px;">
        Chat on WhatsApp
      </a>
    </div>

    <!-- Order Items Card -->
    <div style="border: 1px solid #E5E7EB; border-radius: 8px; padding: 18px 20px; margin: 20px 0;">
      <span style="font-size: 11.5px; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: 0.8px; display: block; margin-bottom: 12px;">Order Summary</span>
      ${items.map(item => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #F3F4F6;">
          <div>
            <strong style="color: #111827; font-size: 13.5px;">${item.name}</strong>
            <span style="display: block; font-size: 12px; color: #6B7280;">${item.size || 'Standard'} &bull; Qty: ${item.quantity}</span>
          </div>
          <strong style="color: #111827; font-size: 13.5px;">KES ${(item.price * item.quantity).toLocaleString()}</strong>
        </div>
      `).join('')}
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 14px; padding-top: 8px;">
        <span style="font-size: 14.5px; font-weight: 700; color: #111827;">Total Due</span>
        <span style="font-size: 18px; font-weight: 700; color: #1E3D2F;">KES ${Number(total).toLocaleString()}</span>
      </div>
    </div>

    <div style="text-align: center; margin-top: 24px;">
      <a href="${FRONTEND_URL}/track-order/${orderId || orderNumber}" class="pill-btn">View Live Order Tracking</a>
    </div>
  `;
  return getBaseTemplate(`Order Reserved #${orderNumber} - Rerendet Coffee`, content, { logoUrl });
};

// ── 17. ORDER EXPIRED NOTIFICATION ──────────────────────────────────────────
export const getOrderExpiredEmail = (name, orderNumber, logoUrl) => {
  const content = `
    <h1 class="hero-title" style="color: #6B7280;">Order #${orderNumber} has expired.</h1>
    <p class="hero-subtitle">
      Hi ${name || 'Valued Customer'}, order <strong>#${orderNumber}</strong> was not paid within the 24-hour reservation window and has expired.
    </p>

    <div style="border: 1px solid #E5E7EB; border-radius: 8px; padding: 18px 20px; text-align: center; margin: 20px 0;">
      <p style="margin: 0; font-size: 14px; color: #4B5563; line-height: 1.6;">
        The reserved coffee items have been returned to our fresh roastery inventory in Bomet. You can place a fresh order anytime.
      </p>
    </div>

    <div style="text-align: center; margin-top: 24px;">
      <a href="${FRONTEND_URL}/#coffee-shop" class="pill-btn">Browse Coffee Shop</a>
    </div>
  `;
  return getBaseTemplate(`Order #${orderNumber} Has Expired - Rerendet Coffee`, content, { logoUrl });
};

// ── 18. CUSTOMER PAYMENT REPORT RECEIVED ────────────────────────────────────
export const getPaymentReportReceivedCustomerEmail = (name, orderNumber, mpesaCode, logoUrl, orderId = null, trackingNumber = null) => {
  const content = `
    <h1 class="hero-title">Payment reported &middot; #${orderNumber}</h1>
    <p class="hero-subtitle">
      Hi ${name || 'Valued Customer'}, we received your payment notification for Order <strong>#${orderNumber}</strong>.
    </p>

    ${trackingNumber ? `
      <div style="background-color: #F0FDF4; border: 1.5px solid #BBF7D0; border-radius: 8px; margin: 18px 0; padding: 14px 18px; text-align: center;">
        <span style="font-size: 11px; font-weight: 700; color: #166534; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 4px;">Tracking Code</span>
        <span style="font-family: monospace; font-size: 24px; font-weight: 800; color: #111827; letter-spacing: 4px;">${trackingNumber}</span>
      </div>
    ` : ''}

    <div style="border: 1px solid #E5E7EB; border-radius: 8px; margin: 20px 0; padding: 18px 20px; text-align: center;">
      <span style="font-size: 11.5px; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: 0.8px; display: block; margin-bottom: 6px;">Submitted M-Pesa Code</span>
      <span style="font-size: 18px; font-weight: 700; color: #111827; letter-spacing: 1.5px; font-family: monospace;">${mpesaCode || 'Code Pending Verification'}</span>
      <p style="font-size: 13.5px; color: #4B5563; margin: 12px 0 0; line-height: 1.5;">
        Our finance team is currently checking this transaction against our bank records. Once verified, we will email your official payment receipt and begin roasting and packing your coffee.
      </p>
    </div>

    <div style="text-align: center; margin-top: 24px;">
      <a href="${FRONTEND_URL}/track-order/${orderId || orderNumber}" class="pill-btn">Track Verification Status</a>
    </div>
  `;
  return getBaseTemplate(`Payment Reported for Order #${orderNumber} - Rerendet Coffee`, content, { logoUrl });
};

// ── 19. PAYMENT CONFIRMED WITH PDF RECEIPT ──────────────────────────────────
export const getPaymentConfirmedWithReceiptEmail = (name, orderNumber, receiptNumber, total, logoUrl, orderId = null, trackingNumber = null) => {
  const content = `
    <h1 class="hero-title">Payment confirmed &middot; #${orderNumber}</h1>
    <p class="hero-subtitle">
      Hi ${name || 'Valued Customer'}, your payment of <strong>KES ${Number(total).toLocaleString()}</strong> for Order <strong>#${orderNumber}</strong> has been confirmed.
    </p>

    ${trackingNumber ? `
      <div style="background-color: #F0FDF4; border: 1.5px solid #BBF7D0; border-radius: 8px; margin: 18px 0; padding: 14px 18px; text-align: center;">
        <span style="font-size: 11px; font-weight: 700; color: #166534; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 4px;">Tracking Code</span>
        <span style="font-family: monospace; font-size: 24px; font-weight: 800; color: #111827; letter-spacing: 4px;">${trackingNumber}</span>
      </div>
    ` : ''}

    <div style="background-color: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 8px; margin: 20px 0; padding: 18px 20px; text-align: center;">
      <span style="font-size: 11.5px; font-weight: 700; color: #166534; text-transform: uppercase; letter-spacing: 0.8px; display: block; margin-bottom: 4px;">Official Receipt Number</span>
      <span style="font-size: 17px; font-weight: 700; color: #111827; font-family: monospace;">${receiptNumber}</span>
      <p style="font-size: 13px; color: #166534; margin: 10px 0 0; line-height: 1.5;">
        Your official digital payment receipt is attached as a PDF to this email. You can also download it anytime from your customer account dashboard.
      </p>
    </div>

    <div style="text-align: center; margin-top: 24px;">
      <a href="${FRONTEND_URL}/track-order/${orderId || orderNumber}" class="pill-btn">View Live Roast &amp; Dispatch Tracking</a>
    </div>
  `;
  return getBaseTemplate(`Payment Confirmed - Order #${orderNumber} - Rerendet Coffee`, content, { logoUrl });
};

// ── 20. PARTIAL PAYMENT RECEIVED EMAIL ──────────────────────────────────────
export const getPartialPaymentReceivedCustomerEmail = (name, orderNumber, amountReceived, outstandingBalance, receiptNumber, logoUrl, orderId = null) => {
  const content = `
    <h1 class="hero-title">Partial payment received &middot; #${orderNumber}</h1>
    <p class="hero-subtitle">
      Hi ${name || 'Valued Customer'}, we have verified a payment of <strong>KES ${Number(amountReceived).toLocaleString()}</strong> for Order <strong>#${orderNumber}</strong>.
    </p>

    <div style="border: 1px solid #E5E7EB; border-radius: 8px; margin: 20px 0; padding: 18px 20px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        <span style="font-size: 13.5px; color: #4B5563;">Amount Received:</span>
        <strong style="color: #166534; font-size: 15px;">KES ${Number(amountReceived).toLocaleString()}</strong>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 10px; border-top: 1px dashed #E5E7EB;">
        <span style="font-size: 14px; font-weight: 700; color: #111827;">Remaining Balance:</span>
        <strong style="color: #DC2626; font-size: 16px;">KES ${Number(outstandingBalance).toLocaleString()}</strong>
      </div>
      <p style="font-size: 12.5px; color: #6B7280; margin: 12px 0 0; text-align: center;">
        Your order is currently reserved. Preparation and packaging will commence as soon as the remaining balance is completed.
      </p>
    </div>

    <div style="text-align: center; margin-top: 24px;">
      <a href="${FRONTEND_URL}/track-order/${orderId || orderNumber}" class="pill-btn">Complete Outstanding Payment</a>
    </div>
  `;
  return getBaseTemplate(`Partial Payment Received - Order #${orderNumber} - Rerendet Coffee`, content, { logoUrl });
};
