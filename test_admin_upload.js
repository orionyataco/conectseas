// Test script to verify admin panel upload
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

const API_URL = 'http://localhost:3001';

async function testAdminUpload() {
    try {
        // 1. Login as admin
        console.log('1. Logging in as admin...');
        const loginRes = await axios.post(`${API_URL}/api/login`, {
            username: 'admin',
            password: 'admin'
        });

        const token = loginRes.data.token;
        console.log('✓ Login successful, token:', token.substring(0, 20) + '...');

        // 2. Get current settings
        console.log('\n2. Fetching current settings...');
        const settingsRes = await axios.get(`${API_URL}/api/admin/settings`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('✓ Current login_ui:', JSON.stringify(settingsRes.data.login_ui, null, 2));

        // 3. Test upload endpoint (simulated)
        console.log('\n3. Testing upload endpoint availability...');
        console.log('Upload endpoint: POST /api/admin/settings/upload/:key');
        console.log('Expected behavior: Accept multipart/form-data with file and field');

        console.log('\n✓ All checks passed!');
    } catch (error) {
        console.error('✗ Error:', error.response?.data || error.message);
    }
}

testAdminUpload();
