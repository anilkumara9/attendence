import * as SQLite from "expo-sqlite";

const DB_NAME = "myclass_cache.db";
let dbInstance: SQLite.SQLiteDatabase | null = null;
let setupPromise: Promise<SQLite.SQLiteDatabase> | null = null;
let isReady = false;

/**
 * Returns a ready-to-use database instance.
 * Ensures initialization is complete before returning.
 */
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
    if (isReady && dbInstance) return dbInstance;
    return await initDatabase();
}

/**
 * Initializes the database tables and migrations.
 * Uses a global promise to prevent concurrent initialization attempts.
 */
export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
    if (setupPromise) return setupPromise;

    setupPromise = (async () => {
        try {
            console.log("[DB] Starting initialization...");
            const db = await SQLite.openDatabaseAsync(DB_NAME);

            // Core tables
            const schema = [
                `CREATE TABLE IF NOT EXISTS CachedAcademicYear (
                    id TEXT PRIMARY KEY,
                    yearName TEXT NOT NULL,
                    isActive INTEGER DEFAULT 1,
                    lastSyncTime INTEGER
                );`,
                `CREATE TABLE IF NOT EXISTS CachedSemesterType (
                    id TEXT PRIMARY KEY,
                    typeName TEXT NOT NULL,
                    lastSyncTime INTEGER
                );`,
                `CREATE TABLE IF NOT EXISTS CachedSemester (
                    id TEXT PRIMARY KEY,
                    semNumber INTEGER NOT NULL,
                    semesterTypeId TEXT NOT NULL,
                    isActive INTEGER DEFAULT 1,
                    lastSyncTime INTEGER
                );`,
                `CREATE TABLE IF NOT EXISTS CachedSubject (
                    id TEXT PRIMARY KEY,
                    subjectName TEXT NOT NULL,
                    subjectCode TEXT NOT NULL,
                    semesterId TEXT NOT NULL,
                    lastSyncTime INTEGER
                );`,
                `CREATE TABLE IF NOT EXISTS CachedStaff (
                    id TEXT PRIMARY KEY,
                    staffId TEXT NOT NULL,
                    name TEXT NOT NULL,
                    email TEXT NOT NULL,
                    lastLogin INTEGER,
                    lastSyncTime INTEGER
                );`,
                `CREATE TABLE IF NOT EXISTS LocalAttendance (
                    id TEXT PRIMARY KEY,
                    academicYear TEXT,
                    semesterType TEXT,
                    semester TEXT,
                    subjectCode TEXT,
                    subjectName TEXT,
                    sessionDetails TEXT,
                    students TEXT NOT NULL,
                    markedBy TEXT NOT NULL,
                    isSynced INTEGER DEFAULT 0,
                    isOfflineCreated INTEGER DEFAULT 1,
                    localCreatedTime INTEGER NOT NULL,
                    section TEXT
                );`
            ];

            for (const sql of schema) {
                await db.execAsync(sql);
            }

            // Run migrations
            await migrateSchema(db);

            dbInstance = db;
            isReady = true;
            console.log("[DB] Initialization complete.");
            return db;
        } catch (error) {
            setupPromise = null; // Allow retry
            console.error("[DB] Initialization failed:", error);
            throw error;
        }
    })();

    return setupPromise;
}

async function migrateSchema(db: SQLite.SQLiteDatabase) {
    try {
        const result = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(LocalAttendance)`);
        const columns = result.map(col => col.name);

        // Add 'section' if missing
        if (!columns.includes("section")) {
            console.log("[DB] Migrating: Adding 'section' column");
            await db.execAsync(`ALTER TABLE LocalAttendance ADD COLUMN section TEXT;`);
        }

        // Add 'sessionDetails' if missing
        if (!columns.includes("sessionDetails")) {
            console.log("[DB] Migrating: Adding 'sessionDetails' column");
            await db.execAsync(`ALTER TABLE LocalAttendance ADD COLUMN sessionDetails TEXT;`);
        }
    } catch (e) {
        console.error("[DB] Migration error", e);
    }
}
