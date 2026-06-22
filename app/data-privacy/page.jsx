import Navbar from '@/components/Navbar/Navbar';
import Footer from '@/components/Footer/Footer';
import './data-privacy.css';

export const metadata = {
  title: 'Data Privacy Policy | MEMPCO',
  description: 'MEMPCO Data Privacy Policy and consent notice.',
};

export default function DataPrivacyPage() {
  return (
    <>
      <Navbar />

      <main className="privacy-page">
        <article className="privacy-document">
          <h1>Data Privacy Policy</h1>

          <p>
            In compliance with Republic Act No. 10173, or the Data Privacy Act
            of 2012, its Implementing Rules and Regulations, and relevant
            issuances of the National Privacy Commission, I/we authorize the
            Micro-Entrepreneurs Multi-Purpose Cooperative (MEMPCO) and its
            authorized offices, personnel, and service providers to collect,
            use, verify, process, store, and share information obtained from
            me/us in the course of dealings with the cooperative. Such
            processing may be undertaken to offer and administer products and
            services, assess eligibility, capacity, and suitability, enforce
            contracts and legal obligations, manage risk, and comply with
            reporting duties under applicable laws, rules, regulations, and
            agreements. This information may include personal information and
            sensitive personal information and shall be processed only for
            declared, specified, and legitimate purposes.
          </p>

          <p>
            I/we consent that my/our personal data may be collected,
            processed, stored, and shared for up to five (5) years from the
            date of the last transaction or termination of my/our dealings
            with MEMPCO, unless a shorter or longer retention period is
            required by law, regulation, contract, an applicable retention
            schedule, or the establishment, exercise, or defense of legal
            claims. Personal data shall be securely disposed of when its
            retention is no longer necessary or legally justified.
          </p>

          <p>
            I/we acknowledge my/our rights under the Data Privacy Act,
            including the right to be informed whether personal data is being
            processed; to reasonable access; to request correction of
            inaccurate or incomplete information; to object to processing; to
            withdraw consent when consent is the lawful basis; to request
            erasure or blocking when legally permitted; to data portability
            when applicable; to claim damages for unlawful processing; and to
            file a complaint with the National Privacy Commission. The
            exercise of these rights remains subject to applicable legal
            conditions, legitimate grounds for processing, and MEMPCO&apos;s
            right to discontinue a product or service when the information
            required to provide it can no longer be lawfully processed.
          </p>

          <p>
            I/we authorize MEMPCO to obtain, disclose, or verify my/our
            personal data with persons or entities when reasonably necessary
            and legally permitted for the purposes stated above. MEMPCO shall
            apply appropriate safeguards and limit access and disclosure to
            authorized parties. Nothing in this policy shall waive liability
            for unlawful, negligent, or unauthorized processing of personal
            data.
          </p>

          <p className="privacy-document__contact">
            Privacy requests or concerns may be submitted to the MEMPCO Main
            Office at 3D–3E HC Marketing Building, Zamboanga City, Monday to
            Friday, 8:00 AM–4:00 PM.
          </p>
        </article>
      </main>

      <Footer />
    </>
  );
}
