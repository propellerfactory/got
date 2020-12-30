"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ava_1 = require("ava");
const source_1 = require("../source");
const with_server_1 = require("./helpers/with-server");
const p_event_1 = require("p-event");
const pify = require("pify");
const pem = require("pem");
const createPrivateKey = pify(pem.createPrivateKey);
const createCSR = pify(pem.createCSR);
const createCertificate = pify(pem.createCertificate);
const createPkcs12 = pify(pem.createPkcs12);
ava_1.default('https request without ca', with_server_1.withHttpsServer(), async (t, server, got) => {
    server.get('/', (_request, response) => {
        response.end('ok');
    });
    t.truthy((await got({
        https: {
            certificateAuthority: [],
            rejectUnauthorized: false
        }
    })).body);
});
ava_1.default('https request with ca', with_server_1.withHttpsServer(), async (t, server, got) => {
    server.get('/', (_request, response) => {
        response.end('ok');
    });
    const { body } = await got({});
    t.is(body, 'ok');
});
ava_1.default('https request with ca and afterResponse hook', with_server_1.withHttpsServer(), async (t, server, got) => {
    server.get('/', (_request, response) => {
        response.end('ok');
    });
    const warningListener = (warning) => {
        if (warning.name === 'DeprecationWarning' &&
            warning.message === 'Got: "options.ca" was never documented, please use ' +
                '"options.https.certificateAuthority"') {
            process.off('warning', warningListener);
            t.fail('unexpected deprecation warning');
        }
    };
    process.once('warning', warningListener);
    let shouldRetry = true;
    const { body } = await got({
        hooks: {
            afterResponse: [
                (response, retry) => {
                    if (shouldRetry) {
                        shouldRetry = false;
                        return retry({});
                    }
                    return response;
                }
            ]
        }
    });
    t.is(body, 'ok');
});
ava_1.default('https request with `checkServerIdentity` OK', with_server_1.withHttpsServer(), async (t, server, got) => {
    server.get('/', (_request, response) => {
        response.end('ok');
    });
    const { body } = await got({
        https: {
            checkServerIdentity: (hostname, certificate) => {
                t.is(hostname, 'localhost');
                t.is(certificate.subject.CN, 'localhost');
                t.is(certificate.issuer.CN, 'authority');
            }
        }
    });
    t.is(body, 'ok');
});
ava_1.default('https request with `checkServerIdentity` NOT OK', with_server_1.withHttpsServer(), async (t, server, got) => {
    server.get('/', (_request, response) => {
        response.end('ok');
    });
    const promise = got({
        https: {
            checkServerIdentity: (hostname, certificate) => {
                t.is(hostname, 'localhost');
                t.is(certificate.subject.CN, 'localhost');
                t.is(certificate.issuer.CN, 'authority');
                return new Error('CUSTOM_ERROR');
            }
        }
    });
    await t.throwsAsync(promise, {
        message: 'CUSTOM_ERROR'
    });
});
// The built-in `openssl` on macOS does not support negative days.
{
    const testFn = process.platform === 'darwin' ? ava_1.default.skip : ava_1.default;
    testFn('https request with expired certificate', with_server_1.withHttpsServer({ days: -1 }), async (t, _server, got) => {
        await t.throwsAsync(got({}), {
            code: 'CERT_HAS_EXPIRED'
        });
    });
}
ava_1.default('https request with wrong host', with_server_1.withHttpsServer({ commonName: 'not-localhost.com' }), async (t, _server, got) => {
    await t.throwsAsync(got({}), {
        code: 'ERR_TLS_CERT_ALTNAME_INVALID'
    });
});
ava_1.default('http2', async (t) => {
    const promise = source_1.default('https://httpbin.org/anything', {
        http2: true
    });
    const { headers, body } = await promise;
    await promise.json();
    // @ts-expect-error Pseudo headers may not be strings
    t.is(headers[':status'], 200);
    t.is(typeof body, 'string');
});
ava_1.default.serial('deprecated `rejectUnauthorized` option', with_server_1.withHttpsServer(), async (t, server, got) => {
    server.get('/', (_request, response) => {
        response.end('ok');
    });
    await new Promise(resolve => {
        let request;
        (async () => {
            const warning = await p_event_1.default(process, 'warning');
            t.is(warning.name, 'DeprecationWarning');
            request.cancel();
            resolve();
        })();
        (async () => {
            request = got({
                rejectUnauthorized: false
            });
            try {
                await request;
                t.fail();
            }
            catch (_a) {
                t.true(request.isCanceled);
            }
            resolve();
        })();
    });
});
ava_1.default.serial('non-deprecated `rejectUnauthorized` option', with_server_1.withHttpsServer(), async (t, server, got) => {
    server.get('/', (_request, response) => {
        response.end('ok');
    });
    (async () => {
        const warning = await p_event_1.default(process, 'warning');
        t.not(warning.name, 'DeprecationWarning');
    })();
    await got({
        https: {
            rejectUnauthorized: false
        }
    });
    t.pass();
});
ava_1.default.serial('no double deprecated warning', with_server_1.withHttpsServer(), async (t, server, got) => {
    server.get('/', (_request, response) => {
        response.end('ok');
    });
    (async () => {
        const warning = await p_event_1.default(process, 'warning');
        t.is(warning.name, 'DeprecationWarning');
    })();
    await got({
        rejectUnauthorized: false
    });
    (async () => {
        const warning = await p_event_1.default(process, 'warning');
        t.not(warning.name, 'DeprecationWarning');
    })();
    await got({
        rejectUnauthorized: false
    });
    t.pass();
});
ava_1.default('client certificate', with_server_1.withHttpsServer(), async (t, server, got) => {
    server.get('/', (request, response) => {
        const peerCertificate = request.socket.getPeerCertificate(true);
        peerCertificate.issuerCertificate.issuerCertificate = undefined; // Circular structure
        response.json({
            authorized: request.socket.authorized,
            peerCertificate
        });
    });
    const clientCSRResult = await createCSR({ commonName: 'client' });
    const clientResult = await createCertificate({
        csr: clientCSRResult.csr,
        clientKey: clientCSRResult.clientKey,
        serviceKey: server.caKey,
        serviceCertificate: server.caCert
    });
    // eslint-disable-next-line prefer-destructuring
    const clientKey = clientResult.clientKey;
    const clientCert = clientResult.certificate;
    const response = await got({
        https: {
            key: clientKey,
            certificate: clientCert
        }
    }).json();
    t.true(response.authorized);
    t.is(response.peerCertificate.subject.CN, 'client');
    t.is(response.peerCertificate.issuer.CN, 'authority');
});
ava_1.default('invalid client certificate (self-signed)', with_server_1.withHttpsServer(), async (t, server, got) => {
    server.get('/', (request, response) => {
        const peerCertificate = request.socket.getPeerCertificate(true);
        peerCertificate.issuerCertificate = undefined; // Circular structure
        response.json({
            authorized: request.socket.authorized,
            peerCertificate
        });
    });
    const clientCSRResult = await createCSR({ commonName: 'other-client' });
    const clientResult = await createCertificate({
        csr: clientCSRResult.csr,
        clientKey: clientCSRResult.clientKey,
        selfSigned: true
    });
    // eslint-disable-next-line prefer-destructuring
    const clientKey = clientResult.clientKey;
    const clientCert = clientResult.certificate;
    const response = await got({
        https: {
            key: clientKey,
            certificate: clientCert
        }
    }).json();
    t.is(response.authorized, false);
});
ava_1.default('invalid client certificate (other CA)', with_server_1.withHttpsServer(), async (t, server, got) => {
    server.get('/', (request, response) => {
        const peerCertificate = request.socket.getPeerCertificate(true);
        response.json({
            authorized: request.socket.authorized,
            peerCertificate
        });
    });
    const caCSRResult = await createCSR({ commonName: 'other-authority' });
    const caResult = await createCertificate({
        csr: caCSRResult.csr,
        clientKey: caCSRResult.clientKey,
        selfSigned: true
    });
    const caKey = caResult.clientKey;
    const caCert = caResult.certificate;
    const clientCSRResult = await createCSR({ commonName: 'other-client' });
    const clientResult = await createCertificate({
        csr: clientCSRResult.csr,
        clientKey: clientCSRResult.clientKey,
        serviceKey: caKey,
        serviceCertificate: caCert
    });
    // eslint-disable-next-line prefer-destructuring
    const clientKey = clientResult.clientKey;
    const clientCert = clientResult.certificate;
    const response = await got({
        https: {
            key: clientKey,
            certificate: clientCert
        }
    }).json();
    t.false(response.authorized);
    t.is(response.peerCertificate.subject.CN, 'other-client');
    t.is(response.peerCertificate.issuer.CN, 'other-authority');
});
ava_1.default('key passphrase', with_server_1.withHttpsServer(), async (t, server, got) => {
    server.get('/', (request, response) => {
        const peerCertificate = request.socket.getPeerCertificate(true);
        peerCertificate.issuerCertificate.issuerCertificate = undefined; // Circular structure
        response.json({
            authorized: request.socket.authorized,
            peerCertificate
        });
    });
    const { key: clientKey } = await createPrivateKey(2048, {
        cipher: 'aes256',
        password: 'randomPassword'
    });
    const clientCSRResult = await createCSR({
        // eslint-disable-next-line object-shorthand
        clientKey: clientKey,
        clientKeyPassword: 'randomPassword',
        commonName: 'client'
    });
    const clientResult = await createCertificate({
        csr: clientCSRResult.csr,
        clientKey: clientCSRResult.clientKey,
        clientKeyPassword: 'randomPassword',
        serviceKey: server.caKey,
        serviceCertificate: server.caCert
    });
    const clientCert = clientResult.certificate;
    const response = await got({
        https: {
            key: clientKey,
            passphrase: 'randomPassword',
            certificate: clientCert
        }
    }).json();
    t.true(response.authorized);
    t.is(response.peerCertificate.subject.CN, 'client');
    t.is(response.peerCertificate.issuer.CN, 'authority');
});
ava_1.default('invalid key passphrase', with_server_1.withHttpsServer(), async (t, server, got) => {
    server.get('/', (request, response) => {
        const peerCertificate = request.socket.getPeerCertificate(true);
        peerCertificate.issuerCertificate.issuerCertificate = undefined; // Circular structure
        response.json({
            authorized: request.socket.authorized,
            peerCertificate
        });
    });
    const { key: clientKey } = await createPrivateKey(2048, {
        cipher: 'aes256',
        password: 'randomPassword'
    });
    const clientCSRResult = await createCSR({
        // eslint-disable-next-line object-shorthand
        clientKey: clientKey,
        clientKeyPassword: 'randomPassword',
        commonName: 'client'
    });
    const clientResult = await createCertificate({
        csr: clientCSRResult.csr,
        clientKey: clientCSRResult.clientKey,
        clientKeyPassword: 'randomPassword',
        serviceKey: server.caKey,
        serviceCertificate: server.caCert
    });
    const clientCert = clientResult.certificate;
    const NODE_10 = process.versions.node.split('.')[0] === '10';
    const request = got({
        https: {
            key: clientKey,
            passphrase: 'wrongPassword',
            certificate: clientCert
        }
    });
    // Node.JS 10 does not have an error code, it only has a mesage
    if (NODE_10) {
        try {
            await request;
            t.fail();
        }
        catch (error) {
            t.true(error.message.includes('bad decrypt'), error.message);
        }
    }
    else {
        await t.throwsAsync(request, {
            code: 'ERR_OSSL_EVP_BAD_DECRYPT'
        });
    }
});
ava_1.default('client certificate PFX', with_server_1.withHttpsServer(), async (t, server, got) => {
    server.get('/', (request, response) => {
        const peerCertificate = request.socket.getPeerCertificate(true);
        peerCertificate.issuerCertificate = undefined; // Circular structure
        response.json({
            authorized: request.socket.authorized,
            peerCertificate
        });
    });
    const clientCSRResult = await createCSR({ commonName: 'client' });
    const clientResult = await createCertificate({
        csr: clientCSRResult.csr,
        clientKey: clientCSRResult.clientKey,
        serviceKey: server.caKey,
        serviceCertificate: server.caCert
    });
    // eslint-disable-next-line prefer-destructuring
    const clientKey = clientResult.clientKey;
    const clientCert = clientResult.certificate;
    const { pkcs12 } = await createPkcs12(clientKey, clientCert, 'randomPassword');
    const response = await got({
        https: {
            pfx: pkcs12,
            passphrase: 'randomPassword'
        }
    }).json();
    t.true(response.authorized);
    t.is(response.peerCertificate.subject.CN, 'client');
    t.is(response.peerCertificate.issuer.CN, 'authority');
});
