# Gmail Business Account Setup Guide

This guide will walk you through setting up your Gmail business account to receive contact form submissions and send automated emails to customers.

## Step-by-Step Instructions

### Step 1: Enable 2-Step Verification

1. Go to your Google Account: https://myaccount.google.com/
2. Click on **Security** in the left menu
3. Under "Signing in to Google", find **2-Step Verification**
4. Click **Get Started** and follow the prompts to enable 2-Step Verification
   - You'll need to verify with your phone number
   - You may need to enter a verification code

**Important:** 2-Step Verification MUST be enabled before you can generate an App Password.

---

### Step 2: Generate an App Password

1. After enabling 2-Step Verification, go back to **Security** in your Google Account
2. Scroll down to "Signing in to Google" section
3. Click on **2-Step Verification** again
4. Scroll down to find **App passwords** (at the bottom of the page)
5. Click on **App passwords**
6. You may need to sign in again
7. Select **Mail** as the app type
8. Select **Other (Custom name)** as the device type
9. Enter a name like: "North Via Marketing Website"
10. Click **Generate**
11. **IMPORTANT:** Copy the 16-character password that appears (it will look like: `abcd efgh ijkl mnop`)
   - **Save this password immediately** - you won't be able to see it again!
   - Remove any spaces when using it (so `abcd efgh ijkl mnop` becomes `abcdefghijklmnop`)

---

### Step 3: Create Environment Variables File

1. In your project root folder (`D:\Res\NVM website`), create a new file named `.env.local`
   - **Note:** This file should NOT be committed to Git (it's already in .gitignore)
2. Add the following content to `.env.local`:

```env
# Your Gmail business account email address
GMAIL_USER=your-business-email@gmail.com

# The 16-character App Password you just generated (no spaces)
GMAIL_APP_PASSWORD=abcdefghijklmnop

# Display name for emails (optional)
GMAIL_FROM_NAME=North Via Marketing

# Business email where you want to receive contact form submissions
# If not set, will use GMAIL_USER
BUSINESS_EMAIL=your-business-email@gmail.com
```

3. Replace the placeholder values:
   - `your-business-email@gmail.com` → Your actual Gmail business email
   - `abcdefghijklmnop` → Your 16-character App Password (without spaces)
   - Adjust `GMAIL_FROM_NAME` if desired

**Example:**
```env
GMAIL_USER=contact@northviamarketing.com
GMAIL_APP_PASSWORD=xkcdabcd1234efgh
GMAIL_FROM_NAME=North Via Marketing
BUSINESS_EMAIL=contact@northviamarketing.com
```

---

### Step 4: Restart Your Development Server

1. Stop your current development server (if running) by pressing `Ctrl+C` in the terminal
2. Start it again with:
   ```bash
   npm run dev
   ```

**Important:** Environment variables are only loaded when the server starts, so you MUST restart after creating/editing `.env.local`.

---

### Step 5: Test the Contact Form

1. Go to your website's contact page
2. Fill out the contact form with test data
3. Submit the form
4. Check:
   - **Your business email inbox** - You should receive a notification email
   - **The test email address you used** - You should receive a confirmation email

---

## Troubleshooting

### "Invalid login" or "Authentication failed" error

- **Double-check your App Password** - Make sure there are NO spaces in the password
- **Verify 2-Step Verification is enabled** - You can't use App Passwords without it
- **Regenerate the App Password** - Sometimes regenerating helps

### Emails not being received

1. Check your spam/junk folder
2. Verify the email addresses in `.env.local` are correct
3. Check the server console for error messages
4. Make sure the App Password is exactly 16 characters (no spaces)

### "Failed to send email" error in the form

1. Check the browser console (F12 → Console tab) for errors
2. Check the server terminal for detailed error messages
3. Verify all environment variables are set correctly
4. Make sure you restarted the server after creating `.env.local`

### Still having issues?

- Make sure your Gmail account allows "Less secure app access" is NOT the issue (App Passwords should work regardless)
- Try generating a new App Password
- Check that your Gmail account isn't locked or restricted
- Verify your Gmail account is active and can send emails normally

---

## For Production Deployment

When deploying to Vercel, Netlify, or another hosting platform:

1. Go to your hosting platform's dashboard
2. Find the **Environment Variables** or **Settings** section
3. Add the same environment variables:
   - `GMAIL_USER`
   - `GMAIL_APP_PASSWORD`
   - `GMAIL_FROM_NAME` (optional)
   - `BUSINESS_EMAIL` (optional)
4. Redeploy your application

**Never commit your `.env.local` file to Git!** It contains sensitive information.

---

## Security Notes

- ✅ App Passwords are safer than using your regular password
- ✅ App Passwords can be revoked individually if compromised
- ✅ Keep your `.env.local` file secure and never share it
- ✅ Don't commit `.env.local` to version control (it should be in `.gitignore`)

---

## What Happens When Someone Submits the Form?

1. **You receive an email** with:
   - Customer's name, email, company (if provided)
   - Service they're interested in
   - Their message
   - **You can reply directly** to respond to the customer

2. **Customer receives an email** with:
   - Confirmation that their message was received
   - Information about next steps
   - Your contact information
   - Professional branding

Both emails are sent automatically within seconds of form submission!

---

## Need Help?

If you encounter any issues during setup, check:
1. The troubleshooting section above
2. Server console logs for detailed error messages
3. Your Google Account settings to ensure 2-Step Verification is enabled

Good luck! 🚀

