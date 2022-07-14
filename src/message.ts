import { IncomingMessage, OutgoingHttpHeader, OutgoingHttpHeaders, ServerResponse } from "http"
import { sendFile } from "./file";

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
