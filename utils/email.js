const SibApiV3Sdk = require('@getbrevo/brevo');

const sendEmail = async (options) => {
  const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

  const apiKey = apiInstance.authentications['apiKey'];
  apiKey.apiKey = process.env.BREVO_API_KEY;

  const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

  sendSmtpEmail.subject = options.subject;
  sendSmtpEmail.htmlContent = `<html><body><p>${options.message}</p></body></html>`;
  sendSmtpEmail.sender = { name: process.env.BREVO_FROM_NAME, email: process.env.BREVO_FROM_EMAIL };
  sendSmtpEmail.to = [{ email: options.email }];
  sendSmtpEmail.replyTo = { email: process.env.BREVO_FROM_EMAIL, name: process.env.BREVO_FROM_NAME };

  try {
    await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('Email sent successfully with Brevo');
  } catch (error) {
    console.error('Error sending email with Brevo:', error);
  }
};

module.exports = sendEmail;