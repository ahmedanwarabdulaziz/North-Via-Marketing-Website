import Hero from './components/Hero'
import EmpathyIntro from './components/EmpathyIntro'
import Services from './components/Services'
import HowItWorks from './components/HowItWorks'
import Portfolio from './components/Portfolio'
import WhyChooseUs from './components/WhyChooseUs'
import About from './components/About'
import Contact from './components/Contact'

export default function Home() {
  return (
    <>
      <Hero />
      <EmpathyIntro />
      <Services />
      <HowItWorks />
      <Portfolio />
      <WhyChooseUs />
      <About />
      <Contact />
    </>
  )
}
