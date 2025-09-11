-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('USER', 'ADMIN');

-- CreateTable
CREATE TABLE "public"."Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "passwordHash" TEXT,
    "role" "public"."Role" NOT NULL DEFAULT 'USER',

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "public"."Roadmap" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "content" JSONB NOT NULL,
    "contentHash" TEXT,
    "userId" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "slug" TEXT,
    "publishedAt" TIMESTAMP(3),
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "sourceId" TEXT,

    CONSTRAINT "Roadmap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RoadmapProgress" (
    "id" TEXT NOT NULL,
    "roadmapId" TEXT NOT NULL,
    "completedTasks" JSONB NOT NULL DEFAULT '{}',
    "percent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoadmapProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RoadmapRating" (
    "id" TEXT NOT NULL,
    "roadmapId" TEXT NOT NULL,
    "versionId" TEXT,
    "userId" TEXT NOT NULL,
    "stars" INTEGER NOT NULL,
    "review" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoadmapRating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RoadmapAggregates" (
    "roadmapId" TEXT NOT NULL,
    "versionId" TEXT,
    "avgStars" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ratingsCount" INTEGER NOT NULL DEFAULT 0,
    "h1" INTEGER NOT NULL DEFAULT 0,
    "h2" INTEGER NOT NULL DEFAULT 0,
    "h3" INTEGER NOT NULL DEFAULT 0,
    "h4" INTEGER NOT NULL DEFAULT 0,
    "h5" INTEGER NOT NULL DEFAULT 0,
    "savesCount" INTEGER NOT NULL DEFAULT 0,
    "forksCount" INTEGER NOT NULL DEFAULT 0,
    "wilsonScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bayesianScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoadmapAggregates_pkey" PRIMARY KEY ("roadmapId")
);

-- CreateTable
CREATE TABLE "public"."RoadmapSave" (
    "id" TEXT NOT NULL,
    "roadmapId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoadmapSave_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RoadmapMetricsDaily" (
    "id" TEXT NOT NULL,
    "roadmapId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "uniqueViewers" INTEGER NOT NULL DEFAULT 0,
    "saves" INTEGER NOT NULL DEFAULT 0,
    "uniqueSavers" INTEGER NOT NULL DEFAULT 0,
    "forks" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RoadmapMetricsDaily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Topic" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "aliases" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Topic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RoadmapTopic" (
    "id" TEXT NOT NULL,
    "roadmapId" TEXT NOT NULL,
    "versionId" TEXT,
    "topicId" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT NOT NULL DEFAULT 'ai',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoadmapTopic_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "public"."Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "public"."Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "public"."VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "public"."VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Roadmap_slug_key" ON "public"."Roadmap"("slug");

-- CreateIndex
CREATE INDEX "Roadmap_userId_contentHash_title_idx" ON "public"."Roadmap"("userId", "contentHash", "title");

-- CreateIndex
CREATE UNIQUE INDEX "Roadmap_userId_sourceId_key" ON "public"."Roadmap"("userId", "sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "RoadmapProgress_roadmapId_key" ON "public"."RoadmapProgress"("roadmapId");

-- CreateIndex
CREATE INDEX "RoadmapRating_roadmapId_versionId_idx" ON "public"."RoadmapRating"("roadmapId", "versionId");

-- CreateIndex
CREATE INDEX "RoadmapRating_userId_idx" ON "public"."RoadmapRating"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RoadmapRating_roadmapId_versionId_userId_key" ON "public"."RoadmapRating"("roadmapId", "versionId", "userId");

-- CreateIndex
CREATE INDEX "RoadmapSave_roadmapId_idx" ON "public"."RoadmapSave"("roadmapId");

-- CreateIndex
CREATE INDEX "RoadmapSave_userId_idx" ON "public"."RoadmapSave"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RoadmapSave_roadmapId_userId_key" ON "public"."RoadmapSave"("roadmapId", "userId");

-- CreateIndex
CREATE INDEX "RoadmapMetricsDaily_roadmapId_idx" ON "public"."RoadmapMetricsDaily"("roadmapId");

-- CreateIndex
CREATE UNIQUE INDEX "RoadmapMetricsDaily_roadmapId_date_key" ON "public"."RoadmapMetricsDaily"("roadmapId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Topic_slug_key" ON "public"."Topic"("slug");

-- CreateIndex
CREATE INDEX "Topic_parentId_idx" ON "public"."Topic"("parentId");

-- CreateIndex
CREATE INDEX "RoadmapTopic_roadmapId_idx" ON "public"."RoadmapTopic"("roadmapId");

-- CreateIndex
CREATE INDEX "RoadmapTopic_topicId_idx" ON "public"."RoadmapTopic"("topicId");

-- CreateIndex
CREATE UNIQUE INDEX "RoadmapTopic_roadmapId_versionId_topicId_key" ON "public"."RoadmapTopic"("roadmapId", "versionId", "topicId");

-- AddForeignKey
ALTER TABLE "public"."Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Roadmap" ADD CONSTRAINT "Roadmap_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RoadmapProgress" ADD CONSTRAINT "RoadmapProgress_roadmapId_fkey" FOREIGN KEY ("roadmapId") REFERENCES "public"."Roadmap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RoadmapTopic" ADD CONSTRAINT "RoadmapTopic_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "public"."Topic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
