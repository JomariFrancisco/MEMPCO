import ServiceInquiryPage from '@/components/AlliedServices/ServiceInquiryPage';

const topics = [
  {
    title: 'Available services',
    description: 'Ask which wellness or diagnostic services are currently offered.',
  },
  {
    title: 'Locations and timing',
    description: 'Confirm where services are available and whether scheduling is needed.',
  },
  {
    title: 'Access and fees',
    description: 'Check who may participate and whether requirements or costs apply.',
  },
];

export default function WellnessPage() {
  return (
    <ServiceInquiryPage
      title="Wellness & Diagnostics"
      description="For current information about MEMPCO wellness and diagnostic services, contact us. Our team can confirm what is available and what requirements apply."
      topics={topics}
    />
  );
}
