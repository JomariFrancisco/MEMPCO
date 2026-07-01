export const COMPANY_YOUTUBE_URL = 'https://www.youtube.com/@mempcoph3541';

export const STORY_YOUTUBE_URLS = {
  villarosa: 'https://youtu.be/QwMlGNOP2gY?si=Vuc8E9pATomR654n',
  rosario: 'https://youtu.be/ublDz2mWQP0?si=vUfEwHut8r9eqw6W',
  mallorca: 'https://youtu.be/qTQaPQVCyHY?si=GyBn-USDbqnJFC8P',
};

export const getStoryYoutubeUrl = (name = '', fallback = '') => {
  const normalizedName = String(name).toLowerCase();

  if (normalizedName.includes('villarosa')) return STORY_YOUTUBE_URLS.villarosa;
  if (normalizedName.includes('rosario')) return STORY_YOUTUBE_URLS.rosario;
  if (normalizedName.includes('mallorca')) return STORY_YOUTUBE_URLS.mallorca;

  return fallback || COMPANY_YOUTUBE_URL;
};

export const MEMBER_STORIES = [
  {
    text: "Once an OFW, I invested my savings into building a small bakery. With business training and MEMPCO's support, I was able to expand my bakery, support my family, and help my children finish school.",
    name: 'Amylita Villarosa',
    role: 'Bakery Shop Owner',
    location: 'San Roque, Zamboanga City',
    image: '/MemberStories/Amylita.png',
    emoji: '',
    fullStory: [
      "Meet Amelita Villarosa, a proud entrepreneur from San Roque and the dedicated owner of her own Bakery Shop. Once an OFW, Amelita made the brave decision to invest her hard-earned savings into building a small bakery upon returning to the Philippines. Instead of spending it elsewhere, she chose to take business training and workshops, equipping herself with the knowledge and confidence to properly manage her venture.",
      "Through her perseverance and determination, she not only supported her family's needs and helped her children finish school, but also expanded her bakery with the help and support of MEMPCO. Truly, Amelita's journey is a testament that courage, learning, and faith can turn even the smallest beginnings into something remarkable.",
      "Her inspiring success story reminds us that no dream is too big when paired with hard work and the right support system. MEMPCO is proud to be part of Amelita's journey toward growth and stability, a shining example of empowerment through cooperation and perseverance.",
    ],
    tags: ['#MEMPCOStories', '#CooperativePride', '#WomenInBusiness', '#OFWtoEntrepreneur', '#InspiringJourney', '#MEMPCOSupportsSuccess'],
    youtubeUrl: STORY_YOUTUBE_URLS.villarosa,
  },
  {
    text: 'I started with a humble ukay-ukay and used my MEMPCO loan to venture into a junk shop business. Today, my business employs more than 10 workers and has expanded to multiple locations.',
    name: 'Edna Mallorca',
    role: 'Junk Shop Owner',
    location: 'Zamboanga City',
    image: '/MemberStories/Edna.png',
    emoji: '',
    fullStory: [
      "Meet Edna Gonzalez Mallorca, a driven entrepreneur and the proud owner of a Junk Shop and Demolition Contracting Business. Her journey began with a humble ukay-ukay venture, where she not only earned a living but also empowered others by teaching her fellow MEMPCO members basic sewing and tailoring skills. With a heart for growth and community, Edna laid the foundation of her entrepreneurial path through hard work and shared knowledge.",
      "In 2011, she bravely ventured into the junk shop business using her MEMPCO loan, even without having a formal space. Starting from her own home, she used her open area to store collected scrap materials while learning the ins and outs of the business. Through perseverance and determination, her efforts paid off, and by 2019, her business began to flourish. She then combined her savings with MEMPCO support to purchase a lot in Zone 8, Ayala, marking a major milestone in expanding her junk shop operations.",
      "Today, Edna's business continues to thrive, employing more than 10 workers and expanding into multiple locations, including areas in La Paz Arc and Pamucutan. From a small, risk-filled beginning to a booming and sustainable enterprise, she is now able to support her family, sustain her employees, and even enjoy the fruits of her hard work through travel and a stable lifestyle.",
    ],
    tags: ['#MEMPCOStories', '#CooperativePride', '#WomenInBusiness', '#FromHumbleBeginnings', '#MEMPCOSuccess'],
    youtubeUrl: STORY_YOUTUBE_URLS.mallorca,
  },
  {
    text: "With MEMPCO's support, I strengthened my sari-sari store and rubber buying business, and even acquired a truck and a car to help sustain and grow my livelihood for my family.",
    name: 'Girlee Del Rosario',
    role: 'Rubber Buyer & Sari-Sari Store Owner',
    location: 'Ipil, Zamboanga Sibugay',
    image: '/MemberStories/Girlee.png',
    emoji: '',
    fullStory: [
      "Meet Girlee Del Rosario, a passionate entrepreneur from Ipil, Zamboanga Sibugay, proudly managing her business as a Rubber Buyer and Sari-Sari Store Owner. Through her perseverance and dedication, Girlee was able to provide for her family and steadily grow her livelihood.",
      "With the support of MEMPCO, she expanded her opportunities, strengthening her sari-sari store and even acquiring a truck and a car, both essential in sustaining and growing her business. Truly, her story shows how determination and the right support can turn dreams into reality.",
      "As a proud MEMPCO member, Girlee continues to inspire with her resilience and vision for a brighter future. Her journey proves that when hard work meets cooperative strength, success knows no limits. Let's celebrate Girlee's achievements and may her story spark motivation for more aspiring entrepreneurs to dream big and never give up!",
    ],
    tags: ['#MEMPCOStories', '#Entrepreneurship', '#CooperativeSuccess', '#WomenInBusiness', '#InspiringJourneys'],
    youtubeUrl: STORY_YOUTUBE_URLS.rosario,
  },
];

export const toMemberStory = (post) => ({
  text: post.excerpt || '',
  name: post.title || 'MEMPCO Member',
  role: post.storyRole || 'MEMPCO Member',
  location: post.storyLocation || 'MEMPCO Community',
  image: post.image || '/Logos/Logo.png',
  emoji: '',
  fullStory: post.fullArticle?.length ? post.fullArticle : [post.excerpt || ''],
  tags: post.tags?.length ? post.tags : ['#MEMPCOStories'],
  youtubeUrl: getStoryYoutubeUrl(post.title, post.externalUrl),
});
