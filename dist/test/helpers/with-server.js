"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withSocketServer = exports.withHttpsServer = exports.withServerAndFakeTimers = exports.withBodyParsingServer = void 0;
const util_1 = require("util");
const is_1 = require("@sindresorhus/is");
const http = require("http");
const tempy = require("tempy");
const create_https_test_server_1 = require("./create-https-test-server");
const create_http_test_server_1 = require("./create-http-test-server");
const FakeTimers = require("@sinonjs/fake-timers");
const source_1 = require("../../source");
const generateHook = ({ install, options: testServerOptions }) => async (t, run) => {
    const clock = install ? FakeTimers.install() : FakeTimers.createClock();
    // Re-enable body parsing to investigate https://github.com/sindresorhus/got/issues/1186
    const server = await create_http_test_server_1.default(is_1.default.plainObject(testServerOptions) ? testServerOptions : {
        bodyParser: {
            type: () => false
        }
    });
    const options = {
        // @ts-expect-error Augmenting for test detection
        avaTest: t.title,
        handlers: [
            (options, next) => {
                const result = next(options);
                clock.tick(0);
                // @ts-expect-error FIXME: Incompatible union type signatures
                result.on('response', () => {
                    clock.tick(0);
                });
                return result;
            }
        ]
    };
    const preparedGot = source_1.default.extend({ prefixUrl: server.url, ...options });
    try {
        await run(t, server, preparedGot, clock);
    }
    finally {
        await server.close();
    }
    if (install) {
        clock.uninstall();
    }
};
exports.withBodyParsingServer = generateHook({ install: false, options: {} });
exports.default = generateHook({ install: false });
exports.withServerAndFakeTimers = generateHook({ install: true });
const generateHttpsHook = (options, installFakeTimer = false) => async (t, run) => {
    const fakeTimer = installFakeTimer ? FakeTimers.install() : undefined;
    const server = await create_https_test_server_1.default(options);
    const preparedGot = source_1.default.extend({
        // @ts-expect-error Augmenting for test detection
        avaTest: t.title,
        handlers: [
            (options, next) => {
                const result = next(options);
                fakeTimer === null || fakeTimer === void 0 ? void 0 : fakeTimer.tick(0);
                // @ts-expect-error FIXME: Incompatible union type signatures
                result.on('response', () => {
                    fakeTimer === null || fakeTimer === void 0 ? void 0 : fakeTimer.tick(0);
                });
                return result;
            }
        ],
        prefixUrl: server.url,
        https: {
            certificateAuthority: server.caCert,
            rejectUnauthorized: true
        }
    });
    try {
        await run(t, server, preparedGot, fakeTimer);
    }
    finally {
        await server.close();
    }
    if (installFakeTimer) {
        fakeTimer.uninstall();
    }
};
exports.withHttpsServer = generateHttpsHook;
// TODO: remove this when `create-test-server` supports custom listen
const withSocketServer = async (t, run) => {
    const socketPath = tempy.file({ extension: 'socket' });
    const server = http.createServer((request, response) => {
        server.emit(request.url, request, response);
    });
    server.socketPath = socketPath;
    // @ts-expect-error - TS 4.1 bug.
    await util_1.promisify(server.listen.bind(server))(socketPath);
    try {
        await run(t, server);
    }
    finally {
        await util_1.promisify(server.close.bind(server))();
    }
};
exports.withSocketServer = withSocketServer;
