"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("util");
const fs = require("fs");
const stream_1 = require("stream");
const stream = require("stream");
const ava_1 = require("ava");
const toReadableStream = require("to-readable-stream");
const getStream = require("get-stream");
const pEvent = require("p-event");
const FormData = require("form-data");
const is_1 = require("@sindresorhus/is");
const source_1 = require("../source");
const with_server_1 = require("./helpers/with-server");
const pStreamPipeline = util_1.promisify(stream.pipeline);
const defaultHandler = (_request, response) => {
    response.writeHead(200, {
        unicorn: 'rainbow',
        'content-encoding': 'gzip'
    });
    response.end(Buffer.from('H4sIAAAAAAAA/8vPBgBH3dx5AgAAAA==', 'base64')); // 'ok'
};
const redirectHandler = (_request, response) => {
    response.writeHead(302, {
        location: '/'
    });
    response.end();
};
const postHandler = async (request, response) => {
    await pStreamPipeline(request, response);
};
const errorHandler = (_request, response) => {
    response.statusCode = 404;
    response.end();
};
const headersHandler = (request, response) => {
    response.end(JSON.stringify(request.headers));
};
const infiniteHandler = (_request, response) => {
    response.write('foobar');
};
ava_1.default('`options.responseType` is ignored', with_server_1.default, async (t, server, got) => {
    server.get('/', defaultHandler);
    await t.notThrowsAsync(getStream(got.stream({ responseType: 'json' })));
});
ava_1.default('returns readable stream', with_server_1.default, async (t, server, got) => {
    server.get('/', defaultHandler);
    const data = await getStream(got.stream(''));
    t.is(data, 'ok');
});
ava_1.default('returns writeable stream', with_server_1.default, async (t, server, got) => {
    server.post('/', postHandler);
    const stream = got.stream.post('');
    const promise = getStream(stream);
    stream.end('wow');
    t.is(await promise, 'wow');
});
ava_1.default('throws on write if body is specified', with_server_1.default, (t, server, got) => {
    server.post('/', postHandler);
    const streams = [
        got.stream.post({ body: 'wow' }),
        got.stream.post({ json: {} }),
        got.stream.post({ form: {} })
    ];
    for (const stream of streams) {
        t.throws(() => {
            stream.end('wow');
        }, {
            message: 'The payload has been already provided'
        });
        stream.destroy();
    }
});
ava_1.default('does not throw if using stream and passing a json option', with_server_1.default, async (t, server, got) => {
    server.post('/', postHandler);
    await t.notThrowsAsync(getStream(got.stream.post({ json: {} })));
});
ava_1.default('does not throw if using stream and passing a form option', with_server_1.default, async (t, server, got) => {
    server.post('/', postHandler);
    await t.notThrowsAsync(getStream(got.stream.post({ form: {} })));
});
ava_1.default('throws on write if no payload method is present', with_server_1.default, (t, server, got) => {
    server.post('/', postHandler);
    const stream = got.stream.get('');
    t.throws(() => {
        stream.end('wow');
    }, {
        message: 'The payload has been already provided'
    });
    stream.destroy();
});
ava_1.default('has request event', with_server_1.default, async (t, server, got) => {
    server.get('/', defaultHandler);
    const stream = got.stream('');
    const request = await pEvent(stream, 'request');
    t.truthy(request);
    t.is(request.method, 'GET');
    await getStream(stream);
});
ava_1.default('has redirect event', with_server_1.default, async (t, server, got) => {
    server.get('/', defaultHandler);
    server.get('/redirect', redirectHandler);
    const stream = got.stream('redirect');
    const { headers } = await pEvent(stream, 'redirect');
    t.is(headers.location, '/');
    await getStream(stream);
});
ava_1.default('has response event', with_server_1.default, async (t, server, got) => {
    server.get('/', defaultHandler);
    const { statusCode } = await pEvent(got.stream(''), 'response');
    t.is(statusCode, 200);
});
ava_1.default('has error event', with_server_1.default, async (t, server, got) => {
    server.get('/', errorHandler);
    const stream = got.stream('');
    await t.throwsAsync(pEvent(stream, 'response'), {
        instanceOf: got.HTTPError,
        message: 'Response code 404 (Not Found)'
    });
});
ava_1.default('has error event #2', async (t) => {
    const stream = source_1.default.stream('http://doesntexist');
    try {
        await pEvent(stream, 'response');
    }
    catch (error) {
        t.regex(error.code, /ENOTFOUND|EAI_AGAIN/);
    }
});
ava_1.default('has response event if `options.throwHttpErrors` is false', with_server_1.default, async (t, server, got) => {
    server.get('/', errorHandler);
    const { statusCode } = await pEvent(got.stream({ throwHttpErrors: false }), 'response');
    t.is(statusCode, 404);
});
ava_1.default('accepts `options.body` as a Stream', with_server_1.default, async (t, server, got) => {
    server.post('/', postHandler);
    const stream = got.stream.post({ body: toReadableStream('wow') });
    t.is(await getStream(stream), 'wow');
});
ava_1.default('redirect response contains old url', with_server_1.default, async (t, server, got) => {
    server.get('/', defaultHandler);
    server.get('/redirect', redirectHandler);
    const { requestUrl } = await pEvent(got.stream('redirect'), 'response');
    t.is(requestUrl, `${server.url}/redirect`);
});
ava_1.default('check for pipe method', with_server_1.default, (t, server, got) => {
    server.get('/', defaultHandler);
    const stream = got.stream('');
    t.true(is_1.default.function_(stream.pipe));
    t.true(is_1.default.function_(stream.on('foobar', () => { }).pipe));
    stream.destroy();
});
ava_1.default('piping works', with_server_1.default, async (t, server, got) => {
    server.get('/', defaultHandler);
    t.is(await getStream(got.stream('')), 'ok');
    t.is(await getStream(got.stream('').on('foobar', () => { })), 'ok');
});
ava_1.default('proxying headers works', with_server_1.default, async (t, server, got) => {
    server.get('/', defaultHandler);
    server.get('/proxy', async (_request, response) => {
        await pStreamPipeline(got.stream(''), response);
    });
    const { headers, body } = await got('proxy');
    t.is(headers.unicorn, 'rainbow');
    t.is(headers['content-encoding'], undefined);
    t.is(body, 'ok');
});
ava_1.default('piping server request to Got proxies also headers', with_server_1.default, async (t, server, got) => {
    server.get('/', headersHandler);
    server.get('/proxy', async (request, response) => {
        await pStreamPipeline(request, got.stream(''), response);
    });
    const { foo } = await got('proxy', {
        headers: {
            foo: 'bar'
        }
    }).json();
    t.is(foo, 'bar');
});
ava_1.default('skips proxying headers after server has sent them already', with_server_1.default, async (t, server, got) => {
    server.get('/', defaultHandler);
    server.get('/proxy', async (_request, response) => {
        response.writeHead(200);
        await pStreamPipeline(got.stream(''), response);
    });
    const { headers } = await got('proxy');
    t.is(headers.unicorn, undefined);
});
ava_1.default('throws when trying to proxy through a closed stream', with_server_1.default, async (t, server, got) => {
    server.get('/', defaultHandler);
    const stream = got.stream('');
    const promise = getStream(stream);
    stream.once('data', () => {
        t.throws(() => {
            stream.pipe(new stream_1.PassThrough());
        }, {
            message: 'Failed to pipe. The response has been emitted already.'
        });
    });
    await promise;
});
ava_1.default('proxies `content-encoding` header when `options.decompress` is false', with_server_1.default, async (t, server, got) => {
    server.get('/', defaultHandler);
    server.get('/proxy', async (_request, response) => {
        await pStreamPipeline(got.stream({ decompress: false }), response);
    });
    const { headers } = await got('proxy');
    t.is(headers.unicorn, 'rainbow');
    t.is(headers['content-encoding'], 'gzip');
});
{
    const nodejsMajorVersion = Number(process.versions.node.split('.')[0]);
    const testFn = nodejsMajorVersion < 14 ? ava_1.default.failing : ava_1.default;
    testFn('destroying got.stream() destroys the request - `request` event', with_server_1.default, async (t, server, got) => {
        server.get('/', defaultHandler);
        const stream = got.stream('');
        const request = await pEvent(stream, 'request');
        stream.destroy();
        t.truthy(request.destroyed);
    });
    testFn('destroying got.stream() destroys the request - `response` event', with_server_1.default, async (t, server, got) => {
        server.get('/', (_request, response) => {
            response.write('hello');
        });
        const stream = got.stream('');
        const request = await pEvent(stream, 'request');
        await pEvent(stream, 'response');
        stream.destroy();
        t.truthy(request.destroyed);
    });
}
ava_1.default('piping to got.stream.put()', with_server_1.default, async (t, server, got) => {
    server.get('/', defaultHandler);
    server.put('/post', postHandler);
    await t.notThrowsAsync(async () => {
        await getStream(stream.pipeline(got.stream(''), got.stream.put('post'), () => { }));
    });
});
// See https://github.com/nodejs/node/issues/35237
// eslint-disable-next-line ava/no-skip-test
ava_1.default.skip('no unhandled body stream errors', async (t) => {
    const body = new FormData();
    body.append('upload', fs.createReadStream('/bin/sh'));
    await t.throwsAsync(source_1.default.post(`https://offlinesite${Date.now()}.com`, {
        body
    }), {
        code: 'ENOTFOUND'
    });
});
ava_1.default('works with pipeline', async (t) => {
    await t.throwsAsync(pStreamPipeline(new stream.Readable({
        read() {
            this.push(null);
        }
    }), source_1.default.stream.put('http://localhost:7777')), {
        instanceOf: source_1.RequestError,
        message: 'connect ECONNREFUSED 127.0.0.1:7777'
    });
});
ava_1.default('errors have body', with_server_1.default, async (t, server, got) => {
    var _a;
    server.get('/', (_request, response) => {
        response.setHeader('set-cookie', 'foo=bar');
        response.end('yay');
    });
    const error = await t.throwsAsync(getStream(got.stream('', {
        cookieJar: {
            setCookie: async (_, __) => {
                throw new Error('snap');
            },
            getCookieString: async (_) => ''
        }
    })));
    t.is(error.message, 'snap');
    t.is((_a = error.response) === null || _a === void 0 ? void 0 : _a.body, 'yay');
});
ava_1.default('pipe can send modified headers', with_server_1.default, async (t, server, got) => {
    server.get('/foobar', (_request, response) => {
        response.setHeader('foo', 'bar');
        response.end();
    });
    server.get('/', (_request, response) => {
        got.stream('foobar').on('response', response => {
            response.headers.foo = 'boo';
        }).pipe(response);
    });
    const { headers } = await got('');
    t.is(headers.foo, 'boo');
});
ava_1.default('the socket is alive on a successful pipeline', with_server_1.default, async (t, server, got) => {
    const payload = 'ok';
    server.get('/', (_request, response) => {
        response.end(payload);
    });
    const gotStream = got.stream('');
    t.is(gotStream.socket, undefined);
    const receiver = new stream.PassThrough();
    await util_1.promisify(stream.pipeline)(gotStream, receiver);
    t.is(await getStream(receiver), payload);
    t.truthy(gotStream.socket);
    t.false(gotStream.socket.destroyed);
});
ava_1.default('async iterator works', with_server_1.default, async (t, server, got) => {
    const payload = 'ok';
    server.get('/', (_request, response) => {
        response.end(payload);
    });
    const gotStream = got.stream('');
    const chunks = [];
    for await (const chunk of gotStream) {
        chunks.push(chunk);
    }
    t.is(Buffer.concat(chunks).toString(), payload);
});
if (Number.parseInt(process.versions.node.split('.')[0], 10) <= 12) {
    ava_1.default('does not emit end event on error', with_server_1.default, async (t, server, got) => {
        server.get('/', infiniteHandler);
        await t.notThrowsAsync(new Promise((resolve, reject) => {
            got.stream({
                timeout: 100,
                hooks: {
                    beforeError: [
                        async (error) => {
                            await new Promise(resolve => {
                                setTimeout(resolve, 50);
                            });
                            return error;
                        }
                    ]
                }
            }).once('end', () => {
                reject(new Error('Stream has ended before erroring'));
            }).once('error', resolve).resume();
        }));
    });
}
// Test only on Linux
const testFn = process.platform === 'linux' ? ava_1.default : ava_1.default.skip;
testFn('it sends a body of file with size on stat = 0', with_server_1.default, async (t, server, got) => {
    server.post('/', async (request, response) => {
        response.end(await getStream(request));
    });
    const response = await got.post({
        body: fs.createReadStream('/proc/cpuinfo')
    });
    t.truthy(response.body);
});
