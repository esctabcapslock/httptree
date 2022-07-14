/// <reference types="node" />
import { ServerResponse, IncomingMessage } from "http";
import { HtIncomingMessage, HtServerResponse, httpError } from "./message";
declare type HttptreePathCallback<T> = (req: HtIncomingMessage, res: HtServerResponse, data: any, option: T) => any;
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
    private copy;
    protected printpathStructure(dt: string, end?: boolean): void;
}
export declare class Server<T> extends HttptreePath<T> {
    constructor();
    parse(req: IncomingMessage, res: ServerResponse, option: T): boolean;
    printStructure(): void;
}
export declare const addon: {
    parseCookie: (ar: string[] | undefined | string) => {
        [key: string]: string;
        [key: number]: string;
    };
    rmStrangeStr: (str: string) => string;
};
export { httpError, HtServerResponse, HtIncomingMessage };
