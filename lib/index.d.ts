/// <reference types="node" />
import { ServerResponse, IncomingMessage } from "http";
import { HtIncomingMessage, HtServerResponse, httpError } from "./message";
interface OptionOfHttptreePath {
    payloadMaxSize?: number;
    urlMaxSize?: number;
}
declare type HttptreePathCallback<T> = ((req: HtIncomingMessage, res: HtServerResponse, option: T) => void) | ((req: HtIncomingMessage, res: HtServerResponse, option: T) => Promise<void>);
declare type HttptreeErrorCallback<T> = ((req: HtIncomingMessage, res: HtServerResponse, option: T, error: any) => void) | ((req: HtIncomingMessage, res: HtServerResponse, option: T, error: any) => Promise<void>);
export declare class HttptreePath<T> {
    protected subpath: string;
    protected showerror: boolean;
    private subpathList;
    private methodFns;
    private getFn;
    private headFn;
    private postFn;
    private putFn;
    private patchFn;
    private deleteFn;
    protected errorFn: HttptreeErrorCallback<T> | null;
    payloadMaxSize: number;
    urlMaxSize: number;
    constructor(subpath?: string, option?: OptionOfHttptreePath);
    p(subpath: string | RegExp, option?: OptionOfHttptreePath): HttptreePath<T>;
    path(subpath: string | RegExp, option?: OptionOfHttptreePath): HttptreePath<T>;
    get(callback: HttptreePathCallback<T>): void;
    head(callback: HttptreePathCallback<T>): void;
    post(callback: HttptreePathCallback<T>): void;
    put(callback: HttptreePathCallback<T>): void;
    patch(callback: HttptreePathCallback<T>): void;
    delete(callback: HttptreePathCallback<T>): void;
    catch(callback: HttptreeErrorCallback<T>): void;
    method(methodName: string, callback: HttptreePathCallback<T>): void;
    protected propagation(req: IncomingMessage, res: ServerResponse, option: T, pathName: string, testedPath?: string): Promise<boolean>;
    private copy;
    protected printpathStructure(dt: string, end?: boolean): void;
}
export declare class Server<T> extends HttptreePath<T> {
    constructor(subpath?: string, option?: OptionOfHttptreePath);
    parse(req: IncomingMessage, res: ServerResponse, option: T): Promise<boolean>;
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
