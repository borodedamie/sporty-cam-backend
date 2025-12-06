export const  generateGuestAdminEmailHtml = (clubName:string,fullName: string, email:string, guestFee:number, preferredTime:string, preferredDay:string) => `
        <html>
  <head>
    <meta charset="UTF-8">
    <title>Guest Payment Confirmation</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        background-color: #f4f4f7;
        color: #333;
        margin: 0;
        padding: 0;
      }
      .container {
        max-width: 600px;
        margin: 40px auto;
        background-color: #ffffff;
        border-radius: 8px;
        box-shadow: 0 2px 6px rgba(0,0,0,0.1);
        padding: 30px;
      }
      h2 {
        color: #0B53CB;
        margin-top: 0;
      }
      p {
        line-height: 1.6;
      }
      .details {
        background-color: #f9f9f9;
        border-left: 4px solid #0B53CB;
        padding: 15px 20px;
        margin: 20px 0;
        border-radius: 4px;
      }
      .details li {
        margin-bottom: 8px;
      }
      .footer {
        font-size: 0.9em;
        color: #777;
        margin-top: 30px;
      }
      .footer a {
        color: #0B53CB;
        text-decoration: none;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h2>Hello ${clubName} Team,</h2>
      <p>
        This is to notify you that a guest has successfully paid the Guest Fee for your upcoming session and is now eligible to participate as a guest player.
      </p>
      
      <div class="details">
        <ul>
          <li><strong>Name:</strong> ${fullName}</li>
          <li><strong>Email:</strong> ${email}</li>
          <li><strong>Event/Training Day:</strong>${preferredDay || 'N/A'}</li>
          <li><strong>Date:</strong>${preferredTime || 'N/A'}</li>
          <li><strong>Amount Paid:</strong> ₦${guestFee}</li>
        </ul>
      </div>

      <p>
        The player has been automatically marked as <strong>“Guest – Payment Confirmed”</strong> on your club dashboard.
      </p>

      <p>
        If there are any issues or you need additional verification, you may reach out to the guest directly from your admin dashboard.
      </p>

      <p class="footer">
        Thank you for keeping your club organized with <strong>SportyCam</strong>.<br>
        Best regards,<br>
        <em>SportyCam Automated System</em>
      </p>
    </div>
  </body>
</html>
      `;

export const generateGuestEmailHtml = (clubName: string, fullName: string, email: string, guestFee: number, preferredTime:string, preferredDay:string) => `


<html>
  <head>
    <meta charset="UTF-8">
    <title>Guest Payment Successful</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        background-color: #f4f4f7;
        color: #333;
        margin: 0;
        padding: 0;
      }
      .container {
        max-width: 600px;
        margin: 40px auto;
        background-color: #ffffff;
        border-radius: 8px;
        box-shadow: 0 2px 6px rgba(0,0,0,0.1);
        padding: 30px;
      }
      h2 {
        color: #0B53CB;
        margin-top: 0;
      }
      p {
        line-height: 1.6;
      }
      .details {
        background-color: #f9f9f9;
        border-left: 4px solid #0B53CB;
        padding: 15px 20px;
        margin: 20px 0;
        border-radius: 4px;
      }
      .details li {
        margin-bottom: 8px;
      }
      .footer {
        font-size: 0.9em;
        color: #777;
        margin-top: 30px;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h2>Hello {{GuestName}},</h2>

      <p>
        Your Guest Fee payment was received successfully.
        You are now cleared to participate in the upcoming session with <strong>{{ClubName}}</strong>.
      </p>

      <div class="details">
        <ul>
          <li><strong>Club:</strong> ${clubName}</li>
          <li><strong>Event/Training Day:</strong> ${preferredDay || 'N/A'}</li>
          <li><strong>Date:</strong> ${preferredTime || 'N/A'}</li>
          <li><strong>Amount Paid:</strong> ₦${guestFee}</li>
        </ul>
      </div>

      <p>
        When you arrive, simply inform the club admin that you have been added
        as a registered guest for the day.
      </p>

      <p>
        We wish you a great session and an amazing experience with the team!
      </p>
      <p class="footer">
        Regards,<br>
        <strong>SportyCam</strong>
      </p>
    </div>
  </body>
</html>
`