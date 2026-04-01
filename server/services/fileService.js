import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '../uploads');

/**
 * Deleta um arquivo do diretório de uploads de forma segura.
 * @param {string} filename - Nome do arquivo a ser deletado (apenas o nome, sem o caminho completo).
 * @returns {Promise<boolean>} - true se deletado, false caso contrário (ex: arquivo não existe).
 */
export async function deleteFileFromDisk(filename) {
    if (!filename) return false;
    
    // Se o filename for um caminho (/uploads/...), limpa para pegar apenas o nome
    const cleanFilename = filename.startsWith('/uploads/') 
        ? filename.replace('/uploads/', '') 
        : path.basename(filename);

    const filePath = path.join(uploadsDir, cleanFilename);
    
    try {
        await fs.access(filePath);
        await fs.unlink(filePath);
        return true;
    } catch (error) {
        if (error.code !== 'ENOENT') {
            console.error(`Erro ao deletar arquivo físico ${cleanFilename}:`, error);
        }
        return false;
    }
}

/**
 * Helper para deletar múltiplos arquivos.
 * @param {string[]} filenames 
 */
export async function deleteMultipleFilesFromDisk(filenames) {
    if (!Array.isArray(filenames)) return;
    const promises = filenames.map(f => deleteFileFromDisk(f));
    return Promise.allSettled(promises);
}
