// src/types/orbitdb-core.d.ts
declare module '@orbitdb/core' {
    export function createOrbitDB(options: { ipfs: any }): Promise<any>;
}