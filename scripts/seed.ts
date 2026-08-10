/**
 * Idempotent demo data.
 *
 * The legacy SQL dump shipped real client names and plaintext passwords. None of
 * that is carried over: these are invented accounts with bcrypt-hashed passwords.
 */
import "./load-env";

import bcrypt from "bcryptjs";
import pg from "pg";

const { Client } = pg;

const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "demo1234";

const BRANCHES = [
  { name: "Main Branch", isMain: true },
  { name: "North Branch", isMain: false },
  { name: "South Branch", isMain: false },
];

const USERS = [
  {
    firstName: "Ada",
    lastName: "Reyes",
    username: "admin",
    role: "super_admin",
    branch: "Main Branch",
  },
  {
    firstName: "Ben",
    lastName: "Cruz",
    username: "branch",
    role: "branch_user",
    branch: "North Branch",
  },
  {
    firstName: "Cara",
    lastName: "Lim",
    username: "worker",
    role: "worker",
    branch: "Main Branch",
  },
];

const ITEMS = [
  ["Steel Shelving Unit", "Ironclad", "Grey", "Northwind Supply", "set", "equipment", 24, 3200, 4100],
  ["Packing Tape 48mm", "SealPro", "Clear", "Northwind Supply", "roll", "general", 480, 35, 55],
  ["Cardboard Box Large", "BoxCo", "Kraft", "Vertex Trading", "pc", "general", 310, 22, 40],
  ["Pallet Jack 2.5T", "LiftMax", "Blue", "Vertex Trading", "unit", "equipment", 6, 18500, 23000],
  ["Stretch Wrap Film", "SealPro", "Clear", "Northwind Supply", "roll", "general", 95, 210, 310],
  ["Safety Gloves", "GuardWell", "Black", "Summit Industrial", "pair", "general", 240, 65, 110],
  ["Barcode Scanner", "ScanTek", "Black", "Summit Industrial", "unit", "equipment", 12, 4300, 5600],
  ["Storage Bin 60L", "BoxCo", "Yellow", "Vertex Trading", "pc", "general", 140, 180, 265],
  ["Label Printer Roll", "ScanTek", "White", "Summit Industrial", "roll", "general", 8, 140, 220],
  ["Hand Truck", "LiftMax", "Red", "Vertex Trading", "unit", "equipment", 3, 5200, 6800],
] as const;

const POSTS = [
  {
    title: "Quarterly stock count begins Monday",
    description:
      "All branches should freeze outbound transfers from Friday evening until the count is reconciled. Report discrepancies through the pull-out log rather than adjusting quantities directly.",
  },
  {
    title: "New supplier onboarded: Summit Industrial",
    description:
      "Summit Industrial is now an approved supplier for safety equipment and scanning hardware. Existing purchase orders with the previous vendor remain valid until they are fulfilled.",
  },
  {
    title: "Low-stock thresholds are now enforced",
    description:
      "Items below ten units are surfaced on the insufficient-stock screen for every branch. Branch users should raise a pull-in request rather than waiting for the monthly replenishment run.",
  },
];

async function main() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  const needsSsl =
    /sslmode=require/.test(connectionString) ||
    /neon\.tech/.test(connectionString);

  const client = new Client({
    connectionString,
    ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
  });

  await client.connect();

  for (const branch of BRANCHES) {
    await client.query(
      `insert into branches (name, is_main) values ($1, $2)
       on conflict (name) do nothing`,
      [branch.name, branch.isMain],
    );
  }

  const branchIds = new Map<string, number>(
    (
      await client.query<{ id: string; name: string }>(
        "select id, name from branches",
      )
    ).rows.map((row) => [row.name, Number(row.id)]),
  );

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  for (const user of USERS) {
    await client.query(
      `insert into users
         (first_name, last_name, username, password_hash, branch_id, role)
       values ($1, $2, $3, $4, $5, $6)
       on conflict (username) do nothing`,
      [
        user.firstName,
        user.lastName,
        user.username,
        passwordHash,
        branchIds.get(user.branch),
        user.role,
      ],
    );
  }

  const adminId = (
    await client.query<{ id: string }>(
      "select id from users where username = 'admin'",
    )
  ).rows[0]?.id;

  const existingItems = Number(
    (await client.query<{ count: string }>("select count(*) from inventory_items"))
      .rows[0].count,
  );

  if (existingItems === 0) {
    const branchNames = BRANCHES.map((b) => b.name);

    for (const [index, item] of ITEMS.entries()) {
      const [
        name,
        brand,
        color,
        supplier,
        unit,
        productType,
        quantity,
        unitPrice,
        sellingPrice,
      ] = item;

      // Spread the demo catalogue across branches so the scoping is visible.
      const branchName = branchNames[index % branchNames.length];

      await client.query(
        `insert into inventory_items
           (branch_id, name, brand, color, supplier_name, unit, product_type,
            quantity, unit_price, selling_price, delivery_receipt_num)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          branchIds.get(branchName),
          name,
          brand,
          color,
          supplier,
          unit,
          productType,
          quantity,
          unitPrice,
          sellingPrice,
          `DR-${1000 + index}`,
        ],
      );
    }
  }

  const existingPosts = Number(
    (await client.query<{ count: string }>("select count(*) from posts")).rows[0]
      .count,
  );

  if (existingPosts === 0) {
    for (const post of POSTS) {
      await client.query(
        "insert into posts (title, description, author_id) values ($1, $2, $3)",
        [post.title, post.description, adminId ?? null],
      );
    }
  }

  const existingPullIn = Number(
    (
      await client.query<{ count: string }>(
        "select count(*) from pull_in_transactions",
      )
    ).rows[0].count,
  );

  if (existingPullIn === 0) {
    await client.query(
      `insert into pull_in_transactions
         (branch_id, name, brand, color, supplier_name, unit, product_type,
          quantity, unit_price, selling_price, delivery_receipt_num, status)
       values
         ($1, 'Packing Tape 48mm', 'SealPro', 'Clear', 'Northwind Supply', 'roll', 'general', 200, 35, 55, 'DR-2001', 'pending'),
         ($2, 'Storage Bin 60L', 'BoxCo', 'Yellow', 'Vertex Trading', 'pc', 'general', 60, 180, 265, 'DR-2002', 'pending')`,
      [branchIds.get("North Branch"), branchIds.get("South Branch")],
    );
  }

  console.log("seed complete");
  console.log(`  admin / ${ADMIN_PASSWORD}   (super_admin)`);
  console.log(`  branch / ${ADMIN_PASSWORD}  (branch_user, North Branch)`);
  console.log(`  worker / ${ADMIN_PASSWORD}  (worker, Main Branch)`);

  await client.end();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
