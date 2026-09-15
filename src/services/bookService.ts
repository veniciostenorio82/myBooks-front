import axios from 'axios';
import { type Book, type BookPost } from '../types/book';

const API_URL = import.meta.env.VITE_API_URL;

export async function findAll(): Promise<Book[]>{
    try {
        const response = await axios.get(`${API_URL}/books`);
        return response.data;

    } catch (error) {
        throw new Error("Erro ao tentar encontrar livros");
        
    }
}

export async function create(book: BookPost): Promise<Book>{
    try {
        const response = await axios.post(`${API_URL}/books`, book);
        return response.data;
        
    } catch (error) {
        throw new Error("Erro ao tentar realizar post na API");
    }
}

export async function update(book: Book): Promise<Book> {
    try {
        const response = await axios.put(`${API_URL}/books/${book.id}`, book);
        return response.data;

    } catch (error) {
        throw new Error("Erro ao tentar atualizar informações do livro");
    }
}

export async function remove(book: Book){
    try {
        const response = await axios.delete(`${API_URL}/books/${book.id}`);
        return response.data;

    } catch (error) {
        throw new Error("Erro ao tentar excluir o livro");
    }    
}