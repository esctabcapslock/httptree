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
exports.sendFile = void 0;
const fs_1 = require("fs");
function get_file_type(mime) {
    if (['txt', 'css', 'js', 'ts', 'html', 'json'].includes(mime)) {
        return `text/${mime == 'txt' ? 'plain' : mime.replace('js', 'javascript')}; charset=utf-8`;
    }
    else
        return 'application';
}
function sendFile(res, pathname, range) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (!(0, fs_1.existsSync)(pathname))
                throw ('404 file not in server');
            const stats = (0, fs_1.statSync)(pathname);
            if (stats.isDirectory())
                throw ('404 this is directory, can not streaming ');
            const mime = pathname.split('.').splice(-1)[0];
            const parts = range == undefined ? undefined : range.replace(/bytes=/, "").replace(/\/([0-9|*]+)$/, '').split("-").map(v => parseInt(v));
            const file_type = get_file_type(mime);
            if (!parts || parts.length != 2 || isNaN(parts[0]) || parts[0] < 0) {
                res.setHeader('Content-Type', file_type);
                res.setHeader('Content-Length', 'stats.size');
                res.setHeader('Accept-Ranges', 'bytes');
                const readStream = (0, fs_1.createReadStream)(pathname);
                readStream.pipe(res);
            }
            else {
                const start = parts[0];
                const MAX_CHUNK_SIZE = 1024 * 1024 * 10;
                const end = Math.min((parts[1] < stats.size - 1) ? parts[1] : stats.size - 1, start + MAX_CHUNK_SIZE - 1);
                const readStream = (0, fs_1.createReadStream)(pathname, { start, end });
                res.setHeader('Content-Type', file_type);
                res.setHeader('Accept-Ranges', 'bytes');
                res.setHeader('Content-Range', `bytes ${start}-${end}/${stats.size}`);
                res.setHeader('Content-Length', end - start + 1);
                readStream.pipe(res);
            }
        }
        catch (e) {
            throw (`404 file not exist ${e}`);
        }
    });
}
exports.sendFile = sendFile;
