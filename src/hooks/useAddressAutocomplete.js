import { useEffect, useRef, useState } from "react";
import { searchAddressSuggestions } from "../services/nominatim";

const AUTOCOMPLETE_DEBOUNCE_MS = 350;

export default function useAddressAutocomplete(query) {
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const debounceTimerRef = useRef(null);

  useEffect(() => {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      setSuggestions([]);
      setIsLoading(false);
      setError("");
      return undefined;
    }

    const abortController = new AbortController();
    setIsLoading(true);
    setError("");

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const results = await searchAddressSuggestions(trimmedQuery, {
          signal: abortController.signal
        });
        setSuggestions(results);
      } catch (requestError) {
        if (requestError.name !== "AbortError") {
          setSuggestions([]);
          setError("Unable to fetch address suggestions.");
        }
      } finally {
        setIsLoading(false);
      }
    }, AUTOCOMPLETE_DEBOUNCE_MS);

    return () => {
      abortController.abort();
      clearTimeout(debounceTimerRef.current);
    };
  }, [query]);

  const clearSuggestions = () => setSuggestions([]);

  return {
    suggestions,
    isLoading,
    error,
    clearSuggestions
  };
}

