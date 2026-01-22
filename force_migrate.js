import initDB from './server/init.js';

async function run() {
    console.log('Iniciando migração manual de senhas...');
    await initDB();
    console.log('Migração concluída.');
    process.exit(0);
}

run().catch(err => {
    console.error('Erro na migração:', err);
    process.exit(1);
});
