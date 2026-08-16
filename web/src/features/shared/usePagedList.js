import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

/** Reusable list state: debounced search + filters + pagination, backed by React Query. */
export function usePagedList(key, fetchFn, limit = 20) {
  const [page, setPage] = useState(1);
  const [searchRaw, setSearchRaw] = useState('');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({});

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchRaw);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchRaw]);

  const params = useMemo(() => {
    const f = {};
    Object.entries(filters).forEach(([k, v]) => {
      if (v) f[k] = v;
    });
    return { page, limit, ...(search ? { search } : {}), ...f };
  }, [page, limit, search, filters]);

  const q = useQuery({
    queryKey: [key, params],
    queryFn: () => fetchFn(params),
    placeholderData: keepPreviousData,
  });

  const setFilter = (k, v) => {
    setFilters((f) => ({ ...f, [k]: v }));
    setPage(1);
  };

  return { q, page, setPage, searchRaw, setSearchRaw, filters, setFilter };
}
