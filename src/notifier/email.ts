import nodemailer from "nodemailer";

interface EmailConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  to: string;
}

export async function sendEmail(
  config: EmailConfig,
  subject: string,
  body: string
): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  await transporter.sendMail({
    from: config.user,
    to: config.to,
    subject,
    text: body,
    html: body.replace(/\n/g, "<br>"),
  });
}
