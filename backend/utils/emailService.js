const nodemailer = require('nodemailer');
require('dotenv').config();

// Create reusable transporter object using SMTP transport
const createTransporter = () => {
  // For Gmail
  if (process.env.EMAIL_SERVICE === 'gmail') {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD // Use App Password for Gmail
      }
    });
  }

  // For custom SMTP (works with most email providers)
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
};

// Send OTP email
const sendOTPEmail = async (email, otp, userName = 'User') => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"FindMech" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Password Reset Verification Code - FindMech',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333333;
              background-color: #f5f5f5;
              margin: 0;
              padding: 0;
            }
            .email-wrapper {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
            }
            .container {
              background: #ffffff;
              padding: 40px 30px;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 2px solid #f0f0f0;
            }
            .logo {
              font-size: 28px;
              font-weight: 700;
              color: #dc143c;
              margin-bottom: 10px;
            }
            .logo-icon {
              font-size: 32px;
              margin-right: 8px;
            }
            h2 {
              color: #1a1a1a;
              font-size: 24px;
              margin: 20px 0;
              font-weight: 600;
            }
            p {
              color: #555555;
              font-size: 16px;
              margin: 15px 0;
            }
            .otp-container {
              background: linear-gradient(135deg, #dc143c 0%, #b0102e 100%);
              padding: 3px;
              border-radius: 12px;
              margin: 30px 0;
              box-shadow: 0 4px 15px rgba(220, 20, 60, 0.3);
            }
            .otp-box {
              background: #ffffff;
              padding: 30px 20px;
              border-radius: 10px;
              text-align: center;
            }
            .otp-label {
              color: #666666;
              font-size: 14px;
              font-weight: 500;
              text-transform: uppercase;
              letter-spacing: 1px;
              margin-bottom: 15px;
            }
            .otp-code {
              font-size: 42px;
              font-weight: 700;
              color: #dc143c;
              letter-spacing: 12px;
              font-family: 'Courier New', Courier, monospace;
              margin: 10px 0;
              text-align: center;
              display: inline-block;
              padding: 15px 25px;
              background: #fff5f7;
              border: 2px dashed #dc143c;
              border-radius: 8px;
              min-width: 280px;
            }
            .otp-hint {
              color: #888888;
              font-size: 13px;
              margin-top: 15px;
              font-style: italic;
            }
            .warning {
              background: #fff8e1;
              border-left: 4px solid #ffc107;
              padding: 18px;
              margin: 25px 0;
              border-radius: 6px;
            }
            .warning strong {
              color: #f57c00;
              display: block;
              margin-bottom: 8px;
              font-size: 15px;
            }
            .warning ul {
              margin: 10px 0;
              padding-left: 25px;
              color: #666666;
            }
            .warning li {
              margin: 8px 0;
              font-size: 14px;
            }
            .footer {
              margin-top: 40px;
              padding-top: 25px;
              border-top: 1px solid #e0e0e0;
              font-size: 12px;
              color: #999999;
              text-align: center;
            }
            .footer p {
              margin: 5px 0;
              font-size: 12px;
            }
            @media only screen and (max-width: 600px) {
              .container {
                padding: 25px 20px;
              }
              .otp-code {
                font-size: 36px;
                letter-spacing: 8px;
                padding: 12px 15px;
                min-width: auto;
              }
              h2 {
                font-size: 20px;
              }
            }
          </style>
        </head>
        <body>
          <div class="email-wrapper">
            <div class="container">
              <div class="header">
                <div class="logo">
                   FindMech
                </div>
              </div>
              
              <h2 style="color: #1a1a1a; font-size: 24px; margin: 20px 0; font-weight: 600;">Password Reset Request</h2>
              
              <p style="color: #555555; font-size: 16px; margin: 15px 0;">Hello <strong>${userName}</strong>,</p>
              
              <p style="color: #555555; font-size: 16px; margin: 15px 0;">We received a request to reset your password for your FindMech account. Use the verification code below to proceed:</p>
              
              <div class="otp-container">
                <div class="otp-box">
                  <div class="otp-label">Your Verification Code</div>
                  <div class="otp-code">${otp}</div>
                  <div class="otp-hint">This code expires in 10 minutes</div>
                </div>
              </div>
              
              <div class="warning">
                <strong><span style="color: #ffc107; margin-right: 5px;">⚠</span> Important Security Notice:</strong>
                <ul>
                  <li>This code will expire in <strong>10 minutes</strong></li>
                  <li>If you didn't request this password reset, please ignore this email</li>
                  <li>Never share this code with anyone - FindMech staff will never ask for it</li>
                  <li>For your security, this code can only be used once</li>
                </ul>
              </div>
              
              <p style="color: #555555; font-size: 16px; margin: 15px 0;">Enter this code in the verification page to reset your password.</p>
              
              <div class="footer">
                <p>This is an automated email. Please do not reply to this message.</p>
                <p>&copy; ${new Date().getFullYear()} FindMech. All rights reserved.</p>
                <p style="margin-top: 10px; font-size: 11px; color: #bbbbbb;">If you have any questions, please contact our support team.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Password Reset Verification Code - FindMech
        
        Hello ${userName},
        
        We received a request to reset your password. Use the verification code below:
        
        ${otp}
        
        This code will expire in 10 minutes.
        
        If you didn't request this, please ignore this email.
        
        © ${new Date().getFullYear()} FindMech. All rights reserved.
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending email:', error);
    throw new Error('Failed to send email. Please try again later.');
  }
};

// Test email configuration
const testEmailConnection = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log('✅ Email server is ready to send messages');
    return true;
  } catch (error) {
    console.error('❌ Email server configuration error:', error);
    return false;
  }
};

module.exports = {
  sendOTPEmail,
  testEmailConnection
};

