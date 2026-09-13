import "dotenv/config";
import { seedDemoCli } from "../server/services/demo-seed.service";

async function main() {
  const result = await seedDemoCli();
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
