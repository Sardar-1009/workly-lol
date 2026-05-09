import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useVacancyBloc } from './vacancyBloc';

describe('useVacancyBloc', () => {
  it('should handle successful loading state', async () => {
    const mockUseCase = {
      fetchVacancies: vi.fn().mockResolvedValue([{ id: 1, title: 'Test Job', status: 'active' }])
    };

    const { result } = renderHook(() => useVacancyBloc(mockUseCase));
    
    expect(result.current.state.loading).toBe(false);
    
    await act(async () => {
      await result.current.loadVacancies('emp-123');
    });

    expect(mockUseCase.fetchVacancies).toHaveBeenCalledWith('emp-123');
    expect(result.current.state.loading).toBe(false);
    expect(result.current.state.error).toBe(null);
    expect(result.current.state.vacancies).toHaveLength(1);
    expect(result.current.state.vacancies[0].title).toBe('Test Job');
  });

  it('should handle error state', async () => {
    const mockUseCase = {
      fetchVacancies: vi.fn().mockRejectedValue(new Error('Network error'))
    };

    const { result } = renderHook(() => useVacancyBloc(mockUseCase));
    
    await act(async () => {
      await result.current.loadVacancies('emp-123');
    });

    expect(result.current.state.loading).toBe(false);
    expect(result.current.state.error).toBe('Network error');
    expect(result.current.state.vacancies).toEqual([]);
  });
});
