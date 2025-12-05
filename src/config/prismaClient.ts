import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
	throw new Error("DATABASE_URL is not set in the environment.");
}

const globalForPrisma = globalThis as unknown as {
	prisma: PrismaClient | undefined;
	prismaPool: Pool | undefined;
};

const pool =
	globalForPrisma.prismaPool ??
	new Pool({ connectionString: databaseUrl });

if (!globalForPrisma.prismaPool) {
	globalForPrisma.prismaPool = pool;
}

const adapter = new PrismaPg(pool);

export const prisma_client =
	globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
	globalForPrisma.prisma = prisma_client;
}
