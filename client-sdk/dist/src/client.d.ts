export declare class GameClient {
    private ws;
    private pending;
    connect(url: string): Promise<void>;
    request<T>(msgId: number, reqType: string, respType: string, msg: unknown, expectMsgId: number, timeoutMs?: number): Promise<T>;
    close(): void;
}
