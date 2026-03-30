// Email Notification Service using Nodemailer
import nodemailer from 'nodemailer';

// Create a test transporter — uses Ethereal (fake SMTP) by default
// In production, replace with real SMTP credentials (Gmail, SendGrid, etc.)
let transporter = null;

async function getTransporter() {
  if (transporter) return transporter;

  try {
    // Create an Ethereal test account automatically
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
    console.log('📧 Email service initialized (Ethereal test account)');
    console.log(`   Test inbox: https://ethereal.email/login`);
    console.log(`   User: ${testAccount.user}`);
    return transporter;
  } catch (err) {
    console.warn('⚠️ Email service failed to initialize:', err.message);
    return null;
  }
}

// Initialize on import
getTransporter();

/**
 * Send a blood request notification email to a donor
 */
export async function sendBloodRequestEmail(donorEmail, donorName, hospitalName, bloodGroup, urgency) {
  const transport = await getTransporter();
  if (!transport) {
    console.log(`📧 [SKIPPED] Email to ${donorEmail} - transporter not available`);
    return null;
  }

  const isEmergency = urgency === 'critical';
  const subject = isEmergency
    ? `🚨 EMERGENCY: ${bloodGroup} Blood Needed — ${hospitalName}`
    : `🩸 Blood Request: ${bloodGroup} Needed — ${hospitalName}`;

  const html = `
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #e2e8f0; border-radius: 16px; overflow: hidden; border: 1px solid #334155;">
      <!-- Header -->
      <div style="background: ${isEmergency ? 'linear-gradient(135deg, #dc2626, #991b1b)' : 'linear-gradient(135deg, #06b6d4, #0891b2)'}; padding: 32px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px; color: #fff; letter-spacing: 2px;">
          ${isEmergency ? '🚨 EMERGENCY BLOOD REQUEST' : '🩸 BLOOD REQUEST'}
        </h1>
      </div>
      
      <!-- Body -->
      <div style="padding: 32px;">
        <p style="font-size: 16px; margin-bottom: 20px; color: #cbd5e1;">
          Dear <strong style="color: #fff;">${donorName}</strong>,
        </p>
        
        <p style="font-size: 15px; color: #94a3b8; line-height: 1.6;">
          <strong style="color: #06b6d4;">${hospitalName}</strong> has raised ${isEmergency ? 'an <strong style="color: #dc2626;">emergency</strong>' : 'a'} blood request for blood group <strong style="color: #dc2626; font-size: 18px;">${bloodGroup}</strong>.
        </p>
        
        <div style="background: #1a1a1a; border: 1px solid #334155; border-radius: 12px; padding: 20px; margin: 24px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 13px;">Hospital</td>
              <td style="padding: 8px 0; color: #fff; font-weight: bold; text-align: right;">${hospitalName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 13px;">Blood Group Required</td>
              <td style="padding: 8px 0; color: #dc2626; font-weight: bold; text-align: right; font-size: 16px;">${bloodGroup}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 13px;">Priority</td>
              <td style="padding: 8px 0; font-weight: bold; text-align: right; color: ${isEmergency ? '#dc2626' : urgency === 'high' ? '#eab308' : '#06b6d4'};">${urgency.toUpperCase()}</td>
            </tr>
          </table>
        </div>

        <p style="font-size: 14px; color: #94a3b8; line-height: 1.6;">
          Please log in to <strong style="color: #06b6d4;">BloodLink</strong> to accept or decline this request. Your response helps save lives.
        </p>

        <div style="text-align: center; margin-top: 28px;">
          <a href="http://localhost:5173/donor-dashboard" style="display: inline-block; background: #dc2626; color: #fff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; letter-spacing: 1px; text-transform: uppercase;">
            Respond Now
          </a>
        </div>
      </div>

      <!-- Footer -->
      <div style="padding: 20px 32px; border-top: 1px solid #1e293b; text-align: center;">
        <p style="font-size: 11px; color: #475569; margin: 0;">
          Blood Donor Finder — Developed by Aryan Naik, Hitesh Wagh, Vaibhav Bawaskar, Agastya Aher
        </p>
      </div>
    </div>
  `;

  try {
    const info = await transport.sendMail({
      from: '"BloodLink 🩸" <bloodlink@notification.com>',
      to: donorEmail,
      subject,
      html
    });

    console.log(`📧 Email sent to ${donorEmail} — Preview: ${nodemailer.getTestMessageUrl(info)}`);
    return info;
  } catch (err) {
    console.error(`📧 Failed to send email to ${donorEmail}:`, err.message);
    return null;
  }
}

/**
 * Send a donor acceptance notification email to the hospital
 */
export async function sendDonorAcceptedEmail(hospitalEmail, hospitalName, donorName, bloodGroup) {
  const transport = await getTransporter();
  if (!transport) return null;

  try {
    const info = await transport.sendMail({
      from: '"BloodLink 🩸" <bloodlink@notification.com>',
      to: hospitalEmail,
      subject: `✅ Donor Accepted: ${donorName} (${bloodGroup})`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; background: #0a0a0a; color: #e2e8f0; border-radius: 12px; padding: 32px; border: 1px solid #334155;">
          <h2 style="color: #22c55e; margin-top: 0;">✅ Donor Accepted Your Request</h2>
          <p><strong style="color: #fff;">${donorName}</strong> (Blood Group: <strong style="color: #dc2626;">${bloodGroup}</strong>) has accepted your blood request.</p>
          <p style="color: #64748b; font-size: 13px; margin-top: 20px;">— BloodLink Notification Service</p>
        </div>
      `
    });
    console.log(`📧 Acceptance email sent to ${hospitalEmail} — Preview: ${nodemailer.getTestMessageUrl(info)}`);
    return info;
  } catch (err) {
    console.error(`📧 Failed to send acceptance email:`, err.message);
    return null;
  }
}
