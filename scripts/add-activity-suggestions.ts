import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local BEFORE importing Prisma
config({ path: resolve(process.cwd(), '.env.local') });

import { prisma } from '../lib/prisma';

async function main() {
  const groupId = '9f375804-3282-426b-a07e-76adf0f25579';

  // Get all external events from Nov 16, 2025
  const externalEvents = await prisma.externalEvent.findMany({
    where: {
      sourceApi: 'manual',
      sourceId: {
        contains: 'fake-',
      },
    },
  });

  console.log(`Found ${externalEvents.length} external events`);
  console.log(`Creating activity suggestions for group ${groupId}...\n`);

  const suggestions = [
    {
      externalEventId: externalEvents.find(e => e.sourceId === 'fake-jazz-nov16-2025')?.id,
      title: 'Live Jazz Night at Werner Cafe',
      description: 'Experience an intimate evening of smooth jazz with local musicians. Enjoy craft cocktails and a cozy atmosphere perfect for friends and music lovers.',
      location: 'Werner Cafe, Tallinn',
      category: 'Music',
      startTime: new Date('2025-11-16T19:00:00Z'),
      endTime: new Date('2025-11-16T22:00:00Z'),
      cost: 15.00,
      reasoning: 'This jazz night is perfect for the group to unwind together. The intimate setting encourages conversation and connection, while the live music creates a memorable shared experience. The reasonable cover charge includes entry and supports local artists.',
    },
    {
      externalEventId: externalEvents.find(e => e.sourceId === 'fake-tech-meetup-nov16-2025')?.id,
      title: 'Tartu Tech Meetup: AI & Machine Learning',
      description: 'Monthly tech meetup featuring talks on the latest in AI and machine learning. Network with local developers and tech enthusiasts. Free pizza and drinks!',
      location: 'Tartu Tech Hub, Tartu',
      category: 'Technology',
      startTime: new Date('2025-11-16T17:00:00Z'),
      endTime: new Date('2025-11-16T20:00:00Z'),
      cost: 0.00,
      reasoning: 'Great opportunity for tech-minded group members to learn about cutting-edge AI developments and network with the local tech community. Free entry with food and drinks makes this accessible for everyone. Could spark interesting discussions within the group.',
    },
    {
      externalEventId: externalEvents.find(e => e.sourceId === 'fake-comedy-nov16-2025')?.id,
      title: 'Open Mic Comedy Night',
      description: 'Laugh the night away at our weekly open mic comedy show. Featuring both seasoned comedians and brave newcomers testing their material. Entry includes one drink.',
      location: 'Comedy Cellar, Tallinn',
      category: 'Comedy',
      startTime: new Date('2025-11-16T20:00:00Z'),
      endTime: new Date('2025-11-16T23:00:00Z'),
      cost: 12.00,
      reasoning: 'Laughter is the best bonding experience! This comedy night offers a fun, low-pressure way for the group to enjoy an evening together. The open mic format means every show is unique and unpredictable, creating shared memories and inside jokes.',
    },
    {
      externalEventId: externalEvents.find(e => e.sourceId === 'fake-yoga-nov16-2025')?.id,
      title: 'Saturday Morning Yoga in the Park',
      description: 'Join us for a refreshing outdoor yoga session suitable for all levels. Bring your own mat and enjoy the crisp autumn air. Perfect way to start your weekend!',
      location: 'Tammsaare Park, Tallinn',
      category: 'Sports & Wellness',
      startTime: new Date('2025-11-16T08:00:00Z'),
      endTime: new Date('2025-11-16T09:30:00Z'),
      cost: 5.00,
      reasoning: 'Start the weekend together with a healthy, energizing activity! This yoga session is suitable for all fitness levels and promotes wellness and mindfulness. The outdoor setting in autumn provides a beautiful, refreshing atmosphere for group bonding.',
    },
  ];

  for (const suggestion of suggestions) {
    const created = await prisma.activitySuggestion.create({
      data: {
        groupId,
        ...suggestion,
      },
    });
    console.log(`✓ Created suggestion: ${created.title}`);
  }

  console.log('\nAll activity suggestions created successfully!');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
