"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isResponseOk = void 0;
const isResponseOk = (response) => {
    const { statusCode } = response;
    const limitStatusCode = response.request.options.followRedirect ? 299 : 399;
    return (statusCode >= 200 && statusCode <= limitStatusCode) || statusCode === 304;
};
exports.isResponseOk = isResponseOk;
