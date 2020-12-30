"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const stream_1 = require("stream");
exports.default = (clock) => {
    let i = 0;
    return new stream_1.Readable({
        read() {
            if (i++ < 10) {
                this.push('data\n'.repeat(100));
                clock.tick(100);
            }
            else {
                this.push(null);
            }
        }
    });
};
