declare module 'multibase' {
    export function encode(name: string, data: Uint8Array): Uint8Array;
    export function decode(data: string | Uint8Array): Uint8Array;
}