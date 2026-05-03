import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, company, service, message } = body

    // Validate required fields
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Name, email, and message are required' },
        { status: 400 }
      )
    }

    // Configure Gmail transporter
    const transporter = nodemailer.createTransport({
      host: 'smtp.purelymail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD, // Purelymail password
      },
    })

    // Verify transporter configuration
    await transporter.verify()

    // Prepare email content
    const serviceLabel = service 
      ? service.split('-').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
      : 'General Inquiry'

    // Email to business (notification)
    const businessEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #274290;">New Contact Form Submission</h2>
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          ${company ? `<p><strong>Company:</strong> ${company}</p>` : ''}
          ${service ? `<p><strong>Service Interest:</strong> ${serviceLabel}</p>` : ''}
          <p><strong>Message:</strong></p>
          <p style="white-space: pre-wrap;">${message}</p>
        </div>
        <p style="color: #666; font-size: 12px;">
          This email was sent from your website contact form.<br>
          Reply directly to this email to respond to ${name} at ${email}
        </p>
      </div>
    `

    // Email to customer (confirmation)
    const customerEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #274290 0%, #f27921 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0;">Thank You for Contacting Us!</h1>
        </div>
        <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
          <p style="font-size: 16px; color: #333;">Hi ${name},</p>
          <p style="font-size: 16px; color: #333;">
            We've received your message and appreciate you taking the time to reach out. Our team will review your inquiry and get back to you within 24 hours during business days.
          </p>
          <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f27921;">
            <p style="margin: 0; font-weight: bold; color: #274290;">What's Next?</p>
            <ul style="margin: 10px 0; padding-left: 20px; color: #666;">
              <li>We'll review your inquiry carefully</li>
              <li>One of our team members will respond personally</li>
              <li>We may schedule a free consultation call to discuss your needs</li>
            </ul>
          </div>
          <p style="font-size: 16px; color: #333;">
            If you have any urgent questions, feel free to call us at <a href="tel:+16476753343" style="color: #f27921;">+1 (647) 675-3343</a>.
          </p>
          <p style="font-size: 16px; color: #333; margin-top: 30px;">
            Best regards,<br>
            <strong>The North Via Marketing Team</strong>
          </p>
        </div>
        <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
          <p>509 Dundas St W, Oakville, ON L6M 5P4, Canada</p>
          <p>
            <a href="https://northviamarketing.com" style="color: #274290;">northviamarketing.com</a> | 
            <a href="mailto:info@northviamarketing.com" style="color: #274290;">info@northviamarketing.com</a>
          </p>
        </div>
      </div>
    `

    // Send email to business
    const businessMailOptions = {
      from: `"${process.env.GMAIL_FROM_NAME || 'North Via Marketing'}" <${process.env.GMAIL_USER}>`,
      to: process.env.BUSINESS_EMAIL || process.env.GMAIL_USER,
      replyTo: email, // This allows replying directly to the customer
      subject: `New Contact Form: ${name} - ${serviceLabel}`,
      html: businessEmailHtml,
      text: `
New Contact Form Submission

Name: ${name}
Email: ${email}
${company ? `Company: ${company}` : ''}
${service ? `Service Interest: ${serviceLabel}` : ''}

Message:
${message}

---
Reply to this email to respond to ${name} at ${email}
      `.trim(),
    }

    // Send email to customer
    const customerMailOptions = {
      from: `"${process.env.GMAIL_FROM_NAME || 'North Via Marketing'}" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: 'Thank You for Contacting North Via Marketing',
      html: customerEmailHtml,
      text: `
Thank You for Contacting North Via Marketing!

Hi ${name},

We've received your message and appreciate you taking the time to reach out. Our team will review your inquiry and get back to you within 24 hours during business days.

What's Next?
- We'll review your inquiry carefully
- One of our team members will respond personally
- We may schedule a free consultation call to discuss your needs

If you have any urgent questions, feel free to call us at +1 (647) 675-3343.

Best regards,
The North Via Marketing Team

509 Dundas St W, Oakville, ON L6M 5P4, Canada
northviamarketing.com | info@northviamarketing.com
      `.trim(),
    }

    // Send both emails
    await Promise.all([
      transporter.sendMail(businessMailOptions),
      transporter.sendMail(customerMailOptions),
    ])

    return NextResponse.json(
      { 
        success: true, 
        message: 'Emails sent successfully' 
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Email error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to send email',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}



