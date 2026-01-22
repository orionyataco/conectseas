// LDAP Connection Test Helper
import ldap from 'ldapjs';

export async function testLDAPConnection(ldapConfig) {
    return new Promise((resolve) => {
        if (!ldapConfig.enabled || !ldapConfig.host || !ldapConfig.baseDn) {
            return resolve({
                success: false,
                error: 'LDAP não configurado corretamente',
                details: 'Verifique se host, porta e Base DN estão preenchidos'
            });
        }

        const port = ldapConfig.port || 389;
        const protocol = port === 636 ? 'ldaps' : 'ldap';
        const url = `${protocol}://${ldapConfig.host}:${port}`;

        console.log(`[LDAP TEST] Connecting to: ${url}`);

        const clientOptions = {
            url: url,
            timeout: 10000,
            connectTimeout: 10000
        };

        if (protocol === 'ldaps') {
            clientOptions.tlsOptions = {
                rejectUnauthorized: false
            };
        }

        const client = ldap.createClient(clientOptions);
        const results = {
            success: false,
            url: url,
            protocol: protocol,
            steps: []
        };

        client.on('error', (err) => {
            console.error('[LDAP TEST] Client error:', err.message);
            results.steps.push({ step: 'Connection', status: 'error', message: err.message });
            resolve(results);
        });

        // Step 1: Bind with service account (or anonymous if no credentials)
        const bindDn = ldapConfig.bindDn || '';
        const bindPassword = ldapConfig.bindPassword || '';

        console.log(`[LDAP TEST] Attempting bind with: ${bindDn || '(anonymous)'}`);

        // Try anonymous bind if no credentials provided
        if (!bindDn && !bindPassword) {
            console.log('[LDAP TEST] Using anonymous bind');
            results.steps.push({
                step: 'Anonymous Bind',
                status: 'info',
                message: 'Tentando conexão anônima (sem credenciais)'
            });

            // Skip bind and go directly to search
            performSearch();
            return;
        }

        client.bind(bindDn, bindPassword, (bindErr) => {
            if (bindErr) {
                console.error('[LDAP TEST] Bind error:', bindErr.message);
                results.steps.push({
                    step: 'Service Account Bind',
                    status: 'error',
                    message: bindErr.message,
                    bindDn: ldapConfig.bindDn
                });
                client.unbind();
                return resolve(results);
            }

            results.steps.push({
                step: 'Service Account Bind',
                status: 'success',
                message: 'Conectado com sucesso',
                bindDn: ldapConfig.bindDn
            });

            // Step 2: Search for users
            const searchOptions = {
                filter: '(objectClass=*)',
                scope: 'sub',
                attributes: ['cn', 'uid', 'sAMAccountName', 'mail', 'displayName', 'objectClass'],
                sizeLimit: 5
            };

            console.log(`[LDAP TEST] Searching in: ${ldapConfig.baseDn}`);
            client.search(ldapConfig.baseDn, searchOptions, (searchErr, searchRes) => {
                if (searchErr) {
                    console.error('[LDAP TEST] Search error:', searchErr.message);
                    results.steps.push({
                        step: 'User Search',
                        status: 'error',
                        message: searchErr.message,
                        baseDn: ldapConfig.baseDn
                    });
                    client.unbind();
                    return resolve(results);
                }

                const foundEntries = [];

                searchRes.on('searchEntry', (entry) => {
                    const entryData = {
                        dn: entry.objectName,
                        attributes: {}
                    };

                    entry.attributes.forEach(attr => {
                        entryData.attributes[attr.type] = attr.values;
                    });

                    foundEntries.push(entryData);
                    console.log(`[LDAP TEST] Found entry: ${entry.objectName}`);
                });

                searchRes.on('error', (err) => {
                    console.error('[LDAP TEST] Search result error:', err.message);
                    results.steps.push({
                        step: 'User Search',
                        status: 'error',
                        message: err.message
                    });
                    client.unbind();
                    resolve(results);
                });

                searchRes.on('end', () => {
                    client.unbind();

                    if (foundEntries.length > 0) {
                        results.success = true;
                        results.steps.push({
                            step: 'User Search',
                            status: 'success',
                            message: `Encontrados ${foundEntries.length} registros`,
                            entries: foundEntries
                        });
                    } else {
                        results.steps.push({
                            step: 'User Search',
                            status: 'warning',
                            message: 'Nenhum registro encontrado no Base DN',
                            baseDn: ldapConfig.baseDn
                        });
                    }

                    resolve(results);
                });
            });
        });
    });
}
