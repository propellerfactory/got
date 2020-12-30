'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const url_1 = require("url");
const https = require("https");
const axios_1 = require("axios");
const Benchmark = require("benchmark");
const node_fetch_1 = require("node-fetch");
const request = require("request");
const source_1 = require("../source");
const core_1 = require("../source/core");
const { normalizeArguments } = core_1.default;
// Configuration
const httpsAgent = new https.Agent({
    keepAlive: true,
    rejectUnauthorized: false
});
const url = new url_1.URL('https://127.0.0.1:8080');
const urlString = url.toString();
const gotOptions = {
    agent: {
        https: httpsAgent
    },
    https: {
        rejectUnauthorized: false
    },
    retry: 0
};
const normalizedGotOptions = normalizeArguments(url, gotOptions);
normalizedGotOptions[core_1.kIsNormalizedAlready] = true;
const requestOptions = {
    strictSSL: false,
    agent: httpsAgent
};
const fetchOptions = {
    agent: httpsAgent
};
const axiosOptions = {
    url: urlString,
    httpsAgent,
    https: {
        rejectUnauthorized: false
    }
};
const axiosStreamOptions = {
    ...axiosOptions,
    responseType: 'stream'
};
const httpsOptions = {
    https: {
        rejectUnauthorized: false
    },
    agent: httpsAgent
};
const suite = new Benchmark.Suite();
// Benchmarking
suite.add('got - promise', {
    defer: true,
    fn: async (deferred) => {
        await source_1.default(url, gotOptions);
        deferred.resolve();
    }
}).add('got - stream', {
    defer: true,
    fn: async (deferred) => {
        source_1.default.stream(url, gotOptions).resume().once('end', () => {
            deferred.resolve();
        });
    }
}).add('got - core', {
    defer: true,
    fn: async (deferred) => {
        const stream = new core_1.default(url, gotOptions);
        stream.resume().once('end', () => {
            deferred.resolve();
        });
    }
}).add('got - core - normalized options', {
    defer: true,
    fn: async (deferred) => {
        const stream = new core_1.default(undefined, normalizedGotOptions);
        stream.resume().once('end', () => {
            deferred.resolve();
        });
    }
}).add('request - callback', {
    defer: true,
    fn: (deferred) => {
        request(urlString, requestOptions, (error) => {
            if (error) {
                throw error;
            }
            deferred.resolve();
        });
    }
}).add('request - stream', {
    defer: true,
    fn: (deferred) => {
        const stream = request(urlString, requestOptions);
        stream.resume();
        stream.once('end', () => {
            deferred.resolve();
        });
    }
}).add('node-fetch - promise', {
    defer: true,
    fn: async (deferred) => {
        const response = await node_fetch_1.default(url, fetchOptions);
        await response.text();
        deferred.resolve();
    }
}).add('node-fetch - stream', {
    defer: true,
    fn: async (deferred) => {
        const { body } = await node_fetch_1.default(url, fetchOptions);
        body.resume();
        body.once('end', () => {
            deferred.resolve();
        });
    }
}).add('axios - promise', {
    defer: true,
    fn: async (deferred) => {
        await axios_1.default.request(axiosOptions);
        deferred.resolve();
    }
}).add('axios - stream', {
    defer: true,
    fn: async (deferred) => {
        const { data } = await axios_1.default.request(axiosStreamOptions);
        data.resume();
        data.once('end', () => {
            deferred.resolve();
        });
    }
}).add('https - stream', {
    defer: true,
    fn: (deferred) => {
        https.request(urlString, httpsOptions, response => {
            response.resume();
            response.once('end', () => {
                deferred.resolve();
            });
        }).end();
    }
}).on('cycle', (event) => {
    console.log(String(event.target));
}).on('complete', function () {
    console.log(`Fastest is ${this.filter('fastest').map('name')}`);
    internalBenchmark();
}).run();
const internalBenchmark = () => {
    console.log();
    const internalSuite = new Benchmark.Suite();
    internalSuite.add('got - normalize options', {
        fn: () => {
            normalizeArguments(url, gotOptions);
        }
    }).on('cycle', (event) => {
        console.log(String(event.target));
    });
    internalSuite.run();
};
