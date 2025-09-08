// app/api/get-resources/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const schema = z.object({ topic: z.string().min(1) });

// For phase 1, return a small curated list based on topic keywords. Replace with real search later.
const STATIC_RESOURCES: Array<{ match: RegExp; items: { title: string; url: string; source: string }[] }> = [
  {
    match: /next\.?js|react/i,
    items: [
      { title: 'Next.js Docs – Learn', url: 'https://nextjs.org/learn', source: 'docs' },
      { title: 'React Docs – Learn React', url: 'https://react.dev/learn', source: 'docs' },
      { title: 'Vercel – Next.js YouTube', url: 'https://www.youtube.com/@vercel', source: 'youtube' },
      { title: 'usehooks-ts – React Hooks', url: 'https://usehooks-ts.com/', source: 'article' },
    ],
  },
  {
    match: /python|data\s*science|pandas|numpy/i,
    items: [
      { title: 'Python Docs – Tutorial', url: 'https://docs.python.org/3/tutorial/', source: 'docs' },
      { title: 'NumPy Guide', url: 'https://numpy.org/learn/', source: 'docs' },
      { title: 'Pandas User Guide', url: 'https://pandas.pydata.org/docs/user_guide/index.html', source: 'docs' },
      { title: 'freeCodeCamp – Pandas Course', url: 'https://www.youtube.com/watch?v=vmEHCJofslg', source: 'youtube' },
    ],
  },
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

    const { topic } = parsed.data;
    const found = STATIC_RESOURCES.find((r) => r.match.test(topic));
    const items = found?.items || [
      { title: 'Google – Search', url: 'https://www.google.com', source: 'search' },
      { title: 'YouTube – Search', url: 'https://www.youtube.com', source: 'search' },
      { title: 'Stack Overflow', url: 'https://stackoverflow.com', source: 'community' },
    ];

    return NextResponse.json({ resources: items.slice(0, 5) });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to get resources' }, { status: 500 });
  }
}
