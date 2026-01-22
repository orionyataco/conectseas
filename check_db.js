import pool from './server/db.js';

async function check() {
    try {
        const [rows] = await pool.query('SELECT id, username, password FROM users');
        console.log('Usuários no banco:');
        rows.forEach(u => {
            const isHashed = u.password.startsWith('$2a$') || u.password.startsWith('$2b$');
            console.log(`- ID: ${u.id}, User: ${u.username}, Hashed: ${isHashed}, Password Start: ${u.password.substring(0, 5)}...`);
        });
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

check();
