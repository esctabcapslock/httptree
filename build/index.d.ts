/// <reference types="node" />
import { ServerResponse, IncomingMessage, OutgoingHttpHeaders, IncomingHttpHeaders, OutgoingHttpHeader } from "http";
declare type HttptreePathCallback<T> = ($$: HttptreePath<T>, req: HtIncomingMessage, res: HtServerResponse, data: object, option: T) => any;
export declare class HttptreePath<T> {
    protected subpath: string;
    protected showerror: boolean;
    private subpathList;
    private methodFns;
    private getFn;
    private headFn;
    private postFn;
    private putFn;
    private deleteFn;
    constructor(subpath?: string);
    p(subpath: string | RegExp): HttptreePath<T>;
    path(subpath: string | RegExp): HttptreePath<T>;
    get(callback: HttptreePathCallback<T>): void;
    head(callback: HttptreePathCallback<T>): void;
    post(callback: HttptreePathCallback<T>): void;
    put(callback: HttptreePathCallback<T>): void;
    delete(callback: HttptreePathCallback<T>): void;
    method(methodName: string, callback: HttptreePathCallback<T>): void;
    protected propagation(req: IncomingMessage, res: ServerResponse, option: T, pathName: string): boolean;
}
export declare class Server<T> extends HttptreePath<T> {
    constructor();
    parse(req: IncomingMessage, res: ServerResponse, option: T): boolean;
}
export declare class HtIncomingMessage {
    private req;
    private __url;
    constructor(req: IncomingMessage);
    get complete(): boolean;
    destroy(error?: Error | undefined): IncomingMessage;
    get headers(): IncomingHttpHeaders;
    get url(): string;
    get method(): string;
    get httpVersion(): string;
    get rawHeaders(): string[];
}
export declare class HtServerResponse {
    private req;
    private res;
    constructor(req: IncomingMessage, res: ServerResponse);
    writeHead(statusCode: number, statusMessage?: string | undefined, headers?: OutgoingHttpHeaders | OutgoingHttpHeader[] | undefined): this;
    writeHead(statusCode: number, headers?: OutgoingHttpHeaders | OutgoingHttpHeader[] | undefined): this;
    setHeader(name: string, value: string | number | readonly string[]): this;
    set statusCode(statusCode: number);
    getHeader(name: string): string | number | string[] | undefined;
    removeHeader(name: string): void;
    set statusMessage(msg: string);
    send(data: Buffer | string | object): void;
    sendFile(filepath: string): void;
}
export declare function httpError(statusCode: number, res: ServerResponse, consoleMsg: any, userMsg?: string | boolean): boolean;
export declare const addon: {
    parseCookie: (ar: string[] | undefined | string) => {
        [key: string]: string;
    };
    rmStrangeStr: (str: string) => string;
};
export {};
