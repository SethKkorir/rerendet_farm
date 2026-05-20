import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import fs from 'fs';
import generateInvoice from './utils/invoiceGenerator.js';
import Settings from './models/Settings.js';

(async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected.');

        // Self-heal store setting trigger
        console.log('Triggering settings self-heal...');
        const settings = await Settings.getSettings();
        console.log('Current Store Address in DB:', settings.store.address);

        // Mock Order
        const mockOrder = {
            orderNumber: 'ORD-TEST-999',
            createdAt: new Date(),
            shippingAddress: {
                firstName: 'John',
                lastName: 'Doe',
                phone: '+254712345678',
                address: '123 Highland Ridge',
                town: 'Bomet',
                county: 'Bomet',
                postalCode: '20400',
                country: 'Kenya'
            },
            items: [
                { name: 'Rerendet Peaberry Reserve', quantity: 2, price: 1500 },
                { name: 'Rerendet Medium Roast Arabica', quantity: 1, price: 1200 }
            ],
            subtotal: 4200,
            shippingCost: 350,
            tax: 0,
            total: 4550,
            paymentMethod: 'mpesa',
            paymentStatus: 'paid'
        };

        console.log('Generating PDF...');
        const buffer = await generateInvoice(mockOrder);
        
        const testPdfPath = './test-invoice.pdf';
        fs.writeFileSync(testPdfPath, buffer);
        console.log(`✅ Success! Generated test invoice PDF at: ${testPdfPath}`);

        await mongoose.disconnect();
        console.log('Database disconnected.');
    } catch (err) {
        console.error('❌ Test failed:', err);
        try {
            await mongoose.disconnect();
        } catch {}
    }
})();
