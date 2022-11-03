import {ServerResponse, IncomingMessage, OutgoingHttpHeaders, createServer, IncomingHttpHeaders, OutgoingHttpHeader} from "http";

import { HtIncomingMessage, HtServerResponse, httpError } from "./message";

const PayloadMaxSize = 2**32 // 4GB
const UrlMaxSize = 1024 // 1014

function wildcard2Regexp(str:string):RegExp{
    return new RegExp('^'+str.split("").map(c=>{
        if(c==='*') return '(.+)'
        else if(c==='?') return '(.)'
        const cc = c.charCodeAt(0)
        if(cc<=47||(cc>=58&&cc<=64)||(cc>=91&&cc<=96)||(cc>=123&&cc<128)) return '\\'+c
        else return c
        }).join('')+'$')
}

interface OptionOfHttptreePath{
    payloadMaxSize?:number,
    urlMaxSize?:number
}

type HttptreePathCallback<T> = 
    ((req:HtIncomingMessage,res:HtServerResponse, option:T)=>void)|
    ((req:HtIncomingMessage,res:HtServerResponse, option:T)=>Promise<void>)

type HttptreeErrorCallback<T> = 
    ((req:HtIncomingMessage,res:HtServerResponse, option:T, error:any)=>void)|
    ((req:HtIncomingMessage,res:HtServerResponse, option:T, error:any)=>Promise<void>)

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
    private patchFn: HttptreePathCallback<T>|null
    private deleteFn: HttptreePathCallback<T>|null
    protected errorFn: HttptreeErrorCallback<T>|null
    public payloadMaxSize:number
    public urlMaxSize:number
    constructor(subpath:string='', option:OptionOfHttptreePath={}){
        this.subpath = subpath
        this.showerror = true
        this.getFn = null
        this.headFn = null
        this.postFn = null
        this.putFn = null
        this.patchFn = null
        this.deleteFn = null
        this.errorFn = null
        this.subpathList = {}
        this.methodFns = {}
        this.payloadMaxSize = option.payloadMaxSize?option.payloadMaxSize:PayloadMaxSize // limit size of Payload
        this.urlMaxSize = option.urlMaxSize?option.urlMaxSize:UrlMaxSize // limit size of Payload
    }

    public p(subpath:string|RegExp, option:OptionOfHttptreePath={}):HttptreePath<T>{return this.path(subpath, option)}
    public path(subpath:string|RegExp, option:OptionOfHttptreePath={}):HttptreePath<T>{
        if(typeof subpath == 'string') subpath = subpath.replace(/\\/g,'/').replace(/$\//,'')
        if(this.subpathList[String(subpath)]!==undefined) return this.subpathList[String(subpath)].p
        const $$ = new HttptreePath<T>(String(subpath), option)
        this.subpathList[String(subpath)] = {p:$$,r:(typeof subpath == 'string'? wildcard2Regexp(subpath):subpath)}
        return $$
    }
    

    public get   (callback:HttptreePathCallback<T>){if(this.getFn   !==null) throw("Already set"); this.getFn = callback;}
    public head  (callback:HttptreePathCallback<T>){if(this.headFn  !==null) throw("Already set"); this.headFn = callback;}
    public post  (callback:HttptreePathCallback<T>){if(this.postFn  !==null) throw("Already set"); this.postFn = callback;}
    public put   (callback:HttptreePathCallback<T>){if(this.putFn   !==null) throw("Already set"); this.putFn = callback;}
    public patch (callback:HttptreePathCallback<T>){if(this.patchFn !==null) throw("Already set"); this.patchFn = callback;}
    public delete(callback:HttptreePathCallback<T>){if(this.deleteFn!==null) throw("Already set"); this.deleteFn = callback;}
    public catch(callback:HttptreeErrorCallback<T>){if(this.deleteFn!==null) throw("Already set"); this.errorFn = callback;}
    public method(methodName:string,callback:HttptreePathCallback<T>){
        if(this.methodFns[methodName]!==undefined) throw(`Already set in methodName: ${methodName}`);
        this.methodFns[methodName] = callback
    }

    protected async propagation(req:IncomingMessage,res:ServerResponse, option:T, pathName:string, testedPath:string=''):Promise<boolean>{
        
        pathName = pathName.replace(/\\/g,'/').replace(/^\//,'')
        const pathnameList = pathName.split('/')
        const pathnameL = pathnameList.splice(1).join('/')
        const pathnameF = pathnameList[0]

        // console.log('[propagation]', pathName, pathnameList, 'pathnameL',pathnameL, 'pathnameF', pathnameF)
        // if(pathnameF == '' ){

        const propagationError = async (fn:Function)=>{
            try{
                return await fn()
            }catch(err){
                const [HTreq, HTres] = [new HtIncomingMessage(req, testedPath), new HtServerResponse(req,res)]
                if (this.errorFn) this.errorFn(HTreq,HTres, option, err)
                else throw(err)
            }

        }


        if(this.getFn||this.headFn||this.postFn||this.patchFn||this.putFn||this.deleteFn){
            const method = req.method?.toUpperCase()
            // console.log('me',method)
            if(!method) return httpError(400,res,`Invalid method, url: ${req.url}`, 'Invalid method');
            const [HTreq, HTres] = [new HtIncomingMessage(req, testedPath), new HtServerResponse(req,res)]


            

            const wrapfn = async (fn:HttptreePathCallback<T>, hasBody:boolean)=>{
                await propagationError(async ()=>{
                    try{
                        if(hasBody) HTreq.rawBody = await post(req, this.payloadMaxSize)
                    }catch(e){
                        return httpError(413, res, 'Payload Too Large'+e+req.url, 'Payload Too Large')
                    }

                    await fn(HTreq, HTres, option)
                })
            }


            if(method=='GET'&&this.getFn)              await wrapfn(this.getFn, false)
            else if(method=='HEAD'&&this.headFn)       await wrapfn(this.headFn, false)
            else if(this.postFn && method=='POST')     await wrapfn(this.postFn,true)
            else if(this.putFn && method=='PUT')       await wrapfn(this.putFn,true)
            else if(this.patchFn && method=='PATCH')   await wrapfn(this.patchFn,true)
            else if(this.deleteFn && method=='DELETE') await wrapfn(this.deleteFn,true)
            else if(this.methodFns[method])            await wrapfn(this.methodFns[method],true)
            else return false
            return true
        }
        if(this.subpathList[pathnameF]){
            const {p,r} = this.subpathList[pathnameF]
            return await propagationError(async ()=> await p.propagation(req,res, option, pathnameL))
        }
        for (const path in this.subpathList){
            const {p,r} = this.subpathList[path]
            if(r.test(pathnameF)) {
                return await propagationError(async ()=> await p.propagation(req, res, option, pathnameL, pathnameF))
            }

        }
        return false
    }

    private copy(){
        const $$ = new HttptreePath<T>(this.subpath)
        $$.getFn = this.getFn
        $$.postFn = this.postFn
        $$.putFn = this.putFn
        $$.patchFn = this.patchFn
        $$.deleteFn = this.deleteFn
        $$.methodFns = this.methodFns
        $$.subpathList = this.subpathList
        return $$
    }

    protected printpathStructure(dt:string,end:boolean=true){
        const tab = '   '
        const hd = end?'  ':'│ '
        const bt = '•'
        const endchr = end?'└─':'├─'
        //const dt = (new Array(d)).fill(tab).join('')
        console.log(dt+endchr+`${"\x1b[32m"}"${this.subpath}"${"\x1b[0m"}`)
        if(this.getFn) console.log(dt+hd+bt,'GET',this.getFn)
        if(this.headFn) console.log(dt+hd+bt,'HEAD',this.headFn)
        if(this.postFn) console.log(dt+hd+bt,'POST',this.postFn)
        if(this.putFn) console.log(dt+hd+bt,'PUT',this.putFn)
        if(this.patchFn) console.log(dt+hd+bt,'PATCH',this.patchFn)
        if(this.deleteFn) console.log(dt+hd+bt,'DELETE',this.deleteFn)
        for(const method in this.methodFns) console.log(dt+hd+bt,`${method}:`,this.methodFns[method])
        const keyList = []
        for(const subpath in this.subpathList) keyList.push(subpath)
        for(let i=0; i<keyList.length; i++){
            const {r,p} = this.subpathList[keyList[i]]
            p.printpathStructure(dt+hd,i==(keyList.length-1))
            
        }
    }
}


export class Server<T> extends HttptreePath<T>{
    constructor(subpath:string='', option:OptionOfHttptreePath={}){
        super(subpath,option);
    }

    public async parse(req:IncomingMessage,res:ServerResponse, option:T):Promise<boolean>{

        if(req.url && req.url?.length>this.urlMaxSize) return httpError(414, res, `URI Too Long, url length: ${req.url.length}`, true)

        try{
            const subpath = (new URL('http://localhost'+req.url)).pathname
            return await this.propagation(req,res,option, subpath)
        }catch(err){
            if(this.errorFn) {
                try{
                    await this.errorFn(new HtIncomingMessage(req, '/'),new HtServerResponse(req,res), option, err)
                }catch(e){
                    httpError(500,res,`Server request parse error, errmsg: ${e}, url: ${req.url}`, false)
                }finally{
                    return true
                }
            }else{
                return httpError(500,res,`Server request parse error, errmsg: ${err}, url: ${req.url}`, false)
            }
        }
    }

    public printStructure(){
        console.log('httptree structure')
        this.printpathStructure('',true)
    }
}


// class a extends ServerResponse{
    
// }

async function post(req:IncomingMessage, max_size:number=PayloadMaxSize):Promise<Buffer> {
    return new Promise((resolve,rejects)=>{
        const data:Buffer[] = [];
        let size = 0
        req.on('error', () => { rejects('error in post') });
        req.on('data', (chunk) => { 
            size+=chunk.length
            if(size>max_size) throw('size off')
            data.push(chunk)

        });
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
        str.replace(/[\u0000-\u0008]|\u200b|[\u0e00-\u0e7f]|[\u0E80–\u0EFF]/gi,'').replace(/\s{2,}/,' ').trim()
    // parseQuery:(queryString:string)=>{
    //     const query = {} as {[key:string]:string};
    //     (queryString[0] === '?' ? queryString.substr(1) : queryString).split('&').forEach(pair=>{
    //         const data = pair.split('=')
    //         query[decodeURIComponent(data[0])] = decodeURIComponent(data[1] || '');
    //     });
    //     return query;
    // }

}

export {httpError,HtServerResponse,HtIncomingMessage}