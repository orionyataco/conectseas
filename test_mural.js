
import axios from 'axios';

async function testMural() {
    try {
        const response = await axios.get('http://localhost:3002/api/mural/feed');
        console.log('Status:', response.status);
        console.log('Data sample:', JSON.stringify(response.data.slice(0, 2), null, 2));
    } catch (error) {
        console.error('Error fetching mural:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

testMural();
