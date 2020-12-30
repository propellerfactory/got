"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = require("http");
const https_1 = require("https");
const ava_1 = require("ava");
const sinon = require("sinon");
const with_server_1 = require("./helpers/with-server");
const createAgentSpy = (AgentClass) => {
    const agent = new AgentClass({ keepAlive: true });
    // @ts-expect-error This IS correct
    const spy = sinon.spy(agent, 'addRequest');
    return { agent, spy };
};
ava_1.default('non-object agent option works with http', with_server_1.default, async (t, server, got) => {
    server.get('/', (_request, response) => {
        response.end('ok');
    });
    const { agent, spy } = createAgentSpy(http_1.Agent);
    t.truthy((await got({
        https: {
            rejectUnauthorized: false
        },
        agent: {
            http: agent
        }
    })).body);
    t.true(spy.calledOnce);
    // Make sure to close all open sockets
    agent.destroy();
});
ava_1.default('non-object agent option works with https', with_server_1.withHttpsServer(), async (t, server, got) => {
    server.get('/', (_request, response) => {
        response.end('ok');
    });
    const { agent, spy } = createAgentSpy(https_1.Agent);
    t.truthy((await got({
        https: {
            rejectUnauthorized: false
        },
        agent: {
            https: agent
        }
    })).body);
    t.true(spy.calledOnce);
    // Make sure to close all open sockets
    agent.destroy();
});
ava_1.default('redirects from http to https work with an agent object', with_server_1.default, async (t, serverHttp) => {
    await with_server_1.withHttpsServer()(t, async (t, serverHttps, got) => {
        serverHttp.get('/', (_request, response) => {
            response.end('http');
        });
        serverHttps.get('/', (_request, response) => {
            response.end('https');
        });
        serverHttp.get('/httpToHttps', (_request, response) => {
            response.writeHead(302, {
                location: serverHttps.url
            });
            response.end();
        });
        const { agent: httpAgent, spy: httpSpy } = createAgentSpy(http_1.Agent);
        const { agent: httpsAgent, spy: httpsSpy } = createAgentSpy(https_1.Agent);
        t.truthy((await got('httpToHttps', {
            prefixUrl: serverHttp.url,
            agent: {
                http: httpAgent,
                https: httpsAgent
            }
        })).body);
        t.true(httpSpy.calledOnce);
        t.true(httpsSpy.calledOnce);
        // Make sure to close all open sockets
        httpAgent.destroy();
        httpsAgent.destroy();
    });
});
ava_1.default('redirects from https to http work with an agent object', with_server_1.withHttpsServer(), async (t, serverHttps, got) => {
    await with_server_1.default(t, async (t, serverHttp) => {
        serverHttp.get('/', (_request, response) => {
            response.end('http');
        });
        serverHttps.get('/', (_request, response) => {
            response.end('https');
        });
        serverHttps.get('/httpsToHttp', (_request, response) => {
            response.writeHead(302, {
                location: serverHttp.url
            });
            response.end();
        });
        const { agent: httpAgent, spy: httpSpy } = createAgentSpy(http_1.Agent);
        const { agent: httpsAgent, spy: httpsSpy } = createAgentSpy(https_1.Agent);
        t.truthy((await got('httpsToHttp', {
            prefixUrl: serverHttps.url,
            agent: {
                http: httpAgent,
                https: httpsAgent
            }
        })).body);
        t.true(httpSpy.calledOnce);
        t.true(httpsSpy.calledOnce);
        // Make sure to close all open sockets
        httpAgent.destroy();
        httpsAgent.destroy();
    });
});
ava_1.default('socket connect listener cleaned up after request', with_server_1.withHttpsServer(), async (t, server, got) => {
    server.get('/', (_request, response) => {
        response.end('ok');
    });
    const { agent } = createAgentSpy(https_1.Agent);
    // Make sure there are no memory leaks when reusing keep-alive sockets
    for (let i = 0; i < 20; i++) {
        // eslint-disable-next-line no-await-in-loop
        await got({
            agent: {
                https: agent
            }
        });
    }
    // Node.js 12 has incomplete types
    for (const value of Object.values(agent.freeSockets)) {
        for (const sock of value) {
            t.is(sock.listenerCount('connect'), 0);
        }
    }
    // Make sure to close all open sockets
    agent.destroy();
});
{
    const testFn = Number(process.versions.node.split('.')[0]) < 12 ? ava_1.default.failing : ava_1.default;
    testFn('no socket hung up regression', with_server_1.default, async (t, server, got) => {
        const agent = new http_1.Agent({ keepAlive: true });
        const token = 'helloworld';
        server.get('/', (request, response) => {
            if (request.headers.token !== token) {
                response.statusCode = 401;
                response.end();
                return;
            }
            response.end('ok');
        });
        const { body } = await got({
            prefixUrl: 'http://127.0.0.1:3000',
            agent: {
                http: agent
            },
            hooks: {
                afterResponse: [
                    async (response, retryWithMergedOptions) => {
                        var _a;
                        // Force clean-up
                        (_a = response.socket) === null || _a === void 0 ? void 0 : _a.destroy();
                        // Unauthorized
                        if (response.statusCode === 401) {
                            return retryWithMergedOptions({
                                headers: {
                                    token
                                }
                            });
                        }
                        // No changes otherwise
                        return response;
                    }
                ]
            },
            // Disable automatic retries, manual retries are allowed
            retry: 0
        });
        t.is(body, 'ok');
        agent.destroy();
    });
}
