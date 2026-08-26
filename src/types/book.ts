export interface Book {
  id: number
  title: string
  genre: string
  publicationYear: number
  coverImage?: string
}

export interface BookPost {
  title: string
  genre: string
  publicationYear: number
  coverImage?: string
}