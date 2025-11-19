'use client';

import { useState, useEffect } from 'react';
import { apiGet, apiPost } from '@/lib/api/client';

export interface Book {
  id: number;
  title: string;
  author: string | null;
  publisher: string | null;
  cover_image_url: string | null;
  isbn: string | null;
  asin: string | null;
}

interface BooksResponse {
  books: Book[];
  total: number;
  has_more: boolean;
}

interface BookResponse {
  book: Book;
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
      const data = await apiGet<BooksResponse>('/api/books?limit=100&has_quotes=true');
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
      const data = await apiPost<BookResponse>('/api/books', bookData);
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
