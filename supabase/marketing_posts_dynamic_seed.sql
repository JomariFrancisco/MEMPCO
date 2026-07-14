-- Run this in Supabase SQL Editor to convert the current static Marketing
-- content into real Marketing Admin records.

create extension if not exists pgcrypto;

alter table public.marketing_posts
add column if not exists placement text not null default 'more',
add column if not exists display_order integer not null default 0;

update public.marketing_posts
set
  placement = case
    when coalesce(nullif(placement, ''), case when featured then 'featured' else 'more' end) in ('featured', 'latest', 'more')
      then coalesce(nullif(placement, ''), case when featured then 'featured' else 'more' end)
    else 'more'
  end,
  display_order = coalesce(display_order, 0);

create index if not exists marketing_posts_placement_order_idx
on public.marketing_posts (placement, display_order, published_at desc);

with seed_marketing_posts (
  slug,
  title,
  category,
  content_type,
  excerpt,
  body,
  image_url,
  status,
  featured,
  placement,
  display_order,
  published_at
) as (
  values
    (
      'mempco-share-capital-build-up-award-natcco',
      'MEMPCO Receives Share Capital Build-Up Award at NATCCO Congress',
      'News',
      'news',
      'MEMPCO was honored with the Share Capital Build-Up Award during the 40th NATCCO General Assembly and 24th Leaders Congress held in Iloilo City, reflecting the trust, commitment, and collective effort of its members, officers, and stakeholders.',
      jsonb_build_array(
        'MEMPCO is deeply honored to receive the Share Capital Build-Up Award during the 40th NATCCO General Assembly and 24th Leaders Congress held in Iloilo City.',
        'With the theme One Year to Gold, this recognition reflects the unwavering trust, commitment, and collective effort of our members, officers, and stakeholders in strengthening our cooperative and building a more empowered community.',
        'We extend our sincere appreciation to NATCCO for this recognition. This milestone inspires us even more to stay committed to our mission and continue creating meaningful impact as we move forward together.'
      ),
      '/About/40th NATCCO GA.png',
      'published',
      true,
      'featured',
      0,
      '2026-05-02 09:00:00+08'::timestamptz
    ),
    (
      'mempco-124th-labor-day-job-fair',
      'MEMPCO Joins the 124th Labor Day Job Fair',
      'Events',
      'event',
      'MEMPCO proudly took part in the 124th Labor Day Job Fair at KCC Mall de Zamboanga, supporting employment opportunities and empowering individuals toward a better and more inclusive future.',
      jsonb_build_array(
        'MEMPCO proudly took part in the 124th Labor Day Job Fair, embracing this years theme: Disenteng Trabaho Para sa Lahat: Iisang Hangarin, Bagong Pilipinas Sama-samang Mararating.',
        'The event was held on May 1, 2026 at KCC Mall de Zamboanga and was led by the Department of Labor and Employment.',
        'MEMPCO remains committed to supporting employment opportunities and empowering individuals toward a better and more inclusive future.'
      ),
      '/About/Labor Day.png',
      'published',
      false,
      'latest',
      1,
      '2026-05-03 09:00:00+08'::timestamptz
    ),
    (
      'mempco-wmsu-careercon-job-fair-2026',
      'MEMPCO Participates in WMSU CareerCon and Job Fair 2026',
      'Events',
      'event',
      'MEMPCO joined CareerCon and Job Fair 2026 at the WMSU Gymnasium, supporting an initiative that connects students and graduates to future career opportunities.',
      jsonb_build_array(
        'MEMPCO is grateful to be part of CareerCon and Job Fair 2026, held at the Western Mindanao State University Gymnasium on April 30, 2026.',
        'We thank Western Mindanao State University for the invitation and for organizing a successful event that connects students and graduates to future opportunities.',
        'MEMPCO is honored to support this meaningful initiative for alumni and graduating students.'
      ),
      '/About/CareerCon.png',
      'published',
      false,
      'latest',
      2,
      '2026-05-01 09:00:00+08'::timestamptz
    ),
    (
      'mempco-climbs-service-climate-action',
      'MEMPCO Recognized by CLIMBS for Service and Climate Action',
      'News',
      'news',
      'During the 54th Annual General Assembly of CLIMBS Life and General Insurance Cooperative, MEMPCO was recognized as Top Premium Producer Regional and Champion for Climate Action.',
      jsonb_build_array(
        'With humble hearts, MEMPCO shares this meaningful milestone. During the 54th Annual General Assembly of CLIMBS Life and General Insurance Cooperative in Cebu City, MEMPCO was honored to receive recognitions as Top Premium Producer Regional and Champion for Climate Action.',
        'We accept these honors with gratitude, recognizing that these achievements reflect the trust of our member-owners and the dedication of our team.',
        'MEMPCO remains committed to serving with integrity and contributing to a more sustainable and progressive community.'
      ),
      '/About/54th Climbs Annual General Assembly.png',
      'published',
      false,
      'latest',
      3,
      '2026-04-29 09:00:00+08'::timestamptz
    ),
    (
      'award-diamond-awards-regional-awardee-2025',
      'Diamond Awards Regional Awardee',
      'Awards',
      'award',
      'Recognized as a Distinguished Institution and Mover of National Development Regional Awardee.',
      jsonb_build_object(
        'paragraphs',
        jsonb_build_array(
          'Recognized as a Distinguished Institution and Mover of National Development Regional Awardee.'
        ),
        'organization',
        'Land Bank of the Philippines'
      ),
      '/About/Awards/diamond-awards.png',
      'published',
      false,
      'more',
      0,
      '2025-12-04 09:00:00+08'::timestamptz
    ),
    (
      'award-most-outstanding-primary-cooperative-2025',
      'Most Outstanding Primary Cooperative',
      'Awards',
      'award',
      'First placer in the Large Cooperative Category during the 2025 Cooperative Month Celebration.',
      jsonb_build_object(
        'paragraphs',
        jsonb_build_array(
          'First placer in the Large Cooperative Category during the 2025 Cooperative Month Celebration.'
        ),
        'organization',
        '7th Marciano Aquino Coop Gawad Parangal'
      ),
      '/About/Awards/coop-gawad-parangal.png',
      'published',
      false,
      'more',
      0,
      '2025-12-03 09:00:00+08'::timestamptz
    ),
    (
      'award-aurora-awards-2025',
      'Aurora Awards 2025',
      'Awards',
      'award',
      'Received multiple recognitions for risk readiness, share capital structure, and loan-loss provision.',
      jsonb_build_object(
        'paragraphs',
        jsonb_build_array(
          'Received multiple recognitions for risk readiness, share capital structure, and loan-loss provision.'
        ),
        'organization',
        'NATCCO Network'
      ),
      '/About/Awards/aurora-awards-2025.png',
      'published',
      false,
      'more',
      0,
      '2025-12-02 09:00:00+08'::timestamptz
    ),
    (
      'award-champion-for-climate-action-2025',
      'Champion for Climate Action',
      'Awards',
      'award',
      'Recognized for sustainability impact and climate-conscious cooperative action.',
      jsonb_build_object(
        'paragraphs',
        jsonb_build_array(
          'Recognized for sustainability impact and climate-conscious cooperative action.'
        ),
        'organization',
        'CLIMBS'
      ),
      '/About/Awards/climbs-climate-action.png',
      'published',
      false,
      'more',
      0,
      '2025-12-01 09:00:00+08'::timestamptz
    ),
    (
      'empowering-communities-financial-wellness',
      'Empowering Communities Through Financial Wellness',
      'Events',
      'event',
      'MEMPCO joined the DSWD Convergence Caravan with 4Ps beneficiaries in Zamboanga City, sharing financial wellness discussions on PMES, savings, loans, insurance, and financial literacy.',
      jsonb_build_array(
        'MEMPCO is grateful to the Department of Social Welfare and Development for inviting us to be part of their Convergence Caravan with 4Ps beneficiaries from different barangays in Zamboanga City.',
        'During the activity, MEMPCO shared discussions on PMES, financial wellness and management, loans, savings, and insurance services.',
        'We sincerely hope that the learnings shared will be applied and become a guide toward a more secure future. Helping people help themselves remains at the heart of this initiative.'
      ),
      '/About/Financial Literacy Seminar.png',
      'published',
      false,
      'more',
      4,
      '2026-04-23 09:00:00+08'::timestamptz
    ),
    (
      'central-office-fire-drill-seminar',
      'Fire Drill Seminar Strengthens Preparedness at Central Office',
      'Events',
      'event',
      'MEMPCO Central Office conducted a Fire Drill Seminar in partnership with the Bureau of Fire Protection - Zamboanga City Fire District to strengthen fire prevention, safety protocols, and emergency response.',
      jsonb_build_array(
        'MEMPCO Central Office successfully conducted a Fire Drill Seminar in partnership with the Bureau of Fire Protection - Zamboanga City Fire District.',
        'The activity equipped participants with essential knowledge on fire prevention, safety protocols, and proper emergency response, reinforcing the importance of readiness in ensuring workplace safety.',
        'MEMPCO extends its sincere gratitude to the Bureau of Fire Protection for their continuous efforts in promoting fire safety awareness and preparedness within the community.'
      ),
      '/About/Central Office Fire Drill.png',
      'published',
      false,
      'more',
      5,
      '2026-04-23 10:00:00+08'::timestamptz
    ),
    (
      'culianan-branch-fire-drill-seminar',
      'Fire Drill Seminar Conducted at Culianan Branch',
      'Events',
      'event',
      'MEMPCO Culianan Branch participated in a Fire Drill Seminar with the Bureau of Fire Protection, helping participants gain practical knowledge and confidence in responding to emergency situations.',
      jsonb_build_array(
        'MEMPCO Culianan Branch successfully participated in a Fire Drill Seminar in partnership with the Bureau of Fire Protection - Zamboanga City Fire District.',
        'The seminar strengthened awareness on fire prevention, emergency response, and workplace safety. Participants were provided with valuable knowledge and practical guidance to ensure readiness during emergency situations.',
        'Through activities like these, participants are empowered with both knowledge and confidence in responding effectively during fire-related incidents.'
      ),
      '/About/Culianan Fire Drill.png',
      'published',
      false,
      'more',
      6,
      '2026-04-24 09:00:00+08'::timestamptz
    ),
    (
      'earth-day-everyday-sustainable-living',
      'Earth Day, Everyday: MEMPCO Promotes Sustainable Living',
      'Announcement',
      'announcement',
      'MEMPCO encourages members and communities to practice simple daily actions such as conserving water, using natural light, choosing reusable items, and proper waste segregation.',
      jsonb_build_array(
        'At MEMPCO, we believe that meaningful change begins with simple everyday actions.',
        'From conserving water and using natural light, to choosing reusable items and practicing proper waste segregation, each small step contributes to a healthier and more sustainable future for our communities.',
        'Let us continue working together as responsible stewards of our environment. By making mindful choices today, we help build a better tomorrow for the next generation.'
      ),
      '/About/Earth Day.png',
      'published',
      false,
      'more',
      7,
      '2026-05-01 10:00:00+08'::timestamptz
    ),
    (
      'mempco-hour-level-up',
      'Lets Go Green with MEMPCO Hour Level Up',
      'Announcement',
      'announcement',
      'In celebration of Earth Month, MEMPCO continues to encourage green habits and responsible actions through the MEMPCO Hour Level Up initiative.',
      jsonb_build_array(
        'In celebration of Earth Month, MEMPCO continues to encourage members, employees, and communities to take part in meaningful actions for the environment.',
        'The MEMPCO Hour Level Up initiative promotes simple but impactful habits that support sustainability and environmental responsibility.',
        'Through collective participation, MEMPCO hopes to strengthen awareness and inspire everyone to contribute to a cleaner, greener, and more sustainable future.'
      ),
      '/About/MEMPCO Hour.png',
      'published',
      false,
      'more',
      8,
      '2026-04-28 09:00:00+08'::timestamptz
    ),
    (
      'member-story-amylita-villarosa',
      'Amylita Villarosa',
      'Member Stories',
      'member_story',
      'Once an OFW, Amylita invested her savings into building a small bakery. With business training and MEMPCO support, she expanded her livelihood and helped her children finish school.',
      jsonb_build_object(
        'paragraphs',
        jsonb_build_array(
          'Meet Amylita Villarosa, a proud entrepreneur from San Roque and the dedicated owner of her own bakery shop. Once an OFW, Amylita made the brave decision to invest her hard-earned savings into building a small bakery upon returning to the Philippines.',
          'Instead of spending it elsewhere, she chose to take business training and workshops, equipping herself with the knowledge and confidence to properly manage her venture.',
          'Through perseverance and determination, she supported her family needs, helped her children finish school, and expanded her bakery with the help and support of MEMPCO.'
        ),
        'videoUrl',
        'https://youtu.be/QwMlGNOP2gY?si=Vuc8E9pATomR654n',
        'role',
        'Bakery Shop Owner',
        'location',
        'San Roque, Zamboanga City',
        'tags',
        jsonb_build_array('#MEMPCOStories', '#CooperativePride', '#WomenInBusiness', '#OFWtoEntrepreneur')
      ),
      '/MemberStories/Amylita.png',
      'published',
      false,
      'more',
      0,
      '2026-05-04 09:00:00+08'::timestamptz
    ),
    (
      'member-story-edna-mallorca',
      'Edna Mallorca',
      'Member Stories',
      'member_story',
      'Edna started with a humble ukay-ukay and used her MEMPCO loan to venture into a junk shop business. Today, her business employs more than 10 workers and has expanded to multiple locations.',
      jsonb_build_object(
        'paragraphs',
        jsonb_build_array(
          'Meet Edna Gonzalez Mallorca, a driven entrepreneur and the proud owner of a junk shop and demolition contracting business.',
          'Her journey began with a humble ukay-ukay venture, where she earned a living and empowered others by teaching fellow MEMPCO members basic sewing and tailoring skills.',
          'With MEMPCO support, Edna ventured into the junk shop business, expanded her operations, and built a livelihood that now supports her family and more than 10 workers.'
        ),
        'videoUrl',
        'https://youtu.be/qTQaPQVCyHY?si=GyBn-USDbqnJFC8P',
        'role',
        'Junk Shop Owner',
        'location',
        'Zamboanga City',
        'tags',
        jsonb_build_array('#MEMPCOStories', '#CooperativePride', '#WomenInBusiness', '#FromHumbleBeginnings')
      ),
      '/MemberStories/Edna.png',
      'published',
      false,
      'more',
      1,
      '2026-05-04 10:00:00+08'::timestamptz
    ),
    (
      'member-story-girlee-del-rosario',
      'Girlee Del Rosario',
      'Member Stories',
      'member_story',
      'With MEMPCO support, Girlee strengthened her sari-sari store and rubber buying business, and acquired vehicles to help sustain and grow her livelihood for her family.',
      jsonb_build_object(
        'paragraphs',
        jsonb_build_array(
          'Meet Girlee Del Rosario, a passionate entrepreneur from Ipil, Zamboanga Sibugay, proudly managing her business as a rubber buyer and sari-sari store owner.',
          'Through perseverance and dedication, Girlee was able to provide for her family and steadily grow her livelihood.',
          'With MEMPCO support, she strengthened her sari-sari store and acquired a truck and a car, both essential in sustaining and growing her business.'
        ),
        'videoUrl',
        'https://youtu.be/ublDz2mWQP0?si=vUfEwHut8r9eqw6W',
        'role',
        'Rubber Buyer and Sari-Sari Store Owner',
        'location',
        'Ipil, Zamboanga Sibugay',
        'tags',
        jsonb_build_array('#MEMPCOStories', '#Entrepreneurship', '#CooperativeSuccess', '#WomenInBusiness')
      ),
      '/MemberStories/Girlee.png',
      'published',
      false,
      'more',
      2,
      '2026-05-04 11:00:00+08'::timestamptz
    )
)
insert into public.marketing_posts (
  slug,
  title,
  category,
  content_type,
  excerpt,
  body,
  image_url,
  status,
  featured,
  placement,
  display_order,
  published_at
)
select
  seed.slug,
  seed.title,
  seed.category,
  seed.content_type,
  seed.excerpt,
  seed.body,
  seed.image_url,
  seed.status,
  seed.featured,
  seed.placement,
  seed.display_order,
  seed.published_at
from seed_marketing_posts seed
on conflict (slug) do update
set
  title = excluded.title,
  category = excluded.category,
  content_type = excluded.content_type,
  excerpt = excluded.excerpt,
  body = excluded.body,
  image_url = excluded.image_url,
  status = excluded.status,
  featured = excluded.featured,
  placement = excluded.placement,
  display_order = excluded.display_order,
  published_at = excluded.published_at;
