import mysql from "mysql2/promise";
import * as schema from "./schema";
export declare const pool: {
    query<T = any>(sql: string, params?: any[]): Promise<{
        rows: T[];
        result: any;
    }>;
    connect(): Promise<{
        query<T = any>(sql: string, params?: any[]): Promise<{
            rows: T[];
            result: any;
        }>;
        release(): void;
        execute(sql: string): Promise<[mysql.QueryResult, mysql.FieldPacket[]]>;
    }>;
};
export declare const db: import("drizzle-orm/mysql2").MySql2Database<typeof schema> & {
    $client: mysql.Pool;
};
export * from "./schema";
//# sourceMappingURL=index.d.ts.map