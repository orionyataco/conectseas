
import axios from 'axios';

const BASE_URL = 'http://localhost:3002';

async function test() {
    try {
        console.log('--- Testando Login ---');
        const loginRes = await axios.post(`${BASE_URL}/api/login`, {
            username: 'admin',
            password: 'admin'
        });

        const { token, user } = loginRes.data;
        console.log('Login bem-sucedido!');
        console.log('User ID:', user.id);
        console.log('Token:', token.substring(0, 20) + '...');

        console.log('\n--- Testando Endpoint Autenticado (/api/warnings) ---');
        const authHeader = { Authorization: `Bearer ${token}` };
        const warningsRes = await axios.get(`${BASE_URL}/api/warnings`, { headers: authHeader });
        console.log('Warnings:', warningsRes.status, warningsRes.data ? 'OK' : 'Empty');

        console.log('\n--- Testando Endpoint do Calendário (/api/events) ---');
        const eventsRes = await axios.get(`${BASE_URL}/api/events?userId=${user.id}&userRole=${user.role}`, { headers: authHeader });
        console.log('Events:', eventsRes.status, Array.isArray(eventsRes.data) ? `OK (${eventsRes.data.length} events)` : 'Error');

        console.log('\n--- Testando Endpoint do Drive (/api/drive/folders) ---');
        const driveRes = await axios.get(`${BASE_URL}/api/drive/folders?userId=${user.id}&parentId=null`, { headers: authHeader });
        console.log('Drive Folders:', driveRes.status, Array.isArray(driveRes.data) ? `OK (${driveRes.data.length} folders)` : 'Error');

    } catch (error) {
        console.error('Erro no teste:', error.response ? `${error.response.status} ${JSON.stringify(error.response.data)}` : error.message);
    }
}

test();
