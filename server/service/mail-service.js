const nodemailer = require("nodemailer");
require("dotenv").config();

class MailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: false,

      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }

  async sendActivationMail(to, link) {
    await this.transporter.sendMail(
      {
        from: {
          name: "Vadim",
          address: process.env.SMTP_USER,
        },
        to,
        subject: "Активация аккаунта на " + process.env.API_URL,
        text: "",
        html: `
                            <div>
                                <h1>Для активации перейдите по ссылке</h1>
                                <a href=${link}>${link}</a>
                            </div>
                        `,
      },
      (error, info) => {
        if (error) {
          console.log("Ошибка при отправке письма:", error);
        } else {
          console.log("Письмо успешно отправлено:", info.response);
        }
      }
    );
  }
}

module.exports = new MailService();
