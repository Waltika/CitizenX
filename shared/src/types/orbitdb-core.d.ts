// src/types/orbitdb-core.d.ts
declare module 'shared/src/types/orbitdb-core' {
    export function createOrbitDB(options: { ipfs: any }): Promise<any>;
}