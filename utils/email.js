const nodemailer = require('nodemailer');
const aws = require('aws-sdk');

// configure AWS SDK
aws.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

// create SES transporter
const ses = new aws.SES({ apiVersion: '2010-12-01' });

const sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    SES: { ses, aws },
  });

  const message = {
    from: `${process.env.SES_FROM_NAME} <${process.env.SES_FROM_EMAIL}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
  };

  await transporter.sendMail(message);
};

module.exports = sendEmail;
