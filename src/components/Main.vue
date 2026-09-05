<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { Book, BookPost } from '../types/book'
import { create, findAll, remove, update } from '../services/bookService'

const STORAGE_KEY = 'personal-library-books'
const THEME_KEY = 'personal-library-theme'

const books = ref<Book[]>([])
const searchQuery = ref('')
const sortBy = ref<'title' | 'publicationYear' | 'genre'>('title')
const isDark = ref(false)

const showFormModal = ref(false)
const showDetailModal = ref(false)
const showDeleteConfirm = ref(false)
const editingBook = ref<Book | null>(null)
const selectedBook = ref<Book | null>(null)

const form = ref({
  title: '',
  genre: '',
  publicationYear: new Date().getFullYear(),
  coverImage: undefined as string | undefined,
})

const coverError = ref('')
const MAX_COVER_SIZE = 2 * 1024 * 1024

const genres = [
  'Ficção',
  'Romance',
  'Fantasia',
  'Ficção Científica',
  'Terror',
  'Suspense',
  'Drama',
  'Comédia',
  'Ação',
  'Aventura',
  'Suspense Policial',
  'Biografia',
  'História',
  'Tecnologia',
  'Filosofia',
  'Poesia',
  'Outro',
]

function saveBooks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(books.value));
}

const filteredBooks = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  let result = [...books.value]

  if (query) {
    result = result.filter(
      (book) =>
        book.title.toLowerCase().includes(query) ||
        book.genre.toLowerCase().includes(query) ||
        String(book.publicationYear).includes(query),
    )
  }

  result.sort((a, b) => {
    if (sortBy.value === 'publicationYear') return b.publicationYear - a.publicationYear
    if (sortBy.value === 'genre') return a.genre.localeCompare(b.genre, 'pt-BR')
    return a.title.localeCompare(b.title, 'pt-BR')
  })

  return result
})

function coverGradient(title: string) {
  let hash = 0
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash) % 360
  return `linear-gradient(145deg, hsl(${hue}, 45%, 28%) 0%, hsl(${(hue + 40) % 360}, 55%, 18%) 100%)`
}

function coverInitials(title: string) {
  return title
    .split(' ')
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('')
}

function resetForm() {
  form.value = {
    title: '',
    genre: genres[0],
    publicationYear: new Date().getFullYear(),
    coverImage: undefined,
  }
  coverError.value = ''
}

function onCoverSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  coverError.value = ''

  if (!file) return

  if (!file.type.startsWith('image/')) {
    coverError.value = 'Selecione um arquivo de imagem válido.'
    input.value = ''
    return
  }

  if (file.size > MAX_COVER_SIZE) {
    coverError.value = 'A imagem deve ter no máximo 2 MB.'
    input.value = ''
    return
  }

  const reader = new FileReader()
  reader.onload = () => {
    form.value.coverImage = reader.result as string
  }
  reader.onerror = () => {
    coverError.value = 'Não foi possível carregar a imagem.'
  }
  reader.readAsDataURL(file)
  input.value = ''
}

function removeCover() {
  form.value.coverImage = undefined
  coverError.value = ''
}

function coverPreviewStyle(title: string, coverImage?: string) {
  if (coverImage) return undefined
  return { background: coverGradient(title) }
}

function openAddModal() {
  editingBook.value = null
  resetForm()
  showFormModal.value = true
}

function openEditModal(book: Book) {
  editingBook.value = book
  form.value = {
    title: book.title,
    genre: book.genre,
    publicationYear: book.publicationYear,
    coverImage: book.coverImage,
  }
  coverError.value = ''
  showDetailModal.value = false
  showFormModal.value = true
}

function openDetailModal(book: Book) {
  selectedBook.value = book
  showDetailModal.value = true
}

function closeFormModal() {
  showFormModal.value = false
  editingBook.value = null
  resetForm()
}

function closeDetailModal() {
  showDetailModal.value = false
  selectedBook.value = null
}

async function submitForm() {
  const title = form.value.title.trim()
  const genre = form.value.genre.trim()
  const publicationYear = Number(form.value.publicationYear)

  if (!title || !genre || !publicationYear || publicationYear < 1000 || publicationYear > 9999) return

  if (editingBook.value) {
    const index = books.value.findIndex((b) => b.id === editingBook.value!.id)
    
    if (index !== -1) {
      const updated: Book = { ...editingBook.value, title, genre, publicationYear }
      
      if (form.value.coverImage) {
        updated.coverImage = form.value.coverImage
      
      } else {
        delete updated.coverImage
      
      }
      
      const updatedBook = await update(updated);
      books.value = books.value.map((book) => book.id === updatedBook.id ? updatedBook : book);
    }

  } else {
    const book: BookPost = { title, genre, publicationYear }
    
    if (form.value.coverImage) {
      book.coverImage = form.value.coverImage
    }

    const createBook = await create(book);
    books.value.push(createBook)
  }
  
  saveBooks()
  closeFormModal()
}

function requestDelete(book: Book) {
  selectedBook.value = book
  showDeleteConfirm.value = true
}

async function confirmDelete() {
  if (!selectedBook.value) return;

  // Envia o livro selecionado para a API realizar a exclusão
  await remove(selectedBook.value);
  
  // Remove do array o livro cujo ID é igual ao ID do livro selecionado
  books.value = books.value.filter((b) => b.id !== selectedBook.value!.id); 

  // Modal de confirmação de exclusão fecha
  showDeleteConfirm.value = false; 

  // Fecha o modal de "detalhes" do livro
  closeDetailModal(); 
}

function cancelDelete() {
  showDeleteConfirm.value = false
}

function applyTheme(dark: boolean) {
  isDark.value = dark
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
  localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light')
}

function toggleTheme() {
  applyTheme(!isDark.value)
}

function initTheme() {
  const stored = localStorage.getItem(THEME_KEY)
  if (stored === 'dark' || stored === 'light') {
    applyTheme(stored === 'dark');
    return
  }
  applyTheme(window.matchMedia('(prefers-color-scheme: dark)').matches);
}

onMounted( async () => {
  const resultado = await findAll();
  books.value = resultado;
  

  initTheme();
})
</script>

<template>
  <div class="library">
    <header class="header">
      <div class="header-inner">
        <div class="brand">
          <span class="brand-icon">📚</span>
          <h1 class="brand-title">Minha Biblioteca</h1>
        </div>

        <div class="header-actions">
          <div class="search-wrapper">
            <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <input
              v-model="searchQuery"
              type="search"
              class="search-input"
              placeholder="Pesquisar por título, gênero ou ano..."
              aria-label="Pesquisar livros"
            />
          </div>

          <button
            type="button"
            class="btn btn-icon"
            :aria-label="isDark ? 'Ativar modo claro' : 'Ativar modo escuro'"
            :title="isDark ? 'Modo claro' : 'Modo escuro'"
            @click="toggleTheme"
          >
            <svg v-if="isDark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
            </svg>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          </button>

          <button type="button" class="btn btn-primary" @click="openAddModal">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="18" height="18">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Adicionar livro
          </button>
        </div>
      </div>
    </header>

    <main class="main">
      <section class="hero">
        <div class="hero-content">
          <p class="hero-label">Sua coleção pessoal</p>
          <h2 class="hero-title">{{ books.length }} {{ books.length === 1 ? 'livro' : 'livros' }} na estante</h2>
          <p class="hero-desc">
            Organize, pesquise e gerencie os livros que você leu ou pretende ler.
          </p>
        </div>
        <div class="hero-stats">
          <div class="stat-card">
            <span class="stat-value">{{ new Set(books.map((b) => b.genre)).size }}</span>
            <span class="stat-label">Gêneros</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">{{ books.length ? Math.min(...books.map((b) => b.publicationYear)) : '—' }}</span>
            <span class="stat-label">Mais antigo</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">{{ books.length ? Math.max(...books.map((b) => b.publicationYear)) : '—' }}</span>
            <span class="stat-label">Mais recente</span>
          </div>
        </div>
      </section>

      <div class="toolbar">
        <span class="toolbar-label">Ordenar por:</span>
        <div class="sort-buttons">
          <button
            type="button"
            class="sort-btn"
            :class="{ active: sortBy === 'title' }"
            @click="sortBy = 'title'"
          >
            Título
          </button>
          <button
            type="button"
            class="sort-btn"
            :class="{ active: sortBy === 'publicationYear' }"
            @click="sortBy = 'publicationYear'"
          >
            Ano
          </button>
          <button
            type="button"
            class="sort-btn"
            :class="{ active: sortBy === 'genre' }"
            @click="sortBy = 'genre'"
          >
            Gênero
          </button>
        </div>
        <span class="result-count">{{ filteredBooks.length }} resultado(s)</span>
      </div>

      <section v-if="filteredBooks.length" class="grid">
        <article
          v-for="book in filteredBooks"
          :key="book.id"
          class="book-card"
          tabindex="0"
          role="button"
          :aria-label="`Ver detalhes de ${book.title}`"
          @click="openDetailModal(book)"
          @keydown.enter="openDetailModal(book)"
        >
          <div
            class="book-cover"
            :style="coverPreviewStyle(book.title, book.coverImage)"
          >
            <img
              v-if="book.coverImage"
              :src="book.coverImage"
              :alt="`Capa de ${book.title}`"
              class="cover-img"
            />
            <span v-else class="book-initials">{{ coverInitials(book.title) }}</span>
          </div>
          <div class="book-info">
            <h3 class="book-title">{{ book.title }}</h3>
            <p class="book-genre">{{ book.genre }}</p>
            <p class="book-publicationYear">{{ book.publicationYear }}</p>
          </div>
        </article>
      </section>

      <section v-else class="empty-state">
        <div class="empty-icon">📖</div>
        <h3>Nenhum livro encontrado</h3>
        <p v-if="searchQuery">Tente outra pesquisa ou adicione um novo livro.</p>
        <p v-else>Sua biblioteca está vazia. Comece adicionando o primeiro livro!</p>
        <button type="button" class="btn btn-primary" @click="openAddModal">
          Adicionar livro
        </button>
      </section>
    </main>

    <footer class="footer">
      <p>Minha Biblioteca Pessoal &copy; {{ new Date().getFullYear() }}</p>
    </footer>

    <!-- Modal: Adicionar / Editar -->
    <Teleport to="body">
      <div v-if="showFormModal" class="modal-overlay" @click.self="closeFormModal">
        <div class="modal" role="dialog" :aria-label="editingBook ? 'Editar livro' : 'Adicionar livro'">
          <div class="modal-header">
            <h2>{{ editingBook ? 'Editar livro' : 'Adicionar livro' }}</h2>
            <button type="button" class="modal-close" aria-label="Fechar" @click="closeFormModal">&times;</button>
          </div>

          <form class="modal-form" @submit.prevent="submitForm">
            <label class="field">
              <span>Título</span>
              <input v-model="form.title" type="text" required placeholder="Ex: O Hobbit" />
            </label>

            <label class="field">
              <span>Gênero</span>
              <select v-model="form.genre" required>
                <option v-for="genre in genres" :key="genre" :value="genre">{{ genre }}</option>
              </select>
            </label>

            <label class="field">
              <span>Ano de lançamento</span>
              <input
                v-model.number="form.publicationYear"
                type="number"
                required
                min="1000"
                max="9999"
                placeholder="Ex: 2024"
              />
            </label>

            <div class="field">
              <span>Capa do livro</span>
              <div class="cover-upload">
                <div
                  class="cover-preview"
                  :style="coverPreviewStyle(form.title || 'Novo livro', form.coverImage)"
                >
                  <img
                    v-if="form.coverImage"
                    :src="form.coverImage"
                    alt="Pré-visualização da capa"
                    class="cover-img"
                  />
                  <span v-else class="book-initials">
                    {{ coverInitials(form.title || 'NL') }}
                  </span>
                </div>

                <div class="cover-upload-actions">
                  <label class="btn btn-secondary btn-upload">
                    Escolher imagem
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      @change="onCoverSelected"
                    />
                  </label>
                  <button
                    v-if="form.coverImage"
                    type="button"
                    class="btn btn-secondary"
                    @click="removeCover"
                  >
                    Remover capa
                  </button>
                </div>

                <p class="cover-hint">PNG, JPG ou WEBP — máximo 2 MB</p>
                <p v-if="coverError" class="cover-error">{{ coverError }}</p>
              </div>
            </div>

            <div class="modal-actions">
              <button type="button" class="btn btn-secondary" @click="closeFormModal">Cancelar</button>
              <button type="submit" class="btn btn-primary">
                {{ editingBook ? 'Salvar alterações' : 'Adicionar' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Modal: Detalhes do livro -->
    <Teleport to="body">
      <div v-if="showDetailModal && selectedBook" class="modal-overlay" @click.self="closeDetailModal">
        <div class="modal modal-detail" role="dialog" aria-label="Detalhes do livro">
          <div class="modal-header">
            <h2>Detalhes do livro</h2>
            <button type="button" class="modal-close" aria-label="Fechar" @click="closeDetailModal">&times;</button>
          </div>

          <div class="detail-content">
            <div
              class="detail-cover"
              :style="coverPreviewStyle(selectedBook.title, selectedBook.coverImage)"
            >
              <img
                v-if="selectedBook.coverImage"
                :src="selectedBook.coverImage"
                :alt="`Capa de ${selectedBook.title}`"
                class="cover-img"
              />
              <span v-else class="book-initials large">{{ coverInitials(selectedBook.title) }}</span>
            </div>

            <div class="detail-info">
              <h3>{{ selectedBook.title }}</h3>
              <dl>
                <div>
                  <dt>Gênero</dt>
                  <dd>{{ selectedBook.genre }}</dd>
                </div>
                <div>
                  <dt>Ano de lançamento</dt>
                  <dd>{{ selectedBook.publicationYear }}</dd>
                </div>
              </dl>
            </div>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn btn-danger" @click="requestDelete(selectedBook)">
              Excluir
            </button>
            <button type="button" class="btn btn-secondary" @click="openEditModal(selectedBook)">
              Editar
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Modal: Confirmar exclusão -->
    <Teleport to="body">
      <div v-if="showDeleteConfirm && selectedBook" class="modal-overlay" @click.self="cancelDelete">
        <div class="modal modal-sm" role="dialog" aria-label="Confirmar exclusão">
          <div class="modal-header">
            <h2>Excluir livro</h2>
            <button type="button" class="modal-close" aria-label="Fechar" @click="cancelDelete">&times;</button>
          </div>

          <p class="confirm-text">
            Tem certeza que deseja excluir <strong>{{ selectedBook.title }}</strong>?
            Esta ação não pode ser desfeita.
          </p>

          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" @click="cancelDelete">Cancelar</button>
            <button type="button" class="btn btn-danger" @click="confirmDelete">Excluir</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.library {
  min-height: 100svh;
  display: flex;
  flex-direction: column;
}

/* Header */
.header {
  background: var(--navy-900);
  border-bottom: 1px solid var(--navy-700);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-inner {
  max-width: 1280px;
  margin: 0 auto;
  padding: 16px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand-icon {
  font-size: 28px;
}

.brand-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #fff;
  letter-spacing: -0.02em;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  justify-content: flex-end;
  min-width: 280px;
}

.search-wrapper {
  position: relative;
  flex: 1;
  max-width: 420px;
}

.search-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  width: 18px;
  height: 18px;
  color: var(--text-muted);
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 10px 14px 10px 42px;
  border: 1px solid var(--navy-600);
  border-radius: var(--radius);
  background: var(--navy-800);
  color: #fff;
  font-size: 0.9375rem;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.search-input::placeholder {
  color: var(--text-muted);
}

.search-input:focus {
  border-color: var(--blue-accent);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.25);
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border: none;
  border-radius: var(--radius);
  font-size: 0.9375rem;
  font-weight: 500;
  transition: background 0.2s, transform 0.15s;
  white-space: nowrap;
}

.btn:active {
  transform: scale(0.98);
}

.btn-primary {
  background: var(--blue-accent);
  color: #fff;
}

.btn-primary:hover {
  background: var(--blue-accent-hover);
}

.btn-secondary {
  background: var(--surface);
  color: var(--text-primary);
  border: 1px solid var(--border-strong);
}

.btn-secondary:hover {
  background: var(--surface-hover);
}

.btn-danger {
  background: var(--danger);
  color: #fff;
}

.btn-danger:hover {
  background: var(--danger-hover);
}

.btn-icon {
  padding: 10px;
  background: var(--navy-800);
  color: rgba(255, 255, 255, 0.85);
  border: 1px solid var(--navy-600);
  flex-shrink: 0;
}

.btn-icon:hover {
  background: var(--navy-700);
  color: #fff;
}

/* Main */
.main {
  flex: 1;
  max-width: 1280px;
  width: 100%;
  margin: 0 auto;
  padding: 32px 24px 48px;
}

/* Hero */
.hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 32px;
  padding: 32px;
  background: linear-gradient(135deg, var(--navy-800) 0%, var(--navy-600) 100%);
  border-radius: var(--radius-lg);
  color: #fff;
  margin-bottom: 32px;
  flex-wrap: wrap;
}

.hero-label {
  margin: 0 0 8px;
  font-size: 0.8125rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.65);
}

.hero-title {
  margin: 0 0 12px;
  font-size: 1.75rem;
  font-weight: 600;
  letter-spacing: -0.02em;
}

.hero-desc {
  margin: 0;
  color: rgba(255, 255, 255, 0.75);
  max-width: 420px;
  font-size: 0.9375rem;
}

.hero-stats {
  display: flex;
  gap: 16px;
}

.stat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 24px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: var(--radius);
  border: 1px solid rgba(255, 255, 255, 0.12);
  min-width: 90px;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
}

.stat-label {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.65);
  margin-top: 4px;
}

/* Toolbar */
.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.toolbar-label {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.sort-buttons {
  display: flex;
  gap: 6px;
}

.sort-btn {
  padding: 6px 14px;
  border: 1px solid var(--border-strong);
  border-radius: 20px;
  background: var(--surface);
  color: var(--text-secondary);
  font-size: 0.8125rem;
  transition: all 0.2s;
}

.sort-btn:hover {
  border-color: var(--navy-500);
  color: var(--text-primary);
}

.sort-btn.active {
  background: var(--navy-800);
  border-color: var(--navy-800);
  color: #fff;
}

.result-count {
  margin-left: auto;
  font-size: 0.8125rem;
  color: var(--text-muted);
}

/* Grid */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 24px 20px;
}

.book-card {
  cursor: pointer;
  border-radius: var(--radius);
  transition: transform 0.2s, box-shadow 0.2s;
  outline: none;
}

.book-card:hover,
.book-card:focus-visible {
  transform: translateY(-4px);
  box-shadow: var(--shadow-md);
}

.book-cover {
  aspect-ratio: 2 / 3;
  border-radius: var(--radius);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-sm);
  margin-bottom: 10px;
  overflow: hidden;
  position: relative;
}

.cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.book-initials {
  font-size: 2rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.85);
  letter-spacing: 0.05em;
}

.book-initials.large {
  font-size: 3rem;
}

.book-info {
  padding: 0 2px;
}

.book-title {
  margin: 0 0 4px;
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.book-genre {
  margin: 0 0 2px;
  font-size: 0.8125rem;
  color: var(--text-secondary);
}

.book-publicationYear {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--text-muted);
}

/* Empty state */
.empty-state {
  text-align: center;
  padding: 64px 24px;
  background: var(--surface);
  border-radius: var(--radius-lg);
  border: 1px dashed var(--border-strong);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-state h3 {
  margin: 0 0 8px;
  color: var(--heading);
}

.empty-state p {
  margin: 0 0 24px;
  color: var(--text-secondary);
}

/* Footer */
.footer {
  background: var(--navy-900);
  color: rgba(255, 255, 255, 0.5);
  text-align: center;
  padding: 20px;
  font-size: 0.8125rem;
}

.footer p {
  margin: 0;
}

/* Modals */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: var(--overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  padding: 24px;
  backdrop-filter: blur(4px);
}

.modal {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  width: 100%;
  max-width: 460px;
  animation: modalIn 0.2s ease;
}

.modal-sm {
  max-width: 400px;
}

@keyframes modalIn {
  from {
    opacity: 0;
    transform: translateY(12px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 0;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.125rem;
  color: var(--heading);
}

.modal-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: var(--text-muted);
  line-height: 1;
  padding: 4px 8px;
  border-radius: 6px;
  transition: background 0.15s;
}

.modal-close:hover {
  background: var(--bg);
  color: var(--text-primary);
}

.modal-form {
  padding: 20px 24px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field span {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--text-secondary);
}

.field input,
.field select {
  padding: 10px 12px;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  font-size: 0.9375rem;
  color: var(--text-primary);
  background: var(--surface);
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.field input:focus,
.field select:focus {
  border-color: var(--blue-accent);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

.cover-upload {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cover-preview {
  width: 120px;
  aspect-ratio: 2 / 3;
  border-radius: var(--radius);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--border-strong);
}

.cover-upload-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.btn-upload {
  cursor: pointer;
}

.cover-hint {
  margin: 0;
  font-size: 0.75rem;
  color: var(--text-muted);
}

.cover-error {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--danger);
}

.modal-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  padding: 0 24px 24px;
}

.modal-detail .modal-actions {
  padding-top: 8px;
}

.detail-content {
  display: flex;
  gap: 24px;
  padding: 20px 24px;
}

.detail-cover {
  width: 120px;
  flex-shrink: 0;
  aspect-ratio: 2 / 3;
  border-radius: var(--radius);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-md);
  overflow: hidden;
}

.detail-info h3 {
  margin: 0 0 16px;
  font-size: 1.25rem;
  color: var(--heading);
}

.detail-info dl {
  margin: 0;
}

.detail-info dl div {
  margin-bottom: 12px;
}

.detail-info dt {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  margin-bottom: 2px;
}

.detail-info dd {
  margin: 0;
  font-size: 0.9375rem;
  color: var(--text-primary);
}

.confirm-text {
  padding: 8px 24px 0;
  margin: 0;
  color: var(--text-secondary);
  line-height: 1.6;
}

/* Responsive */
@media (max-width: 768px) {
  .header-inner {
    flex-direction: column;
    align-items: stretch;
  }

  .header-actions {
    flex-direction: column;
    min-width: unset;
  }

  .search-wrapper {
    max-width: unset;
  }

  .btn-primary {
    width: 100%;
    justify-content: center;
  }

  .hero {
    flex-direction: column;
    align-items: flex-start;
  }

  .hero-stats {
    width: 100%;
    justify-content: space-between;
  }

  .stat-card {
    flex: 1;
    padding: 12px;
  }

  .detail-content {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
}
</style>
