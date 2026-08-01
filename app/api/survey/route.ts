import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, company, results, answers } = body

    // Validate required fields
    if (!name || !email || !results) {
      return NextResponse.json(
        { error: 'Name, email, and results are required' },
        { status: 400 }
      )
    }

    // Configure Gmail transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    })

    // Verify transporter configuration
    await transporter.verify()

    // Format section titles for email
    const sectionTitleMap: { [key: string]: string } = {
      'A': 'Business Basics',
      'B': 'Website & Online Presence',
      'C': 'Social Media',
      'D': 'Advertising & Testing',
      'E': 'Customer Management',
      'F': 'Email & Automation',
      'G': 'Customer Retention',
      'H': 'Analytics & Measurement',
      'I': 'Strategy & Planning',
      'J': 'Innovation & Technology',
      'K': 'Growth Mindset'
    }

    // Helper function to convert 1-5 score to 0-100
    const convertTo100 = (score: number) => Math.round((score / 5) * 100)
    const overallScore100 = convertTo100(results.overallScore)

    // Build section details HTML for emails
    const sectionDetailsHtml = Object.keys(results.sectionDetails || {})
      .map(section => {
        const detail = results.sectionDetails[section]
        const sectionTitle = sectionTitleMap[section] || `Section ${section}`
        if (!detail) return ''
        const sectionScore100 = convertTo100(detail.score)
        
        return `
          <div style="margin-bottom: 20px; padding: 15px; background-color: #f9f9f9; border-left: 4px solid #274290; border-radius: 4px;">
            <h3 style="color: #274290; margin-top: 0;">${sectionTitle}</h3>
            <p><strong>Score:</strong> ${sectionScore100}/100 | <strong>Level:</strong> ${detail.label}</p>
            <p><strong>Status:</strong> ${detail.statusStatement}</p>
            <p><strong>Recommendations:</strong></p>
            <ul style="margin: 10px 0; padding-left: 20px;">
              ${detail.recommendations.map((rec: any) => `<li>${rec}</li>`).join('')}
            </ul>
          </div>
        `
      })
      .join('')

    // Email to business (notification with full details)
    const businessEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #274290 0%, #f27921 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0;">New Business Marketing Assessment Submission</h1>
        </div>
        <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
          <div style="background-color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #274290; margin-top: 0;">Customer Information</h2>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
            ${company ? `<p><strong>Company:</strong> ${company}</p>` : ''}
          </div>

          <div style="background-color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
            <h2 style="color: #274290; margin-top: 0;">Overall Results</h2>
            <div style="font-size: 48px; font-weight: bold; color: #274290; margin: 20px 0;">
              ${overallScore100}/100
            </div>
            <div style="font-size: 24px; font-weight: bold; color: #f27921; margin-bottom: 10px;">
              ${results.label} Level
            </div>
            <p style="color: #666;">${results.statusStatement}</p>
          </div>

          <div style="background-color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #274290; margin-top: 0;">General Recommendations</h2>
            <ul style="margin: 10px 0; padding-left: 20px;">
              ${results.generalRecommendations.map((rec: any) => `<li>${rec}</li>`).join('')}
            </ul>
          </div>

          ${sectionDetailsHtml ? `
          <div style="background-color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #274290; margin-top: 0;">Detailed Section Analysis</h2>
            ${sectionDetailsHtml}
          </div>
          ` : ''}

          ${results.flags && results.flags.length > 0 ? `
          <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #ffc107;">
            <h3 style="color: #856404; margin-top: 0;">Important Considerations</h3>
            <ul style="margin: 10px 0; padding-left: 20px; color: #856404;">
              ${results.flags.map((flag: any) => `<li>${flag}</li>`).join('')}
            </ul>
          </div>
          ` : ''}

          <div style="background-color: #e7f3ff; padding: 15px; border-radius: 8px; margin-top: 20px; border-left: 4px solid #274290;">
            <p style="margin: 0; color: #666; font-size: 14px;">
              <strong>Next Steps:</strong> Reply directly to this email to contact ${name} at ${email}
            </p>
          </div>
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

    // Email to customer (summary)
    const customerEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #274290 0%, #f27921 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0;">Your Business Marketing Assessment Results</h1>
        </div>
        <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
          <p style="font-size: 16px; color: #333;">Hi ${name},</p>
          <p style="font-size: 16px; color: #333;">
            Thank you for completing the Business Marketing Assessment! We've analyzed your responses and prepared a summary of your digital marketing maturity level.
          </p>

          <div style="background-color: white; padding: 30px; border-radius: 8px; margin: 20px 0; text-align: center; border: 2px solid #274290;">
            <div style="font-size: 56px; font-weight: bold; color: #274290; margin-bottom: 10px;">
              ${overallScore100}/100
            </div>
            <div style="font-size: 28px; font-weight: bold; color: #f27921; margin-bottom: 15px;">
              ${results.label} Level
            </div>
            <div style="width: 100%; background-color: #e0e0e0; border-radius: 10px; height: 20px; margin: 15px 0;">
              <div style="background: linear-gradient(135deg, #274290 0%, #f27921 100%); height: 100%; border-radius: 10px; width: ${overallScore100}%;"></div>
            </div>
          </div>

          <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f27921;">
            <h3 style="color: #274290; margin-top: 0;">Your Business Status</h3>
            <p style="color: #666; margin-bottom: 0;">${results.statusStatement}</p>
          </div>

          <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #274290; margin-top: 0;">Recommended Next Steps</h3>
            <ul style="margin: 10px 0; padding-left: 20px; color: #666;">
              ${results.generalRecommendations.map((rec: any) => `<li style="margin-bottom: 8px;">${rec}</li>`).join('')}
            </ul>
          </div>

          ${sectionDetailsHtml ? `
          <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #274290; margin-top: 0;">Detailed Section Analysis</h3>
            <p style="color: #666; margin-bottom: 15px;">Here's how each area of your business marketing is performing, along with specific recommendations for improvement.</p>
            ${sectionDetailsHtml}
          </div>
          ` : ''}

          ${results.flags && results.flags.length > 0 ? `
          <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <h3 style="color: #856404; margin-top: 0;">Important Considerations</h3>
            <ul style="margin: 10px 0; padding-left: 20px; color: #856404;">
              ${results.flags.map((flag: any) => `<li style="margin-bottom: 8px;">${flag}</li>`).join('')}
            </ul>
          </div>
          ` : ''}

          <div style="background-color: #e7f3ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #274290;">
            <h3 style="color: #274290; margin-top: 0;">Ready to Take Action?</h3>
            <p style="color: #666; margin-bottom: 15px;">
              Our team specializes in helping businesses like yours achieve their digital marketing goals. 
              Let's discuss how we can help you implement these recommendations.
            </p>
            <div style="text-align: center;">
              <a href="https://northviamarketing.com/contact" 
                 style="display: inline-block; background: linear-gradient(135deg, #274290 0%, #f27921 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 5px;">
                Schedule a Free Consultation
              </a>
            </div>
          </div>

          <p style="font-size: 16px; color: #333; margin-top: 30px;">
            If you have any questions about your results, feel free to call us at 
            <a href="tel:+16476753343" style="color: #f27921;">+1 (647) 675-3343</a>.
          </p>

          <p style="font-size: 16px; color: #333; margin-top: 20px;">
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

    // Build plain text versions
    const businessEmailText = `
New Business Marketing Assessment Submission

Customer Information:
Name: ${name}
Email: ${email}
${company ? `Company: ${company}` : ''}

Overall Results:
Score: ${overallScore100}/100
Level: ${results.label}
Status: ${results.statusStatement}

General Recommendations:
${results.generalRecommendations.map((rec: string, i: number) => `${i + 1}. ${rec}`).join('\n')}

Detailed Section Analysis:
${Object.keys(results.sectionDetails || {}).map(section => {
  const detail = results.sectionDetails[section]
  const sectionTitle = sectionTitleMap[section] || `Section ${section}`
  if (!detail) return ''
  const sectionScore100 = convertTo100(detail.score)
  return `
${sectionTitle}:
  Score: ${sectionScore100}/100 | Level: ${detail.label}
  Status: ${detail.statusStatement}
  Recommendations:
${detail.recommendations.map((rec: string) => `    - ${rec}`).join('\n')}`
}).join('\n')}

${results.flags && results.flags.length > 0 ? `
Important Considerations:
${results.flags.map((flag: string) => `- ${flag}`).join('\n')}
` : ''}

Reply to this email to contact ${name} at ${email}
    `.trim()

    const customerEmailText = `
Your Business Marketing Assessment Results

Hi ${name},

Thank you for completing the Business Marketing Assessment! We've analyzed your responses and prepared a summary of your digital marketing maturity level.

Overall Score: ${overallScore100}/100
Level: ${results.label}

Your Business Status:
${results.statusStatement}

Recommended Next Steps:
${results.generalRecommendations.map((rec: string, i: number) => `${i + 1}. ${rec}`).join('\n')}

Detailed Section Analysis:
${Object.keys(results.sectionDetails || {}).map(section => {
  const detail = results.sectionDetails[section]
  const sectionTitle = sectionTitleMap[section] || `Section ${section}`
  if (!detail) return ''
  const sectionScore100 = convertTo100(detail.score)
  return `
${sectionTitle}:
  Score: ${sectionScore100}/100 | Level: ${detail.label}
  Status: ${detail.statusStatement}
  Recommendations:
${detail.recommendations.map((rec: string) => `    - ${rec}`).join('\n')}`
}).join('\n')}

Ready to Take Action?
Our team specializes in helping businesses like yours achieve their digital marketing goals. 
Let's discuss how we can help you implement these recommendations.

Schedule a Free Consultation: https://northviamarketing.com/contact

If you have any questions about your results, feel free to call us at +1 (647) 675-3343.

Best regards,
The North Via Marketing Team

509 Dundas St W, Oakville, ON L6M 5P4, Canada
northviamarketing.com | info@northviamarketing.com
    `.trim()

    // Send email to business
    const businessMailOptions = {
      from: `"${process.env.GMAIL_FROM_NAME || 'North Via Marketing'}" <${process.env.GMAIL_USER}>`,
      to: process.env.BUSINESS_EMAIL || process.env.GMAIL_USER,
      replyTo: email,
      subject: `New Assessment Submission: ${name} - ${results.label} Level (${overallScore100}/100)`,
      html: businessEmailHtml,
      text: businessEmailText,
    }

    // Send email to customer
    const customerMailOptions = {
      from: `"${process.env.GMAIL_FROM_NAME || 'North Via Marketing'}" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: `Your Business Marketing Assessment Results - ${results.label} Level`,
      html: customerEmailHtml,
      text: customerEmailText,
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
    console.error('Survey email error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to send email',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}

