// controllers/contactController.js
import asyncHandler from 'express-async-handler';
import Contact from '../models/Contact.js';
import Order from '../models/Order.js';
import sendEmail from '../utils/sendEmail.js';

// @desc    Submit a contact inquiry (Public)
// @route   POST /api/contact
// @access  Public
export const submitContactInquiry = asyncHandler(async (req, res) => {
  const { name, email, subject, message, orderNumber, hp_website } = req.body;

  // 1. Honeypot Anti-Spam Check: If bot fills hidden honeypot field, silently succeed without saving
  if (hp_website) {
    console.log('🤖 Honeypot triggered in contact form submission. Silently dropping spam.');
    return res.status(200).json({
      success: true,
      message: "Thank you for reaching out! We've received your message and will respond within 2-4 business hours."
    });
  }

  // 2. Server Validation
  if (!name || !email || !subject || !message) {
    res.status(400);
    throw new Error('Please fill in all required fields (name, email, subject, message).');
  }

  if (!email.includes('@')) {
    res.status(400);
    throw new Error('Please provide a valid email address.');
  }

  if (message.length < 10) {
    res.status(400);
    throw new Error('Message must be at least 10 characters long.');
  }

  // 3. Check for linked order if order number is supplied
  let linkedOrder = null;
  if (orderNumber && orderNumber.trim()) {
    const cleanNum = orderNumber.trim();
    linkedOrder = await Order.findOne({
      $or: [
        { orderNumber: cleanNum },
        { _id: cleanNum.match(/^[0-9a-fA-F]{24}$/) ? cleanNum : null }
      ]
    });
  }

  // 4. Create Contact document
  const contact = await Contact.create({
    user: req.user ? req.user._id : null,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    subject: subject.trim(),
    message: message.trim(),
    orderNumber: orderNumber ? orderNumber.trim() : null,
    order: linkedOrder ? linkedOrder._id : null,
    linkedOrderId: linkedOrder ? linkedOrder._id : null,
    linkedOrderSnapshot: linkedOrder ? { orderNumber: linkedOrder.orderNumber, total: linkedOrder.total, status: linkedOrder.orderStatus } : null,
    status: 'new'
  });

  // 5. Send Confirmation Email to Customer
  try {
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 25px;">
          <h1 style="color: #6b4226; margin: 0; font-size: 24px;">☕ We Received Your Message</h1>
          <p style="color: #666; font-size: 14px; margin-top: 5px;">Rerendet Coffee Customer Care</p>
        </div>
        <p style="font-size: 15px; color: #333;">Hello <strong>${name}</strong>,</p>
        <p style="font-size: 14px; color: #555; line-height: 1.6;">
          Thank you for contacting Rerendet Coffee Co. We have received your inquiry regarding <strong>"${subject}"</strong> and our support team will get back to you within 2 to 4 business hours.
        </p>
        <div style="padding: 15px; background-color: #f8f9fa; border-left: 4px solid #6b4226; border-radius: 4px; margin: 20px 0;">
          <p style="margin: 0; font-size: 13px; color: #333;"><strong>Inquiry Ticket ID:</strong> ${contact._id}</p>
          ${linkedOrder ? `<p style="margin: 5px 0 0 0; font-size: 13px; color: #333;"><strong>Associated Order:</strong> ${linkedOrder.orderNumber}</p>` : ''}
        </div>
        <p style="font-size: 13px; color: #777;">Need immediate assistance? You can also reach us via WhatsApp during business hours (Mon-Sat 8:00 AM - 6:00 PM EAT).</p>
      </div>
    `;

    await sendEmail({
      to: email,
      subject: `☕ Inquiry Received: ${subject}`,
      html: emailHtml
    });
  } catch (emailErr) {
    console.error('Failed to send contact confirmation email:', emailErr.message);
  }

  res.status(201).json({
    success: true,
    message: "Thank you for reaching out! We've received your message and will respond within 2-4 business hours.",
    data: contact
  });
});
