import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

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

  const { product, price, timestamp, cta_source } = req.body;

  try {
    // Log to Google Sheet
    const serviceAccountAuth = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);

    await doc.loadInfo();

    // Try to find or create a "Purchases" sheet
    let purchaseSheet = doc.sheetsByTitle['Purchases'];

    if (!purchaseSheet) {
      // Create new sheet if it doesn't exist
      purchaseSheet = await doc.addSheet({
        title: 'Purchases',
        headerValues: ['Product', 'Price', 'Timestamp', 'CTA Source', 'IP']
      });
    }

    await purchaseSheet.addRow({
      Product: product || 'autoforge-lifetime',
      Price: price || 299,
      Timestamp: timestamp || new Date().toISOString(),
      'CTA Source': cta_source || 'unknown',
      IP: req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown'
    });

    return res.status(200).json({
      success: true,
      message: 'Purchase tracked successfully'
    });

  } catch (error) {
    console.error('Tracking error:', error);
    // Don't fail the request if tracking fails
    return res.status(200).json({
      success: false,
      message: 'Tracking failed but request completed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
