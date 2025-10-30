'use client';

import { useState, useEffect } from 'react';

export interface Book {
  id: number;
  title: string;
  author: string | null;
  publisher: string | null;
  cover_image_url: string | null;
  isbn: string | null;
  asin: string | null;
}

export function useBooks() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/books?limit=100');
      if (!response.ok) {
        throw new Error('Failed to fetch books');
      }
      const data = await response.json();
      setBooks(data.books || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const createBook = async (bookData: {
    title: string;
    author?: string;
    publisher?: string;
    cover_image_url?: string;
    isbn?: string;
    asin?: string;
  }): Promise<Book | null> => {
    try {
      const response = await fetch('/api/books', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookData),
      });

      if (!response.ok) {
        throw new Error('Failed to create book');
      }

      const data = await response.json();
      const newBook = data.book;
      setBooks([...books, newBook]);
      return newBook;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    }
  };

  return { books, loading, error, createBook, refetch: fetchBooks };
}
