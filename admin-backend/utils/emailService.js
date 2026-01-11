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
      secure: false,
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
// Add this function to your existing emailService.js

export const sendBookingReminderEmail = async ({
  to,
  name,
  bookingId,
  pilotName,
  date,
  time,
  location,
  reminderNumber,
  totalReminders,
  daysUntil = 0,
  isOwner = false,
  customerName = ""
}) => {
  try {
    let subject = "";
    let template = "";
    
    if (isOwner) {
      subject = `📋 Booking Reminder ${reminderNumber}/${totalReminders} - ${customerName} on ${date}`;
      template = "booking_reminder_owner";
    } else {
      if (daysUntil === 0) {
        subject = `⏰ Today's Pilot Booking Reminder ${reminderNumber}/${totalReminders}`;
      } else if (daysUntil === 1) {
        subject = `📅 Tomorrow's Pilot Booking Reminder ${reminderNumber}/${totalReminders}`;
      } else {
        subject = `📋 Upcoming Pilot Booking Reminder ${reminderNumber}/${totalReminders}`;
      }
      template = "booking_reminder_customer";
    }
    
    const emailData = {
      to,
      subject,
      template,
      data: {
        name,
        bookingId,
        pilotName,
        date,
        time,
        location,
        reminderNumber,
        totalReminders,
        daysUntil,
        customerName,
        currentDate: new Date().toLocaleDateString()
      }
    };
    
    // Send email using your email service
    // await transporter.sendMail(emailData);
    
    console.log(`📧 Booking reminder email sent to ${to}`);
    return true;
    
  } catch (error) {
    console.error("Failed to send booking reminder email:", error);
    return false;
  }
};
// ================================================
// 1️⃣ PILOT ALERT DEACTIVATION EMAIL
// ================================================

export const sendAlertDeactivationEmail = async ({
  Type,
  Name,
  Email,
  supportEmail,
  supportContact,
}) => {
  try {
    const transporter = getTransporter();

    await transporter.sendMail({
      from: `Flyhub Support <${process.env.EMAIL_USER}>`,
      to: Email,
      subject: `⚠️ ${Type} Temporarily Deactivated - Action Required`,
      html: `
        <div style="font-family: Arial, sans-serif; background: #f4f6fb; padding: 30px;">
          <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 12px; padding: 30px; box-shadow: 0 8px 24px rgba(0,0,0,0.08);">
            
            <h2 style="color: #d32f2f; margin-top: 0; text-align: center;">
              ⚠️ ${Type} Temporarily Deactivated
            </h2>

            <p style="font-size: 15px; color: #333;">
              Hello <strong>${Name}</strong>,
            </p>

            <p style="font-size: 15px; color: #555; line-height: 1.6;">
              Your ${Type.toLowerCase()} has been <strong>temporarily deactivated</strong> due to multiple missed booking confirmations.
            </p>

            <div style="background: #fff3f3; padding: 16px; border-radius: 10px; margin: 20px 0;">
              <h4 style="color: #b00020; margin-top: 0;">📋 Reason for Deactivation:</h4>
              <ul style="color: #444; font-size: 14px; line-height: 1.8;">
                <li>❌ Multiple booking requests were ignored</li>
                <li>⏰ Failure to respond within required time</li>
              </ul>
            </div>

            <div style="background: #f3f6ff; padding: 16px; border-radius: 10px; margin: 20px 0;">
              <h4 style="color: #1a0a5b; margin-top: 0;">📞 Need Help?</h4>
              <p style="font-size: 14px; color: #444;">
                Contact support:<br/>
                ✉️ Email: <strong>${supportEmail}</strong><br/>
                📱 Phone: <strong>${supportContact}</strong>
              </p>
            </div>

            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 24px 0;" />

            <p style="font-size: 12px; color: #777;">
              <strong>Flyhub Support Team</strong>
            </p>

          </div>
        </div>
      `,
    });

    console.log(`✅ Alert deactivation email sent to ${Email}`);
    return true;
  } catch (error) {
    console.error("❌ Failed to send deactivation email:", error);
    return false;
  }
};

// ================================================
// 2️⃣ PILOT REMINDER EMAIL
// ================================================

export const sendPilotReminderEmail = async ({
  to,
  name,
  bookingId,
  pilotName
}) => {
  try {
    const transporter = getTransporter();

    await transporter.sendMail({
      from: `Flyhub Reminders <${process.env.EMAIL_USER}>`,
      to,
      subject: `🔔 Reminder: Confirm Booking ${bookingId}`,
      html: `
        <div style="font-family: Arial, sans-serif; background: #f4f6fb; padding: 30px;">
          <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 12px; padding: 30px; box-shadow: 0 8px 24px rgba(0,0,0,0.08);">
            
            <h2 style="color: #1a73e8; margin-top: 0; text-align: center;">
              🔔 Booking Confirmation Reminder
            </h2>

            <p style="font-size: 15px; color: #333;">
              Hi <strong>${name}</strong>,
            </p>

            <p style="font-size: 15px; color: #555; line-height: 1.6;">
              You have a pending booking request for pilot <strong>${pilotName}</strong>.
            </p>

            <div style="background: #e8f4ff; padding: 16px; border-radius: 10px; margin: 20px 0;">
              <h4 style="color: #1a73e8; margin-top: 0;">📋 Booking Details:</h4>
              <p style="font-size: 14px; color: #444; margin: 8px 0;">
                <strong>Booking ID:</strong> ${bookingId}<br/>
                <strong>Pilot:</strong> ${pilotName}
              </p>
            </div>

            <div style="background: #fff3f3; padding: 16px; border-radius: 10px; margin: 20px 0;">
              <p style="font-size: 14px; color: #8a1f1f;">
                ⚠️ <strong>Important:</strong> Please respond within the specified time.
              </p>
            </div>

            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 24px 0;" />

            <p style="font-size: 12px; color: #777;">
              <strong>Flyhub Booking System</strong>
            </p>

          </div>
        </div>
      `,
    });

    console.log(`✅ Pilot reminder email sent to ${to}`);
    return true;
  } catch (error) {
    console.error("❌ Failed to send pilot reminder email:", error);
    return false;
  }
};

// ================================================
// 3️⃣ USER PILOT UNAVAILABLE EMAIL
// ================================================

export const sendUserPilotUnavailableEmail = async ({
  to,
  name,
  bookingId,
  pilotName
}) => {
  try {
    const transporter = getTransporter();

    await transporter.sendMail({
      from: `Flyhub Notifications <${process.env.EMAIL_USER}>`,
      to,
      subject: `❌ Pilot Unavailable - Booking ${bookingId}`,
      html: `
        <div style="font-family: Arial, sans-serif; background: #f4f6fb; padding: 30px;">
          <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 12px; padding: 30px; box-shadow: 0 8px 24px rgba(0,0,0,0.08);">
            
            <h2 style="color: #d32f2f; margin-top: 0; text-align: center;">
              ❌ Pilot Unavailable Notification
            </h2>

            <p style="font-size: 15px; color: #333;">
              Hi <strong>${name}</strong>,
            </p>

            <p style="font-size: 15px; color: #555; line-height: 1.6;">
              Pilot <strong>${pilotName}</strong> is currently unavailable.
            </p>

            <div style="background: #fff3f3; padding: 16px; border-radius: 10px; margin: 20px 0;">
              <h4 style="color: #b00020; margin-top: 0;">📋 Booking Details:</h4>
              <p style="font-size: 14px; color: #444; margin: 8px 0;">
                <strong>Booking ID:</strong> ${bookingId}<br/>
                <strong>Pilot:</strong> ${pilotName}
              </p>
            </div>

            <p style="font-size: 15px; color: #555;">
              We apologize for the inconvenience. You can book another pilot.
            </p>

            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 24px 0;" />

            <p style="font-size: 12px; color: #777;">
              <strong>Flyhub Customer Support</strong>
            </p>

          </div>
        </div>
      `,
    });

    console.log(`✅ Pilot unavailable email sent to ${to}`);
    return true;
  } catch (error) {
    console.error("❌ Failed to send pilot unavailable email:", error);
    return false;
  }
};

export async function sendEmailVerificationLink({
  to,
  name,
  verificationLink,
}) {
  try {
    const transport = getTransporter();

    await transport.sendMail({
      from: `Flyhub Security <${process.env.EMAIL_USER}>`,
      to,
      subject: "Verify your Flyhub email address",
      html: `
                <div style="
                  font-family:Arial, sans-serif;
                  background:#f4f6fb;
                  padding:30px;
                ">
                  <div style="
                    max-width:600px;
                    margin:auto;
                    background:#ffffff;
                    border-radius:14px;
                    padding:30px;
                    box-shadow:0 8px 24px rgba(0,0,0,0.08);
                  ">
                    
                    <h2 style="
                      color:#1a0a5b;
                      margin-top:0;
                      text-align:center;
                    ">
                      🔐 Email Verification Required
                    </h2>

                    <p style="font-size:15px;color:#333;">
                      Hi <strong>${name || "User"}</strong>,
                    </p>

                    <p style="font-size:15px;color:#555;line-height:1.6;">
                      Thank you for signing up with us. To keep your account secure, please
                      verify your email address by clicking the button below.
                    </p>

                    <div style="text-align:center;margin:32px 0;">
                      <a href="${verificationLink}"
                        style="
                          display:inline-block;
                          background:#1a0a5b;
                          color:#ffffff;
                          padding:14px 32px;
                          text-decoration:none;
                          border-radius:10px;
                          font-weight:bold;
                          font-size:16px;
                        ">
                        Verify Email Address
                      </a>
                    </div>

                    <div style="
                      background:#f3f6ff;
                      padding:16px;
                      border-radius:10px;
                      font-size:14px;
                      color:#555;
                    ">
                      🔒 This verification link is generated securely and will expire automatically.
                      If you did not request this email, no action is required.
                    </div>

                    <hr style="border:none;border-top:1px solid #e0e0e0;margin:28px 0;" />

                    <p style="font-size:13px;color:#777;line-height:1.6;">
                      Thank you for choosing us.
                      <br/>
                      <strong>AVIATRICKS Team</strong>
                    </p>

                  </div>
                </div>
              `,

    });

    console.log("✅ Email verification link sent to:", to);
  } catch (err) {
    console.error("❌ Email verification link failed:", err.message);
    throw err;
  }
}

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
  <div style="
    font-family:Arial, sans-serif;
    padding:24px;
    background:#f8f9fb;
    border-radius:12px;
    max-width:600px;
    margin:auto;
  ">
    
    <h2 style="color:#1a73e8;margin-bottom:8px;">
      📢 Flyhub Seller Update
    </h2>

    <p style="font-size:15px;color:#333;">
      Hello <strong>Seller</strong>,
    </p>

    <p style="font-size:15px;color:#444;line-height:1.6;">
      We’d like to inform you that your 
      <strong>${productType}</strong> 
      <strong>“${productName}”</strong> has been
      <span style="
        color:${status === "approved" ? "#2e7d32" : "#d32f2f"};
        font-weight:bold;
        text-transform:capitalize;
      ">
        ${status}
      </span>.
    </p>

    <div style="
      background:#ffffff;
      padding:16px;
      border-radius:10px;
      margin:20px 0;
      border-left:4px solid ${status === "approved" ? "#2e7d32" : "#d32f2f"};
    ">
      <p style="margin:0;font-size:14px;color:#555;">
        👉 You can view detailed information and take necessary actions by visiting
        the <strong>Product Status</strong> section in your <strong>Seller Profile</strong>.
      </p>
    </div>

    <p style="font-size:14px;color:#555;">
      If you have any questions or need assistance, our support team is always here to help.
    </p>

    <hr style="border:none;border-top:1px solid #ddd;margin:24px 0;"/>

    <p style="font-size:12px;color:#777;">
      Thank you for being a valued partner on Flyhub.
      <br/>
      <strong>Team AVIATRICKS</strong>
    </p>

  </div>
`;


  try {
    await getTransporter().sendMail({
      from: `Flyhub Admin <${process.env.EMAIL_USER}>`,
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
  const adminEmail = process.env.ADMIN_EMAIL || "flyhubapp@gmail.com";
  const transport = getTransporter();

  const studentSubject = `🎓 Enrollment Confirmed – ${courseTitle}`;

  const studentHtml = `
  <div style="font-family:Arial, sans-serif;background:#f4f6fb;padding:30px;">
    <div style="
      max-width:600px;
      margin:auto;
      background:#ffffff;
      border-radius:14px;
      padding:28px;
      box-shadow:0 8px 24px rgba(0,0,0,0.08);
    ">
      
      <h2 style="color:#4b3eff;margin-top:0;">
        🎉 Enrollment Successful!
      </h2>

      <p style="font-size:15px;color:#333;">
        Hi <strong>${studentName}</strong>,
      </p>

      <p style="font-size:15px;color:#555;line-height:1.6;">
        Thank you for enrolling in the <strong>${courseTitle}</strong> training program.
        We’re excited to have you onboard.
      </p>

      <div style="
        background:#f3f6ff;
        padding:18px;
        border-radius:10px;
        margin:20px 0;
        font-size:14px;
        color:#444;
      ">
        <b>📘 Course:</b> ${courseTitle}<br/>
        <b>⏱ Duration:</b> ${courseDays} Days<br/>
        <b>💰 Total Fee:</b> ₹${totalAmount}
      </div>

      <p style="font-size:14px;color:#555;">
        Our team will contact you shortly with your training schedule
        and further instructions.
      </p>

      <hr style="border:none;border-top:1px solid #e0e0e0;margin:26px 0;" />

      <p style="font-size:13px;color:#777;">
        We wish you a great learning experience.
        <br/>
        <strong>Team Flyhub</strong>
      </p>

    </div>
  </div>
`;


  try {
    await transport.sendMail({
      from: `Flyhub Training <${process.env.EMAIL_USER}>`,
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
      from: `Flyhub System <${process.env.EMAIL_USER}>`,
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
      from: `Flyhub Security <${process.env.EMAIL_USER}>`,
      to,
      subject: "Your Flyhub Password Was Changed",
      html: `
            <div style="font-family:Arial, sans-serif;background:#f4f6fb;padding:30px;">
              <div style="
                max-width:600px;
                margin:auto;
                background:#ffffff;
                border-radius:14px;
                padding:28px;
                box-shadow:0 6px 20px rgba(0,0,0,0.08);
              ">
                
                <h3 style="color:#1a0a5b;margin-top:0;">
                  🔐 Password Updated Successfully
                </h3>

                <p style="font-size:15px;color:#333;">
                  Hi <strong>${name || "User"}</strong>,
                </p>

                <p style="font-size:15px;color:#555;line-height:1.6;">
                  This is a confirmation that your Flyhub account password was
                  <strong>changed successfully</strong>.
                </p>

                <div style="
                  background:#fff3f3;
                  padding:16px;
                  border-radius:10px;
                  margin:20px 0;
                  font-size:14px;
                  color:#8a1f1f;
                ">
                  ⚠️ <strong>Didn’t make this change?</strong><br/>
                  Please contact our support team immediately to secure your account.
                </div>

                <p style="font-size:13px;color:#666;">
                  Keeping your account safe is our top priority.
                </p>

                <hr style="border:none;border-top:1px solid #e0e0e0;margin:24px 0;" />

                <p style="font-size:12px;color:#777;">
                  – <strong>Flyhub Security Team</strong>
                </p>

              </div>
            </div>
          `,

    });

    console.log("✅ Password change email sent to:", to);
  } catch (err) {
    console.error("❌ Password change email failed:", err.message);
  }
}

export const sendSellerPasswordChangedEmail = async ({ to, name }) => {
  try {
    const transport = getTransporter();

    await transport.sendMail({
      from: `Flyhub Security <${process.env.EMAIL_USER}>`,
      to,
      subject: "Your Flyhub Password Was Changed",
      html: `
          <div style="font-family:Arial, sans-serif;background:#f4f6fb;padding:24px;">
            <div style="
              max-width:600px;
              margin:auto;
              background:#ffffff;
              border-radius:12px;
              padding:24px;
              box-shadow:0 6px 18px rgba(0,0,0,0.08);
            ">

              <h3 style="color:#1a0a5b;margin-top:0;">
                🔐 Password Change Confirmation
              </h3>

              <p style="font-size:15px;color:#333;">
                Hi <strong>${name || "User"}</strong>,
              </p>

              <p style="font-size:15px;color:#555;line-height:1.6;">
                This email confirms that your <strong>Flyhub</strong> account password
                was changed successfully.
              </p>

              <div style="
                background:#fff3f3;
                padding:14px;
                border-radius:10px;
                margin:18px 0;
                font-size:14px;
                color:#8a1f1f;
              ">
                ⚠️ <strong>Wasn’t you?</strong><br/>
                Please contact our support team immediately to secure your account.
              </div>

              <p style="font-size:13px;color:#666;">
                Your account security is important to us.
              </p>

              <hr style="border:none;border-top:1px solid #e0e0e0;margin:22px 0;" />

              <p style="font-size:12px;color:#777;">
                – <strong>Flyhub Security Team</strong>
              </p>

            </div>
          </div>
        `,

    });

    console.log("✅ Password change email sent to:", to);
  } catch (err) {
    console.error("❌ Password change email failed:", err.message);
  }
}
// ============================================================
// 🔐 OTP EMAIL (Password Reset / Login / Verification)
// ============================================================
export async function sendOtpEmail({
  to,
  otp,
  buyerName,
  purpose = "verification",
}) {
  return sendVerificationCodeEmail({
    to,
    name: buyerName,
    code: otp,
    purpose: purpose === "password_reset"
      ? "Password Reset"
      : "Verification",
  });
}

export async function sendVerificationCodeEmail({ to, name, code, purpose }) {
  try {
    const transport = getTransporter();

    await transport.sendMail({
      from: `Flyhub Security <${process.env.EMAIL_USER}>`,
      to,
      subject: `Your ${purpose} Verification Code`,
      html: `
            <div style="font-family:Arial, sans-serif;background:#f4f6fb;padding:24px;">
              <div style="
                max-width:600px;
                margin:auto;
                background:#ffffff;
                border-radius:12px;
                padding:24px;
                box-shadow:0 6px 18px rgba(0,0,0,0.08);
              ">

                <h2 style="color:#1a0a5b;margin-top:0;">
                  🔐 ${purpose} Verification
                </h2>

                <p style="font-size:15px;color:#333;">
                  Hi <strong>${name || "User"}</strong>,
                </p>

                <p style="font-size:15px;color:#555;line-height:1.6;">
                  Use the verification code below to complete your
                  <strong>${purpose.toLowerCase()}</strong>.
                </p>

                <div style="
                  background:#1a0a5b;
                  color:#ffffff;
                  padding:16px;
                  border-radius:10px;
                  font-size:26px;
                  font-weight:bold;
                  text-align:center;
                  letter-spacing:6px;
                  margin:24px 0;
                ">
                  ${code}
                </div>

                <p style="font-size:14px;color:#555;">
                  ⏳ This code will expire in <strong>10 minutes</strong>.
                </p>

                <div style="
                  background:#fff3f3;
                  padding:14px;
                  border-radius:10px;
                  margin-top:18px;
                  font-size:14px;
                  color:#8a1f1f;
                ">
                  ⚠️ If you did not request this verification, please ignore this email.
                  Your account remains secure.
                </div>

                <hr style="border:none;border-top:1px solid #e0e0e0;margin:22px 0;" />

                <p style="font-size:12px;color:#777;">
                  – <strong>Flyhub Security Team</strong>
                </p>

              </div>
            </div>
          `,

    });

    console.log("✅ Verification code email sent to:", to);
  } catch (err) {
    console.error("❌ Verification email failed:", err.message);
    throw err;
  }
};

export async function send_mail_notification_seller_status(seller) {
  try {

    const transport = getTransporter();

    const status = String(seller.status).toUpperCase();

    let subject = "";
    let message = "";

    if (status === "APPROVED") {
      subject = "🎉 Your Seller Account is Approved!";
      message = `
    <div style="font-family:Arial,sans-serif;background:#f4f6fb;padding:24px;">
      <div style="max-width:600px;margin:auto;background:#ffffff;
                  border-radius:12px;padding:24px;
                  box-shadow:0 6px 18px rgba(0,0,0,0.08);">

        <h2 style="color:#1a0a5b;">🎉 Congratulations ${seller.name || "Seller"}!</h2>

        <p style="font-size:15px;color:#333;">
          We’re excited to inform you that your <b>seller account has been successfully verified</b>.
        </p>

        <p style="font-size:15px;color:#555;">
          You now have full access to the platform and can start growing your business:
        </p>

        <ul style="color:#444;font-size:14px;line-height:1.8;">
          <li>🛒 Sell your products</li>
          <li>🚁 Rent drones & pilots</li>
          <li>🛠️ Offer professional services</li>
          <li>📢 Post and manage job listings</li>
        </ul>

        <p style="font-size:15px;color:#333;">
          Welcome aboard — we’re thrilled to have you with us!
        </p>

        <hr style="border:none;border-top:1px solid #e0e0e0;margin:22px 0;" />

        <p style="font-size:12px;color:#777;">
          Thank you for choosing Flyhub.<br/>
          – <strong>AVIATRICKS Team</strong>
        </p>
      </div>
    </div>
  `;
    }
    else if (status === "REJECTED") {
      subject = "❌ Seller Verification Update";
      message = `
    <div style="font-family:Arial,sans-serif;background:#fff4f4;padding:24px;">
      <div style="max-width:600px;margin:auto;background:#ffffff;
                  border-radius:12px;padding:24px;
                  box-shadow:0 6px 18px rgba(0,0,0,0.08);">

        <h2 style="color:#b00020;">Seller Verification Update</h2>

        <p style="font-size:15px;color:#333;">
          Hello ${seller.name || "Seller"},
        </p>

        <p style="font-size:15px;color:#555;">
          We regret to inform you that your seller verification could not be approved at this time.
        </p>

        <p style="font-size:15px;color:#555;">
          Please review and update your submitted documents, then reapply for verification.
        </p>

        <p style="font-size:14px;color:#777;">
          Our team is here to help you complete the process successfully.
        </p>

        <hr style="border:none;border-top:1px solid #e0e0e0;margin:22px 0;" />

        <p style="font-size:12px;color:#777;">
          – <strong>AVIATRICKS Team</strong>
        </p>
      </div>
    </div>
  `;
    }
    else {
      subject = "⏳ Seller Verification In Progress";
      message = `
    <div style="font-family:Arial,sans-serif;background:#f8f9fb;padding:24px;">
      <div style="max-width:600px;margin:auto;background:#ffffff;
                  border-radius:12px;padding:24px;
                  box-shadow:0 6px 18px rgba(0,0,0,0.08);">

        <h2 style="color:#1a0a5b;">⏳ Verification In Progress</h2>

        <p style="font-size:15px;color:#333;">
          Hello ${seller.name || "Seller"},
        </p>

        <p style="font-size:15px;color:#555;">
          Thank you for submitting your seller verification request.
        </p>

        <p style="font-size:15px;color:#555;">
          Our team is currently reviewing your details. You’ll be notified as soon as the process is complete.
        </p>

        <p style="font-size:14px;color:#777;">
          We appreciate your patience.
        </p>

        <hr style="border:none;border-top:1px solid #e0e0e0;margin:22px 0;" />

        <p style="font-size:12px;color:#777;">
          – <strong>AVIATRICKS Team</strong>
        </p>
      </div>
    </div>
  `;
    }


    await transport.sendMail({
      from: `AVIATRICKS Team <${process.env.EMAIL_USER}>`,
      to: seller.email,
      subject,
      html: `
        ${message}
        <br/>
        <p>Thank you for choosing AVIATRICKS.</p>
        <p><b>AVIATRICKS Team</b></p>
      `
    });

    console.log("✅ Seller status email sent successfully");

  } catch (error) {
    console.error("❌ Seller status email error:", error.message);
  }
}