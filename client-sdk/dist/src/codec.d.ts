export declare function loadProto(files: string[]): Promise<void>;
export declare function encodeFrame(msgId: number, typeName: string, msg: unknown): Uint8Array;
export declare function decodeFrame(data: ArrayBuffer): {
    msgId: number;
    body: Uint8Array;
};
export declare function decodeBody<T>(body: Uint8Array, typeName: string): T;
