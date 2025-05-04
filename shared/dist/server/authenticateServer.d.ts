interface AuthenticateServerProps {
    gun: any;
    did?: string;
}
export declare function authenticateServer({ gun, did }: AuthenticateServerProps): Promise<{
    did: string;
    privateKey: string;
}>;
export {};
