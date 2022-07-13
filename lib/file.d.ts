/// <reference types="node" />
import { ServerResponse } from "http";
export declare function sendFile(res: ServerResponse, pathname: string, range: string | undefined): Promise<void>;
