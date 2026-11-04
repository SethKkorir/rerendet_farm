import React, { useState, useContext, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { Link, useLocation } from 'react-router-dom';
import {
  FaShieldAlt,
  FaFileContract,
  FaUndoAlt,
  FaTruck,
  FaCheckCircle,
  FaChevronDown,
  FaChevronUp,
  FaArrowDown,
  FaCheck,
  FaTimes,
  FaEnvelope,
  FaWhatsapp,
  FaBookOpen
} from 'react-icons/fa';
import './PolicyPage.css';

/* ── Rich Default Policy Data Structured for the Split Card Layout ── */
const POLICY_DETAILS = {
  shippingPolicy: {
    title: 'Shipping Policy',
    tagline: 'Fulfillment & Express Delivery',
    summary: "There's an update in our delivery terms to ensure your highland coffee arrives fresher and faster across all Kenyan counties.",
    faqQuestion: 'What does this mean for me?',
    faqAnswer: 'Your coffee is custom-roasted and dispatched within 24 hours. Nairobi deliveries arrive within 12-24 hours; countrywide express hubs arrive within 24-48 hours with live SMS tracking.',
    card1Label: 'Dispatch & Roasting Schedule',
    card1Excerpt: 'All coffee is roasted in dedicated small batches upon order confirmation. Orders placed before 12:00 PM are queued for same-day roasting and handover to express couriers within 24 hours.',
    card2Label: 'County Delivery & Live Tracking',
    card2Excerpt: 'Direct doorstep and hub delivery across Nairobi and all major counties via vetted courier partners. Real-time tracking is assigned immediately upon parcel dispatch.',
    fullMarkdown: `
# Shipping & Fulfillment Policy
We roast in dedicated small batches to ensure your coffee arrives at peak aroma and flavor. Here is everything you need to know about our courier partners and dispatch timelines.

## 1. Small-Batch Roasting Schedule
- Orders placed Monday through Friday before 12:00 PM are queued for immediate batch roasting and dispatched within 24 hours.
- Orders received on weekends or public holidays are roasted and dispatched on the subsequent business day.

## 2. Delivery Zones & Timelines
- **Nairobi Metropolitan Area**: Same-day or next-day direct courier delivery (typically within 12 to 24 hours of dispatch).
- **Major Kenyan County Hubs**: Delivery within 24 to 48 hours via our vetted express transport partners.
- **Remote & Upcountry Locations**: Delivery within 2 to 3 business days to designated collection points or doorstep.

## 3. County Shipping Rates
[!] Shipping fees are calculated transparently at checkout based on your selected delivery county and package weight.
Special promotions or bulk orders exceeding designated volume thresholds qualify for complimentary standard delivery.

## 4. Live Order Tracking
Upon dispatch, a unique Tracking ID is assigned to your parcel. You can track transit milestones in real time using our online **Track Order** portal or directly within your Account Dashboard.

## 5. Unsuccessful Deliveries & Address Verification
Please ensure your phone number and delivery instructions are accurate. If our courier cannot reach you after multiple attempts, the package will return to our central hub for re-dispatch coordination.
`
  },

  refundPolicy: {
    title: 'Refund Policy',
    tagline: '100% Satisfaction Guarantee',
    summary: 'We stand behind the craftsmanship of every roast. Review our refund and replacement standards designed for your peace of mind.',
    faqQuestion: 'What does this mean for me?',
    faqAnswer: 'If your coffee arrives damaged, with an incorrect roast profile, or with compromised packaging, let us know within 7 days. We will immediately replace it or refund you via M-Pesa or card.',
    card1Label: 'Freshness & Damage Protection',
    card1Excerpt: 'Because coffee is a freshly roasted perishable item, standard change-of-mind returns are not permitted once unsealed. However, all transit damages or roasting errors qualify for immediate replacement.',
    card2Label: 'Reimbursement & Processing',
    card2Excerpt: 'M-Pesa reimbursements are credited directly to your mobile number within 24 to 48 hours. Card refunds reflect on your statement within 3 to 5 business days.',
    fullMarkdown: `
# Refund & Replacement Policy
We stand behind the craftsmanship of every roast. If your highland coffee experience does not meet the exceptional standard we promise, our team is committed to making it right.

## 1. 100% Freshness Guarantee
Because coffee is a freshly roasted perishable food product, standard change-of-mind returns are not generally permitted once beans have been dispatched. However, we guarantee complete satisfaction regarding roast freshness, packaging integrity, and order accuracy.

## 2. Qualifying Situations for Replacement or Refund
You are entitled to a full replacement or refund in the event of:
- **Damaged or Compromised Packaging**: Sealed pouches arriving ruptured, punctured, or compromised during transit.
- **Incorrect Order Received**: Receiving a roast profile, grind size, or product different from your confirmed invoice.
- **Verified Quality Defects**: Irregularities in batch roasting or roast freshness reported within 7 days of delivery.

## 3. How to Request Resolution
[!] Please notify our team within 7 calendar days of delivery with your Order ID and photos of the affected product.
- Email: **support@rerendet.com** or message us directly via our verified WhatsApp concierge.
- Our team will review your request within 24 business hours.

## 4. Refund Processing Timeline
- **M-Pesa Reimbursements**: Credited back to the originating M-Pesa mobile number within 24 to 48 business hours.
- **Card Refunds**: Processed through our payment gateway and reflected on your bank statement within 3 to 5 business days.
`
  },

  termsConditions: {
    title: 'Terms & Conditions',
    tagline: 'Storefront Agreement',
    summary: "There's an update in our terms to ensure the highest standards of artisan roasting and ethical transparency for all customers.",
    faqQuestion: 'What does this mean for me?',
    faqAnswer: 'You are guaranteed authentic 100% single-origin Arabica from high-altitude Kenyan volcanic soils. Orders may be cancelled within 1 hour before custom roasting commences.',
    card1Label: 'Quality & Specialty Standards',
    card1Excerpt: 'Every bag of Rerendet Coffee is specialty-grade Arabica, nurtured at elevations of 1,800m+ above sea level in Kenya. All beans are small-batch roasted to preserve optimal flavor nuance.',
    card2Label: 'Orders, Pricing & Cancellations',
    card2Excerpt: 'All prices are quoted in Kenya Shillings (KES). Cancellations are welcomed within 1 hour of order placement before artisan roasting commences.',
    fullMarkdown: `
# Terms of Service & Store Policies
Welcome to Rerendet Coffee. By accessing our platform, creating an account, or placing an order for our highland single-origin coffees, you agree to be bound by these Terms & Conditions.

## 1. Specialty Grade Quality Standards
Every bag of Rerendet Coffee is specialty-grade Arabica, nurtured in the high-altitude volcanic soils of Kenya at elevations reaching 1,950 meters above sea level.
- All whole beans and ground coffees are small-batch roasted to preserve optimal flavor nuance.
- We guarantee bean integrity and dispatch freshness upon handover to couriers.

## 2. Orders, Pricing & Currency
- All prices displayed on our storefront are quoted in Kenya Shillings (KES) inclusive of applicable statutory taxes unless expressly stated otherwise.
- We reserve the right to correct pricing errors or update harvest availability without prior notice.
- An order confirmation email and system receipt are generated upon successful payment.

## 3. Order Cancellations
[!] Orders may be cancelled within 1 hour of placement before batch scheduling and roasting begins.
Once coffee has been custom-roasted or handed to the dispatch courier, standard cancellation is no longer applicable, and the transaction is governed by our Refund Policy.

## 4. Payment Methods Accepted
We accept secure M-Pesa STK Push, verified Visa and Mastercard debit/credit cards, and Cash on Delivery for designated serviceable zones.

## 5. Intellectual Property
All website text, imagery, brand marks, packaging designs, roast identifiers, and custom coffee configurations are the protected intellectual property of Rerendet Coffee.
`
  },

  privacyPolicy: {
    title: 'Privacy Policy',
    tagline: 'Personal Data Protection',
    summary: 'We treat your personal data with the same care and respect as our hand-picked coffee beans. Transparent, secure, and privacy-first.',
    faqQuestion: 'What does this mean for me?',
    faqAnswer: 'We only collect essential details to fulfill and ship your orders. We never store payment PINs or full card numbers, and we never sell your data to advertisers.',
    card1Label: 'Personal Data Collection',
    card1Excerpt: 'We collect your delivery address, contact phone, and order preferences exclusively to route couriers and personalize roast profiles. Your data is encrypted and strictly protected.',
    card2Label: 'Payment & Transaction Security',
    card2Excerpt: 'All transactions are routed through PCI-DSS direct payment gateways and official Safaricom M-Pesa protocols. We never store or log payment credentials on our servers.',
    fullMarkdown: `
# Privacy & Data Protection
At Rerendet Coffee, we treat your personal information with the same care and respect as our hand-picked coffee beans. We are committed to safeguarding your privacy and upholding transparent data practices.

## 1. Information We Collect
We collect information necessary to deliver exceptional highland coffee and seamless storefront services:
- **Contact & Shipping Details**: Your full name, shipping address, delivery county, email, and phone number to coordinate fast courier delivery.
- **Account Credentials**: Securely hashed login credentials and voluntary profile information.
- **Order History & Preferences**: Roasting profile preferences, past orders, and tasting selections to personalize your coffee experience.

## 2. Payment Security & Integrity
[!] Financial data is strictly protected. We never store or log your complete credit card numbers or M-Pesa PINs on our servers.
All digital transactions are processed through end-to-end encrypted, PCI-DSS compliant direct payment gateways and official Safaricom M-Pesa STK push protocols.

## 3. How We Use Your Data
- Fulfilling, roasting, packaging, and dispatching your coffee orders.
- Sending transactional updates, receipt notifications, and dispatch tracking numbers.
- Sending optional roast releases and brewing tips when you subscribe to our newsletter.
- Protecting our platform against fraudulent transactions and unauthorized account access.

## 4. Your Rights & Account Control
- You may access, edit, or update your personal account information at any time via your Account Dashboard.
- You have the absolute right to request account closure and permanent personal data deletion.
- We do not sell, rent, or trade your personal information to third-party advertisers.

## 5. Contacting Our Data Privacy Team
If you have any questions or requests regarding your personal data, contact us at info@rerendet.com or via our Customer Support desk.
`
  }
};

const renderInlineMarkdown = (text) => {
  if (!text) return '';
  const parts = text.split(/(\*\*.*?\*\*|\*[^*]+?\*|_[^_]+?_)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={idx}>{part.slice(2, -2)}</strong>;
    }
    if ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'))) {
      return <em key={idx}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
};

const PolicyPage = ({ type, title }) => {
  const { publicSettings, showNotification } = useContext(AppContext);
  const location = useLocation();

  const policyKey = type || 'shippingPolicy';
  const defaultInfo = POLICY_DETAILS[policyKey] || POLICY_DETAILS.shippingPolicy;
  const customDetails = publicSettings?.policies?.details?.[policyKey] || {};

  const policyInfo = {
    ...defaultInfo,
    summary: customDetails.summary?.trim() || defaultInfo.summary,
    faqAnswer: customDetails.faqAnswer?.trim() || defaultInfo.faqAnswer,
    card1Label: customDetails.card1Label?.trim() || defaultInfo.card1Label,
    card1Excerpt: customDetails.card1Excerpt?.trim() || defaultInfo.card1Excerpt,
    card2Label: customDetails.card2Label?.trim() || defaultInfo.card2Label,
    card2Excerpt: customDetails.card2Excerpt?.trim() || defaultInfo.card2Excerpt,
  };

  const policiesNav = [
    { id: 'shippingPolicy', title: 'Shipping Policy', path: '/shipping-policy', icon: <FaTruck /> },
    { id: 'refundPolicy', title: 'Refund Policy', path: '/refund-policy', icon: <FaUndoAlt /> },
    { id: 'termsConditions', title: 'Terms & Conditions', path: '/terms-conditions', icon: <FaFileContract /> },
    { id: 'privacyPolicy', title: 'Privacy Policy', path: '/privacy-policy', icon: <FaShieldAlt /> }
  ];

  const storageKey = `rerendet_policy_ack_${policyKey}`;
  const [hasAccepted, setHasAccepted] = useState(false);
  const [isExplanationOpen, setIsExplanationOpen] = useState(false);
  const [showFullModal, setShowFullModal] = useState(false);
  const [activeModalSection, setActiveModalSection] = useState(null);

  useEffect(() => {
    try {
      setHasAccepted(localStorage.getItem(storageKey) === 'true');
    } catch (e) {
      // ignore
    }
    setIsExplanationOpen(false);
    setShowFullModal(false);
  }, [policyKey, storageKey]);

  const handleAcceptTerms = () => {
    try {
      localStorage.setItem(storageKey, 'true');
    } catch (e) {
      // ignore
    }
    setHasAccepted(true);
    if (showNotification) {
      showNotification(`Thank you. You have accepted the ${policyInfo.title}.`, 'success');
    }
  };

  const handleOpenClause = (clauseTitle, clauseText) => {
    setActiveModalSection({ title: clauseTitle, text: clauseText });
    setShowFullModal(true);
  };

  const handleOpenFullDocument = () => {
    setActiveModalSection(null);
    setShowFullModal(true);
  };

  // Content for full document: use DB custom text if present, else fallback to rich markdown
  const dbContent = publicSettings?.policies?.[policyKey];
  const isContentValid = dbContent && dbContent.trim().length > 25 && !/being refined|updated soon/i.test(dbContent);
  const rawDocument = isContentValid ? dbContent : policyInfo.fullMarkdown;

  const renderFormattedMarkdown = (content) => {
    const lines = content.split('\n');
    const sections = [];
    let currentSection = { title: null, level: 1, content: [] };

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      if (trimmed.startsWith('##')) {
        if (currentSection.content.length > 0 || currentSection.title) {
          sections.push({ ...currentSection });
        }
        currentSection = { title: trimmed.replace(/^##\s*/, ''), level: 2, content: [] };
      } else if (trimmed.startsWith('#')) {
        if (currentSection.content.length > 0 || currentSection.title) {
          sections.push({ ...currentSection });
        }
        currentSection = { title: trimmed.replace(/^#\s*/, ''), level: 1, content: [] };
      } else if (trimmed.startsWith('-')) {
        currentSection.content.push({ type: 'list', text: trimmed.replace(/^-\s*/, '') });
      } else if (trimmed.startsWith('[!]')) {
        currentSection.content.push({ type: 'notice', text: trimmed.replace(/^\[!\]\s*/, '') });
      } else {
        currentSection.content.push({ type: 'p', text: trimmed });
      }
    });

    if (currentSection.content.length > 0 || currentSection.title) {
      sections.push(currentSection);
    }

    return sections.map((sec, sIdx) => (
      <div key={sIdx} className="modal-doc-section">
        {sec.title && <h3 className={`modal-doc-heading level-${sec.level}`}>{sec.title}</h3>}
        <div className="modal-doc-body">
          {sec.content.map((item, iIdx) => {
            if (item.type === 'list') {
              return (
                <div key={iIdx} className="modal-list-item">
                  <FaCheckCircle className="check-icon" />
                  <span>{renderInlineMarkdown(item.text)}</span>
                </div>
              );
            }
            if (item.type === 'notice') {
              return (
                <div key={iIdx} className="modal-notice-box">
                  <strong>Important:</strong> {renderInlineMarkdown(item.text)}
                </div>
              );
            }
            return <p key={iIdx}>{renderInlineMarkdown(item.text)}</p>;
          })}
        </div>
      </div>
    ));
  };

  const contactPhone = (publicSettings?.contact?.whatsapp || publicSettings?.contact?.phone || '+254700000000').replace(/[^0-9]/g, '');

  return (
    <div className="policy-inspire-page">
      {/* ── Top Half: Rich Coffee Brand Header with Navigation ── */}
      <section className="policy-inspire-top-banner">
        <div className="policy-inspire-container">
          {/* Top Pill Navigation for Policies */}
          <nav className="policy-inspire-nav" aria-label="Policies Navigation">
            {policiesNav.map((pol) => {
              const isActive = location.pathname === pol.path;
              return (
                <Link
                  key={pol.id}
                  to={pol.path}
                  className={`policy-nav-pill ${isActive ? 'active' : ''}`}
                >
                  <span className="pill-icon">{pol.icon}</span>
                  <span className="pill-text">{pol.title}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </section>

      {/* ── Center Floating Card (Exact Mockup Layout in Coffee & Gold) ── */}
      <div className="policy-inspire-container card-anchor">
        <main className="policy-inspire-floating-card">
          <div className="policy-card-split-grid">
            {/* ── Left Column ── */}
            <div className="policy-split-left">
              <h1 className="policy-split-title">{policyInfo.title}</h1>
              <div className="policy-split-accent-line" />
              <p className="policy-split-summary">{policyInfo.summary}</p>

              {/* Accordion: What does this mean for me? */}
              <div className="policy-split-faq">
                <button
                  type="button"
                  className={`policy-faq-toggle ${isExplanationOpen ? 'open' : ''}`}
                  onClick={() => setIsExplanationOpen(!isExplanationOpen)}
                  aria-expanded={isExplanationOpen}
                >
                  <span>{policyInfo.faqQuestion}</span>
                  {isExplanationOpen ? (
                    <FaChevronUp className="faq-toggle-arrow" />
                  ) : (
                    <FaChevronDown className="faq-toggle-arrow" />
                  )}
                </button>

                {isExplanationOpen && (
                  <div className="policy-faq-answer-panel">
                    <p>{policyInfo.faqAnswer}</p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="policy-split-actions">
                <button
                  type="button"
                  className={`btn-split-primary ${hasAccepted ? 'accepted' : ''}`}
                  onClick={handleAcceptTerms}
                >
                  {hasAccepted ? (
                    <><FaCheck /> Accepted</>
                  ) : (
                    'Accept terms'
                  )}
                </button>

                <button
                  type="button"
                  className="btn-split-secondary"
                  onClick={handleOpenFullDocument}
                >
                  Review full policy
                </button>
              </div>
            </div>

            {/* ── Right Column: Stacked Cards with Gold Quotation Marks ── */}
            <div className="policy-split-right">
              {/* Card 1 */}
              <div className="policy-clause-block">
                <div className="policy-clause-label">{policyInfo.card1Label}</div>
                <div className="policy-quote-card">
                  <span className="quote-mark top">“</span>
                  <p className="quote-body">{policyInfo.card1Excerpt}</p>
                  <div className="quote-card-footer">
                    <button
                      type="button"
                      className="quote-seemore-link"
                      onClick={() => handleOpenClause(policyInfo.card1Label, policyInfo.card1Excerpt)}
                    >
                      See more
                    </button>
                    <span className="quote-mark bottom">”</span>
                  </div>
                </div>
              </div>

              {/* Downward Flow Arrow in Gold */}
              <div className="policy-clause-arrow" aria-hidden="true">
                <FaArrowDown />
              </div>

              {/* Card 2 */}
              <div className="policy-clause-block">
                <div className="policy-clause-label highlight">{policyInfo.card2Label}</div>
                <div className="policy-quote-card active-card">
                  <span className="quote-mark top">“</span>
                  <p className="quote-body">{policyInfo.card2Excerpt}</p>
                  <div className="quote-card-footer">
                    <button
                      type="button"
                      className="quote-seemore-link"
                      onClick={() => handleOpenClause(policyInfo.card2Label, policyInfo.card2Excerpt)}
                    >
                      See more
                    </button>
                    <span className="quote-mark bottom">”</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* ── Support & Help Strip Below ── */}
      <div className="policy-inspire-container bottom-support">
        <div className="policy-bottom-support-bar">
          <div className="support-bar-text">
            <h4>Have specific questions regarding our {policyInfo.title.toLowerCase()}?</h4>
            <p>Our highland customer support team is always available to clarify delivery, returns, or terms.</p>
          </div>
          <div className="support-bar-buttons">
            <Link to="/#contact" className="support-btn-outline">
              <FaEnvelope /> Contact Us
            </Link>
            <a
              href={`https://wa.me/${contactPhone}?text=Hello%20Rerendet%20Coffee%2C%20I%20have%20a%20question%20regarding%20the%20${encodeURIComponent(policyInfo.title)}.`}
              target="_blank"
              rel="noopener noreferrer"
              className="support-btn-whatsapp"
            >
              <FaWhatsapp /> Instant WhatsApp
            </a>
          </div>
        </div>
      </div>

      {/* ── Full Policy Document / Clause Modal ── */}
      {showFullModal && (
        <div className="policy-modal-backdrop" onClick={() => setShowFullModal(false)}>
          <div className="policy-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="policy-modal-header">
              <div className="modal-header-meta">
                <span className="modal-verified-tag">
                  <FaShieldAlt /> Verified Storefront Policy
                </span>
                <h2 className="modal-title">
                  {activeModalSection ? activeModalSection.title : policyInfo.title}
                </h2>
              </div>
              <button
                type="button"
                className="policy-modal-close-btn"
                onClick={() => setShowFullModal(false)}
                aria-label="Close document"
              >
                <FaTimes />
              </button>
            </div>

            <div className="policy-modal-scroll-body">
              {activeModalSection ? (
                <div className="single-clause-view">
                  <p className="single-clause-text">{activeModalSection.text}</p>
                </div>
              ) : (
                renderFormattedMarkdown(rawDocument)
              )}
            </div>

            <div className="policy-modal-footer">
              <button
                type="button"
                className="btn-modal-understand"
                onClick={() => {
                  handleAcceptTerms();
                  setShowFullModal(false);
                }}
              >
                I Understand & Accept
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PolicyPage;
