"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dnsLookupIpVersionToFamily = exports.isDnsLookupIpVersion = void 0;
const conversionTable = {
    auto: 0,
    ipv4: 4,
    ipv6: 6
};
const isDnsLookupIpVersion = (value) => {
    return value in conversionTable;
};
exports.isDnsLookupIpVersion = isDnsLookupIpVersion;
const dnsLookupIpVersionToFamily = (dnsLookupIpVersion) => {
    if (exports.isDnsLookupIpVersion(dnsLookupIpVersion)) {
        return conversionTable[dnsLookupIpVersion];
    }
    throw new Error('Invalid DNS lookup IP version');
};
exports.dnsLookupIpVersionToFamily = dnsLookupIpVersionToFamily;
