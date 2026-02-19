import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

async function check() {
    const db = await open({
        filename: './server/database.sqlite',
        driver: sqlite3.Database
    });

    try {
        console.log("TESTING QUERY: SELECT * FROM warnings WHERE active = 1 ORDER BY created_at DESC");
        const rows = await db.all("SELECT * FROM warnings WHERE active = 1 ORDER BY created_at DESC");
        console.log("SUCCESS! ROWS:", JSON.stringify(rows, null, 2));
    } catch (e) {
        console.error("SQL ERROR:", e.message);
    } finally {
        await db.close();
    }
}

check();
