/// <reference types="node" />
import { IncomingMessage, OutgoingHttpHeader, OutgoingHttpHeaders, ServerResponse } from "http";
export declare class HtIncomingMessage {
    private req;
    private __url;
    rawBody: null | Buffer;
    testedSubPath: string;
    constructor(req: IncomingMessage, testedSubPath: string);
    get complete(): boolean;
    destroy(error?: Error | undefined): IncomingMessage;
    get headers(): import("http").IncomingHttpHeaders;
    get url(): string;
    get method(): string;
    get httpVersion(): string;
    get rawHeaders(): string[];
    get lastSubPath(): string | undefined;
    get urlParms(): {
        [key: string]: string;
    };
    body(type?: "json" | "string" | "raw" | "querystring"): any;
}
export declare class HtServerResponse {
    private req;
    private res;
    constructor(req: IncomingMessage, res: ServerResponse);
    writeHead(statusCode: number, statusMessage?: string | undefined, headers?: OutgoingHttpHeaders | OutgoingHttpHeader[] | undefined): this;
    writeHead(statusCode: number, headers?: OutgoingHttpHeaders | OutgoingHttpHeader[] | undefined): this;
    setHeader(name: string, value: string | number | readonly string[]): this;
    set statusCode(statusCode: number);
    get statusCode(): number;
    getHeader(name: string): string | number | string[] | undefined;
    removeHeader(name: string): void;
    set statusMessage(msg: string);
    send(data: Buffer | string | object): void;
    sendFile(filepath: string): void;
    throw(statusCode: number, msg: string, userMsg: string | boolean): void;
}
export declare function httpError(statusCode: number, res: HtServerResponse, consoleMsg: any, userMsg?: string | boolean): boolean;
export declare function httpError(statusCode: number, res: ServerResponse, consoleMsg: any, userMsg?: string | boolean): boolean;
