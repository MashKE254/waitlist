import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;

  // Enhanced email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  try {
    // 1. Add to Google Sheet
    const serviceAccountAuth = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);
    
    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[0];
    
    await sheet.addRow({ 
      Email: email, 
      Date: new Date().toLocaleString(),
      Source: 'Waitlist'
    });

    // 2. Optional: Add to MailerLite (if you want to use it)
    
    const mailerliteResponse = await fetch('https://api.mailerlite.com/api/v2/groups/YOUR_GROUP_ID/subscribers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-MailerLite-ApiKey': process.env.MAILERLITE_API_KEY
      },
      body: JSON.stringify({
        email: email,
        fields: {
          signup_date: new Date().toISOString()
        }
      })
    });

    if (!mailerliteResponse.ok) {
      console.error('MailerLite error:', await mailerliteResponse.text());
    }
  

    // 3. Send "Visual" Confirmation Email
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Styles
    const mainBg = '#030005';
    const cardBg = '#0A0A0C';
    const accent = '#7C3AED';
    
    // We use public GIFs here. 
    // In production, you would upload your own GIFs to your Vercel public folder 
    // and link them like: "https://autoforge.ai/email-header.gif"
    const headerGif = "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbmZ0bnZ4Y2F4N2V4amZ0bnZ4Y2F4N2V4amZ0bnZ4Y2F4N2V4amlzdCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/L2r39d6gO8pXN6D7YF/giphy.gif"; // Glitch Effect
    const accessGif = "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExaGZ0bnZ4Y2F4N2V4amZ0bnZ4Y2F4N2V4amZ0bnZ4Y2F4N2V4amlzdCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/Y35kK8XG3V1eM/giphy.gif"; // HUD loading

    await transporter.sendMail({
      from: '"AutoForge System" <' + process.env.EMAIL_USER + '>',
      to: email,
      subject: 'ACCESS GRANTED // Welcome to the Foundry',
      text: 'AutoForge Waitlist Confirmed. Access Granted.',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            /* Email clients ignore most CSS, so we inline styles below */
            body { margin: 0; padding: 0; background-color: ${mainBg}; }
          </style>
        </head>
        <body style="background-color: ${mainBg}; margin: 0; padding: 0;">
          
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: ${mainBg};">
            <tr>
              <td align="center" style="padding: 40px 10px;">
                
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 500px; background-color: ${cardBg}; border: 1px solid #333; border-radius: 12px; overflow: hidden;">
                  
                  <tr>
                    <td style="padding: 0; background-color: #000;">
                      <img src="${headerGif}" alt="AutoForge System" style="width: 100%; display: block; height: auto; opacity: 0.8;" />
                    </td>
                  </tr>

                  <tr>
                    <td style="padding: 40px; font-family: 'Courier New', monospace; color: #e2e8f0; text-align: center;">
                      
                      <div style="margin-bottom: 20px;">
                        <span style="color: ${accent}; font-weight: bold; letter-spacing: 3px; font-size: 12px; border: 1px solid ${accent}; padding: 4px 8px; border-radius: 4px;">
                          SYSTEM_ID: ${Date.now().toString().slice(-6)}
                        </span>
                      </div>

                      <h1 style="font-size: 24px; margin-bottom: 15px; color: #fff; text-transform: uppercase; letter-spacing: 1px;">
                        Protocol Initiated
                      </h1>

                      <p style="font-size: 14px; line-height: 1.6; color: #94a3b8; margin-bottom: 30px;">
                        The Foundry is currently compiling resources. Your request has been logged in the primary database.
                      </p>

                      <div style="margin: 30px 0;">
                        <img src="${accessGif}" width="100" height="auto" style="display: block; margin: 0 auto; border-radius: 50%; border: 2px solid #333;" />
                      </div>

                      <p style="font-size: 12px; color: #555;">
                        Status: <strong style="color: #4ade80;">WAITLIST_VERIFIED</strong><br>
                        Launch T-Minus: <span style="color: #fff;">EST_MAR_2026</span>
                      </p>

                      <div style="margin-top: 30px;">
                        <a href="https://autoforge.ai" style="background-color: ${accent}; color: #fff; text-decoration: none; padding: 12px 25px; font-weight: bold; font-size: 14px; border-radius: 4px; display: inline-block;">
                          Acknowledge Receipt
                        </a>
                      </div>

                    </td>
                  </tr>
                  
                  <tr>
                    <td style="background-color: #000; padding: 20px; text-align: center; font-family: sans-serif; font-size: 10px; color: #444; border-top: 1px solid #222;">
                      SECURE TRANSMISSION // AUTOFORGE INC.<br>
                      No Action Required. 100% Refundable Until Launch.
                    </td>
                  </tr>

                </table>

              </td>
            </tr>
          </table>

        </body>
        </html>
      `,
    });

    return res.status(200).json({ 
      success: true,
      message: 'Successfully added to waitlist'
    });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ 
      error: 'Internal Server Error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}