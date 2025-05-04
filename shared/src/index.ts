// Export components
export { AnnotationList } from './components/AnnotationList.js';
export { Comment } from './components/Comment.js';

// Export hooks
export { useCommentInput } from './hooks/useCommentInput.js';
export { useAnnotations } from './hooks/useAnnotations.js';
export { useProfileModal } from './hooks/useProfileModal.js';
export { useUserProfile } from './hooks/useUserProfile.js';
export { useIdentityExportImport } from './hooks/useIdentityExportImport.js';
export { useStorage } from './hooks/useStorage.js';

// Export storage
export { GunRepository } from './storage/GunRepository.js';
export { StorageRepository } from './storage/StorageRepository.js';

// Export utilities
export { normalizeUrl } from './utils/normalizeUrl.js';
export { generateDID, validateDID } from './utils/did.js';
export { generateKeyPair, exportKeyPair, importKeyPair, signMessage, verifySignature } from './utils/crypto.js';

// Export server utilities
export { getAnnotationsServer } from './server/getAnnotationsServer.js';
export { authenticateServer } from './server/authenticateServer.js';
export { saveProfileServer } from './server/profileServer.js';
export { exportIdentityServer, importIdentityServer } from './server/identityServer.js';

// Export configuration
export { bootstrapNodes } from './config/boostrap.js';

// Export types
export * from './types/index.js';


