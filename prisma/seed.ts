import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';
const prisma = new PrismaClient();

const TOPICS = [
  { slug: 'programming', name: 'Programming', aliases: ['coding','pemrograman','software development'] },
  { slug: 'frontend', name: 'Frontend', aliases: ['ui','ux','react','next.js','html','css','tailwind'] },
  { slug: 'backend', name: 'Backend', aliases: ['api','node.js','server','database','sql','authentication'] },
  { slug: 'data', name: 'Data', aliases: ['data science','analysis','analytics','etl','bi'] },
  { slug: 'devops', name: 'DevOps', aliases: ['ci/cd','docker','kubernetes','infra','observability'] },
  { slug: 'ai-ml', name: 'AI/ML', aliases: ['machine learning','deep learning','nlp','computer vision','llm','genai'] },
  { slug: 'mobile', name: 'Mobile', aliases: ['android','ios','react native','flutter','kotlin','swift'] },
  { slug: 'design', name: 'Design', aliases: ['ui design','ux design','figma','typography'] },
  { slug: 'business', name: 'Business', aliases: ['startup','strategy','marketing','sales'] },
  { slug: 'finance', name: 'Finance', aliases: ['investment','trading','akuntansi','financial'] },
  { slug: 'agriculture', name: 'Agriculture', aliases: ['pertanian','agri','hortikultura','agro'] },
  { slug: 'health', name: 'Health', aliases: ['kesehatan','medis','nutrition','fitness'] },
  { slug: 'education', name: 'Education', aliases: ['pengajaran','pedagogi','kurikulum'] },
  { slug: 'soft-skills', name: 'Soft Skills', aliases: ['komunikasi','leadership','manajemen waktu'] },
  { slug: 'other', name: 'Other', aliases: [] },
];

async function main() {
  // Ensure admin
  const email = process.env.SEED_ADMIN_EMAIL || 'admin@example.com';
  const password = process.env.SEED_ADMIN_PASSWORD || 'admin123';
  const name = process.env.SEED_ADMIN_NAME || 'Admin';
  const hash = await argon2.hash(password);
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if ((existing as any).role !== 'ADMIN') {
      await (prisma as any).user.update({ where: { id: existing.id }, data: { role: 'ADMIN' } });
    }
    if (!existing.passwordHash) {
      await prisma.user.update({ where: { id: existing.id }, data: { passwordHash: hash } });
    }
    console.log(`Admin ensured: ${email}`);
  } else {
  await (prisma as any).user.create({ data: { email, name, passwordHash: hash, role: 'ADMIN' } });
    console.log(`Admin created: ${email} / ${password}`);
  }

  // Seed topics
  for (const t of TOPICS) {
  await (prisma as any).topic.upsert({
      where: { slug: t.slug },
      update: { name: t.name, aliases: t.aliases },
      create: { slug: t.slug, name: t.name, aliases: t.aliases },
    });
  }
  console.log('Seeded topics:', TOPICS.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
}).finally(async () => prisma.$disconnect());
