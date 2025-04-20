// src/popup/components/History/__tests__/List.test.tsx
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { HistoryList } from '../List';
import { historyService } from '../../../../background/services/history';

// Mock historyService
jest.mock('../../../../background/services/history', () => ({
    historyService: {
        getVisits: jest.fn()
    }
}));

describe('HistoryList', () => {
    const mockVisits = [
        {
            url: 'https://www.example.com/?utm_source=twitter',
            normalizedUrl: 'https://www.example.com/',
            lastVisited: 1234567890
        }
    ];

    beforeEach(() => {
        jest.clearAllMocks();
        (historyService.getVisits as jest.Mock).mockResolvedValue([]);
    });

    test('renders visit history', async () => {
        (historyService.getVisits as jest.Mock).mockResolvedValueOnce(mockVisits);
        render(<HistoryList />);

        expect(screen.getByText('Visit History')).toBeInTheDocument();
        await waitFor(() => {
            expect(screen.getByText(/www.example.com/)).toBeInTheDocument();
        });
    });

    test('displays no visits message when empty', async () => {
        render(<HistoryList />);
        await waitFor(() => {
            expect(screen.getByText('No visits recorded.')).toBeInTheDocument();
        });
    });
});