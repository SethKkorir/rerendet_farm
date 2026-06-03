// models/Settings.js - NEW FILE
import mongoose from 'mongoose';
import crypto from 'crypto';

const settingsSchema = new mongoose.Schema({
  // Store Information
  store: {
    name: { type: String, default: 'Rerendet Coffee' },
    email: { type: String, default: 'info@rerendetcoffee.com' },
    phone: { type: String, default: '+254700000000' },
    address: { type: String, default: 'Bomet, Kenya' },
    description: { type: String, default: 'Premium coffee blends roasted to perfection' },
    logo: { type: String, default: '' },
    favicon: { type: String, default: '' }
  },

  // About Us Page Content (Dynamic)
  about: {
    yearsInBusiness: { type: Number, default: 0 },
    organicPercentage: { type: Number, default: 0 },
    awardsWon: { type: Number, default: 0 },
    story: { type: String, default: 'Founded in the highlands of Kenya, Rerendet Farm has been cultivating exceptional coffee for generations. Our name comes from the local Kalenjin word for the evergreen tree that provides shade for our coffee plants.' },
    subStory: { type: String, default: 'At elevations of 1,800 meters above sea level, our beans develop slowly, allowing complex flavors to mature fully before harvest. Each batch is hand-picked, carefully processed, and roasted to perfection.' },
    imageUrl: { type: String, default: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&q=80&w=1000' },
    imageUrl2: { type: String, default: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&q=80&w=1000' }
  },

  // Business Hours
  businessHours: {
    monday: { open: String, close: String, closed: { type: Boolean, default: false } },
    tuesday: { open: String, close: String, closed: { type: Boolean, default: false } },
    wednesday: { open: String, close: String, closed: { type: Boolean, default: false } },
    thursday: { open: String, close: String, closed: { type: Boolean, default: false } },
    friday: { open: String, close: String, closed: { type: Boolean, default: false } },
    saturday: { open: String, close: String, closed: { type: Boolean, default: false } },
    sunday: { open: String, close: String, closed: { type: Boolean, default: true } }
  },

  // Payment Settings
  payment: {
    currency: { type: String, default: 'KES' },
    currencySymbol: { type: String, default: 'KSh' },
    taxRate: { type: Number, default: 0 }, // No VAT
    freeShippingThreshold: { type: Number, default: 5000 },
    shippingPrice: { type: Number, default: 500 },
    paymentMethods: {
      mpesa: { type: Boolean, default: true },
      card: { type: Boolean, default: true },
      cashOnDelivery: { type: Boolean, default: true }
    }
  },

  // Email Settings
  email: {
    enabled: { type: Boolean, default: true },
    host: { type: String, default: '' },
    port: { type: Number, default: 587 },
    secure: { type: Boolean, default: false },
    auth: {
      user: { type: String, default: '' },
      pass: { type: String, default: '' }
    },
    from: { type: String, default: 'Rerendet Coffee <noreply@rerendetcoffee.com>' },
    notifications: {
      newOrder: { type: Boolean, default: true },
      orderStatus: { type: Boolean, default: true },
      lowStock: { type: Boolean, default: true },
      newUser: { type: Boolean, default: true }
    }
  },

  // Security Settings
  security: {
    require2FA: { type: Boolean, default: false },
    sessionTimeout: { type: Number, default: 24 }, // hours
    maxLoginAttempts: { type: Number, default: 5 },
    passwordMinLength: { type: Number, default: 8 },
    passwordRequireSpecial: { type: Boolean, default: true }
  },

  // Notification Settings
  notifications: {
    admin: {
      newOrder: { type: Boolean, default: true },
      lowStock: { type: Boolean, default: true },
      newUser: { type: Boolean, default: true },
      contactForm: { type: Boolean, default: true }
    },
    customer: {
      orderConfirmation: { type: Boolean, default: true },
      orderStatus: { type: Boolean, default: true },
      shipping: { type: Boolean, default: true },
      promotions: { type: Boolean, default: true }
    }
  },

  // SEO Settings
  seo: {
    metaTitle: { type: String, default: 'Rerendet Coffee - Premium Coffee Blends' },
    metaDescription: { type: String, default: 'Discover our premium coffee blends roasted to perfection. Fresh beans delivered to your doorstep.' },
    keywords: { type: String, default: 'coffee, beans, brew, kenya, arabica' },
    googleAnalyticsId: { type: String, default: '' },
    googleTagManagerId: { type: String, default: '' },
    canonicalUrl: { type: String, default: '' },
    enableStructuredData: { type: Boolean, default: true },
    social: {
      facebook: { type: String, default: '' },
      instagram: { type: String, default: 'https://www.instagram.com/rerendetcoffee?igsh=amdyZDYzd2w1dndq' },
      twitter: { type: String, default: '' },
      whatsapp: { type: String, default: '' },
      tiktok: { type: String, default: '' },
      youtube: { type: String, default: '' }
    }
  },

  // Analytics / Tracking
  analytics: {
    ga4MeasurementId: { type: String, default: '' },
    fbPixelId: { type: String, default: '' },
    hotjarId: { type: String, default: '' },
    enableTracking: { type: Boolean, default: false }
  },

  // WhatsApp Support Widget
  whatsappSupport: {
    enabled: { type: Boolean, default: true },
    phoneNumber: { type: String, default: '' },
    message: { type: String, default: 'Hello! I have a question about Rerendet Coffee.' }
  },

  // Marketing / Newsletter Branding
  newsletter: {
    fromName: { type: String, default: 'Rerendet Coffee' },
    headerColor: { type: String, default: '#D4AF37' },
    footerText: { type: String, default: 'You are receiving this email because you subscribed to Rerendet Coffee.' },
    unsubscribeText: { type: String, default: 'Unsubscribe' }
  },

  // Policies
  policies: {
    privacyPolicy: { type: String, default: '' },
    termsConditions: { type: String, default: '' },
    refundPolicy: { type: String, default: '' },
    shippingPolicy: { type: String, default: '' }
  },
  cancellationFeeKES: { type: Number, default: 200 },
  documentations: [
    {
      name: { type: String },
      label: { type: String },
      content: { type: String }
    }
  ],

  // Features toggle
  features: {
    coffeeAcademy: { type: Boolean, default: true }
  },

  // County-level shipping prices
  countyShipping: [
    {
      county: { type: String, required: true },
      price: { type: Number, default: 500 }
    }
  ],

  // Maintenance Settings (Enterprise Super Gate)
  maintenance: {
    enabled: { type: Boolean, default: false },
    message: { type: String, default: 'We are currently performing maintenance. Please check back soon.' },
    magicLinkToken: { type: String, default: null },
    magicLinkRaw: { type: String, default: null },
    magicLinkExpires: { type: Date, default: null },
    lastToggledAt: { type: Date, default: Date.now },
    history: [
      {
        action: { type: String, enum: ['enabled', 'disabled'] },
        actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        actorName: { type: String, default: 'System' },
        ip: { type: String },
        source: { type: String, enum: ['dashboard', 'magic-link', 'cli'], default: 'dashboard' },
        timestamp: { type: Date, default: Date.now }
      }
    ]
  },
  
  // Custom delivery rates
  deliveryRates: [
    {
      region: { type: String, required: true },
      displayName: { type: String, required: true },
      feeKES: { type: Number, required: true },
      estimatedDays: { type: Number, required: true }
    }
  ]

}, {
  timestamps: true
});

// Create single document with default settings
settingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = new this();
    await settings.save();
  }

  // Self-heal: If store address is the old default 'Nairobi, Kenya', update it to 'Bomet, Kenya'
  if (settings.store && settings.store.address === 'Nairobi, Kenya') {
    settings.store.address = 'Bomet, Kenya';
    await settings.save();
  }

  // Seed default 47 counties if countyShipping is empty or missing
  const COUNTIES = [
    'Nairobi', 'Mombasa', 'Kwale', 'Kilifi', 'Tana River', 'Lamu', 'Taita Taveta', 
    'Garissa', 'Wajir', 'Mandera', 'Marsabit', 'Isiolo', 'Meru', 'Tharaka-Nithi', 
    'Embu', 'Kitui', 'Machakos', 'Makueni', 'Nyandarua', 'Nyeri', 'Kirinyaga', 
    'Mur\'ang\'a', 'Kiambu', 'Turkana', 'West Pokot', 'Samburu', 'Trans Nzoia', 
    'Uasin Gishu', 'Elgeyo Marakwet', 'Nandi', 'Baringo', 'Laikipia', 'Nakuru', 
    'Narok', 'Kajiado', 'Kericho', 'Bomet', 'Kakamega', 'Vihiga', 'Bungoma', 
    'Busia', 'Siaya', 'Kisumu', 'Homa Bay', 'Migori', 'Kisii', 'Nyamira'
  ];

  if (!settings.countyShipping || settings.countyShipping.length === 0) {
    settings.countyShipping = COUNTIES.map(c => ({ county: c, price: 500 }));
    await settings.save();
  }

  if (!settings.deliveryRates || settings.deliveryRates.length === 0) {
    settings.deliveryRates = [
      { region: 'Nairobi', displayName: 'Nairobi Same-Day', feeKES: 150, estimatedDays: 1 },
      { region: 'Kiambu', displayName: 'Kiambu Next-Day', feeKES: 200, estimatedDays: 1 },
      { region: 'Mombasa', displayName: 'Mombasa Courier', feeKES: 400, estimatedDays: 3 },
      { region: 'Kisumu', displayName: 'Kisumu Courier', feeKES: 400, estimatedDays: 3 },
      { region: 'Other', displayName: 'Other Regions Courier', feeKES: 500, estimatedDays: 5 }
    ];
    await settings.save();
  }

  // Pre-generate active magic link token if not present
  if (!settings.maintenance || !settings.maintenance.magicLinkToken || !settings.maintenance.magicLinkRaw) {
    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    settings.maintenance.magicLinkToken = hashedToken;
    settings.maintenance.magicLinkRaw = token;
    settings.maintenance.magicLinkExpires = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
    await settings.save();
  }

  // Sync documentation files to database
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    const docFiles = [
      { name: 'ARCHITECTURE.md', label: 'Architecture Reference' },
      { name: 'API_REFERENCE.md', label: 'API Reference Manual' },
      { name: 'DATABASE.md', label: 'Database Schema & Design' },
      { name: 'DEPLOYMENT.md', label: 'Deployment Guide' },
      { name: 'MONITORING.md', label: 'Telemetry & Monitoring' },
      { name: 'RUNBOOK.md', label: 'Incident & Operations Runbook' },
      { name: 'SECURITY.md', label: 'Security Controls & Audit' },
      { name: 'ADMIN_MANUAL.md', label: 'Admin Manual (Training)' },
      { name: 'FULFILMENT_SOP.md', label: 'Fulfillment SOP (Checklist)' },
      { name: 'SOFTWARE_CONTRACT.md', label: 'Software License Contract' },
      { name: 'DATA_PROCESSING_AGREEMENT.md', label: 'Data Processing Agreement' },
      { name: 'THIRD_PARTY_SERVICES.md', label: 'Third Party Disclosures' },
      { name: 'PRIVACY_POLICY.md', label: 'Privacy Policy' },
      { name: 'TERMS_AND_CONDITIONS.md', label: 'Commercial Terms' },
      { name: 'CREDENTIALS_HANDOVER.md', label: 'Platform Credentials' }
    ];

    const searchDirs = [
      path.resolve(process.cwd(), 'docs'),
      path.resolve(process.cwd(), 'docs/training'),
      path.resolve(process.cwd(), 'docs/legal')
    ];

    const docListWithContent = [];
    for (const doc of docFiles) {
      let content = '';
      for (const dir of searchDirs) {
        try {
          const filePath = path.join(dir, doc.name);
          content = await fs.readFile(filePath, 'utf-8');
          break;
        } catch {}
      }
      if (content) {
        docListWithContent.push({
          name: doc.name,
          label: doc.label,
          content: content
        });
      }
    }
    
    // Save only if different to avoid infinite hooks/updates
    if (JSON.stringify(settings.documentations || []) !== JSON.stringify(docListWithContent)) {
      settings.documentations = docListWithContent;
      await settings.save();
    }
  } catch (err) {
    console.error('Error syncing documentation to DB:', err);
  }

  return settings;
};

export default mongoose.model('Settings', settingsSchema);