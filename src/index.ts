import {ServerResponse, IncomingMessage, OutgoingHttpHeaders, createServer, IncomingHttpHeaders, OutgoingHttpHeader} from "http";

import { HtIncomingMessage, HtServerResponse, httpError } from "./message";



function wildcard2Regexp(str:string):RegExp{
    return new RegExp('^'+str.split("").map(c=>{
        if(c==='*') return '(.+)'
        else if(c==='?') return '(.)'
        const cc = c.charCodeAt(0)
        if(cc<=47||(cc>=58&&cc<=64)||(cc>=91&&cc<=96)||(cc>=123&&cc<128)) return '\\'+c
        else return c
        }).join('')+'$')
}

type HttptreePathCallback<T> = (req:HtIncomingMessage,res:HtServerResponse, option:T)=>any
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
    constructor(subpath:string=''){
        this.subpath = subpath
        this.showerror = true
        this.getFn = null
        this.headFn = null
        this.postFn = null
        this.putFn = null
        this.patchFn = null
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
    public patch (callback:HttptreePathCallback<T>){/*if(this.patchFn !==null) throw("Already set"); */this.patchFn = callback;}
    public delete(callback:HttptreePathCallback<T>){/*if(this.deleteFn!==null) throw("Already set"); */this.deleteFn = callback;}
    public method(methodName:string,callback:HttptreePathCallback<T>){
        if(this.methodFns[methodName]!==undefined) throw(`Already set in methodName: ${methodName}`);
        this.methodFns[methodName] = callback
    }

    protected propagation(req:IncomingMessage,res:ServerResponse, option:T, pathName:string, testedPath:string=''):boolean{
        
        pathName = pathName.replace(/\\/g,'/').replace(/^\//,'')
        const pathnameList = pathName.split('/')
        const pathnameL = pathnameList.splice(1).join('/')
        const pathnameF = pathnameList[0]

        // console.log('[propagation]', pathName, pathnameList, 'pathnameL',pathnameL, 'pathnameF', pathnameF)
        if(pathnameF == '' ){
            const method = req.method?.toUpperCase()
            console.log('me',method)
            if(!method) return httpError(400,res,`Invalid method, url: ${req.url}`, 'Invalid method');
            const [HTreq, HTres] = [new HtIncomingMessage(req, testedPath), new HtServerResponse(req,res)]

            if(method=='GET'||method=='HEAD'){
                if(method=='GET'&&this.getFn) {this.getFn(HTreq,HTres,option); return true}
                else if(method=='HEAD'&&this.headFn) {this.headFn(HTreq,HTres,option); return true}
                else return false
            }
            

            const wrapfn = async (fn:HttptreePathCallback<T>)=>{
                try{
                    HTreq.rawBody = await post(req)
                    // const json = JSON.parse((data).toString())
                    fn(HTreq, HTres, option)
                }catch(e){
                    httpError(400, res, 'request body is wrong'+e+req.url, 'request body is wrong'+req.url)
                }
            }

            if(this.postFn && method=='POST') wrapfn(this.postFn)
            else if(this.putFn && method=='PUT') wrapfn(this.putFn)
            else if(this.patchFn && method=='PATCH') wrapfn(this.patchFn)
            else if(this.deleteFn && method=='DELETE') wrapfn(this.deleteFn)
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
                return p.propagation(req,res, option, pathnameL, pathnameF)
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

    public printStructure(){
        console.log('httptree structure')
        this.printpathStructure('',true)
    }
}


// class a extends ServerResponse{
    
// }

async function post(req:IncomingMessage):Promise<Buffer> {
    return new Promise((resolve,rejects)=>{
        const data:Buffer[] = [];
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