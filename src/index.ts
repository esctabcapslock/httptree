import {ServerResponse, IncomingMessage, OutgoingHttpHeaders, createServer, IncomingHttpHeaders, OutgoingHttpHeader} from "http";
import { sendFile } from "./file";



function wildcard2Regexp(str:string):RegExp{
    return new RegExp('^'+str.split("").map(c=>{
        if(c==='*') return '(.+)'
        else if(c==='?') return '(.)'
        const cc = c.charCodeAt(0)
        if(cc<=47||(cc>=58&&cc<=64)||(cc>=91&&cc<=96)||(cc>=123&&cc<128)) return '\\'+c
        else return c
        }).join('')+'$')
}

type HttptreePathCallback<T> = (req:HtIncomingMessage,res:HtServerResponse, data:any, option:T)=>any
export class HttptreePath<T>{
    // protected option:T
    protected subpath:string
    protected showerror:boolean
    private subpathList: {[pathName:string]:{p:HttptreePath<T>, r:RegExp}}
    private methodFns: {[methodName:string]:HttptreePathCallback<T>}
    private getFn: HttptreePathCallback<T>|null
    private headFn: HttptreePathCallback<T>|null
    private postFn: HttptreePathCallback<T>|null
    private putFn: HttptreePathCallback<T>|null
    private deleteFn: HttptreePathCallback<T>|null
    constructor(subpath:string=''){
        this.subpath = subpath
        this.showerror = true
        this.getFn = null
        this.headFn = null
        this.postFn = null
        this.putFn = null
        this.deleteFn = null
        this.subpathList = {}
        this.methodFns = {}
    }

    public p(subpath:string|RegExp):HttptreePath<T>{return this.path(subpath)}
    public path(subpath:string|RegExp):HttptreePath<T>{
        if(typeof subpath == 'string') subpath = subpath.replace(/\\/g,'/').replace(/$\//,'')
        if(this.subpathList[String(subpath)]!==undefined) return this.subpathList[String(subpath)].p
        const $$ = new HttptreePath<T>(String(subpath))
        this.subpathList[String(subpath)] = {p:$$,r:(typeof subpath == 'string'? wildcard2Regexp(subpath):subpath)}
        return $$
    }
    

    public get   (callback:HttptreePathCallback<T>){/*if(this.getFn   !==null) throw("Already set"); */this.getFn = callback;}
    public head  (callback:HttptreePathCallback<T>){/*if(this.headFn  !==null) throw("Already set"); */this.headFn = callback;}
    public post  (callback:HttptreePathCallback<T>){/*if(this.postFn  !==null) throw("Already set"); */this.postFn = callback;}
    public put   (callback:HttptreePathCallback<T>){/*if(this.putFn   !==null) throw("Already set"); */this.putFn = callback;}
    public delete(callback:HttptreePathCallback<T>){/*if(this.deleteFn!==null) throw("Already set"); */this.deleteFn = callback;}
    public method(methodName:string,callback:HttptreePathCallback<T>){
        if(this.methodFns[methodName]!==undefined) throw(`Already set in methodName: ${methodName}`);
        this.methodFns[methodName] = callback
    }

    protected propagation(req:IncomingMessage,res:ServerResponse, option:T, pathName:string):boolean{
        
        pathName = pathName.replace(/\\/g,'/').replace(/^\//,'')
        const pathnameList = pathName.split('/')
        const pathnameL = pathnameList.splice(1).join('/')
        const pathnameF = pathnameList[0]

        // console.log('[propagation]', pathName, pathnameList, 'pathnameL',pathnameL, 'pathnameF', pathnameF)
        if(pathnameF == '' ){
            const method = req.method?.toLocaleLowerCase()
            if(!method) return httpError(400,res,`Invalid method, url: ${req.url}`, 'Invalid method');
            const [HTreq, HTres] = [new HtIncomingMessage(req), new HtServerResponse(req,res)]
            if(method==='get'||method==='head'){

                const out:{[key:string]:string} = {};
                const sp = (new URL('https://localhost'+req.url)).searchParams
                for(const hd of sp.keys()) {
                    const tmp = sp.get(hd)
                    if(tmp) out[hd]=tmp
                }
                // console.log(sp,out)
                if(method=='get'&&this.getFn) this.getFn(HTreq,HTres,out,option)
                else if(method=='head'&&this.headFn) this.headFn(HTreq,HTres,out,option)
                else return false
                return true
            }

            const wrapfn = async (fn:HttptreePathCallback<T>)=>{
                try{
                    const data = await post(req)
                    const json = JSON.parse((data).toString())
                    fn(HTreq, HTres, json, option)
                }catch(e){
                    httpError(400, res, 'request body is wrong'+req.url, true)
                }
            }

            if(this.postFn && method=='post') wrapfn(this.postFn)
            else if(this.putFn && method=='post') wrapfn(this.putFn)
            else if(this.deleteFn && method=='post') wrapfn(this.deleteFn)
            else if(this.methodFns[method]) wrapfn(this.methodFns[method])
            else return false
            return true
        }
        if(this.subpathList[pathnameF]){
            const {p,r} = this.subpathList[pathnameF]
            return p.propagation(req,res, option, pathnameL)
        }
        for (const path in this.subpathList){
            const {p,r} = this.subpathList[path]
            if(r.test(pathnameF)) {
                return p.propagation(req,res, option, pathnameL)
            }

        }

        return false
    }

    private copy(){
        const $$ = new HttptreePath<T>(this.subpath)
        $$.getFn = this.getFn
        $$.postFn = this.postFn
        $$.putFn = this.putFn
        $$.deleteFn = this.deleteFn
        $$.methodFns = this.methodFns
        $$.subpathList = this.subpathList
        return $$
    }
}


export class Server<T> extends HttptreePath<T>{
    constructor(){
        super();
    }

    public parse(req:IncomingMessage,res:ServerResponse, option:T):boolean{
        try{
            const subpath = (new URL('http://localhost'+req.url)).pathname
            return this.propagation(req,res,option, subpath)
        }catch(e){
            return httpError(500,res,`Server request parse error, errmsg: ${e}, url: ${req.url}`, false)
        }
        
    }
}


// class a extends ServerResponse{
    
// }

export class HtIncomingMessage{
    private req:IncomingMessage
    private __url:string
    constructor(req:IncomingMessage){
        if(req.url===undefined) throw('Invalid url')
        if(req.method===undefined) throw('Invalid method')
        this.req = req
        this.__url = req.url
    }
    get complete():boolean{return this.req.complete}
    destroy(error?: Error | undefined): IncomingMessage {return this.req.destroy(error)}
    get headers(){return this.req.headers}
    get url():string{return this.__url}
    get method():string{return this.method}
    get httpVersion(){return this.req.httpVersion}
    get rawHeaders(){return this.req.rawHeaders}
}


export class HtServerResponse{
    private req:IncomingMessage
    private res:ServerResponse
    constructor(req:IncomingMessage, res:ServerResponse){
        this.req = req
        this.res = res
    }

    writeHead(statusCode: number, statusMessage?: string | undefined, headers?: OutgoingHttpHeaders | OutgoingHttpHeader[] | undefined): this;
    writeHead(statusCode: number, headers?: OutgoingHttpHeaders | OutgoingHttpHeader[] | undefined): this;
    writeHead(statusCode: number, statusMessage?: string | undefined | OutgoingHttpHeaders | OutgoingHttpHeader[], headers?: OutgoingHttpHeaders | OutgoingHttpHeader[] | undefined): this {
        if(typeof statusMessage == 'string' || statusMessage === undefined) this.res.writeHead(statusCode, statusMessage, headers)
        else this.res.writeHead(statusCode, headers) 
        return this
    }

    setHeader(name: string, value: string | number | readonly string[]): this {
        this.res.setHeader(name,value);
        return this
    }
    
    set statusCode(statusCode:number){this.res.statusCode = statusCode}
    get statusCode(){return this.res.statusCode}
    getHeader(name: string): string | number | string[] | undefined {return this.res.getHeader(name)}
    removeHeader(name: string): void {this.res.removeHeader(name)}
    set statusMessage(msg:string){this.res.statusMessage = msg}

    send(data:Buffer|string|object):void{
        if(this.statusCode === undefined) this.statusCode = 200
        if(typeof data == 'string' || data instanceof Buffer) this.res.end(data)
        else httpJSON(this.res.statusCode,this.res,data)
    }

    sendFile(filepath:string){
        sendFile(this.res, filepath, this.req.headers.range).catch(e=>{
            return httpError(404, this.res, `File not exist in path, ${this.req.url}, file: ${filepath}`,"File not exist")
        })
    }
    throw(statusCode:number,msg:string, userMsg:string|boolean){
        console.error(`[${statusCode}] throw error, msg: ${msg}`)
        httpError(statusCode, this.res, '', userMsg);
    }
}


export function httpError(statusCode:number,res:HtServerResponse, consoleMsg:any, userMsg?:string|boolean):boolean;
export function httpError(statusCode:number,res:ServerResponse, consoleMsg:any, userMsg?:string|boolean):boolean;
export function httpError(statusCode:number,res:HtServerResponse|ServerResponse, consoleMsg:any, userMsg:string|boolean=false):boolean{
    try{
        const httpStatusList:{[key:number]:string}={
            400:'Bad Request',
            403:'Forbidden',
            404:'Not Found'
        }
        if(!Number.isInteger(statusCode)|| statusCode<=0) throw(`Invalid stateCode, code: ${statusCode}`)
        console.log(`[${statusCode}]`,consoleMsg, userMsg)
        res.statusCode = statusCode
        const out = {
            stateCode: statusCode,
            explain:httpStatusList[statusCode],
            msg:(typeof userMsg === 'string' ? userMsg : (userMsg? consoleMsg: ''))
        }

        if(res instanceof HtServerResponse)  res.send(out)
        else httpJSON(statusCode, res,out)
        return true
    }catch(e){
        console.error('[err0r httpError]',e)
        return false
    }
}

function httpJSON(stateCode:number, res:ServerResponse, data:any){
    if(data===undefined) data = {status:true}
    res.statusCode = stateCode
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(data, (key,value)=>(value==Infinity?'Infinity':value)))
}



async function post(req:IncomingMessage):Promise<Buffer> {
    return new Promise((resolve,rejects)=>{
        const data:any[] = [];
        req.on('error', () => { rejects('error in post') });
        req.on('data', (chunk) => { data.push(chunk) });
        req.on('end', () => { resolve(Buffer.concat(data)) });
    })
}


export const addon = {
    parseCookie : (ar:string[]|undefined|string)=>{
        if(typeof ar == 'string') ar = ar.split(';').map(v=>v.trim())
        if(!ar) return {}
    
        const out:{[key:string|number]:string} = {}
        for(const d of ar){
            const dd = d.split(';')[0]
            const ddd = dd.split('=')
            out[ddd.splice(0,1)[0]] = decodeURI(ddd.join('='))
        }
        return out
    },
    rmStrangeStr:(str:string)=> // Remove Strange Characters
        str.replace(/[\u0000-\u0008]|\u200b|[\u0e00-\u0e7f]|[\u0E80–\u0EFF]/gi,'').replace(/\s{2,}/,' ').trim(),

}