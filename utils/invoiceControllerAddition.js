// utils/invoiceControllerAddition.js
import asyncHandler from 'express-async-handler';
import Order from '../models/Order.js';

// @desc    Generate PDF invoice for order
// @route   GET /api/orders/:id/invoice
// @access  Private
export const generateOrderInvoice = asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id)
        .populate('user', 'firstName lastName email');

    if (!order) {
        res.status(404);
        throw new Error('Order not found');
    }

    // Check if user owns the order or is admin
    if (order.user?._id?.toString() !== req.user?._id?.toString() && req.user?.role !== 'admin') {
        res.status(403);
        throw new Error('Not authorized to access this invoice');
    }

    // Import invoice generator
    const { generateInvoice } = await import('../utils/invoiceGenerator.js');

    // Generate and stream PDF
    generateInvoice(order, res);
});

export default generateOrderInvoice;
