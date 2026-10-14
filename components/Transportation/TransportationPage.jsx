import ServiceInquiryPage from '@/components/AlliedServices/ServiceInquiryPage';

const topics = [
  {
    title: 'Coverage and availability',
    description: 'Ask which locations and service options are currently available.',
  },
  {
    title: 'Schedules and coordination',
    description: 'Confirm timing and how to coordinate your transportation inquiry.',
  },
  {
    title: 'Requirements and fees',
    description: 'Check whether eligibility, documents, or charges apply to your request.',
  },
];

export default function TransportationPage() {
  return (
    <ServiceInquiryPage
      title="Transportation Services"
      description="For current information about MEMPCO transportation services, contact us. Our team can confirm the details and requirements relevant to your inquiry."
      topics={topics}
    />
  );
}
