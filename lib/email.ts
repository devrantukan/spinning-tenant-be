/**
 * Email utility for sending emails via SMTP
 */

import nodemailer from "nodemailer";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface SMTPConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  fromEmail: string;
  fromName: string;
}

interface OrganizationData {
  smtpHost?: string | null;
  smtpPort?: number | null;
  smtpUser?: string | null;
  smtpPassword?: string | null;
  smtpFromEmail?: string | null;
  smtpFromName?: string | null;
  language?: string | null;
  bankAccountName?: string | null;
  bankName?: string | null;
  bankAccountNumber?: string | null;
  bankIban?: string | null;
  bankSwift?: string | null;
  bankBranch?: string | null;
}

/**
 * Get SMTP configuration from organization settings or environment variables
 */
function getSMTPConfig(
  organization?: OrganizationData | null
): SMTPConfig | null {
  // Try organization settings first
  if (
    organization?.smtpHost &&
    organization?.smtpUser &&
    organization?.smtpPassword
  ) {
    return {
      host: organization.smtpHost,
      port: organization.smtpPort || 587,
      secure: organization.smtpPort === 465,
      user: organization.smtpUser,
      password: organization.smtpPassword,
      fromEmail: organization.smtpFromEmail || "info@spin8studio.com",
      fromName: organization.smtpFromName || "Spin8 Studio",
    };
  }

  // Fall back to environment variables
  const envConfig = {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    secure: process.env.SMTP_SECURE === "true",
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASSWORD,
    fromEmail: process.env.SMTP_FROM_EMAIL || "info@spin8studio.com",
    fromName: process.env.SMTP_FROM_NAME || "Spin8 Studio",
  };

  // Check if we have minimum required config
  if (envConfig.host && envConfig.user && envConfig.password) {
    return envConfig as SMTPConfig;
  }

  return null;
}

/**
 * Send email using SMTP
 */
export async function sendEmail(
  options: EmailOptions,
  organization?: OrganizationData | null
): Promise<void> {
  console.log("[EMAIL] sendEmail called:", {
    to: options.to,
    subject: options.subject,
    hasOrganization: !!organization,
  });

  const smtpConfig = getSMTPConfig(organization);

  if (!smtpConfig) {
    console.error("[EMAIL] SMTP configuration not found. Email not sent.");
    console.error("[EMAIL] Organization data:", {
      hasSmtpHost: !!organization?.smtpHost,
      hasSmtpUser: !!organization?.smtpUser,
      hasSmtpPassword: !!organization?.smtpPassword,
      envHasSmtpHost: !!process.env.SMTP_HOST,
      envHasSmtpUser: !!process.env.SMTP_USER,
      envHasSmtpPassword: !!process.env.SMTP_PASSWORD,
    });
    console.error(
      "[EMAIL] Please configure SMTP settings in organization settings or environment variables."
    );
    throw new Error("SMTP configuration not found");
  }

  console.log("[EMAIL] SMTP config found:", {
    host: smtpConfig.host,
    port: smtpConfig.port,
    secure: smtpConfig.secure,
    fromEmail: smtpConfig.fromEmail,
    fromName: smtpConfig.fromName,
    hasUser: !!smtpConfig.user,
    hasPassword: !!smtpConfig.password,
  });

  try {
    const transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      auth: {
        user: smtpConfig.user,
        pass: smtpConfig.password,
      },
    });

    // Verify connection
    await transporter.verify();
    console.log("[EMAIL] SMTP connection verified successfully");

    const mailOptions = {
      from: `"${smtpConfig.fromName}" <${smtpConfig.fromEmail}>`,
      to: options.to,
      subject: options.subject,
      text: options.text || options.html.replace(/<[^>]*>/g, ""),
      html: options.html,
    };

    console.log("[EMAIL] Sending email:", {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject,
    });

    const info = await transporter.sendMail(mailOptions);
    console.log("[EMAIL] ✓ Email sent successfully:", {
      to: options.to,
      subject: options.subject,
      messageId: info.messageId,
      response: info.response,
    });
  } catch (error: any) {
    console.error("[EMAIL] ✗ Error sending email:", {
      to: options.to,
      subject: options.subject,
      error: error.message,
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode,
      stack: error.stack,
    });
    throw error;
  }
}

/**
 * Email translations
 */
const emailTranslations = {
  en: {
    customerSubject: "Bank Transfer Order Confirmation - Spin8 Studio",
    orgSubject: "New Bank Transfer Order",
    greeting: "Dear",
    thankYou:
      "Thank you for your order! We have received your bank transfer payment request.",
    orderDetails: "Order Details",
    orderId: "Order ID",
    package: "Package",
    originalPrice: "Original Price",
    couponCode: "Coupon Code",
    discount: "Discount",
    totalAmount: "Total Amount",
    nextSteps: "Next Steps",
    nextStepsText: "Please complete the bank transfer for the amount of",
    nextStepsText2:
      "Once we receive and confirm your payment, your package will be activated and credits will be added to your account.",
    bankAccountDetails: "Bank Account Details",
    accountName: "Account Name",
    bankName: "Bank Name",
    accountNumber: "Account Number",
    iban: "IBAN",
    swift: "SWIFT",
    branch: "Branch",
    questions:
      "If you have any questions, please don't hesitate to contact us.",
    bestRegards: "Best regards",
    team: "Spin8 Studio Team",
    phone: "Phone",
    newOrder:
      "A new bank transfer order has been placed and requires payment confirmation.",
    customer: "Customer",
    customerEmail: "Customer Email",
    actionRequired: "Action Required",
    actionRequiredText:
      "Please wait for the customer to complete the bank transfer and then confirm the payment in the admin panel to activate the package.",
    automatedNotification:
      "This is an automated notification from Spin8 Studio",
  },
  tr: {
    customerSubject: "Banka Havalesi Sipariş Onayı - Spin8 Studio",
    orgSubject: "Yeni Banka Havalesi Siparişi",
    greeting: "Sayın",
    thankYou:
      "Siparişiniz için teşekkür ederiz! Banka havalesi ödeme talebinizi aldık.",
    orderDetails: "Sipariş Detayları",
    orderId: "Sipariş No",
    package: "Paket",
    originalPrice: "Orijinal Fiyat",
    couponCode: "Kupon Kodu",
    discount: "İndirim",
    totalAmount: "Toplam Tutar",
    nextSteps: "Sonraki Adımlar",
    nextStepsText: "Lütfen aşağıdaki tutar için banka havalesi yapın",
    nextStepsText2:
      "Ödemenizi aldığımız ve onayladığımızda, paketiniz aktif edilecek ve kredileriniz hesabınıza eklenecektir.",
    bankAccountDetails: "Banka Hesap Bilgileri",
    accountName: "Hesap Adı",
    bankName: "Banka Adı",
    accountNumber: "Hesap Numarası",
    iban: "IBAN",
    swift: "SWIFT",
    branch: "Şube",
    questions:
      "Herhangi bir sorunuz varsa, lütfen bizimle iletişime geçmekten çekinmeyin.",
    bestRegards: "Saygılarımızla",
    team: "Spin8 Studio Ekibi",
    phone: "Telefon",
    newOrder:
      "Yeni bir banka havalesi siparişi verildi ve ödeme onayı gerekiyor.",
    customer: "Müşteri",
    customerEmail: "Müşteri E-postası",
    actionRequired: "Gerekli İşlem",
    actionRequiredText:
      "Lütfen müşterinin banka havalesini tamamlamasını bekleyin ve ardından paketi aktif etmek için admin panelinde ödemeyi onaylayın.",
    automatedNotification: "Bu Spin8 Studio'dan otomatik bir bildirimdir",
  },
};

/**
 * Send bank transfer order notification emails
 */
export async function sendBankTransferOrderEmails(
  customerEmail: string,
  organizationEmail: string,
  orderDetails: {
    packageName: string;
    packageCode: string;
    price: number;
    finalPrice: number;
    discountAmount?: number;
    couponCode?: string;
    memberName?: string;
    orderId?: string;
  },
  organization?: OrganizationData | null
): Promise<void> {
  const {
    packageName,
    packageCode,
    price,
    finalPrice,
    discountAmount,
    couponCode,
    memberName,
    orderId,
  } = orderDetails;

  // Determine language (default to English)
  const lang = organization?.language === "tr" ? "tr" : "en";
  const t = emailTranslations[lang];

  // Bank account details section
  const hasBankDetails =
    organization?.bankAccountName ||
    organization?.bankIban ||
    organization?.bankAccountNumber;

  const bankDetailsHtml = hasBankDetails
    ? `
          <div class="bank-details" style="background-color: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 20px; margin: 20px 0; border-radius: 4px;">
            <h3 style="margin-top: 0; color: #0c4a6e;">${
              t.bankAccountDetails
            }</h3>
            ${
              organization?.bankAccountName
                ? `<div class="detail-row"><span class="label">${t.accountName}:</span><span class="value">${organization.bankAccountName}</span></div>`
                : ""
            }
            ${
              organization?.bankName
                ? `<div class="detail-row"><span class="label">${t.bankName}:</span><span class="value">${organization.bankName}</span></div>`
                : ""
            }
            ${
              organization?.bankAccountNumber
                ? `<div class="detail-row"><span class="label">${t.accountNumber}:</span><span class="value">${organization.bankAccountNumber}</span></div>`
                : ""
            }
            ${
              organization?.bankIban
                ? `<div class="detail-row"><span class="label">${t.iban}:</span><span class="value" style="font-family: monospace;">${organization.bankIban}</span></div>`
                : ""
            }
            ${
              organization?.bankSwift
                ? `<div class="detail-row"><span class="label">${t.swift}:</span><span class="value">${organization.bankSwift}</span></div>`
                : ""
            }
            ${
              organization?.bankBranch
                ? `<div class="detail-row"><span class="label">${t.branch}:</span><span class="value">${organization.bankBranch}</span></div>`
                : ""
            }
          </div>
        `
    : "";

  // Customer email
  const customerEmailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #f97316; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .order-details { background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
        .detail-row:last-child { border-bottom: none; }
        .label { font-weight: bold; color: #6b7280; }
        .value { color: #111827; }
        .total { font-size: 1.2em; font-weight: bold; color: #f97316; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 0.9em; }
        .note { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .bank-details { background-color: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 20px; margin: 20px 0; border-radius: 4px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${
            lang === "tr"
              ? "Banka Havalesi Sipariş Onayı"
              : "Bank Transfer Order Confirmation"
          }</h1>
        </div>
        <div class="content">
          <p>${t.greeting} ${
    memberName || (lang === "tr" ? "Müşteri" : "Customer")
  },</p>
          <p>${t.thankYou}</p>
          
          <div class="order-details">
            <h2 style="margin-top: 0;">${t.orderDetails}</h2>
            ${
              orderId
                ? `<div class="detail-row"><span class="label">${t.orderId}:</span><span class="value">${orderId}</span></div>`
                : ""
            }
            <div class="detail-row"><span class="label">${
              t.package
            }:</span><span class="value">${packageName} (${packageCode})</span></div>
            ${
              discountAmount && discountAmount > 0
                ? `
              <div class="detail-row"><span class="label">${
                t.originalPrice
              }:</span><span class="value">${price.toFixed(2)} ₺</span></div>
              ${
                couponCode
                  ? `<div class="detail-row"><span class="label">${t.couponCode}:</span><span class="value">${couponCode}</span></div>`
                  : ""
              }
              <div class="detail-row"><span class="label">${
                t.discount
              }:</span><span class="value">-${discountAmount.toFixed(
                    2
                  )} ₺</span></div>
            `
                : ""
            }
            <div class="detail-row total"><span class="label">${
              t.totalAmount
            }:</span><span class="value">${finalPrice.toFixed(2)} ₺</span></div>
          </div>

          ${bankDetailsHtml}

          <div class="note">
            <strong>${t.nextSteps}:</strong><br>
            ${t.nextStepsText} <strong>${finalPrice.toFixed(2)} ₺</strong>.<br>
            ${t.nextStepsText2}
          </div>

          <p>${t.questions}</p>
          
          <div class="footer">
            <p>${t.bestRegards},<br>${t.team}</p>
            <p>Email: info@spin8studio.com<br>${t.phone}: +90 544 157 15 49</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  // Organization email
  const organizationEmailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #f97316; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .order-details { background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
        .detail-row:last-child { border-bottom: none; }
        .label { font-weight: bold; color: #6b7280; }
        .value { color: #111827; }
        .total { font-size: 1.2em; font-weight: bold; color: #f97316; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 0.9em; }
        .alert { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${t.orgSubject}</h1>
        </div>
        <div class="content">
          <p>${t.newOrder}</p>
          
          <div class="order-details">
            <h2 style="margin-top: 0;">${t.orderDetails}</h2>
            ${
              orderId
                ? `<div class="detail-row"><span class="label">${t.orderId}:</span><span class="value">${orderId}</span></div>`
                : ""
            }
            <div class="detail-row"><span class="label">${
              t.customer
            }:</span><span class="value">${memberName || "N/A"}</span></div>
            <div class="detail-row"><span class="label">${
              t.customerEmail
            }:</span><span class="value">${customerEmail}</span></div>
            <div class="detail-row"><span class="label">${
              t.package
            }:</span><span class="value">${packageName} (${packageCode})</span></div>
            ${
              discountAmount && discountAmount > 0
                ? `
              <div class="detail-row"><span class="label">${
                t.originalPrice
              }:</span><span class="value">${price.toFixed(2)} ₺</span></div>
              ${
                couponCode
                  ? `<div class="detail-row"><span class="label">${t.couponCode}:</span><span class="value">${couponCode}</span></div>`
                  : ""
              }
              <div class="detail-row"><span class="label">${
                t.discount
              }:</span><span class="value">-${discountAmount.toFixed(
                    2
                  )} ₺</span></div>
            `
                : ""
            }
            <div class="detail-row total"><span class="label">${
              t.totalAmount
            }:</span><span class="value">${finalPrice.toFixed(2)} ₺</span></div>
          </div>

          <div class="alert">
            <strong>${t.actionRequired}:</strong><br>
            ${t.actionRequiredText}
          </div>

          <div class="footer">
            <p>${t.automatedNotification}</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  // Send emails
  const emailPromises = [
    sendEmail(
      {
        to: customerEmail,
        subject: t.customerSubject,
        html: customerEmailHtml,
      },
      organization
    ),
    sendEmail(
      {
        to: organizationEmail,
        subject: `${t.orgSubject} - ${packageName}`,
        html: organizationEmailHtml,
      },
      organization
    ),
  ];

  await Promise.all(emailPromises);
}
