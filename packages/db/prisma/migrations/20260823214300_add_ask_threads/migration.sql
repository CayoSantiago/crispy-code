-- CreateEnum
CREATE TYPE "ask_turn_status" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "ask_thread" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ask_thread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ask_turn" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT,
    "intent" TEXT,
    "plannedQueries" JSONB,
    "usedFallbackPlan" BOOLEAN NOT NULL DEFAULT false,
    "groups" JSONB,
    "totalMatches" INTEGER,
    "missingSources" JSONB,
    "inngestEventId" TEXT,
    "status" "ask_turn_status" NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ask_turn_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ask_thread_userId_updatedAt_idx" ON "ask_thread"("userId", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "ask_turn_threadId_createdAt_idx" ON "ask_turn"("threadId", "createdAt");

-- AddForeignKey
ALTER TABLE "ask_thread" ADD CONSTRAINT "ask_thread_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ask_turn" ADD CONSTRAINT "ask_turn_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "ask_thread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
