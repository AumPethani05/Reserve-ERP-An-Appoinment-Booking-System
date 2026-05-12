import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const poolConnection = mysql.createPool({
  uri: process.env.DATABASE_URL,
});

// Wrapper to match the pg-style pool.query interface
export const pool = {
  async query<T = any>(sql: string, params?: any[]): Promise<{ rows: T[], result: any }> {
    // Basic conversion from $1, $2 to ?, ?
    // This is a simple heuristic; complex queries should be updated manually.
    const convertedSql = sql.replace(/\$\d+/g, "?");
    const [rows] = await poolConnection.execute(convertedSql, params);
    return { rows: (Array.isArray(rows) ? rows : [rows]) as T[], result: rows };
  },
  async connect() {
    const connection = await poolConnection.getConnection();
    return {
      async query<T = any>(sql: string, params?: any[]): Promise<{ rows: T[], result: any }> {
        const convertedSql = sql.replace(/\$\d+/g, "?");
        const [rows] = await connection.execute(convertedSql, params);
        return { rows: (Array.isArray(rows) ? rows : [rows]) as T[], result: rows };
      },
      release() {
        connection.release();
      },
      async execute(sql: string) {
        return connection.execute(sql);
      }
    };
  }
};

export const db = drizzle(poolConnection, { schema, mode: "default" });

export * from "./schema";
