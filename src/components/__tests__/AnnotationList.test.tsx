// src/components/__tests__/AnnotationList.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import AnnotationList from '../AnnotationList';
import '@testing-library/jest-dom';

describe('AnnotationList', () => {
    const mockOnDelete = jest.fn();

    it('displays no annotations message when empty', () => {
        render(<AnnotationList annotations={[]} onDelete={mockOnDelete} />);

        expect(screen.getByText('No annotations yet.')).toBeInTheDocument();
    });

    it('renders a list of annotations', () => {
        const annotations = [
            { _id: '1', url: 'https://example.com', text: 'First annotation', timestamp: 1630000000000 },
            { _id: '2', url: 'https://example.com', text: 'Second annotation', timestamp: 1630000001000 },
        ];

        render(<AnnotationList annotations={annotations} onDelete={mockOnDelete} />);

        expect(screen.getByText('First annotation')).toBeInTheDocument();
        expect(screen.getAllByText(/2021/)).toHaveLength(2); // Expect two timestamps
        expect(screen.getByText('Second annotation')).toBeInTheDocument();
        expect(screen.getAllByText('Delete')).toHaveLength(2);
    });

    it('calls onDelete when the delete button is clicked', () => {
        const annotations = [
            { _id: '1', url: 'https://example.com', text: 'First annotation', timestamp: 1630000000000 },
        ];

        render(<AnnotationList annotations={annotations} onDelete={mockOnDelete} />);

        const deleteButton = screen.getByText('Delete');
        fireEvent.click(deleteButton);

        expect(mockOnDelete).toHaveBeenCalledWith('1');
    });
});