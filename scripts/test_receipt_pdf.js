import fs from 'fs';
import path from 'path';
import { generateReceiptPDF } from '../utils/receiptGenerator.js';

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
    email: 'zsethkipchumba179@gmail.com',
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

async function test() {
  try {
    const pdfBuffer = await generateReceiptPDF(mockOrder);
    fs.writeFileSync('test_receipt_out.pdf', pdfBuffer);
    console.log('PDF generated successfully, size:', pdfBuffer.length);
  } catch (err) {
    console.error('Error generating PDF:', err);
  }
}

test();

