import axios from 'axios';
import { type Book, type BookPost } from '../types/book';

export async function findAll(): Promise<Book[]>{
    try {
        const response = await axios.get(`http://localhost:8080/books`);
        return response.data;

    } catch (error) {
        throw new Error("Erro ao tentar encontrar livros");
        
    }
}

export async function create(book: BookPost): Promise<Book>{
    try {
        const response = await axios.post(`http://localhost:8080/books`, book);
        return response.data;
        
    } catch (error) {
        throw new Error("Erro ao tentar realizar post na API");
    }
}

export async function update(book: Book): Promise<Book> {
    try {
        const response = await axios.put(`http://localhost:8080/books/${book.id}`, book);
        return response.data;

    } catch (error) {
        throw new Error("Erro ao tentar atualizar informações do livro");
    }
}

export async function remove(book: Book){
    try {
        const response = await axios.delete(`http://localhost:8080/books/${book.id}`);
        return response.data;

    } catch (error) {
        throw new Error("Erro ao tentar excluir o livro");
    }    
}