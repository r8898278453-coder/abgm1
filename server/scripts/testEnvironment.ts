/** Child-process environment only; never change the user's cloud bindings. No .env file is loaded. */
export function isolatedTestEnvironment(source:NodeJS.ProcessEnv):NodeJS.ProcessEnv{
 const env:NodeJS.ProcessEnv={...source,NODE_ENV:'test'};
 for(const key of Object.keys(env))if(/^(DB_|DATABASE_URL$|INITIAL_ADMIN_|IS_PRODUCTION$|AUTH_SECRET$|JWT_SECRET$|CREDENTIAL_ENCRYPTION_(KEY|PREVIOUS_KEYS)$|AUTH_COOKIE_ENABLED$|GEMINI_|GOOGLE_|GCP_|META_|WHATSAPP_|TELEGRAM_|RAZORPAY_|SMTP_|EMAIL_|RESEND_|SENDGRID_|POSTMARK_|SERPAPI_|SERP_API_|DATAFORSEO_|DATA_FOR_SEO_)/.test(key))delete env[key];
 return env;
}
