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
exports.HtIncomingMessage = exports.HtServerResponse = exports.httpError = exports.addon = exports.Server = exports.HttptreePath = void 0;
const message_1 = require("./message");
Object.defineProperty(exports, "HtIncomingMessage", { enumerable: true, get: function () { return message_1.HtIncomingMessage; } });
Object.defineProperty(exports, "HtServerResponse", { enumerable: true, get: function () { return message_1.HtServerResponse; } });
Object.defineProperty(exports, "httpError", { enumerable: true, get: function () { return message_1.httpError; } });
const PayloadMaxSize = 2 ** 32; // 4GB
const UrlMaxSize = 1024; // 1014
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
    constructor(subpath = '', option = {}) {
        this.subpath = subpath;
        this.showerror = true;
        this.getFn = null;
        this.headFn = null;
        this.postFn = null;
        this.putFn = null;
        this.patchFn = null;
        this.deleteFn = null;
        this.errorFn = null;
        this.subpathList = {};
        this.methodFns = {};
        this.payloadMaxSize = option.payloadMaxSize ? option.payloadMaxSize : PayloadMaxSize; // limit size of Payload
        this.urlMaxSize = option.urlMaxSize ? option.urlMaxSize : UrlMaxSize; // limit size of Payload
    }
    p(subpath, option = {}) { return this.path(subpath, option); }
    path(subpath, option = {}) {
        if (typeof subpath == 'string')
            subpath = subpath.replace(/\\/g, '/').replace(/$\//, '');
        if (this.subpathList[String(subpath)] !== undefined)
            return this.subpathList[String(subpath)].p;
        const $$ = new HttptreePath(String(subpath), option);
        this.subpathList[String(subpath)] = { p: $$, r: (typeof subpath == 'string' ? wildcard2Regexp(subpath) : subpath) };
        return $$;
    }
    get(callback) { if (this.getFn !== null)
        throw ("Already set"); this.getFn = callback; }
    head(callback) { if (this.headFn !== null)
        throw ("Already set"); this.headFn = callback; }
    post(callback) { if (this.postFn !== null)
        throw ("Already set"); this.postFn = callback; }
    put(callback) { if (this.putFn !== null)
        throw ("Already set"); this.putFn = callback; }
    patch(callback) { if (this.patchFn !== null)
        throw ("Already set"); this.patchFn = callback; }
    delete(callback) { if (this.deleteFn !== null)
        throw ("Already set"); this.deleteFn = callback; }
    catch(callback) { if (this.deleteFn !== null)
        throw ("Already set"); this.errorFn = callback; }
    method(methodName, callback) {
        if (this.methodFns[methodName] !== undefined)
            throw (`Already set in methodName: ${methodName}`);
        this.methodFns[methodName] = callback;
    }
    propagation(req, res, option, pathName, testedPath = '') {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            pathName = pathName.replace(/\\/g, '/').replace(/^\//, '');
            const pathnameList = pathName.split('/');
            const pathnameL = pathnameList.splice(1).join('/');
            const pathnameF = pathnameList[0];
            // console.log('[propagation]', pathName, pathnameList, 'pathnameL',pathnameL, 'pathnameF', pathnameF)
            // if(pathnameF == '' ){
            const propagationError = (fn) => __awaiter(this, void 0, void 0, function* () {
                try {
                    return yield fn();
                }
                catch (err) {
                    const [HTreq, HTres] = [new message_1.HtIncomingMessage(req, testedPath), new message_1.HtServerResponse(req, res)];
                    if (this.errorFn) {
                        try {
                            yield this.errorFn(HTreq, HTres, option, err);
                            return true;
                        }
                        catch (e) {
                            throw (e);
                        }
                    }
                    else
                        throw (err);
                }
            });
            // if(this.getFn||this.headFn||this.postFn||this.patchFn||this.putFn||this.deleteFn){
            if (pathnameF == '') {
                const method = (_a = req.method) === null || _a === void 0 ? void 0 : _a.toUpperCase();
                // console.log('me',method)
                if (!method)
                    return (0, message_1.httpError)(400, res, `Invalid method, url: ${req.url}`, 'Invalid method');
                const [HTreq, HTres] = [new message_1.HtIncomingMessage(req, testedPath), new message_1.HtServerResponse(req, res)];
                const wrapfn = (fn, hasBody) => __awaiter(this, void 0, void 0, function* () {
                    yield propagationError(() => __awaiter(this, void 0, void 0, function* () {
                        try {
                            if (hasBody)
                                HTreq.rawBody = yield post(req, this.payloadMaxSize);
                        }
                        catch (e) {
                            return (0, message_1.httpError)(413, res, 'Payload Too Large' + e + req.url, 'Payload Too Large');
                        }
                        yield fn(HTreq, HTres, option);
                    }));
                });
                if (method == 'GET' && this.getFn)
                    yield wrapfn(this.getFn, false);
                else if (method == 'HEAD' && this.headFn)
                    yield wrapfn(this.headFn, false);
                else if (this.postFn && method == 'POST')
                    yield wrapfn(this.postFn, true);
                else if (this.putFn && method == 'PUT')
                    yield wrapfn(this.putFn, true);
                else if (this.patchFn && method == 'PATCH')
                    yield wrapfn(this.patchFn, true);
                else if (this.deleteFn && method == 'DELETE')
                    yield wrapfn(this.deleteFn, true);
                else if (this.methodFns[method])
                    yield wrapfn(this.methodFns[method], true);
                else
                    return false;
                return true;
            }
            if (this.subpathList[pathnameF]) {
                const { p, r } = this.subpathList[pathnameF];
                return yield propagationError(() => __awaiter(this, void 0, void 0, function* () { return yield p.propagation(req, res, option, pathnameL); }));
            }
            for (const path in this.subpathList) {
                const { p, r } = this.subpathList[path];
                if (r.test(pathnameF)) {
                    r.lastIndex = 0;
                    return yield propagationError(() => __awaiter(this, void 0, void 0, function* () { return yield p.propagation(req, res, option, pathnameL, pathnameF); }));
                }
            }
            return false;
        });
    }
    copy() {
        const $$ = new HttptreePath(this.subpath);
        $$.getFn = this.getFn;
        $$.postFn = this.postFn;
        $$.putFn = this.putFn;
        $$.patchFn = this.patchFn;
        $$.deleteFn = this.deleteFn;
        $$.methodFns = this.methodFns;
        $$.subpathList = this.subpathList;
        return $$;
    }
    printpathStructure(dt, end = true) {
        const tab = '   ';
        const hd = end ? '  ' : '│ ';
        const bt = '•';
        const endchr = end ? '└─' : '├─';
        //const dt = (new Array(d)).fill(tab).join('')
        console.log(dt + endchr + `${"\x1b[32m"}"${this.subpath}"${"\x1b[0m"}`);
        if (this.getFn)
            console.log(dt + hd + bt, 'GET', this.getFn);
        if (this.headFn)
            console.log(dt + hd + bt, 'HEAD', this.headFn);
        if (this.postFn)
            console.log(dt + hd + bt, 'POST', this.postFn);
        if (this.putFn)
            console.log(dt + hd + bt, 'PUT', this.putFn);
        if (this.patchFn)
            console.log(dt + hd + bt, 'PATCH', this.patchFn);
        if (this.deleteFn)
            console.log(dt + hd + bt, 'DELETE', this.deleteFn);
        for (const method in this.methodFns)
            console.log(dt + hd + bt, `${method}:`, this.methodFns[method]);
        const keyList = [];
        for (const subpath in this.subpathList)
            keyList.push(subpath);
        for (let i = 0; i < keyList.length; i++) {
            const { r, p } = this.subpathList[keyList[i]];
            p.printpathStructure(dt + hd, i == (keyList.length - 1));
        }
    }
}
exports.HttptreePath = HttptreePath;
class Server extends HttptreePath {
    constructor(subpath = '', option = {}) {
        super(subpath, option);
    }
    parse(req, res, option) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (req.url && ((_a = req.url) === null || _a === void 0 ? void 0 : _a.length) > this.urlMaxSize)
                return (0, message_1.httpError)(414, res, `URI Too Long, url length: ${req.url.length}`, true);
            try {
                const subpath = (new URL('http://localhost' + req.url)).pathname;
                return yield this.propagation(req, res, option, subpath);
            }
            catch (err) {
                if (this.errorFn) {
                    try {
                        yield this.errorFn(new message_1.HtIncomingMessage(req, '/'), new message_1.HtServerResponse(req, res), option, err);
                    }
                    catch (e) {
                        (0, message_1.httpError)(500, res, `Server request parse error, errmsg: ${e}, url: ${req.url}`, false);
                    }
                    finally {
                        return true;
                    }
                }
                else {
                    return (0, message_1.httpError)(500, res, `Server request parse error, errmsg: ${err}, url: ${req.url}`, false);
                }
            }
        });
    }
    printStructure() {
        console.log('httptree structure');
        this.printpathStructure('', true);
    }
}
exports.Server = Server;
// class a extends ServerResponse{
// }
function post(req, max_size = PayloadMaxSize) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, rejects) => {
            const data = [];
            let size = 0;
            req.on('error', () => { rejects('error in post'); });
            req.on('data', (chunk) => {
                size += chunk.length;
                if (size > max_size)
                    throw ('size off');
                data.push(chunk);
            });
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
     str.replace(/[\u0000-\u0008]|\u200b|[\u0e00-\u0e7f]|[\u0E80–\u0EFF]/gi, '').replace(/\s{2,}/, ' ').trim()
    // parseQuery:(queryString:string)=>{
    //     const query = {} as {[key:string]:string};
    //     (queryString[0] === '?' ? queryString.substr(1) : queryString).split('&').forEach(pair=>{
    //         const data = pair.split('=')
    //         query[decodeURIComponent(data[0])] = decodeURIComponent(data[1] || '');
    //     });
    //     return query;
    // }
};
