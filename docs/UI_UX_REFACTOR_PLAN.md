# План серьёзного UI/UX-рефакторинга Kanban Board App

- Статус: предложение к реализации
- Дата: 28 июля 2026 года
- Область: интерфейс приложения, визуальная система, адаптивность и доступность
- Не меняет: Firestore data model, права owner/editor/viewer,
  realtime-подписки и API-контракты

## 1. Краткое решение

Главная цель рефакторинга — превратить текущую страницу из набора постоянно
раскрытых административных форм в рабочее пространство, где пользователь сразу
видит колонки и карточки.

Предлагаемая модель:

- компактный header отвечает только за навигацию, название доски и глобальные
  настройки;
- отдельный toolbar содержит участников, метки и основное действие «Добавить
  колонку»;
- участники и каталог меток открываются в адаптивных модальных окнах;
- доска занимает основную часть первого экрана;
- формы редактирования появляются только в момент действия;
- одинаковые состояния, размеры, цвета и интеракции собираются в общую
  дизайн-систему;
- desktop, tablet и mobile проектируются как три явных режима, а не как один
  desktop layout с переносом строк.

Рефакторинг следует выполнять последовательными небольшими PR. Сначала нужны
токены и UI-примитивы, затем каркас страницы, после него — метки, участники,
колонки и карточки. Финальный этап — главная страница, sign-in, адаптивность,
доступность и визуальная стабилизация.

## 2. Зафиксированный дизайн-бриф, источники и ограничения

### 2.1. Назначение обновления

Приложение — pet project для портфолио и резюме, а не будущий рабочий продукт.
Поэтому интерфейс должен демонстрировать не максимальное количество функций, а
качественное владение frontend-разработкой:

- продуманную информационную архитектуру;
- аккуратную компонентную систему;
- адаптивность, которая выглядит намеренной;
- keyboard/touch доступность;
- хорошие loading, empty, error и pending состояния;
- стабильный DnD;
- светлую и тёмную темы;
- умение удерживать scope и не добавлять функции без пользовательской ценности.

Визуальный результат должен выглядеть как работа уверенного middle frontend
developer: строгий, минималистичный и технически аккуратный, без шаблонного
«первого учебного проекта» и без чрезмерного декоративного усложнения.

### 2.2. Утверждённое направление

- Общая концепция kanban-приложения сохраняется, но визуальный язык можно
  перестроить.
- Стиль — строгий минимализм с просторной компоновкой и визуальной лёгкостью.
- Приоритетные сценарии: быстрый просмотр доски, создание карточки и DnD.
- Mobile имеет тот же приоритет качества, что desktop, поскольку должен
  демонстрировать владение responsive UI.
- Метки, участники, настройки и формы открываются в модальных окнах. Постоянные
  боковые панели и большие раскрывающиеся management sections не используются.
- На mobile modal может занимать почти весь viewport, но остаётся модальным
  окном, а не отдельной drawer/sheet-моделью.
- Создание карточки сразу показывает полную форму: title, description, due date,
  исполнителей и метки. Quick-add только по названию не вводится.
- Язык интерфейса и тема переносятся в компактное персональное меню.
- Board header/toolbar можно сделать sticky, если в нём остаются действительно
  важные действия. Целевое решение — sticky shell только на странице доски.
- Поиск и фильтрация в это обновление не входят.
- Touch DnD желательно реализовать, если он не создаёт непропорционально большой
  объём работы. Для него предусмотрен отдельный feasibility checkpoint.
- Разрешено добавлять необходимые UI-примитивы, включая Dialog, Tooltip,
  Popover и при необходимости Sheet, но основная пользовательская модель
  текущего редизайна строится на modal Dialog.

### 2.3. Источники

План составлен по:

- переданному desktop-скриншоту страницы доски;
- одиннадцати light/dark desktop/mobile-скриншотам из `screenshots/`;
- текущим `BoardContent`, `HeaderSection`, `ParticipantsSectionView`,
  `LabelsSection`, `ColumnsGrid` и card UI;
- CSS Modules и глобальным CSS variables;
- текущим ru/en-строкам;
- существующим component, unit и Cypress E2E-тестам;
- ролевой матрице и функциональным ограничениям из
  `docs/FUNCTIONAL_SPEC.md`.

### 2.4. Обязательные ограничения

1. Viewer остаётся полностью read-only.
2. Editor не получает owner-only удаления.
3. Owner-only операции не становятся доступнее другим ролям из-за перестановки
   элементов.
4. DnD, optimistic UI и realtime-обновления сохраняются.
5. Все новые строки сразу добавляются на русском и английском.
6. Production build остаётся на `next build --webpack`.
7. В первой волне не меняются schema, Firestore Rules и серверные маршруты.

## 3. Диагностика текущего интерфейса

### 3.1. Информационная иерархия страницы доски

На текущем экране до колонок последовательно расположены:

1. header с названием и двумя селектами языка;
2. крупная карточка участников, совмещённая с созданием колонки;
3. постоянно раскрытый каталог меток;
4. только после этого — сама kanban-доска.

Из-за этого административные функции визуально важнее основной задачи. Даже на
высоком desktop viewport рабочая колонка начинается примерно в середине экрана,
а большая часть ширины и высоты занята редко используемыми формами.

### 3.2. Смешение несвязанных действий

Форма создания колонки находится внутри секции участников. Это связывает две
разные ментальные модели:

- управление командой;
- управление структурой доски.

Пользователю приходится искать действие не там, где появится результат. Создание
колонки должно находиться в toolbar доски либо в конце списка колонок.

### 3.3. Каталог меток

Текущая секция меток является самым заметным кандидатом на переработку:

- каталог постоянно занимает место, хотя используется эпизодически;
- каждая метка всегда отображается как полноценная форма;
- input, select, «Сохранить» и «Удалить метку» повторяются в каждой строке;
- у строки нет спокойного read-state и отдельного edit-state;
- все операции используют один общий `pending`, поэтому действие над одной
  меткой визуально блокирует весь каталог;
- цвет выбирается native `<select>`, тогда как остальной интерфейс использует
  Radix Select;
- реальный цвет слабо участвует в выборе: основной сигнал — текст «Синий»,
  «Красный» и т. п.;
- destructive action имеет тот же визуальный вес, что обычное редактирование;
- кнопки не появляются контекстно и создают сильный визуальный шум;
- на mobile каждая строка разворачивается в длинную вертикальную форму;
- viewer видит каталог в отдельной большой карточке, хотя ему достаточно
  компактного read-only просмотра.

### 3.4. Header и глобальные настройки

В header одновременно находятся:

- возврат к доскам;
- название;
- read-only статус;
- язык содержимого доски;
- язык интерфейса;
- тема.

Два языковых селекта похожи внешне, но меняют разные сущности. На узкой ширине
они конкурируют с названием доски и заставляют header переноситься. Настройки
нужно явно разделить:

- персональные: язык интерфейса и тема;
- настройки доски: язык содержимого.

Редко меняемые настройки доски следует убрать в меню/диалог «Настройки доски»,
а персональные настройки — в компактное пользовательское меню.

### 3.5. Плотность и визуальная система

В проекте уже есть хорошая основа: общие цвета, радиусы, тени, Button, Input,
Select, Card, Badge и AlertDialog. Но система пока неполная:

- нет шкал spacing, typography, control size, z-index и motion;
- одни и те же значения дублируются в feature CSS;
- цвета меток дублируются между несколькими компонентами;
- часть форм использует Radix Select, часть native select;
- `AlertDialog` используется не только для необратимых подтверждений, но и как
  обычный form dialog;
- интерактивные цели размером 24–32 px слишком малы для touch;
- многочисленные границы и большие белые карточки создают одинаковый вес у
  всех блоков;
- фон и крупные тени местами привлекают больше внимания, чем контент;
- для плотного kanban-интерфейса не сформулированы уровни elevation и состояния
  hover/selected/dragging.

### 3.6. Колонки и карточки

Текущая доска функциональна, но нуждается в визуальной полировке:

- при одной колонке остаётся большое неиспользованное пространство;
- заголовок колонки выглядит как кнопка только при наведении и не имеет
  очевидного edit affordance;
- удаление колонки постоянно занимает место, хотя является редким действием;
- карточки перегружены мелким текстом и метаданными;
- 11–12 px используются слишком широко;
- приоритет title, labels, due date и assignees выражен недостаточно;
- add-card form раскрывается внутри узкой колонки и быстро становится длинной;
- empty, loading, drop target, overdue и selected состояния требуют единой
  семантики;
- DnD feedback должен быть заметным и в light, и в dark theme.

### 3.7. Адаптивность

Сейчас адаптивность в основном строится на `flex-wrap` и нескольких breakpoint.
Для серьёзного продукта нужны заранее определённые режимы:

- wide desktop;
- desktop/laptop;
- tablet;
- mobile.

На mobile особенно важны:

- компактный sticky header;
- адаптивный modal, занимающий почти весь viewport;
- touch-target не менее 44 × 44 px для основных действий;
- понятный горизонтальный scroll колонок;
- отсутствие hover-only действий;
- безопасное редактирование карточки без вложенных мини-форм.

### 3.8. Доступность и качество

Существующие aria-label и keyboard DnD являются хорошей базой, но отсутствует
полная система проверки:

- focus order после открытия и закрытия панелей;
- возврат фокуса на trigger;
- keyboard edit/save/cancel в строке метки;
- доступное описание цвета, не полагающееся только на цвет;
- контраст muted text, chips, due/overdue и focus ring;
- `prefers-reduced-motion`;
- доступные названия icon-only действий;
- live-state для локальных сохранений и ошибок;
- автоматизированная проверка основных layout-состояний.

### 3.9. Дополнительные выводы из папки `screenshots`

#### Главная, wide desktop

На ширине 2560 px grid показывает до восьми board cards в строке. Формально это
использует доступную ширину, но ухудшает восприятие:

- card title, role и metadata становятся слишком мелкими;
- взгляд не получает устойчивой точки входа;
- saturated gradient covers превращают страницу в пёструю матрицу;
- вложенная большая «карточка списка» создаёт лишний контейнер;
- 19 тестовых досок показывают, что интерфейс не имеет комфортного максимума
  ширины и продуманной wide-screen композиции.

Для просторного направления нужен max-width основного home content и более
крупная сетка ориентировочно по 320–360 px: четыре колонки на обычном desktop и
не более пяти на wide desktop. Пустое пространство здесь полезно — оно создаёт
визуальную лёгкость и помогает portfolio-подаче.

#### Главная, mobile 375 px

Mobile layout функционально перестраивается в одну колонку, но:

- app header становится высокой самостоятельной карточкой;
- locale, theme и sign-out занимают отдельную строку;
- сортировка распадается на несколько строк без общего toolbar;
- board card почти полностью занимает viewport по высоте;
- большие внешние и внутренние карточки создают эффект «контейнер в
  контейнере».

Новый mobile home должен иметь компактный app header, один modal/menu для
персональных настроек, одну строку title + create action и спокойные board cards
без лишнего общего panel wrapper.

#### Sign-in, light/dark desktop

Auth card занимает небольшую область в центре огромного пустого viewport:

- форма выглядит служебной и недостаточно выразительной для portfolio entry;
- branding ограничен заголовком «Вход в Kanban»;
- visual hierarchy слабая, а текст и controls слишком мелкие;
- dark theme особенно подчёркивает маленький размер и низкий контраст;
- огромный декоративный фон не компенсирован содержанием.

Цель — строгая centered composition шириной примерно 400–440 px с более сильным
product heading, ясными режимами login/register/reset и аккуратным background
accent. Не нужен маркетинговый split-screen: он будет искусственным для
pet-проекта.

#### Доска, desktop

Скриншоты с большим количеством колонок и карточек подтверждают:

- management blocks занимают верх рабочего пространства;
- labels form растягивается на всю ширину независимо от количества меток;
- первая заполненная колонка становится длинной, а пустые колонки остаются
  короткими, усиливая визуальный дисбаланс;
- на 2560 px одновременно видны восемь узких колонок, из-за чего текст и
  действия слишком мелкие;
- горизонтальная модель доски правильна, но column width и общая density должны
  быть увеличены.

Canvas доски, в отличие от home, может оставаться full-width: горизонтальное
пространство полезно для kanban. Простор достигается стабильной шириной колонок,
увеличенными gap и typography, а не max-width всего canvas.

#### Доска, mobile 375 px

Скриншоты показывают реальные layout-регрессии:

- второй language select обрезан справа;
- header переносится в две строки без ясной группировки;
- participants и labels заставляют долго прокручивать страницу до колонок;
- каждая label row превращается в высокую форму;
- горизонтальный scroll колонок работает, но пользователь попадает к нему
  слишком поздно;
- card delete targets и часть metadata слишком малы для touch.

Удаление management sections из document flow является обязательным, а не
косметическим улучшением.

#### Окно карточки, mobile

Текущий modal доказывает, что полноценная форма помещается на 375 px и является
хорошей основой. Нужно сохранить все поля сразу, но улучшить:

- постоянные field labels вместо placeholder-only title/description;
- spacing между смысловыми группами;
- высоту и scroll body при маленьком viewport/клавиатуре;
- sticky modal actions;
- touch targets checkbox/chips;
- локальные validation/error states.

#### Недостающие reference states

Для реализации полезно дополнительно снять, но это не блокирует старт:

- mobile sign-in;
- create board modal;
- empty home и empty board;
- loading, forbidden и recoverable error;
- viewer board desktop/mobile;
- participants manager с несколькими людьми;
- active DnD и drop-target в light/dark;
- mobile keyboard при открытой card form.

## 4. Целевые продуктовые принципы

### 4.1. Work-first

После загрузки доски пользователь должен сразу видеть хотя бы заголовки колонок
и первые карточки. Управление метками, участниками и настройками не должно
отодвигать рабочее полотно.

### 4.2. Progressive disclosure

Редкие и сложные действия показываются по запросу:

- список участников — в modal dialog;
- каталог меток — в modal dialog;
- board settings — в меню или dialog;
- destructive actions — в overflow menu и подтверждении;
- поля редактирования — только для активной сущности.

### 4.3. One place, one purpose

- Header: навигация и идентичность доски.
- Toolbar: действия над текущим рабочим пространством.
- Board canvas: колонки и карточки.
- Dialog: управление справочниками и составными сущностями.
- AlertDialog: только подтверждение опасного действия.

### 4.4. Role-aware, not role-fragmented

У всех ролей сохраняется одна структура экрана. Недоступные действия не
оставляют пустые места. Viewer видит те же данные, но без edit affordances и с
явным компактным read-only indicator.

### 4.5. Stable and calm

Интерфейс не должен «прыгать» из-за realtime-обновлений, pending-state или
появления действий. Размер строки и карточки остаётся стабильным, skeleton
соответствует итоговой геометрии, а сохранение блокирует только затронутый
элемент.

### 4.6. Accessible by default

Каждый новый примитив проектируется одновременно для pointer, touch, keyboard и
screen reader. Цвет всегда дополняется текстом или доступным именем.

## 5. Целевая информационная архитектура страницы доски

### 5.1. Desktop layout

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ ← Доски   Название доски          [Только чтение]     [⋯] [Профиль/тема] │
├──────────────────────────────────────────────────────────────────────────┤
│ [аватары 4 +2] Участники   [🏷 Метки 4]             [+ Добавить колонку] │
├──────────────────────────────────────────────────────────────────────────┤
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐ │
│ │ Backlog   ⋯  │ │ In progress ⋯│ │ Done      ⋯ │ │ + Новая колонка │ │
│ │              │ │              │ │              │ │  (опционально)   │ │
│ │ card         │ │ card         │ │ card         │ └──────────────────┘ │
│ │ card         │ │              │ │              │                      │
│ │ + Карточка   │ │ + Карточка   │ │ + Карточка   │                      │
│ └──────────────┘ └──────────────┘ └──────────────┘                      │
└──────────────────────────────────────────────────────────────────────────┘
```

Целевой результат: верхние служебные области занимают ориентировочно 112–144 px
на laptop/desktop вместо нескольких крупных карточек. Колонки появляются в
первом viewport. Header и toolbar образуют единый sticky shell: он остаётся
доступным при вертикальном scroll длинной колонки, получает тонкий scroll shadow
и не перекрывает горизонтальный canvas.

### 5.2. Tablet

- header переносит вторичные действия в overflow menu;
- toolbar остаётся одной горизонтальной строкой со scroll или компактными
  кнопками;
- колонки сохраняют горизонтальную модель;
- dialog меток/участников занимает до `min(720px, calc(100vw - 32px))`;
- создание колонки открывает компактный dialog или inline-card в конце доски.

### 5.3. Mobile

- первая строка: back, укороченное название, overflow;
- вторая строка: avatar stack, labels, add-column icon button;
- catalog и participants открываются как near-fullscreen modal dialog;
- колонка занимает `calc(100vw - 32px)` и snap-ится по горизонтали;
- основное действие modal имеет устойчивый footer;
- полная форма карточки открывается в modal dialog, а не растягивает колонку;
- hover-only действия всегда имеют tap-эквивалент через overflow.

## 6. Подробная спецификация нового окна меток

### 6.1. Точка входа

В toolbar доски:

- icon `Tag`;
- текст «Метки»;
- count существующих меток;
- button доступна owner, editor и viewer;
- viewer получает read-only вариант менеджера;
- tooltip/accessible name объясняет действие.

Постоянная карточка `LabelsSection` над доской удаляется.

### 6.2. Контейнер

Desktop:

- обычный `Dialog`, не `AlertDialog`;
- ширина 640–720 px;
- максимальная высота `min(760px, calc(100vh - 64px))`;
- header и footer не скроллятся;
- список меток имеет собственный scroll.

Mobile:

- тот же semantic `Dialog` с mobile layout;
- inset 8–12 px либо fullscreen при высоте меньше 700 px;
- максимальная высота до `calc(100dvh - env(safe-area-inset-top))`;
- явная close button вместо drag handle;
- safe-area padding;
- primary action доступна без прокрутки.

Header:

- title «Метки доски»;
- короткое описание;
- счётчик `4 / 50`;
- close button 44 × 44 px на touch;
- для viewer — badge «Только просмотр».

### 6.3. Спокойное состояние списка

Одна строка содержит:

1. крупный цветовой swatch 20–24 px;
2. название метки;
3. необязательный usage count — только в отдельной будущей задаче, если появится
   дешёвый агрегат;
4. overflow menu `⋯` с «Редактировать» и «Удалить».

На desktop edit/delete могут также появляться как icon buttons при
hover/focus-within. На touch они всегда доступны через overflow. Строка не
является input по умолчанию.

### 6.4. Создание метки

В header или footer находится primary action «Создать метку». После нажатия:

- появляется отдельная create-form;
- focus переходит в поле названия;
- цвет по умолчанию выбирается детерминированно: первый доступный из palette,
  либо текущий blue для сохранения поведения;
- пользователь видит palette, а не текстовый select;
- Enter создаёт;
- Escape отменяет и возвращает фокус trigger;
- пустое/duplicate/limit состояние показывается рядом с полем;
- после успеха форма очищается, новая строка подсвечивается кратким
  non-blocking transition и становится доступна в списке.

Не следует держать пустую create-form постоянно раскрытой: это возвращает
текущую проблему административного экрана.

### 6.5. Редактирование

При выборе «Редактировать» только одна строка переходит в edit-state:

- input названия;
- palette цветов;
- «Сохранить» и «Отмена»;
- Save активен только при валидном dirty-state;
- Enter сохраняет;
- Escape отменяет локальные изменения;
- blur сам по себе не сохраняет, чтобы случайное переключение фокуса не меняло
  общий каталог;
- realtime update этой же метки не должен бесшумно перетереть введённый draft:
  при конфликте показать «Метка изменилась в другой сессии» и предложить
  перечитать значение либо повторить сохранение.

На первом этапе допустимо ограничиться стабильным `key` и reset draft после
успешного snapshot, но конфликтное поведение должно быть зафиксировано тестом
или явным TODO.

### 6.6. Palette

Palette использует текущие восемь допустимых значений:

- gray;
- red;
- orange;
- yellow;
- green;
- blue;
- purple;
- pink.

Требования:

- визуально — grid swatches;
- семантически — radio group;
- у каждого swatch есть локализованное accessible name;
- selected-state обозначен check icon, outline и `aria-checked`, а не только
  цветом;
- focus ring контрастен в light/dark theme;
- label color CSS variables являются единым источником для manager, picker и
  chips карточек;
- для chip foreground/background задаются отдельные семантические пары, чтобы
  выполнить contrast.

### 6.7. Удаление

Удаление остаётся в `AlertDialog`:

- title включает имя метки;
- description прямо сообщает, что метка будет удалена и исчезнет со всех
  карточек;
- destructive action использует destructive variant;
- pending блокирует только target row и confirm action;
- после успеха фокус возвращается в логичную соседнюю строку либо на create
  button;
- server/API-поведение не меняется.

Не следует показывать точное число затронутых карточек, пока оно не доступно без
дополнительной дорогой подписки/агрегации.

### 6.8. Состояния

Нужно отдельно спроектировать и протестировать:

- loading skeleton;
- пустой каталог owner/editor;
- пустой каталог viewer;
- normal list;
- 50/50 limit;
- create pending;
- update pending;
- delete pending;
- local validation error;
- server error с сохранённым draft;
- realtime добавление/изменение/удаление из другой сессии;
- read-only viewer.

### 6.9. Архитектура feature

Рекомендуемое разбиение:

```text
features/labels/
  model/
    use-board-labels.ts
    use-label-manager-controller.ts
    label-normalizers.ts
    label-colors.ts
  ui/
    labels-manager-trigger.tsx
    labels-manager-dialog.tsx
    labels-manager-view.tsx
    label-create-form.tsx
    label-row.tsx
    label-color-picker.tsx
    label-chip.tsx
    labels.module.css
```

`LabelsSection` не следует превращать в ещё более крупный monolith. Data/mutation
orchestration остаётся в controller, а UI-компоненты получают явные props и
могут покрываться component tests без Firebase.

## 7. Участники

### 7.1. Новая точка входа

В toolbar:

- avatar stack;
- count участников;
- подпись «Участники» на desktop;
- accessible button для открытия manager;
- отдельная primary/secondary action «Пригласить» допустима только owner, если
  не перегружает toolbar; иначе она находится внутри manager.

### 7.2. Manager

Desktop и mobile используют один semantic Dialog. На mobile он получает
near-fullscreen layout со scrollable body и закреплёнными действиями.

Содержимое:

- header с count и пояснением ролей;
- список участников в одну колонку;
- identity слева, role и actions справа;
- текущий пользователь и owner явно отмечены;
- owner меняет editor/viewer через Select;
- remove action находится в overflow/destructive зоне;
- invite form — отдельный блок сверху или отдельный step;
- editor/viewer видит action «Покинуть доску» в footer/destructive section.

Форма создания колонки полностью удаляется из participants feature.

## 8. Header, toolbar и настройки

### 8.1. Board header

Основная строка:

- back button;
- board title;
- read-only badge;
- справа board menu и personal menu/theme.

Название должно иметь нормальный размер 20–24 px, понятное truncation и tooltip
только когда реально обрезано.

### 8.2. Board menu

Содержит role-aware действия:

- настройки доски;
- язык содержимого доски;
- покинуть доску для editor/viewer;
- destructive board action — только если она уже предусмотрена текущим экраном
  или добавляется отдельной согласованной задачей.

Язык доски нельзя смешивать с языком интерфейса. В тексте нужно пояснить, что
это metadata доски и что она не переключает персональный интерфейс.

### 8.3. Personal controls

Язык интерфейса и тема переходят в единое compact menu. На первом промежуточном
этапе допустимо оставить theme icon рядом с menu, но два постоянных текстовых
select в header не сохраняются.

### 8.4. Board toolbar

Минимальный состав первой волны:

- participants trigger;
- labels trigger;
- spacer;
- add-column action.

Поиск, фильтрация, группировка и сохранённые views не входят в первую волну:
сейчас для них нет продуктового контракта. Их можно добавить отдельной фазой
после стабилизации базового shell.

## 9. Колонки и карточки

### 9.1. Колонки

- desktop width 320–344 px с согласованной просторной density;
- заголовок, count карточек и overflow menu;
- rename через явный edit action или double click плюс доступный menu action;
- delete находится в overflow и остаётся owner-only;
- add-column располагается справа в toolbar и, опционально, как ghost column в
  конце canvas;
- empty board показывает полезный onboarding state с одним primary action;
- horizontal scrollbar стилизован, но не скрыт полностью;
- scroll shadow показывает наличие скрытых колонок;
- active drop column получает border/background, не меняя размеры.

Reorder колонок не добавляется: его нет в текущем продукте и data model.

### 9.2. Карточки

Целевая иерархия:

1. label chips/strips;
2. title;
3. короткое description preview только при наличии;
4. нижняя metadata row: due date, assignee avatars, secondary icons.

Правила:

- title 14–15 px и заметно контрастнее metadata;
- description ограничивается 2–3 строками;
- due date получает состояния normal/today/overdue без зависимости только от
  цвета;
- assignees отображаются avatar stack с accessible names;
- delete/edit actions переходят в overflow либо появляются по
  hover/focus-within;
- вся карточка не должна содержать вложенные конфликтующие click targets без
  чёткой keyboard-модели;
- drag handle становится явным, если это снизит случайные drag на touch;
- focus, selected, dragging и overlay имеют разные состояния.

### 9.3. Создание и редактирование карточки

Утверждённая модель:

- «Добавить карточку» сразу открывает полноценный modal Dialog;
- create и edit используют одну визуальную структуру и общие form sections;
- форма сразу содержит title, description, due date, исполнителей и метки;
- quick-add только по названию не вводится;
- dialog разделяется на смысловые блоки: основное, срок, участники, метки;
- labels и assignees picker используют общие row/chip/avatar primitives;
- title и description получают постоянные labels, а не только placeholder;
- действия dialog закреплены в footer на mobile;
- scroll остаётся внутри modal, background board не меняет положение;
- server error сохраняет заполненную форму.

Полная форма немного увеличивает число действий до создания, но демонстрирует
более сложный responsive form UI и сохраняет согласованное пользователем
поведение.

### 9.4. Touch DnD checkpoint

Touch DnD является желательной portfolio-возможностью, но не должно ломать
горизонтальный scroll доски.

Последовательность проверки:

1. Проверить текущий `PointerSensor` на реальных touch events и mobile emulator.
2. Добавить явный drag handle и activation delay/threshold для `pointer: coarse`.
3. Проверить вертикальный scroll страницы и горизонтальный scroll колонок.
4. Проверить auto-scroll к соседней колонке и отмену жеста.
5. Если надёжное поведение требует непропорционально большой доработки, оставить
   desktop/keyboard DnD и добавить доступное действие «Переместить в колонку» в
   card dialog как mobile fallback.

Условие включения: touch DnD проходит стабильный Cypress/manual smoke на двух
mobile viewport без случайного drag при обычном scroll. Portfolio лучше
показывает осознанный fallback, чем эффектный, но нестабильный жест.

## 10. Главная страница и sign-in

Серьёзный рефакторинг не должен останавливаться на странице доски: shell и
примитивы должны быть согласованы во всём приложении.

### 10.1. Главная

- единый app header вместо большой самостоятельной карточки;
- profile/theme/locale menu совпадает со страницей доски;
- приглашения показываются как заметный, но компактный inbox/banner;
- board list имеет более спокойный container без «карточки вокруг карточек»;
- сортировка группируется в toolbar;
- create board открывается обычным Dialog, не AlertDialog;
- основной content ограничен комфортным max-width ориентировочно 1600–1760 px;
- grid использует cards шириной примерно 320–360 px и не стремится заполнить
  wide viewport восемью колонками;
- board cards имеют стабильную высоту, ясный title и спокойную metadata;
- saturated gradient остаётся узнаваемым акцентом, но занимает меньшую площадь и
  не конкурирует с title;
- rename и delete остаются в overflow;
- empty state ведёт к созданию первой доски.

### 10.2. Sign-in

- визуально связывается с приложением через те же typography, radius и colors;
- centered auth surface получает ширину ориентировочно 400–440 px и более
  уверенную типографическую иерархию;
- background остаётся минималистичным и поддерживающим, а не главным визуальным
  элементом;
- режимы login/register/reset имеют ясные heading и description;
- ошибки поля отображаются рядом с полем, общие ошибки — в alert;
- password visibility, loading и disabled состояния единообразны;
- locale/theme доступны, но не конкурируют с primary auth action;
- проверяются mobile keyboard, autofill и password manager.

## 11. Дизайн-система

### 11.1. Новые группы токенов

В `app/globals.css` либо отдельном token layer определить:

- spacing: 2, 4, 6, 8, 12, 16, 20, 24, 32;
- typography: display, page title, section title, body, body-sm, caption;
- control heights: 32 compact desktop, 36 default, 40 prominent, 44 touch;
- radii: control, card, panel, pill;
- elevation: canvas, card, floating, modal;
- motion: fast/normal/slow и easing;
- semantic colors: canvas, panel, card, text-primary, text-secondary, border,
  border-hover, focus, selected, success, warning, danger;
- z-index: sticky, dropdown, dialog, toast, drag overlay;
- board layout: header height, toolbar height, column width, board gap;
- label palette: background, border и foreground для каждого цвета.

Существующие переменные следует мигрировать постепенно, сохраняя alias на время
перехода. Нельзя одним PR массово переименовывать все CSS variables и
одновременно менять layout.

### 11.2. UI-примитивы

Добавить или уточнить:

- `Dialog` для обычных форм;
- responsive/fullscreen variant `Dialog` для mobile;
- `Popover` для компактных picker;
- `Tooltip` для icon-only controls;
- `Menu`/DropdownMenu как единый overflow pattern;
- `IconButton` либо строгие правила Button icon sizes;
- `Avatar` и `AvatarGroup`;
- `EmptyState`;
- `Skeleton`;
- `FormMessage`;
- `ColorSwatch`/`ColorPicker` на уровне labels feature;
- при необходимости `VisuallyHidden`, если глобального `srOnly` недостаточно.

`AlertDialog` использовать только для действий, требующих подтверждения.

### 11.3. Interaction contracts

Для каждого примитива зафиксировать:

- default, hover, active, focus-visible, disabled, pending;
- light/dark;
- pointer coarse;
- reduced motion;
- keyboard keys;
- focus return;
- accessible name/description.

## 12. Архитектурный план

### 12.1. Board orchestration

`BoardContent` должен оркестрировать крупные независимые зоны:

```text
BoardContent
  BoardHeader
  BoardToolbar
    ParticipantsManagerTrigger
    LabelsManagerTrigger
    AddColumnTrigger
  BoardCanvas / CardsSection
  ParticipantsManager
  LabelsManager
  BoardSettings
```

Важное правило: `BoardContent` не хранит draft каждого dialog. Он передаёт
board/user/permission context, а feature-specific controllers управляют своими
формами.

### 12.2. Permission model

Не размазывать проверки ролей по новым presentational components. Вычислять
capabilities на верхнем уровне:

- `canEditBoard`;
- `canManageLabels`;
- `canInviteMembers`;
- `canDeleteCards`;
- `canDeleteColumns`;
- `canLeaveBoard`.

Presentational UI получает capabilities, а data layer продолжает проверять
авторизацию независимо.

### 12.3. Локальные pending и error state

- toast — для результата операции или общей ошибки;
- inline error — для ошибки конкретного поля/формы;
- pending — на target action/row;
- background realtime loading не блокирует уже доступный контент;
- destructive dialogs не закрываются до подтверждённого успеха;
- draft сохраняется после server error.

### 12.4. Предполагаемая карта файлов

Существующие файлы, которые, вероятно, будут изменены:

- `app/globals.css`;
- `features/board/ui/board-content.tsx`;
- `features/board/ui/board-page.module.css`;
- `features/board/ui/board-header.module.css`;
- `features/columns/ui/header-section.tsx` — переименование/перенос ответственности;
- `features/columns/ui/columns-grid.tsx`;
- `features/cards/ui/cards.module.css`;
- `features/cards/ui/cards-column-body.tsx`;
- `features/cards/ui/card-edit-dialog.tsx`;
- `features/participants/ui/participants-section-view.tsx`;
- `features/participants/ui/participants.module.css`;
- `features/labels/ui/labels-section.tsx`;
- `features/labels/ui/labels.module.css`;
- `features/home/ui/kanban-app.tsx`;
- `features/home/ui/kanban-app.module.css`;
- ru/en i18n-модули;
- component tests и `cypress/e2e/kanban.cy.ts`.

Новые файлы следует добавлять по feature boundaries, не складывая board-specific
компоненты в общий `components/`.

## 13. Этапы реализации

Оценки ниже относительные. Один этап может состоять из нескольких PR.

### Этап 0. Baseline и контракт рефакторинга — S

Задачи:

- каталогизировать уже добавленные reference screenshots light/dark desktop и
  mobile;
- снять только недостающие reference states из раздела 3.9;
- зафиксировать набор обязательных сценариев для owner/editor/viewer;
- перечислить стабильные `data-testid`, которые должны пережить перестройку;
- замерить высоту header/management blocks до первой колонки;
- зафиксировать tab order ключевых сценариев;
- проверить clean baseline: lint, unit/component tests, Cypress.

Результат:

- есть сравнимая точка «до»;
- изменения layout можно оценивать объективно;
- тестовые падения не смешиваются с существующими.

### Этап 1. Токены и базовые примитивы — M

Задачи:

- расширить semantic tokens;
- добавить normal Dialog;
- добавить responsive/fullscreen variant Dialog;
- унифицировать DropdownMenu/Tooltip/IconButton;
- определить touch target и reduced-motion;
- централизовать label palette;
- добавить stories не обязательно; минимальный internal showcase route допустим
  только в development, если не попадает в production.

Критерии:

- новые примитивы работают keyboard-only;
- focus trap и focus return проверены;
- light/dark не используют feature-specific обходы;
- существующий UI можно мигрировать постепенно.

### Этап 2. Новый board shell — M

Задачи:

- разделить Header и Toolbar;
- перенести add-column из participants в toolbar;
- создать triggers меток и участников;
- перенести board language в settings;
- сгруппировать personal locale/theme;
- сделать board header/toolbar responsive sticky shell;
- поднять Board Canvas непосредственно под toolbar.

Критерии:

- на desktop колонки видны в первом viewport;
- viewer видит ту же структуру без edit actions;
- title не ломает controls при длинном имени;
- add-column находится рядом с доской;
- loading/error состояния не меняют ширину shell.

### Этап 3. Labels Manager — M

Задачи:

- вынести controller и presentational view;
- заменить постоянную секцию modal Dialog;
- реализовать calm rows;
- создать accessible palette;
- добавить create/edit/cancel/dirty-state;
- локализовать pending/error;
- сохранить delete confirmation;
- переиспользовать palette/chip styles в карточках.

Критерии:

- полный CRUD работает без постоянных форм;
- viewer видит read-only список;
- Enter/Escape/focus return работают;
- delete явно сообщает об удалении ссылок с карточек;
- realtime rename/recolor обновляет chips на доске;
- limit 50 корректно отображается.

### Этап 4. Participants Manager — M

Задачи:

- заменить раскрывающуюся большую карточку modal Dialog;
- сохранить avatar summary в toolbar;
- перенести invite form;
- унифицировать role controls;
- сохранить remove/leave confirmations;
- проверить длинные email/display names;
- исключить add-column props из participants feature.

Критерии:

- role matrix полностью совпадает с текущей;
- owner/editor/viewer имеют правильные действия;
- manager usable на 320–390 px;
- update одного участника не блокирует весь список.

### Этап 5. Колонки, карточки и card dialog — L

Задачи:

- привести columns к новой density и menu pattern;
- переработать card hierarchy;
- унифицировать chips, due states и avatar group;
- уточнить drag handle/feedback;
- перенести полную create-card form в modal Dialog;
- переработать полноценный card dialog;
- добавить empty/onboarding states;
- сохранить cap warning и read-only поведение.

Критерии:

- DnD mouse и keyboard не регрессировал;
- touch DnD либо проходит checkpoint из раздела 9.4, либо mobile получает явное
  действие «Переместить»;
- card CRUD и optimistic UI стабильны;
- длинные title/description/labels не ломают колонку;
- overdue виден без зависимости только от красного цвета;
- viewer card не выглядит интерактивной;
- удаление остаётся owner-only.

### Этап 6. Главная и sign-in — M

Задачи:

- применить общий app shell;
- заменить form-in-AlertDialog на normal Dialog;
- переработать board list toolbar и board cards;
- ограничить home content max-width и увеличить минимальную ширину board cards;
- унифицировать profile/locale/theme controls;
- улучшить invitations и empty states;
- привести sign-in к тем же form patterns и усилить его portfolio-композицию.

Критерии:

- приложение визуально воспринимается как единый продукт;
- auth, home и board используют одинаковые controls;
- locale/theme не меняют layout непредсказуемо;
- основные действия ясны на desktop и mobile.

### Этап 7. A11y, responsive и визуальная стабилизация — M

Задачи:

- keyboard audit всех flows;
- screen-reader audit dialog/menu/DnD;
- contrast audit light/dark;
- pointer coarse и 44 px touch targets;
- `prefers-reduced-motion`;
- 200% zoom и reflow;
- ru/en overflow audit;
- системная проверка empty/loading/error/pending.

Критерии:

- целевой уровень WCAG 2.2 AA для основных flows;
- нет keyboard trap;
- visible focus не обрезается;
- цвет не является единственным сигналом;
- интерфейс usable на 320 px и при 200% zoom.

### Этап 8. Test hardening и документация — S–M

Задачи:

- обновить component tests;
- обновить Cypress selectors по публичным пользовательским действиям;
- добавить сценарии открытия manager;
- добавить viewport/theme/locale screenshots;
- документировать новые UI patterns;
- обновить `FUNCTIONAL_SPEC.md`, только если изменилось пользовательское
  поведение;
- удалить dead CSS и старые компоненты после миграции.

Критерии:

- lint, unit/component, Cypress и production build проходят;
- нет неиспользуемого старого layout;
- plan/decision records отражают итоговые отклонения.

## 14. Тестовая стратегия

### 14.1. Component tests

Обязательные новые тесты:

- Labels Manager empty/list/viewer;
- create validation и submit;
- edit dirty/save/cancel;
- palette keyboard navigation;
- delete confirmation;
- pending только target row;
- Participants Manager role capabilities;
- BoardToolbar role variants;
- Dialog focus return;
- card compact metadata и viewer state.

### 14.2. Cypress E2E

Текущий CRUD/DnD flow нужно адаптировать:

1. Открыть Labels Manager через trigger.
2. Создать label через новую форму/palette.
3. Закрыть manager.
4. Создать колонку из toolbar.
5. Создать card и выбрать label.
6. Выполнить DnD.
7. Снова открыть manager, rename/recolor label.
8. Проверить обновление chip.
9. Удалить label и проверить очистку chip.
10. Проверить viewer: manager открывается, write controls отсутствуют.

Отдельно:

- participants invite/role/remove/leave;
- mobile viewport для manager и card dialog;
- keyboard smoke для board toolbar и edit dialog.

Тесты должны предпочитать role/name/label и стабильные `data-testid`, а не
зависеть от CSS-классов или положения элемента.

### 14.3. Визуальная матрица

Минимальный ручной/автоматизированный набор:

| Экран | 2560 wide | 1440 desktop | 1024 laptop | 768 tablet | 375/390 mobile |
| --- | :---: | :---: | :---: | :---: | :---: |
| Sign-in | light/dark | light/dark | light | — | light/dark |
| Home | light/dark | light/dark | light | light | light/dark |
| Board owner | light | light/dark | light | light | light/dark |
| Board viewer | — | light | — | — | light |
| Labels manager | — | light/dark | light | light | light/dark |
| Participants manager | — | light | — | light | light/dark |
| Card dialog | — | light/dark | light | light | light/dark |

Для русского языка обязательно проверять длинные подписи; для английского —
длинные email/title.

## 15. Метрики успеха

### Layout

- верх первой колонки находится в первом desktop viewport;
- header + toolbar укладываются примерно в 112–144 px без открытых banners;
- постоянный catalog labels не занимает место в board flow;
- при одной колонке layout выглядит намеренно, а не как случайный пустой экран;
- home не превращается в восемь мелких колонок на 2560 px;
- mobile board открывает первую колонку сразу под compact sticky shell.

### Interaction

- основные действия доступны не более чем за один trigger + одно подтверждение;
- создание колонки находится в контексте доски;
- редактирование метки не показывает form controls у остальных меток;
- pending одной сущности не блокирует несвязанные действия.

### Quality

- основные flows проходят keyboard-only;
- нет контрастных нарушений в ключевых состояниях;
- desktop/mobile light/dark screenshots стабильны;
- существующие role, CRUD, realtime и optimistic сценарии не регрессируют;
- DnD стабилен для mouse/keyboard, а touch имеет либо проверенный жест, либо
  явный fallback.

### Субъективная проверка

При пятисекундном просмотре пользователь должен без подсказки ответить:

1. Как называется доска?
2. Где находятся колонки и карточки?
3. Как добавить колонку?
4. Где посмотреть участников?
5. Где управлять метками?

### Portfolio-проверка

Интерфейс должен давать видимые доказательства инженерного уровня:

- responsive перестройка меняет композицию, а не только переносит строки;
- light/dark являются согласованными темами, а не простой инверсией;
- modal корректно работает с focus, scroll, keyboard и mobile viewport;
- DnD имеет продуманные active/drop/cancel состояния;
- empty/loading/error/pending выглядят как часть одной системы;
- CSS и React-компоненты показывают повторное использование, но не
  преждевременную абстракцию;
- визуальная лёгкость достигается whitespace, типографикой и иерархией, а не
  большим количеством эффектов.

## 16. Риски и способы их снизить

### Риск: большой «переписывающий всё» PR

Снижение: мигрировать слой за слоем, начиная с примитивов; сохранять data hooks и
API; один PR — один пользовательский контур.

### Риск: регрессия role permissions

Снижение: capability matrix, component tests для трёх ролей и сохранение server
enforcement.

### Риск: DnD ломается из-за dialog/scroll/sticky

Снижение: board shell и DnD менять разными PR; проверять pointer, keyboard и
horizontal scroll после каждого layout-изменения.

### Риск: touch DnD конфликтует со scroll

Снижение: отдельный feasibility checkpoint, drag handle и activation delay.
Если жест остаётся нестабильным, использовать modal action «Переместить» вместо
затягивания рефакторинга.

### Риск: realtime snapshot сбрасывает draft

Снижение: отдельный controller draft, стабильные keys и явная политика
конфликта.

### Риск: mobile modal и экранная клавиатура

Снижение: `100dvh`, safe-area, scrollable body, sticky footer, тест на реальном
или эмулированном mobile viewport.

### Риск: визуальный рефакторинг ухудшает производительность

Снижение: не добавлять тяжёлые background effects; не подписывать toolbar на
дополнительные коллекции; избегать анимации layout properties; профилировать
доску с большим числом карточек.

### Риск: дублирование старых и новых CSS patterns

Снижение: временные aliases токенов, список deprecated styles и удаление dead
code в конце каждого feature migration, а не одним огромным cleanup.

## 17. Что сознательно не входит в первую волну

- изменение Firestore schema;
- поиск и фильтрация карточек;
- сохранённые views;
- reorder колонок;
- archive UI;
- ownership transfer;
- комментарии, вложения и checklist;
- audit log;
- виртуализация;
- новый notification backend;
- точные usage counts меток без готового агрегата;
- смена технологического стека или переход с CSS Modules.

Эти задачи могут использовать новую дизайн-систему позже, но не должны
блокировать базовый UI-рефакторинг.

## 18. Рекомендуемый порядок первых PR

1. Baseline screenshots, test inventory и token additions без визуального
   изменения.
2. Normal Dialog + Tooltip/IconButton contracts.
3. Board Header + Toolbar и перенос add-column.
4. Labels Manager.
5. Participants Manager.
6. Column menu и визуальная плотность columns.
7. Card hierarchy + full create/edit card dialog.
8. Touch DnD checkpoint и fallback decision.
9. Home/app shell.
10. Sign-in.
11. Responsive/a11y/test cleanup.

Именно Labels Manager рекомендуется делать первым feature после нового shell:
он даёт наиболее заметное улучшение показанного экрана, проверяет новые
responsive Dialog, palette, form error и role-aware patterns, а затем эти
решения можно переиспользовать для участников и карточек.

## 19. Definition of Done для всего рефакторинга

Рефакторинг считается завершённым, когда:

- основное полотно доски находится в первом viewport;
- метки и участники управляются через modal Dialog;
- создание колонки больше не связано с секцией участников;
- header не перегружен двумя постоянными language select;
- card create/edit сохраняет полную форму в responsive modal;
- обычные формы не используют AlertDialog;
- label palette едина во всех местах;
- карточки, колонки, dialogs и home используют общие токены;
- home имеет спокойный max-width и не превращается в мелкую восьмиколоночную
  матрицу на wide desktop;
- mobile layout не обрезает controls и показывает доску сразу под compact shell;
- touch DnD реализован либо заменён документированным mobile move fallback;
- owner/editor/viewer UI соответствует текущей матрице;
- ru/en, light/dark и desktop/mobile проверены;
- keyboard, focus, contrast и reduced motion соответствуют принятому
  accessibility contract;
- lint, unit/component tests, Cypress, rules tests при изменении rules и
  production build проходят;
- старый CSS/layout удалён, а итоговое поведение отражено в документации.
