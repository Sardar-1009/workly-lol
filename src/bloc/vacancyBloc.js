import { useState, useCallback } from 'react';

// A conceptual BLOC (Business Logic Component) implemented as a custom hook
export const useVacancyBloc = (vacancyUseCase) => {
  const [state, setState] = useState({
    vacancies: [],
    loading: false,
    error: null,
  });

  const loadVacancies = useCallback(async (employerId) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const vacancies = await vacancyUseCase.fetchVacancies(employerId);
      setState({
        vacancies,
        loading: false,
        error: null,
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message,
      }));
    }
  }, [vacancyUseCase]);

  return {
    state,
    loadVacancies
  };
};
