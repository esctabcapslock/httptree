"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addon = exports.httpError = exports.HtServerResponse = exports.HtIncomingMessage = exports.Server = exports.HttptreePath = void 0;
const file_1 = require("./file");
function wildcard2Regexp(str) {
    return new RegExp('^' + str.split("").map(c => {
        if (c === '*')
            return '(.+)';
        else if (c === '?')
            return '(.)';
        const cc = c.charCodeAt(0);
        if (cc <= 47 || (cc >= 58 && cc <= 64) || (cc >= 91 && cc <= 96) || (cc >= 123 && cc < 128))
            return '\\' + c;
        else
            return c;
    }).join('') + '$');
}
class HttptreePath {
    constructor(subpath = '') {
        this.subpath = subpath;
        this.showerror = true;
        this.getFn = null;
        this.headFn = null;
        this.postFn = null;
        this.putFn = null;
        this.deleteFn = null;
        this.subpathList = {};
        this.methodFns = {};
    }
    p(subpath) { return this.path(subpath); }
    path(subpath) {
        if (typeof subpath == 'string')
            subpath = subpath.replace(/\\/g, '/').replace(/$\//, '');
        if (this.subpathList[String(subpath)] !== undefined)
            return this.subpathList[String(subpath)].p;
        const $$ = new HttptreePath(String(subpath));
        this.subpathList[String(subpath)] = { p: $$, r: (typeof subpath == 'string' ? wildcard2Regexp(subpath) : subpath) };
        return $$;
    }
    get(callback) { /*if(this.getFn   !==null) throw("Already set"); */ this.getFn = callback; }
    head(callback) { /*if(this.headFn  !==null) throw("Already set"); */ this.headFn = callback; }
    post(callback) { /*if(this.postFn  !==null) throw("Already set"); */ this.postFn = callback; }
    put(callback) { /*if(this.putFn   !==null) throw("Already set"); */ this.putFn = callback; }
    delete(callback) { /*if(this.deleteFn!==null) throw("Already set"); */ this.deleteFn = callback; }
    method(methodName, callback) {
        if (this.methodFns[methodName] !== undefined)
            throw (`Already set in methodName: ${methodName}`);
        this.methodFns[methodName] = callback;
    }
    propagation(req, res, option, pathName) {
        var _a;
        pathName = pathName.replace(/\\/g, '/').replace(/^\//, '');
        const pathnameList = pathName.split('/');
        const pathnameL = pathnameList.splice(1).join('/');
        const pathnameF = pathnameList[0];
        // console.log('[propagation]', pathName, pathnameList, 'pathnameL',pathnameL, 'pathnameF', pathnameF)
        if (pathnameF == '') {
            const method = (_a = req.method) === null || _a === void 0 ? void 0 : _a.toLocaleLowerCase();
            if (!method)
                return httpError(400, res, `Invalid method, url: ${req.url}`, 'Invalid method');
            const [HTreq, HTres] = [new HtIncomingMessage(req), new HtServerResponse(req, res)];
            if (method === 'get' || method === 'head') {
                const out = {};
                const sp = (new URL('https://localhost' + req.url)).searchParams;
                for (const hd of sp.keys()) {
                    const tmp = sp.get(hd);
                    if (tmp)
                        out[hd] = tmp;
                }
                // console.log(sp,out)
                if (method == 'get' && this.getFn)
                    this.getFn(HTreq, HTres, out, option);
                else if (method == 'head' && this.headFn)
                    this.headFn(HTreq, HTres, out, option);
                else
                    return false;
                return true;
            }
            const wrapfn = (fn) => __awaiter(this, void 0, void 0, function* () {
                try {
                    const data = yield post(req);
                    const json = JSON.parse((data).toString());
                    fn(HTreq, HTres, json, option);
                }
                catch (e) {
                    httpError(400, res, 'request body is wrong' + req.url, true);
                }
            });
            if (this.postFn && method == 'post')
                wrapfn(this.postFn);
            else if (this.putFn && method == 'post')
                wrapfn(this.putFn);
            else if (this.deleteFn && method == 'post')
                wrapfn(this.deleteFn);
            else if (this.methodFns[method])
                wrapfn(this.methodFns[method]);
            else
                return false;
            return true;
        }
        if (this.subpathList[pathnameF]) {
            const { p, r } = this.subpathList[pathnameF];
            return p.propagation(req, res, option, pathnameL);
        }
        for (const path in this.subpathList) {
            const { p, r } = this.subpathList[path];
            if (r.test(pathnameF)) {
                return p.propagation(req, res, option, pathnameL);
            }
        }
        return false;
    }
    copy() {
        const $$ = new HttptreePath(this.subpath);
        $$.getFn = this.getFn;
        $$.postFn = this.postFn;
        $$.putFn = this.putFn;
        $$.deleteFn = this.deleteFn;
        $$.methodFns = this.methodFns;
        $$.subpathList = this.subpathList;
        return $$;
    }
}
exports.HttptreePath = HttptreePath;
class Server extends HttptreePath {
    constructor() {
        super();
    }
    parse(req, res, option) {
        try {
            const subpath = (new URL('http://localhost' + req.url)).pathname;
            return this.propagation(req, res, option, subpath);
        }
        catch (e) {
            return httpError(500, res, `Server request parse error, errmsg: ${e}, url: ${req.url}`, false);
        }
    }
}
exports.Server = Server;
// class a extends ServerResponse{
// }
class HtIncomingMessage {
    constructor(req) {
        if (req.url === undefined)
            throw ('Invalid url');
        if (req.method === undefined)
            throw ('Invalid method');
        this.req = req;
        this.__url = req.url;
    }
    get complete() { return this.req.complete; }
    destroy(error) { return this.req.destroy(error); }
    get headers() { return this.req.headers; }
    get url() { return this.__url; }
    get method() { return this.method; }
    get httpVersion() { return this.req.httpVersion; }
    get rawHeaders() { return this.req.rawHeaders; }
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
            stateCode: statusCode,
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
function post(req) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, rejects) => {
            const data = [];
            req.on('error', () => { rejects('error in post'); });
            req.on('data', (chunk) => { data.push(chunk); });
            req.on('end', () => { resolve(Buffer.concat(data)); });
        });
    });
}
exports.addon = {
    parseCookie: (ar) => {
        if (typeof ar == 'string')
            ar = ar.split(';').map(v => v.trim());
        if (!ar)
            return {};
        const out = {};
        for (const d of ar) {
            const dd = d.split(';')[0];
            const ddd = dd.split('=');
            out[ddd.splice(0, 1)[0]] = decodeURI(ddd.join('='));
        }
        return out;
    },
    rmStrangeStr: (str) => // Remove Strange Characters
     str.replace(/[\u0000-\u0008]|\u200b|[\u0e00-\u0e7f]|[\u0E80–\u0EFF]/gi, '').replace(/\s{2,}/, ' ').trim(),
};
