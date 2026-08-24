-- CreateEnum
CREATE TYPE "ask_search_stage" AS ENUM ('PLANNING', 'SEARCHING', 'WRITING');

-- AlterTable
ALTER TABLE "ask_turn" ADD COLUMN "searchStage" "ask_search_stage";
