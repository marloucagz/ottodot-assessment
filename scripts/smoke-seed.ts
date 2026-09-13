import "dotenv/config";
import {
  getSeedStatus,
  resetDemo,
  seedDemo,
} from "../server/services/demo-seed.service";

async function main() {
  if (process.env.DIRECT_URL) {
    process.env.DATABASE_URL = process.env.DIRECT_URL;
  }

  const before = await getSeedStatus();
  console.log(
    "before",
    JSON.stringify({ seeded: before.seeded, version: before.version }),
  );

  const mid = before.seeded ? await resetDemo() : await seedDemo();
  console.log(
    "mid",
    JSON.stringify({
      seeded: mid.seeded,
      seededAt: mid.seededAt,
      lastSeat: mid.summary?.slots.lastSeat,
      emails: [
        mid.summary?.users.parentA.email,
        mid.summary?.users.parentB.email,
      ],
    }),
  );

  const after = await resetDemo();
  console.log(
    "after-reset",
    JSON.stringify({
      seeded: after.seeded,
      seededAt: after.seededAt,
      caps: {
        lastSeat: after.summary?.slots.lastSeat.capacity,
        multi: after.summary?.slots.multiChild.capacity,
        happy: after.summary?.slots.happyPath.capacity,
      },
    }),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
