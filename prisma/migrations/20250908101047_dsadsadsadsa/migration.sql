-- AlterTable
ALTER TABLE "public"."Task" ADD COLUMN     "requestedAmount" DECIMAL(65,30),
ADD COLUMN     "urgencyReason" TEXT;
