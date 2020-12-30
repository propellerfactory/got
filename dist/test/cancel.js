"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const stream_1 = require("stream");
const stream = require("stream");
const ava_1 = require("ava");
const delay = require("delay");
const pEvent = require("p-event");
const getStream = require("get-stream");
const source_1 = require("../source");
const slow_data_stream_1 = require("./helpers/slow-data-stream");
const with_server_1 = require("./helpers/with-server");
const prepareServer = (server, clock) => {
    const emitter = new events_1.EventEmitter();
    const promise = new Promise((resolve, reject) => {
        server.all('/abort', async (request, response) => {
            emitter.emit('connection');
            request.once('aborted', resolve);
            response.once('finish', reject.bind(null, new Error('Request finished instead of aborting.')));
            try {
                await pEvent(request, 'end');
            }
            catch (_a) {
                // Node.js 15.0.0 throws AND emits `aborted`
            }
            response.end();
        });
        server.get('/redirect', (_request, response) => {
            response.writeHead(302, {
                location: `${server.url}/abort`
            });
            response.end();
            emitter.emit('sentRedirect');
            clock.tick(3000);
            resolve();
        });
    });
    return { emitter, promise };
};
const downloadHandler = (clock) => (_request, response) => {
    response.writeHead(200, {
        'transfer-encoding': 'chunked'
    });
    response.flushHeaders();
    stream.pipeline(slow_data_stream_1.default(clock), response, () => {
        response.end();
    });
};
ava_1.default.serial('does not retry after cancelation', with_server_1.withServerAndFakeTimers, async (t, server, got, clock) => {
    const { emitter, promise } = prepareServer(server, clock);
    const gotPromise = got('redirect', {
        retry: {
            calculateDelay: () => {
                t.fail('Makes a new try after cancelation');
                return 0;
            }
        }
    });
    emitter.once('sentRedirect', () => {
        gotPromise.cancel();
    });
    await t.throwsAsync(gotPromise, { instanceOf: source_1.CancelError });
    await t.notThrowsAsync(promise, 'Request finished instead of aborting.');
});
ava_1.default.serial('cleans up request timeouts', with_server_1.default, async (t, server, got) => {
    server.get('/', () => { });
    const gotPromise = got({
        timeout: 10,
        retry: {
            calculateDelay: ({ computedValue }) => {
                process.nextTick(() => gotPromise.cancel());
                if (computedValue) {
                    return 20;
                }
                return 0;
            },
            limit: 1
        }
    });
    await t.throwsAsync(gotPromise, { instanceOf: source_1.CancelError });
    // Wait for unhandled errors
    await delay(40);
});
ava_1.default.serial('cancels in-progress request', with_server_1.withServerAndFakeTimers, async (t, server, got, clock) => {
    const { emitter, promise } = prepareServer(server, clock);
    const body = new stream_1.Readable({
        read() { }
    });
    body.push('1');
    const gotPromise = got.post('abort', { body });
    // Wait for the connection to be established before canceling
    emitter.once('connection', () => {
        gotPromise.cancel();
        body.push(null);
    });
    await t.throwsAsync(gotPromise, { instanceOf: source_1.CancelError });
    await t.notThrowsAsync(promise, 'Request finished instead of aborting.');
});
ava_1.default.serial('cancels in-progress request with timeout', with_server_1.withServerAndFakeTimers, async (t, server, got, clock) => {
    const { emitter, promise } = prepareServer(server, clock);
    const body = new stream_1.Readable({
        read() { }
    });
    body.push('1');
    const gotPromise = got.post('abort', { body, timeout: 10000 });
    // Wait for the connection to be established before canceling
    emitter.once('connection', () => {
        gotPromise.cancel();
        body.push(null);
    });
    await t.throwsAsync(gotPromise, { instanceOf: source_1.CancelError });
    await t.notThrowsAsync(promise, 'Request finished instead of aborting.');
});
ava_1.default.serial('cancel immediately', with_server_1.withServerAndFakeTimers, async (t, server, got, clock) => {
    const promise = new Promise((resolve, reject) => {
        // We won't get an abort or even a connection
        // We assume no request within 1000ms equals a (client side) aborted request
        server.get('/abort', (_request, response) => {
            response.once('finish', reject.bind(global, new Error('Request finished instead of aborting.')));
            response.end();
        });
        clock.tick(1000);
        resolve();
    });
    const gotPromise = got('abort');
    gotPromise.cancel();
    await t.throwsAsync(gotPromise);
    await t.notThrowsAsync(promise, 'Request finished instead of aborting.');
});
ava_1.default('recover from cancelation using cancelable promise attribute', async (t) => {
    // Canceled before connection started
    const p = source_1.default('http://example.com');
    const recover = p.catch((error) => {
        if (p.isCanceled) {
            return;
        }
        throw error;
    });
    p.cancel();
    await t.notThrowsAsync(recover);
});
ava_1.default('recover from cancellation using error instance', async (t) => {
    // Canceled before connection started
    const p = source_1.default('http://example.com');
    const recover = p.catch((error) => {
        if (error instanceof source_1.default.CancelError) {
            return;
        }
        throw error;
    });
    p.cancel();
    await t.notThrowsAsync(recover);
});
ava_1.default.serial('throws on incomplete (canceled) response - promise', with_server_1.withServerAndFakeTimers, async (t, server, got, clock) => {
    server.get('/', downloadHandler(clock));
    await t.throwsAsync(got({
        timeout: { request: 500 },
        retry: 0
    }), { instanceOf: got.TimeoutError });
});
ava_1.default.serial('throws on incomplete (canceled) response - promise #2', with_server_1.withServerAndFakeTimers, async (t, server, got, clock) => {
    server.get('/', downloadHandler(clock));
    const promise = got('').on('response', () => {
        clock.tick(500);
        promise.cancel();
    });
    await t.throwsAsync(promise, { instanceOf: got.CancelError });
});
ava_1.default.serial('throws on incomplete (canceled) response - stream', with_server_1.withServerAndFakeTimers, async (t, server, got, clock) => {
    server.get('/', downloadHandler(clock));
    const errorString = 'Foobar';
    const stream = got.stream('').on('response', () => {
        clock.tick(500);
        stream.destroy(new Error(errorString));
    });
    await t.throwsAsync(getStream(stream), { message: errorString });
});
// Note: it will throw, but the response is loaded already.
ava_1.default('throws when canceling cached request', with_server_1.default, async (t, server, got) => {
    server.get('/', (_request, response) => {
        response.setHeader('Cache-Control', 'public, max-age=60');
        response.end(Date.now().toString());
    });
    const cache = new Map();
    await got({ cache });
    const promise = got({ cache }).on('response', () => {
        promise.cancel();
    });
    await t.throwsAsync(promise, { instanceOf: got.CancelError });
});
ava_1.default('throws when canceling cached request #2', with_server_1.default, async (t, server, got) => {
    server.get('/', (_request, response) => {
        response.setHeader('Cache-Control', 'public, max-age=60');
        response.end(Date.now().toString());
    });
    const cache = new Map();
    await got({ cache });
    const promise = got({ cache });
    promise.cancel();
    await t.throwsAsync(promise, { instanceOf: got.CancelError });
});
