import {ServerResponse,OutgoingHttpHeaders} from "http"
import {createReadStream, statSync, existsSync} from "fs"


function get_file_type(mime:string){
    if (['txt','css','js','ts','html','json'].includes(mime)){
        return `text/${mime=='txt'?'plain':mime.replace('js','javascript')}; charset=utf-8`;
    }else return 'application'
}

export async function sendFile(res:ServerResponse,pathname:string,range:string|undefined){
    try {
        if(!existsSync(pathname)) throw('404 file not in server')
        const stats = statSync(pathname)
        if(stats.isDirectory()) throw('404 this is directory, can not streaming ')

        const mime = pathname.split('.').splice(-1)[0]
        const parts = range == undefined ? undefined : range.replace(/bytes=/, "").replace(/\/([0-9|*]+)$/, '').split("-").map(v => parseInt(v));
        const file_type = get_file_type(mime)

        if (!parts || parts.length != 2 || isNaN(parts[0]) || parts[0] < 0) {
            res.setHeader('Content-Type', file_type)
            res.setHeader('Content-Length',  'stats.size')
            res.setHeader('Accept-Ranges', 'bytes')
            const readStream = createReadStream(pathname)
            readStream.pipe(res);
        } else {
            const start = parts[0];
            const MAX_CHUNK_SIZE = 1024 * 1024 * 10;
            const end = Math.min((parts[1] < stats.size - 1) ? parts[1] : stats.size - 1, start + MAX_CHUNK_SIZE - 1)
            const readStream = createReadStream(pathname, { start, end });
            res.setHeader('Content-Type' ,file_type)
            res.setHeader('Accept-Ranges' , 'bytes')
            res.setHeader('Content-Range' , `bytes ${start}-${end}/${stats.size}`)
            res.setHeader('Content-Length', end - start + 1)
            readStream.pipe(res);
        }
    } catch (e) {
        throw (`404 file not exist, error: ${e}`)
    }
}