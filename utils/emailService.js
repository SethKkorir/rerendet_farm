// utils/emailService.js
import nodemailer from 'nodemailer';
import handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sendMail from './sendEmail.js';
import realSendEmail from './realSendEmail.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Send an email using a template or raw html via unified sender pipeline
 */
export const sendEmail = async (options) => {
    try {
        const { to, subject, templateName, data } = options;
        let html = options.html;

        // Load and compile template if provided
        if (templateName && !html) {
            const templatePath = path.join(__dirname, '../templates/emails', `${templateName}.hbs`);
            if (fs.existsSync(templatePath)) {
                const templateSource = fs.readFileSync(templatePath, 'utf8');
                const template = handlebars.compile(templateSource);
                html = template(data);
            }
        }

        if (!html) {
            throw new Error('Email HTML content or templateName is required');
        }

        const mailPayload = {
            to,
            subject,
            html,
            from: `"${process.env.EMAIL_FROM_NAME || 'Rerendet Coffee'}" <${process.env.EMAIL_FROM || 'orders@rerendetcoffee.com'}>`
        };

        // Send via unified email pipeline with direct SMTP fallback
        try {
            return await sendMail(mailPayload);
        } catch (queueErr) {
            console.warn('⚠️ Unified email queue error, delivering via direct SMTP:', queueErr.message);
            return await realSendEmail(mailPayload);
        }
    } catch (error) {
        console.error('❌ Email sending error in emailService:', error.message);
        return null;
    }
};
