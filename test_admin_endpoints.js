// Quick test to verify admin endpoints
import axios from 'axios';

const API_URL = 'http://localhost:3002';

async function testAdminEndpoints() {
    try {
        // 1. Login
        console.log('1. Logging in...');
        const loginRes = await axios.post(`${API_URL}/api/login`, {
            username: 'admin',
            password: 'admin'
        });

        const token = loginRes.data.token;
        console.log('✓ Login successful');

        // 2. Test GET settings
        console.log('\n2. Testing GET /api/admin/settings...');
        try {
            const getRes = await axios.get(`${API_URL}/api/admin/settings`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log('✓ GET settings works!');
            console.log('Settings keys:', Object.keys(getRes.data));
        } catch (err) {
            console.error('✗ GET failed:', err.response?.status, err.response?.data);
        }

        // 3. Test PUT settings
        console.log('\n3. Testing PUT /api/admin/settings/ldap_config...');
        try {
            const putRes = await axios.put(`${API_URL}/api/admin/settings/ldap_config`, {
                value: {
                    enabled: true,
                    host: 'test.ldap.com',
                    port: 389,
                    baseDn: 'dc=test,dc=com',
                    bindDn: 'cn=admin,dc=test,dc=com',
                    bindPassword: ''
                }
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log('✓ PUT settings works!', putRes.data);
        } catch (err) {
            console.error('✗ PUT failed:', err.response?.status, err.response?.data);
            console.error('Full error:', err.message);
        }

    } catch (error) {
        console.error('✗ Test failed:', error.message);
    }
}

testAdminEndpoints();
