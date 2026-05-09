import { describe, it, expect, vi } from 'vitest';
import { VacancyUseCase } from './vacancyUseCase';

describe('VacancyUseCase', () => {
  it('should fetch and filter only active vacancies', async () => {
    const mockRepo = {
      getVacanciesByEmployer: vi.fn().mockResolvedValue([
        { id: 1, title: 'Dev', status: 'active' },
        { id: 2, title: 'Manager', status: 'draft' }
      ])
    };
    
    const useCase = new VacancyUseCase(mockRepo);
    const result = await useCase.fetchVacancies('emp-123');
    
    expect(mockRepo.getVacanciesByEmployer).toHaveBeenCalledWith('emp-123');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  it('should throw an error if employerId is missing', async () => {
    const useCase = new VacancyUseCase({});
    await expect(useCase.fetchVacancies()).rejects.toThrow('Employer ID is required');
  });

  it('should validate vacancy data correctly', () => {
    const useCase = new VacancyUseCase({});
    expect(useCase.validateVacancyData({ title: 'Software Engineer', salary: 1000 })).toBe(true);
    expect(useCase.validateVacancyData({ title: 'Se', salary: 1000 })).toBe(false);
    expect(useCase.validateVacancyData({ title: 'Software Engineer' })).toBe(false);
  });
});
