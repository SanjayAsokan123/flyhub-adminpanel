import nodemailer from "nodemailer";

export async function sendInvoiceEmail({ to, invoiceUrl, orderId }) {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: `"Flyhub" <${process.env.MAIL_USER}>`,
    to,
    subject: `Invoice for Order ${orderId}`,
    html: `
      <p>Thank you for shopping with Flyhub.</p>
      <p>Your invoice is attached below.</p>
      <a href="${invoiceUrl}">Download Invoice</a>
    `,
  });
}
