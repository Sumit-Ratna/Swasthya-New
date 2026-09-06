const mysql = require('mysql2/promise');
require('dotenv').config();

async function resetDB() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || '127.0.0.1',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASS || 'sumit2712'
        });
        
        console.log('Connected to MySQL server.');
        const dbName = process.env.DB_NAME || 'lab_report';
        
        await connection.query(`DROP DATABASE IF EXISTS \`${dbName}\`;`);
        console.log(`Dropped database: ${dbName}`);
        
        await connection.query(`CREATE DATABASE \`${dbName}\`;`);
        console.log(`Created database: ${dbName}`);
        
        await connection.end();
        console.log('Database reset complete.');
    } catch (err) {
        console.error('Error resetting database:', err);
    }
}

resetDB();
