import Navbar from '@/components/Navbar/Navbar';
import Footer from '@/components/Footer/Footer';
import HeroSection from '@/components/HeroSection/HeroSection';
import InstitutionalPartners from '../components/InstitutionalPartners/InstitutionalPartners';
import AboutPreview from '../components/AboutPreview/AboutPreview';
import NewsEvents from '@/components/NewsEvents/NewsEvents';
import ServicesSection from '@/components/ServicesSection/ServicesSection';
import MemberStories from '@/components/MemberStories/MemberStories';

import './page.css';

export default function Home() {
  return (
    <>
      <Navbar />

      <main className="home-page">
        <HeroSection />

        <div className="home-flow">
          <InstitutionalPartners />
          <AboutPreview />
          <NewsEvents />
          <ServicesSection />
          <MemberStories />
        </div>
      </main>

      <Footer />
    </>
  );
}