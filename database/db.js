const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const path = require("path");

const dbPath = path.join(
  process.cwd(),
  "database",
  "dekho.db"
);

let db = null;

const connectDB = async () => {
  if (db) {
    return db;
  }

  db = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });

  await db.run("PRAGMA foreign_keys = ON");

  console.log("SQLite database connected");

  return db;
};

module.exports = connectDB;