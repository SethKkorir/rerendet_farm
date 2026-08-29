// controllers/subscriberController.js
import Subscriber from '../models/Subscriber.js';
import sendEmail from '../utils/sendEmail.js';
import { getNewsletterWelcomeEmail, getNewsletterEmail } from '../utils/emailTemplates.js';

// @desc    Subscribe to newsletter
// @route   POST /api/newsletter/subscribe
// @access  Public
export const subscribe = async (req, res, next) => {
    try {
        const { email } = req.body;

        if (!email || !email.includes('@')) {
            return res.status(400).json({ success: false, message: 'Please enter a valid email address' });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // Check if subscriber exists
        let subscriber = await Subscriber.findOne({ email: normalizedEmail });

        if (subscriber) {
            if (subscriber.isSubscribed) {
                return res.status(400).json({ success: false, message: 'You are already subscribed to our newsletter' });
            } else {
                // Reactivate subscription
                subscriber.isSubscribed = true;
                subscriber.subscribedAt = Date.now();
                await subscriber.save();
            }
        } else {
            // Create new subscriber
            subscriber = await Subscriber.create({ email: normalizedEmail });

            // Send welcome email
            try {
                const welcomeEmail = getNewsletterWelcomeEmail();
                await sendEmail({
                    email: subscriber.email,
                    subject: 'Welcome to Rerendet Coffee Journey',
                    html: welcomeEmail
                });
            } catch (emailError) {
                console.error('Failed to send welcome email:', emailError);
                // Continue execution, don't fail subscription
            }
        }

        res.status(201).json({
            success: true,
            message: 'Successfully subscribed to the newsletter!'
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: 'This email is already subscribed.' });
        }
        next(error);
    }
};

// @desc    Unsubscribe from newsletter
// @route   POST /api/newsletter/unsubscribe
// @access  Public
export const unsubscribe = async (req, res, next) => {
    try {
        const { email } = req.body;

        if (!email || !email.includes('@')) {
            return res.status(400).json({ success: false, message: 'Please provide a valid email address' });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const subscriber = await Subscriber.findOne({ email: normalizedEmail });

        if (subscriber) {
            subscriber.isSubscribed = false;
            await subscriber.save();
        }

        res.status(200).json({
            success: true,
            message: 'Successfully unsubscribed from the newsletter'
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all subscribers
// @route   GET /api/newsletter
// @access  Private/Admin
export const getAllSubscribers = async (req, res, next) => {
    try {
        const subscribers = await Subscriber.find().sort('-createdAt');
        res.status(200).json({
            success: true,
            count: subscribers.length,
            data: subscribers
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Send newsletter to all active subscribers
// @route   POST /api/newsletter/send
// @access  Private/Admin
export const sendNewsletter = async (req, res, next) => {
    try {
        const { subject, content } = req.body;

        if (!subject || !content) {
            return res.status(400).json({ success: false, message: 'Subject and content are required' });
        }

        // Get active subscribers
        const subscribers = await Subscriber.find({ isSubscribed: true });

        if (subscribers.length === 0) {
            return res.status(400).json({ success: false, message: 'No active subscribers found' });
        }

        // Send emails
        let successCount = 0;
        let failCount = 0;

        const emailPromises = subscribers.map(async (sub) => {
            try {
                const html = getNewsletterEmail(content);
                await sendEmail({
                    email: sub.email,
                    subject: subject,
                    html: html
                });
                successCount++;
            } catch (err) {
                console.error(`Failed to send to ${sub.email}:`, err);
                failCount++;
            }
        });

        await Promise.all(emailPromises);

        res.status(200).json({
            success: true,
            message: `Newsletter sent successfully`,
            stats: {
                total: subscribers.length,
                sent: successCount,
                failed: failCount
            }
        });
    } catch (error) {
        next(error);
    }
};
