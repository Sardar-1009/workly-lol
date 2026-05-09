export class VacancyUseCase {
  constructor(apiRepository) {
    this.apiRepository = apiRepository;
  }

  async fetchVacancies(employerId) {
    if (!employerId) {
      throw new Error('Employer ID is required');
    }
    
    try {
      const vacancies = await this.apiRepository.getVacanciesByEmployer(employerId);
      // Business logic: filter out drafted or invalid vacancies
      return vacancies.filter(v => v.status === 'active');
    } catch (error) {
      throw new Error(`Failed to fetch vacancies: ${error.message}`);
    }
  }

  validateVacancyData(data) {
    if (!data.title || data.title.length < 3) return false;
    if (!data.salary) return false;
    return true;
  }
}
