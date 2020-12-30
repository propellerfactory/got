"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("util");
const stream = require("stream");
const fs = require("fs");
const SlowStream = require("slow-stream");
const toReadableStream = require("to-readable-stream");
const getStream = require("get-stream");
const FormData = require("form-data");
const tempy = require("tempy");
const is_1 = require("@sindresorhus/is");
const ava_1 = require("ava");
const with_server_1 = require("./helpers/with-server");
const checkEvents = (t, events, bodySize) => {
    t.true(events.length >= 2);
    let lastEvent = events.shift();
    if (!is_1.default.number(bodySize)) {
        t.is(lastEvent.percent, 0);
    }
    for (const [index, event] of events.entries()) {
        const isLastEvent = index === events.length - 1;
        if (is_1.default.number(bodySize)) {
            t.is(event.percent, event.transferred / bodySize);
            t.true(event.percent > lastEvent.percent);
            t.true(event.transferred > lastEvent.transferred);
        }
        else if (isLastEvent) {
            t.is(event.percent, 1);
            t.is(event.transferred, lastEvent.transferred);
            t.is(event.total, event.transferred);
        }
        else {
            t.is(event.percent, 0);
            t.true(event.transferred > lastEvent.transferred);
        }
        lastEvent = event;
    }
};
const file = Buffer.alloc(1024 * 1024 * 2);
const downloadEndpoint = (_request, response) => {
    response.setHeader('content-length', file.length);
    stream.pipeline(toReadableStream(file), new SlowStream({ maxWriteInterval: 50 }), response, () => {
        response.end();
    });
};
const noTotalEndpoint = (_request, response) => {
    response.write('hello');
    response.end();
};
const uploadEndpoint = (request, response) => {
    stream.pipeline(request, new SlowStream({ maxWriteInterval: 100 }), () => {
        response.end();
    });
};
ava_1.default('download progress', with_server_1.default, async (t, server, got) => {
    server.get('/', downloadEndpoint);
    const events = [];
    const { body } = await got({ responseType: 'buffer' })
        .on('downloadProgress', event => events.push(event));
    checkEvents(t, events, body.length);
});
ava_1.default('download progress - missing total size', with_server_1.default, async (t, server, got) => {
    var _a;
    server.get('/', noTotalEndpoint);
    const events = [];
    await got('').on('downloadProgress', (event) => events.push(event));
    t.is((_a = events[0]) === null || _a === void 0 ? void 0 : _a.total, undefined);
    checkEvents(t, events);
});
ava_1.default('download progress - stream', with_server_1.default, async (t, server, got) => {
    server.get('/', downloadEndpoint);
    const events = [];
    const stream = got.stream({ responseType: 'buffer' })
        .on('downloadProgress', event => events.push(event));
    await getStream(stream);
    checkEvents(t, events, file.length);
});
ava_1.default('upload progress - file', with_server_1.default, async (t, server, got) => {
    server.post('/', uploadEndpoint);
    const events = [];
    await got.post({ body: file }).on('uploadProgress', (event) => events.push(event));
    checkEvents(t, events, file.length);
});
ava_1.default('upload progress - file stream', with_server_1.default, async (t, server, got) => {
    server.post('/', uploadEndpoint);
    const path = tempy.file();
    fs.writeFileSync(path, file);
    const events = [];
    await got.post({ body: fs.createReadStream(path) })
        .on('uploadProgress', (event) => events.push(event));
    checkEvents(t, events, file.length);
});
ava_1.default('upload progress - form data', with_server_1.default, async (t, server, got) => {
    server.post('/', uploadEndpoint);
    const events = [];
    const body = new FormData();
    body.append('key', 'value');
    body.append('file', file);
    const size = await util_1.promisify(body.getLength.bind(body))();
    await got.post({ body }).on('uploadProgress', (event) => events.push(event));
    checkEvents(t, events, size);
});
ava_1.default('upload progress - json', with_server_1.default, async (t, server, got) => {
    server.post('/', uploadEndpoint);
    const body = JSON.stringify({ key: 'value' });
    const size = Buffer.byteLength(body);
    const events = [];
    await got.post({ body }).on('uploadProgress', (event) => events.push(event));
    checkEvents(t, events, size);
});
ava_1.default('upload progress - stream with known body size', with_server_1.default, async (t, server, got) => {
    server.post('/', uploadEndpoint);
    const events = [];
    const options = {
        headers: { 'content-length': file.length.toString() }
    };
    const request = got.stream.post(options)
        .on('uploadProgress', event => events.push(event));
    await getStream(stream.pipeline(toReadableStream(file), request, () => { }));
    checkEvents(t, events, file.length);
});
ava_1.default('upload progress - stream with unknown body size', with_server_1.default, async (t, server, got) => {
    var _a;
    server.post('/', uploadEndpoint);
    const events = [];
    const request = got.stream.post('')
        .on('uploadProgress', event => events.push(event));
    await getStream(stream.pipeline(toReadableStream(file), request, () => { }));
    t.is((_a = events[0]) === null || _a === void 0 ? void 0 : _a.total, undefined);
    checkEvents(t, events);
});
ava_1.default('upload progress - no body', with_server_1.default, async (t, server, got) => {
    server.post('/', uploadEndpoint);
    const events = [];
    await got.post('').on('uploadProgress', (event) => events.push(event));
    t.deepEqual(events, [
        {
            percent: 0,
            transferred: 0,
            total: undefined
        },
        {
            percent: 1,
            transferred: 0,
            total: 0
        }
    ]);
});
