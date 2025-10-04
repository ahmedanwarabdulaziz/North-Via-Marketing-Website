# NVM Marketing Website

A professional, modern website for NVM Marketing built with Next.js 14, featuring a unique design with a vertical gray column layout and comprehensive SEO optimization.

## 🎨 Design Features

- **Unique Vertical Column Design**: Gray column spanning header + 2/3 of hero section with logo placement
- **Brand Colors**: 
  - Orange: #f27921 (header background)
  - Blue: #274290 (text and accents)
  - Gray: #e6e7e8 (vertical column and backgrounds)
- **Professional Typography**: Inter for body text, Playfair Display for headings
- **Responsive Design**: Mobile-first approach with smooth animations

## 🚀 Features

- **Next.js 14** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Professional SEO** optimization
- **Responsive Design** for all devices
- **Interactive Components** with smooth animations
- **Contact Form** with validation
- **Modern UI/UX** with hover effects and transitions

## 📁 Project Structure

```
├── app/
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── Hero.tsx
│   │   ├── Services.tsx
│   │   ├── About.tsx
│   │   ├── Contact.tsx
│   │   └── Footer.tsx
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── public/
├── package.json
├── tailwind.config.js
├── next.config.js
└── tsconfig.json
```

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd nvm-marketing-website
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📦 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## 🎯 SEO Features

- **Meta Tags**: Comprehensive meta descriptions, titles, and Open Graph tags
- **Structured Data**: Ready for schema markup implementation
- **Performance**: Optimized images and fast loading times
- **Accessibility**: ARIA labels and semantic HTML
- **Mobile-Friendly**: Responsive design for all screen sizes

## 🎨 Customization

### Brand Colors
Update the colors in `tailwind.config.js`:
```javascript
colors: {
  brand: {
    orange: '#f27921',
    blue: '#274290',
    gray: '#e6e7e8',
  },
}
```

### Content
- Update company information in components
- Modify services in `Services.tsx`
- Update contact information in `Contact.tsx` and `Footer.tsx`

### SEO
- Update metadata in `app/layout.tsx`
- Add your Google Analytics code
- Update social media links

## 🚀 Deployment

### Vercel (Recommended)
1. Push your code to GitHub
2. Connect your repository to Vercel
3. Deploy automatically

### Other Platforms
- **Netlify**: Use `npm run build` and deploy the `out` directory
- **AWS Amplify**: Connect your repository for automatic deployments
- **Traditional Hosting**: Use `npm run build` and upload the `out` directory

## 📱 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 📞 Support

For support or questions, please contact:
- Email: hello@nvm-marketing.com
- Phone: +1 (555) 123-4567

---

Built with ❤️ by NVM Marketing
