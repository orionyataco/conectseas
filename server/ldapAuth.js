// LDAP Authentication Helper
import ldap from 'ldapjs';

export async function authenticateLDAP(username, password, ldapConfig) {
    return new Promise((resolve, reject) => {
        if (!ldapConfig.enabled || !ldapConfig.host || !ldapConfig.baseDn) {
            return resolve({ success: false, reason: 'LDAP not configured' });
        }

        // Determine protocol (LDAPS for port 636, LDAP for 389)
        const port = ldapConfig.port || 389;
        const protocol = port === 636 ? 'ldaps' : 'ldap';
        const url = `${protocol}://${ldapConfig.host}:${port}`;

        console.log(`Connecting to LDAP: ${url}`);

        const clientOptions = {
            url: url,
            timeout: 10000,
            connectTimeout: 10000
        };

        // For LDAPS, add TLS options to handle self-signed certificates
        if (protocol === 'ldaps') {
            clientOptions.tlsOptions = {
                rejectUnauthorized: false // Accept self-signed certificates
            };
        }

        const client = ldap.createClient(clientOptions);

        client.on('error', (err) => {
            console.error('LDAP client error:', err.message);
            resolve({ success: false, reason: 'Connection error' });
        });

        // Step 1: Bind with service account
        client.bind(ldapConfig.bindDn, ldapConfig.bindPassword, (bindErr) => {
            if (bindErr) {
                console.error('LDAP bind error:', bindErr.message);
                client.unbind();
                return resolve({ success: false, reason: 'Service account bind failed' });
            }

            // Step 2: Search for user
            const searchOptions = {
                filter: `(|(sAMAccountName=${username})(cn=${username})(uid=${username}))`,
                scope: 'sub',
                attributes: ['cn', 'mail', 'sAMAccountName', 'displayName', 'department', 'title', 'dn']
            };

            client.search(ldapConfig.baseDn, searchOptions, (searchErr, searchRes) => {
                if (searchErr) {
                    console.error('LDAP search error:', searchErr.message);
                    client.unbind();
                    return resolve({ success: false, reason: 'User search failed' });
                }

                let userEntry = null;

                searchRes.on('searchEntry', (entry) => {
                    userEntry = entry.pojo;
                });

                searchRes.on('error', (err) => {
                    console.error('LDAP search result error:', err.message);
                    client.unbind();
                    resolve({ success: false, reason: 'Search error' });
                });

                searchRes.on('end', () => {
                    client.unbind();

                    if (!userEntry) {
                        return resolve({ success: false, reason: 'User not found in LDAP' });
                    }

                    // Step 3: Try to authenticate as the user
                    const userDn = userEntry.objectName;
                    const userClientOptions = {
                        url: url,
                        timeout: 10000
                    };

                    if (protocol === 'ldaps') {
                        userClientOptions.tlsOptions = {
                            rejectUnauthorized: false
                        };
                    }

                    const userClient = ldap.createClient(userClientOptions);

                    userClient.on('error', (err) => {
                        console.error('LDAP user client error:', err.message);
                        resolve({ success: false, reason: 'User authentication error' });
                    });

                    userClient.bind(userDn, password, (authErr) => {
                        userClient.unbind();

                        if (authErr) {
                            console.error('LDAP user auth failed:', authErr.message);
                            return resolve({ success: false, reason: 'Invalid credentials' });
                        }

                        // Extract user info
                        const getAttr = (name) => {
                            const attr = userEntry.attributes.find(a => a.type === name);
                            return attr?.values?.[0] || null;
                        };

                        resolve({
                            success: true,
                            userInfo: {
                                username: getAttr('sAMAccountName') || username,
                                name: getAttr('displayName') || getAttr('cn') || username,
                                email: getAttr('mail') || `${username}@ldap.local`,
                                department: getAttr('department'),
                                position: getAttr('title')
                            }
                        });
                    });
                });
            });
        });
    });
}
