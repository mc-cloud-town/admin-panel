import { Resend } from 'resend';

export const BASE_EMAIL_DOMAIN = 'mc-ctec.org';

export const REVIEW_EMAIL = `noreply-review@${BASE_EMAIL_DOMAIN}`;
export const NOREPLY_EMAIL = `noreply@${BASE_EMAIL_DOMAIN}`;

export const useEmail = () => new Resend(process.env.RESEND_API_KEY).emails;
