# VocabMaster

Платформа для преподавателей иностранных языков и их учеников. Создание учебных материалов, тестов, домашних заданий и интерактивных досок.

## Возможности

### Для преподавателей
- **Управление контентом** — создание тем, материалов, тестов и домашних заданий
- **Rich Text редактор** — форматирование текста, таблицы, цвета
- **OCR** — распознавание текста с изображений (сканы учебников)
- **Интерактивная доска** — рисование, фигуры, текст для онлайн-уроков
- **Назначение заданий** — отправка материалов и тестов ученикам

### Для учеников
- **Изучение материалов** — просмотр теории по темам
- **Прохождение тестов** — multiple choice, fill-in-the-blank, true/false
- **Домашние задания** — выполнение и отправка на проверку
- **Отслеживание прогресса** — история выполненных заданий

## Технологии

| Категория | Технология |
|-----------|------------|
| Frontend | React 19, Vite 7 |
| Стили | Tailwind CSS |
| Backend | Supabase (PostgreSQL, Auth, RLS) |
| Редактор | TipTap |
| Доска | Fabric.js, Konva |
| Иконки | Lucide React |

## Установка

```bash
# Клонировать репозиторий
git clone https://github.com/Shubin-designer/vocabmaster.git
cd vocabmaster

# Установить зависимости
npm install

# Создать .env файл
cp .env.example .env
# Заполнить VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY

# Запустить dev-сервер
npm run dev
```

## Скрипты

| Команда | Описание |
|---------|----------|
| `npm run dev` | Запуск dev-сервера |
| `npm run build` | Сборка для продакшена |
| `npm run build:prod` | Сборка + обфускация кода |
| `npm run preview` | Превью билда |
| `npm run lint` | Проверка кода ESLint |

## Структура проекта

```
src/
├── components/
│   ├── auth/        # Авторизация
│   ├── common/      # Общие компоненты (RichTextEditor, OCR)
│   ├── content/     # Контент (Topics, Materials, Tests, Homework)
│   ├── student/     # Интерфейс ученика
│   ├── teacher/     # Интерфейс преподавателя
│   └── ui/          # UI компоненты
├── utils/           # Утилиты
└── supabaseClient.js
```

## Переменные окружения

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_GEMINI_API_KEY=your-gemini-key  # для OCR
```

## Лицензия

Проприетарное ПО. Все права защищены. См. [LICENSE](LICENSE).

---

© 2024-2026 VocabMaster
