# IRC Website Feedback — Google Sheets Connection

The floating **Let us know your thoughts** button on the main IRC website sends its text to `POST /api/feedback`. This endpoint only saves feedback after the private Google Apps Script connection is configured.

Destination: [IRC FEEDBACK Sheet](https://docs.google.com/spreadsheets/d/1kP1DJNpZskJw-6fN6I1q2LdcebassttI0a7aI943SvM/edit), tab `Sheet1`, columns **Submitted At / Feedback / Source**.

## One-time setup

1. Open the destination Google Sheet → **Extensions → Apps Script**.
2. Paste the contents of `feedback-apps-script.gs` into `Code.gs` and save.
3. In Apps Script → **Project Settings → Script properties**, add `IRC_FEEDBACK_SECRET` with a strong random secret (32+ characters). Never commit the value into GitHub.
4. Click **Deploy → New deployment → Web app**. Execute as **Me**; access **Anyone**. Approve the Google permissions for this project. Copy the final URL ending in `/exec`.
5. In **Vercel → IRC-Scores → Settings → Environment Variables**, add two server-side variables in Production:
   - `IRC_FEEDBACK_SCRIPT_URL` = copied Apps Script Web App `/exec` URL
   - `IRC_FEEDBACK_SECRET` = exactly the secret from step 3
6. Redeploy the production site to make these environment variables available.
7. Submit a non-sensitive test message on the IRC website and verify it lands as a new row in `Sheet1`. Remove the test row afterward.

## Security and privacy

- The website only sends feedback to its own `/api/feedback` handler. No Google edit permissions or script secret are exposed to the browser.
- The endpoint checks the request origin, validates message length, and uses a hidden bot field. These are modest spam deterrents, not a replacement for rate limiting or CAPTCHA if traffic grows.
- Don't solicit sensitive information, player details, or names. The form is anonymous.
- No submissions are accepted until both environment variables are configured; visitors receive an explicit unavailable message rather than a false success.
- A public Apps Script deployment accepts requests from anyone knowing its URL; the shared secret controls whether a row is written. Rotate it if compromised.

## Troubleshooting

If the site says `Feedback is not available yet`, check both Vercel variables and redeploy. If it says `Unable to send feedback`, check Apps Script execution logs, Web App access settings, and matching secrets.
