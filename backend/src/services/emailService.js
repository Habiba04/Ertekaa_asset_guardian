const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const templates = {
  en: {
    subject: 'Asset Manager - Password Reset Verification Code',
    title: 'Password Reset Request',
    body: 'You requested a password reset for your Asset Manager administrative account.',
    validity: 'This verification code is valid for <strong>10 minutes</strong>. If you did not request this code, please ignore this email.',
    team: 'Asset Manager Security Team',
    dir: 'ltr',
  },
  ar: {
    subject: 'نظام إدارة الأصول - رمز التحقق لإعادة ضبط كلمة السر',
    title: 'طلب إعادة ضبط كلمة السر',
    body: 'لقد طلبت إعادة ضبط كلمة السر لحساب المشرف الخاص بك في نظام إدارة الأصول.',
    validity: 'رمز التحقق هذا صالحة لمدة <strong>10 دقائق</strong>. إذا لم تطلب هذا الرمز، يرجى تجاهل هذه الرسالة.',
    team: 'فريق أمان نظام إدارة الأصول',
    dir: 'rtl',
  },
};

async function sendOtpEmail(toEmail, otpCode, lang = 'en') {
  const t = templates[lang] || templates.en;

  const mailOptions = {
    from: process.env.EMAIL_FROM || '"Asset Manager" <ertekaa.noreply@gmail.com>',
    to: toEmail,
    subject: t.subject,
    html: `
      <div dir="${t.dir}" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #e1e4e8; border-radius: 8px;">
        <h2 style="color: #24292f; margin-top: 0;">${t.title}</h2>
        <p style="color: #57606a; font-size: 14px; line-height: 1.5;">
          ${t.body}
        </p>
        <div style="background-color: #f6f8fa; padding: 16px; border-radius: 6px; text-align: center; margin: 20px 0;">
          <span style="font-size: 28px; font-weight: 700; letter-spacing: 6px; color: #0969da;">${otpCode}</span>
        </div>
        <p style="color: #57606a; font-size: 13px;">
          ${t.validity}
        </p>
        <hr style="border: 0; border-top: 1px solid #d0d7de; margin: 20px 0;" />
        <p style="color: #8c959f; font-size: 11px; margin-bottom: 0;">${t.team}</p>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
}

module.exports = { sendOtpEmail };