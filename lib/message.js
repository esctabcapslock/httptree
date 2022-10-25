"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.httpError = exports.HtServerResponse = exports.HtIncomingMessage = void 0;
const file_1 = require("./file");
const querystring_1 = __importDefault(require("querystring"));
class HtIncomingMessage {
    constructor(req, testedSubPath) {
        if (req.url === undefined)
            throw ('Invalid url');
        if (req.method === undefined)
            throw ('Invalid method');
        this.req = req;
        this.__url = req.url;
        this.rawBody = null;
        this.testedSubPath = testedSubPath;
    }
    get complete() { return this.req.complete; }
    destroy(error) { return this.req.destroy(error); }
    get headers() { return this.req.headers; }
    get url() { return this.__url; }
    get method() { return `${this.req.method}`; }
    get httpVersion() { return this.req.httpVersion; }
    get rawHeaders() { return this.req.rawHeaders; }
    get lastSubPath() {
        const d = this.__url.split('?')[0].match(/[^/]+$/);
        if (d)
            return d[0];
        else
            this.__url.split('?')[0].replace(/$\//, '');
    }
    get urlParms() {
        const out = {};
        const sp = (new URL('https://localhost' + this.__url)).searchParams;
        for (const hd of sp.keys()) {
            const tmp = sp.get(hd);
            if (tmp)
                out[hd] = tmp;
        }
        return out;
    }
    body(type = "json") {
        if (type == "raw")
            return this.rawBody;
        if (this.method == 'GET' || this.method == 'HEAD')
            return null;
        if (!this.rawBody)
            return null;
        const str = (this.rawBody).toString();
        switch (type) {
            case "json":
                if (!this.rawBody)
                    return null;
                try {
                    return JSON.parse(str);
                }
                catch (_a) {
                    return null;
                }
            case 'querystring': return querystring_1.default.parse(str);
            case 'string': return str;
            default: return null;
        }
    }
}
exports.HtIncomingMessage = HtIncomingMessage;
class HtServerResponse {
    constructor(req, res) {
        this.req = req;
        this.res = res;
    }
    writeHead(statusCode, statusMessage, headers) {
        if (typeof statusMessage == 'string' || statusMessage === undefined)
            this.res.writeHead(statusCode, statusMessage, headers);
        else
            this.res.writeHead(statusCode, headers);
        return this;
    }
    setHeader(name, value) {
        this.res.setHeader(name, value);
        return this;
    }
    set statusCode(statusCode) { this.res.statusCode = statusCode; }
    get statusCode() { return this.res.statusCode; }
    getHeader(name) { return this.res.getHeader(name); }
    removeHeader(name) { this.res.removeHeader(name); }
    set statusMessage(msg) { this.res.statusMessage = msg; }
    send(data) {
        if (this.statusCode === undefined)
            this.statusCode = 200;
        if (typeof data == 'string' || data instanceof Buffer)
            this.res.end(data);
        else
            httpJSON(this.res.statusCode, this.res, data);
    }
    sendFile(filepath) {
        (0, file_1.sendFile)(this.res, filepath, this.req.headers.range).catch(e => {
            return httpError(404, this.res, `File not exist in path, ${this.req.url}, file: ${filepath}`, "File not exist");
        });
    }
    throw(statusCode, msg, userMsg) {
        console.error(`[${statusCode}] throw error, msg: ${msg}`);
        httpError(statusCode, this.res, '', userMsg);
    }
}
exports.HtServerResponse = HtServerResponse;
function httpError(statusCode, res, consoleMsg, userMsg = false) {
    try {
        const httpStatusList = {
            400: 'Bad Request',
            403: 'Forbidden',
            404: 'Not Found'
        };
        if (!Number.isInteger(statusCode) || statusCode <= 0)
            throw (`Invalid stateCode, code: ${statusCode}`);
        console.log(`[${statusCode}]`, consoleMsg, userMsg);
        res.statusCode = statusCode;
        const out = {
            statusCode: statusCode,
            explain: httpStatusList[statusCode],
            msg: (typeof userMsg === 'string' ? userMsg : (userMsg ? consoleMsg : ''))
        };
        if (res instanceof HtServerResponse)
            res.send(out);
        else
            httpJSON(statusCode, res, out);
        return true;
    }
    catch (e) {
        console.error('[err0r httpError]', e);
        return false;
    }
}
exports.httpError = httpError;
function httpJSON(stateCode, res, data) {
    if (data === undefined)
        data = { status: true };
    res.statusCode = stateCode;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(data, (key, value) => (value == Infinity ? 'Infinity' : value)));
}
