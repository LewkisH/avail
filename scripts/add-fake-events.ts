import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local BEFORE importing Prisma
config({ path: resolve(process.cwd(), '.env.local') });

import { prisma } from '../lib/prisma';

async function main() {
  const events = [
    {
      title: "Live Jazz Night at Werner Cafe",
      description: "Experience an intimate evening of smooth jazz with local musicians. Enjoy craft cocktails and a cozy atmosphere perfect for friends and music lovers.",
      startTime: new Date('2025-11-16T19:00:00Z'),
      endTime: new Date('2025-11-16T22:00:00Z'),
      timezone: 'Europe/Tallinn',
      location: 'Werner Cafe, Tallinn',
      cost: 15.00,
      currency: 'EUR',
      category: 'Music',
      sourceApi: 'manual',
      sourceId: 'fake-jazz-nov16-2025',
      sourceUrl: 'https://example.com/events/jazz-night',
      imageUrl: 'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=800',
    },
    {
      title: "Tartu Tech Meetup: AI & Machine Learning",
      description: "Monthly tech meetup featuring talks on the latest in AI and machine learning. Network with local developers and tech enthusiasts. Free pizza and drinks!",
      startTime: new Date('2025-11-16T17:00:00Z'),
      endTime: new Date('2025-11-16T20:00:00Z'),
      timezone: 'Europe/Tallinn',
      location: 'Tartu Tech Hub, Tartu',
      cost: 0.00,
      currency: 'EUR',
      category: 'Technology',
      sourceApi: 'manual',
      sourceId: 'fake-tech-meetup-nov16-2025',
      sourceUrl: 'https://example.com/events/tech-meetup',
      imageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800',
    },
    {
      title: "Open Mic Comedy Night",
      description: "Laugh the night away at our weekly open mic comedy show. Featuring both seasoned comedians and brave newcomers testing their material. Entry includes one drink.",
      startTime: new Date('2025-11-16T20:00:00Z'),
      endTime: new Date('2025-11-16T23:00:00Z'),
      timezone: 'Europe/Tallinn',
      location: 'Comedy Cellar, Tallinn',
      cost: 12.00,
      currency: 'EUR',
      category: 'Comedy',
      sourceApi: 'manual',
      sourceId: 'fake-comedy-nov16-2025',
      sourceUrl: 'https://example.com/events/comedy-night',
      imageUrl: 'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=800',
    },
    {
      title: "Saturday Morning Yoga in the Park",
      description: "Join us for a refreshing outdoor yoga session suitable for all levels. Bring your own mat and enjoy the crisp autumn air. Perfect way to start your weekend!",
      startTime: new Date('2025-11-16T08:00:00Z'),
      endTime: new Date('2025-11-16T09:30:00Z'),
      timezone: 'Europe/Tallinn',
      location: 'Tammsaare Park, Tallinn',
      cost: 5.00,
      currency: 'EUR',
      category: 'Sports & Wellness',
      sourceApi: 'manual',
      sourceId: 'fake-yoga-nov16-2025',
      sourceUrl: 'https://example.com/events/yoga-park',
      imageUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800',
    },
  ];

  console.log('Adding 4 fake external events for November 16, 2025...');
  
  for (const event of events) {
    const created = await prisma.externalEvent.create({
      data: event,
    });
    console.log(`✓ Created: ${created.title}`);
  }

  console.log('\nAll events added successfully!');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
