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
exports.httpError = exports.addon = exports.Server = exports.HttptreePath = void 0;
const message_1 = require("./message");
Object.defineProperty(exports, "httpError", { enumerable: true, get: function () { return message_1.httpError; } });
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
                return (0, message_1.httpError)(400, res, `Invalid method, url: ${req.url}`, 'Invalid method');
            const [HTreq, HTres] = [new message_1.HtIncomingMessage(req), new message_1.HtServerResponse(req, res)];
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
                    (0, message_1.httpError)(400, res, 'request body is wrong' + req.url, true);
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
    printpathStructure(dt) {
        const tab = '   ';
        const hd = '│ ';
        const bt = '│•';
        //const dt = (new Array(d)).fill(tab).join('')
        console.log(dt + '├─', `${"\x1b[32m"}"${this.subpath}"${"\x1b[0m"}`);
        if (this.getFn)
            console.log(dt + hd + tab + bt, 'get', this.getFn);
        if (this.headFn)
            console.log(dt + hd + tab + bt, 'head', this.headFn);
        if (this.postFn)
            console.log(dt + hd + tab + bt, 'post', this.postFn);
        if (this.putFn)
            console.log(dt + hd + tab + bt, 'put', this.putFn);
        if (this.deleteFn)
            console.log(dt + hd + tab + bt, 'delete', this.deleteFn);
        for (const method in this.methodFns)
            console.log(dt + hd + tab + bt, `${method}:`, this.methodFns[method]);
        for (const subpath in this.subpathList) {
            const { r, p } = this.subpathList[subpath];
            p.printpathStructure(dt + hd + tab);
        }
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
            return (0, message_1.httpError)(500, res, `Server request parse error, errmsg: ${e}, url: ${req.url}`, false);
        }
    }
    printStructure() {
        console.log('this httptree structure');
        this.printpathStructure('');
    }
}
exports.Server = Server;
// class a extends ServerResponse{
// }
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
