#!/usr/bin/env node
/**
 * Utilidades de la base local (Postgres vía docker-compose).
 *
 *   node scripts/db.mjs migrate   — aplica migraciones + seed (idempotente)
 *   node scripts/db.mjs status    — muestra cuántas filas hay por tabla
 *   node scripts/db.mjs reset     — vacía todas las tablas de contenido
 *
 * Requiere DATABASE_URL (se carga con `node --env-file=.env`, ver npm scripts).
 */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDir = path.join(root, "db", "migrations");
const seedFile = path.join(root, "db", "seed.sql");

const help = `Uso:
  node scripts/db.mjs migrate   (aplica migraciones + seed)
  node scripts/db.mjs status    (conteo por tabla)
  node scripts/db.mjs reset     (vacía las tablas de contenido)
`;

/**
 * Preludio local: las políticas RLS de las migraciones referencian
 * `auth.jwt()`. En Postgres puro ese schema no existe, así que se stubea.
 * La app conecta como owner de las tablas y no evalúa RLS.
 */
const preludeSql = `
  create schema if not exists auth;
  create or replace function auth.jwt()
  returns jsonb
  language sql
  stable
  as $$ select '{}'::jsonb $$;
`;

async function connect() {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  return client;
}

async function runMigrate() {
  const files = (await readdir(migrationsDir)).filter((f) => f.endsWith(".sql")).sort();
  const client = await connect();
  try {
    await client.query(preludeSql);
    await client.query(`
      create table if not exists schema_migrations (
        name text primary key,
        applied_at timestamptz not null default now()
      )
    `);
    let changed = 0;
    for (const file of files) {
      const { rows } = await client.query(`select name from schema_migrations where name = $1`, [
        file,
      ]);
      if (rows.length > 0) {
        console.log(`migración ya aplicada: ${file}`);
        continue;
      }
      const sql = await readFile(path.join(migrationsDir, file), "utf8");
      await client.query(sql);
      await client.query(`insert into schema_migrations (name) values ($1)`, [file]);
      console.log(`migración aplicada: ${file}`);
      changed++;
    }
    const { rows: seedRows } = await client.query(
      `select name from schema_migrations where name = 'seed.sql'`,
    );
    if (seedRows.length === 0) {
      const seed = await readFile(seedFile, "utf8");
      await client.query(seed);
      await client.query(`insert into schema_migrations (name) values ('seed.sql')`);
      console.log("seed aplicado");
      changed++;
    } else {
      console.log("seed ya aplicado");
    }
    console.log(changed === 0 ? "(sin cambios)" : `${changed} cambio(s) aplicados`);
  } finally {
    await client.end();
  }
}

async function runStatus() {
  const tables = [
    "properties",
    "auctions",
    "machinery",
    "property_features",
    "property_images",
    "auction_lots",
    "auction_images",
    "machinery_images",
    "inquiries",
  ];
  const client = await connect();
  try {
    console.log("Estado de la base:");
    for (const table of tables) {
      const { rows } = await client.query(`select count(*)::int as n from "${table}"`);
      console.log(`  ${table.padEnd(20)} ${rows[0].n}`);
    }
  } finally {
    await client.end();
  }
}

async function runReset() {
  const client = await connect();
  try {
    await client.query("begin");
    for (const table of [
      "inquiries",
      "property_images",
      "property_features",
      "auction_images",
      "auction_lots",
      "machinery_images",
      "properties",
      "auctions",
      "machinery",
    ]) {
      await client.query(`truncate table "${table}" cascade`);
    }
    await client.query("commit");
    console.log("Base vaciada (catálogos de referencia se conservan).");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    await client.end();
  }
}

const [command] = process.argv.slice(2);
try {
  switch (command) {
    case "migrate":
      await runMigrate();
      break;
    case "status":
      await runStatus();
      break;
    case "reset":
      await runReset();
      break;
    default:
      console.log(help);
      process.exit(command ? 1 : 0);
  }
} catch (error) {
  console.error(`\nNo se pudo conectar a la base. ¿Corrió primero "npm run db:up"?`);
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
