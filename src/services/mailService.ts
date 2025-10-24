import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { welcomeEmailTemplate } from '../helper/template';

dotenv.config();

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

transporter.verify((error, success) => {
    if (error) {
        console.error('Email transporter configuration error:', error);
    } else {
        // console.log('Email transporter is ready to send messages');
    }
});

export interface MailOptions {
    to: string;
    subject: string;
    html: string;
}

export const sendMail = async (mailOptions: MailOptions): Promise<void> => {
    try {
        const info = await transporter.sendMail({
            from: `"Keshav Products" <${process.env.EMAIL_USER}>`,
            to: mailOptions.to,
            subject: mailOptions.subject,
            html: mailOptions.html,
        });

        console.log('Message sent: %s', info.messageId);
    } catch (error) {
        console.error('Error sending email:', error);
        throw new Error('Failed to send email');
    }
};

export const sendWelcomeEmail = async (to: string, name: string, email: string, otp: string): Promise<void> => {
    try {
        const html = welcomeEmailTemplate({ name, email, otp });
        await sendMail({
            to,
            subject: 'Welcome to Keshav Products!',
            html,
        });
    } catch (error) {
        console.error('Error sending welcome email:', error);
        throw new Error('Failed to send welcome email');
    }
};