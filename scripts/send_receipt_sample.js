import dotenv from 'dotenv';
dotenv.config();

import sendEmail from '../utils/sendEmail.js';
import { generateReceiptPDF } from '../utils/receiptGenerator.js';
import { getPaymentConfirmedWithReceiptEmail } from '../utils/emailTemplates.js';

const mockOrder = {
  _id: '6af2bb6e87951e937ffd67e8',
  orderNumber: 'ORD-92590426-CB275345',
  createdAt: new Date('2026-11-10T09:00:00Z'),
  paymentStatus: 'paid',
  paymentMethod: 'paybill',
  receipt: {
    receiptNumber: 'REC-20261110-DD9D',
    issueDate: new Date('2026-11-10T09:00:00Z')
  },
  paymentConfirmation: {
    mpesaCode: 'RTYVLSITS',
    amountReceived: 750,
    confirmedAt: new Date('2026-11-10T09:00:00Z')
  },
  shippingAddress: {
    firstName: 'Korir',
    lastName: 'Doe',
    phone: '254748497623',
    email: 'rerendet@gmail.com',
    town: 'Bomet',
    county: 'Bomet',
    country: 'Kenya'
  },
  items: [
    {
      name: 'Rerendet AA Arabica Reserve',
      size: '250g',
      quantity: 1,
      price: 750
    }
  ],
  subtotal: 750,
  shippingCost: 0,
  total: 750
};

async function sendReceiptSample() {
  try {
    console.log('Generating 1-page PDF receipt...');
    const pdfBuffer = await generateReceiptPDF(mockOrder);
    console.log('PDF buffer size:', pdfBuffer.length);

    const emailHtml = getPaymentConfirmedWithReceiptEmail(
      'Korir Doe',
      mockOrder.orderNumber,
      mockOrder.receipt.receiptNumber,
      750,
      null,
      mockOrder._id
    );

    console.log('Sending email with PDF attachment to rerendet@gmail.com...');
    const res = await sendEmail({
      to: 'rerendet@gmail.com',
      subject: `Official Payment Receipt · Order #${mockOrder.orderNumber} - Rerendet Coffee`,
      html: emailHtml,
      attachments: [
        {
          filename: `Rerendet-Receipt-${mockOrder.receipt.receiptNumber}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    });

    console.log('✅ Email transmission result:', res);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error sending receipt sample:', err);
    process.exit(1);
  }
}

sendReceiptSample();
