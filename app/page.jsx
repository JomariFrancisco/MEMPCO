import Navbar from '@/components/Navbar/Navbar';
import Footer from '@/components/Footer/Footer';
import HeroSection from '@/components/HeroSection/HeroSection';
import InstitutionalPartners from '../components/InstitutionalPartners/InstitutionalPartners';
import NewsEvents from '@/components/NewsEvents/NewsEvents';
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
          <NewsEvents />
          <MemberStories />
        </div>
      </main>

      <Footer />
    </>
  );
}
