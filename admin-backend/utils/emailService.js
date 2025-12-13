// ==========================================
// 📧 Flyhub Email Service (Seller + Student)
// ==========================================
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config({ path: "./.env" });

let transporter;

const getTransporter = () => {
  if (!transporter) {
    const isGmail =
      process.env.EMAIL_SERVICE?.toLowerCase() === "gmail" ||
      process.env.SMTP_HOST?.includes("gmail");

    transporter = nodemailer.createTransport({
      host: isGmail ? "smtp.gmail.com" : process.env.SMTP_HOST,
      port: isGmail ? 587 : process.env.SMTP_PORT || 587,
      secure: false, // STARTTLS (recommended)
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    transporter.verify((error) => {
      if (error) {
        console.error("❌ Mail transporter error:", error.message);
      } else {
        console.log("✅ Gmail Mail transporter ready.");
      }
    });
  }
  return transporter;
};

export async function sendBuyerWelcomeEmail(to, name) {
  try {
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: "Flyhub Marketplace <no-reply@flyhub.in>",
      to,
      subject: "Welcome to Flyhub!",
      html: `
        <h2>Hi ${name},</h2>
        <p>Your buyer account has been created successfully.</p>
        <p>Start exploring our marketplace!</p>
        <p>– Team Flyhub</p>
      `,
    });

    console.log("📧 Welcome email sent to:", to);
  } catch (err) {
    console.log("❌ Welcome email error:", err.message);
  }
}

// ============================================================
// 📨 Seller Status Notification
// ============================================================
export async function sendSellerStatusMail({
  to,
  productType,
  productName,
  status,
}) {
  const subject = `Your ${productType} "${productName}" was ${status}`;
  const html = `
    <div style="font-family:Arial,sans-serif;padding:20px;background:#f8f9fb;border-radius:10px;">
      <h2 style="color:#1a73e8;">Flyhub Seller Notification</h2>
      <p>Hello Seller,</p>
      <p>Your <strong>${productType}</strong> "<strong>${productName}</strong>" has been
      <span style="color:${status === "approved" ? "green" : "red"};font-weight:bold;">${status}</span>.</p>
      <p>Visit your <a href="https://flyhub.in/seller-dashboard" target="_blank">Seller Dashboard</a> for more details.</p>
      <hr/>
      <p style="font-size:12px;color:#666;">Team Flyhub</p>
    </div>
  `;

  try {
    await getTransporter().sendMail({
      from: `"Flyhub Admin" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`✅ Seller email sent to ${to}`);
  } catch (err) {
    console.error("❌ Error sending seller email:", err.message);
  }
}

// ============================================================
// 🎓 Student Training Enrollment Emails
// ============================================================
export async function sendEnrollmentEmails({
  studentName,
  studentEmail,
  courseTitle,
  courseDays,
  totalAmount,
}) {
  const adminEmail = process.env.ADMIN_EMAIL || "flytutor.in@gmail.com";
  const transport = getTransporter();

  const studentSubject = `🎓 Enrollment Confirmation - ${courseTitle}`;
  const studentHtml = `
    <div style="font-family:Arial,sans-serif;padding:20px;background:#f3f6ff;border-radius:10px;">
      <h2 style="color:#4b3eff;">🎉 Enrollment Successful!</h2>
      <p>Hi <strong>${studentName}</strong>,</p>
      <p>Thank you for enrolling in <strong>${courseTitle}</strong>.</p>
      <p><b>Duration:</b> ${courseDays} Days<br/>
         <b>Total Fee:</b> ₹${totalAmount}</p>
      <p>We’ll contact you soon with your training schedule.</p>
      <hr/>
      <p style="font-size:12px;color:#555;">Team Flyhub</p>
    </div>
  `;

  const adminSubject = `📥 New Training Enrollment - ${studentName}`;
  const adminHtml = `
    <div style="font-family:Arial,sans-serif;padding:20px;background:#fff7e6;border-radius:10px;">
      <h3 style="color:#d35400;">📢 New Training Enrollment</h3>
      <p><b>Name:</b> ${studentName}<br/>
         <b>Email:</b> ${studentEmail}<br/>
         <b>Course:</b> ${courseTitle}<br/>
         <b>Duration:</b> ${courseDays} Days<br/>
         <b>Amount:</b> ₹${totalAmount}</p>
      <p>Please check the <a href="https://flyhub.in/admin" target="_blank">Admin Dashboard</a> for full details.</p>
    </div>
  `;

  try {
    await transport.sendMail({
      from: `"Flyhub Training" <${process.env.EMAIL_USER}>`,
      to: studentEmail,
      subject: studentSubject,
      html: studentHtml,
    });
    console.log(`✅ Enrollment confirmation sent to student: ${studentEmail}`);
  } catch (err) {
    console.error("❌ Failed to send student confirmation email:", err.message);
  }

  try {
    await transport.sendMail({
      from: `"Flyhub System" <${process.env.EMAIL_USER}>`,
      to: adminEmail,
      subject: adminSubject,
      html: adminHtml,
    });
    console.log(`✅ Admin notified of enrollment (${studentName}).`);
  } catch (err) {
    console.error("❌ Failed to notify admin:", err.message);
  }
}

// ============================================================
//  BUYER CHANGE PASSWORD EMAIL 
// ============================================================
export const sendBuyerPasswordChangedEmail = async ({ to, name }) => {
  try {
    const transport = getTransporter(); 

    await transport.sendMail({
      from: `"Flyhub Security" <${process.env.EMAIL_USER}>`,
      to,
      subject: "Your Flyhub Password Was Changed",
      html: `
        <div style="font-family:Arial,sans-serif;padding:20px">
          <h3>🔐 Password Changed</h3>
          <p>Hi ${name || "User"},</p>
          <p>Your Flyhub account password was changed successfully.</p>
          <p><b>If this was not you</b>, please contact support immediately.</p>
          <br/>
          <p>– Flyhub Security Team</p>
        </div>
      `,
    });

    console.log("✅ Password change email sent to:", to);
  } catch (err) {
    console.error("❌ Password change email failed:", err.message);
  }
};


// ============================================================
//    SEND OTP TO USER EMAIL
// ============================================================
export const sendOtpEmail = async ({ to, name, otp }) => {
  try {
    const transport = getTransporter(); 

    await transport.sendMail({
      from: `"Flyhub Support" <${process.env.EMAIL_USER}>`,
      to,
      subject: "Your Flyhub OTP Code",
      html: `
        <div style="font-family:Arial,sans-serif;padding:20px">
          <h3>🔑 Your OTP Code</h3>
          <p>Hi ${name || "User"},</p>
          <p>Your OTP code is: <strong>${otp}</strong></p>
          <p>This code will expire in 10 minutes.</p>
          <br/>
          <p>– Flyhub Support Team</p>
        </div>
      `,  });

    console.log("✅ OTP email sent to:", to);
  } catch (err) {
    console.error("❌ OTP email failed:", err.message);
  }
};  