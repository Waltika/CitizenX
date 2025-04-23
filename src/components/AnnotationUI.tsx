// src/components/AnnotationUI.tsx
import { useAnnotations } from '../hooks/useAnnotations';
import { useUserProfiles } from '../hooks/useUserProfiles';
import { default as useAuth } from '../hooks/useAuth'; // Or { useAuth } if using named export
import { useOrbitDB } from '../hooks/useOrbitDB';
import AnnotationList from './AnnotationList';

interface AnnotationUIProps {
    url: string;
}

const AnnotationUI: React.FC<AnnotationUIProps> = ({ url }) => {
    const { did, profile, loading: authLoading } = useAuth();
    const { db, isDbReady, loading: dbLoading } = useOrbitDB('citizenx-annotations', { type: 'documents' });
    const { annotations, error, handleSaveAnnotation, handleDeleteAnnotation, handleSaveComment } = useAnnotations(
        url,
        db,
        did,
        isDbReady
    );
    const { profiles } = useUserProfiles(did);

    // Combine loading states
    const isLoading = authLoading || dbLoading;

    return (
        <div className="annotation-ui">
            <h1>Annotations</h1>
            {isLoading ? (
                <p>Loading...</p>
            ) : !profile ? (
                <p>Please create a profile to start annotating.</p>
            ) : error ? (
                <p>Error: {error}</p>
            ) : (
                <AnnotationList
                    annotations={annotations}
                    profiles={profiles}
                    onSaveAnnotation={handleSaveAnnotation}
                    onDeleteAnnotation={handleDeleteAnnotation}
                    onSaveComment={handleSaveComment}
                />
            )}
        </div>
    );
};

export default AnnotationUI;