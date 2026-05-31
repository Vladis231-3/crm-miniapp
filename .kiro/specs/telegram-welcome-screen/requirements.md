# Requirements Document

## Introduction

Приветственный экран Telegram-бота для студии. При команде `/start` бот отправляет пользователю
визуально оформленное приветственное сообщение с изображением, HTML-подписью и интерактивной
клавиатурой. Клавиатура содержит кнопки «О нас», «Наши работы» и кнопку входа в CRM через
Web App. Нажатие на информационные кнопки возвращает соответствующий текст о студии.

Все изменения вносятся в `backend/bot.py`. Существующие тесты не затрагиваются.

## Glossary

- **Bot**: Telegram-бот, обрабатывающий входящие обновления через `_process_telegram_update`.
- **WelcomeKeyboard**: Inline-клавиатура, отображаемая при команде `/start`, содержащая три кнопки.
- **WelcomeMessage**: Приветственное сообщение с изображением и HTML-подписью, отправляемое при `/start`.
- **PhotoSender**: Компонент бота, отвечающий за загрузку изображения по URL и отправку через `sendPhoto`.
- **FallbackSender**: Компонент бота, отправляющий текстовое сообщение при невозможности загрузить изображение.
- **CallbackHandler**: Компонент бота, обрабатывающий нажатия на inline-кнопки `btn_about` и `btn_works`.
- **CRM**: Веб-приложение студии, открываемое через Telegram Web App.

---

## Requirements

### Requirement 1: Разметка клавиатуры приветственного экрана

**User Story:** Как пользователь, открывающий бота впервые, я хочу видеть удобную клавиатуру с
понятными кнопками, чтобы быстро перейти к нужному разделу или войти в CRM.

#### Acceptance Criteria

1. THE **WelcomeKeyboard** SHALL содержать два ряда кнопок.
2. THE **WelcomeKeyboard** SHALL отображать в верхнем ряду две кнопки рядом: «✨ О нас» с
   callback-данными `btn_about` и «📸 Наши работы» с callback-данными `btn_works`.
3. THE **WelcomeKeyboard** SHALL отображать в нижнем ряду одну широкую кнопку «🚀 Войти» типа
   `web_app`, открывающую URL из `runtime.webapp_url`.
4. WHEN функция `_start_reply_markup` вызывается с корректным `webapp_url`, THE **WelcomeKeyboard**
   SHALL возвращать структуру `inline_keyboard` с двумя рядами, где первый ряд содержит два
   элемента, а второй — один элемент.

---

### Requirement 2: Отправка приветственного сообщения с изображением

**User Story:** Как пользователь, отправивший команду `/start`, я хочу получить красивое
приветственное сообщение с фотографией студии, чтобы сразу понять, куда я попал.

#### Acceptance Criteria

1. WHEN пользователь отправляет команду `/start`, THE **Bot** SHALL вызвать функцию
   `_send_start_message` с `runtime` и `chat_id` пользователя.
2. WHEN функция `_send_start_message` вызывается, THE **PhotoSender** SHALL загрузить изображение
   по URL `https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1000` с таймаутом 10 секунд.
3. WHEN изображение успешно загружено, THE **PhotoSender** SHALL отправить его через метод
   `sendPhoto` с HTML-подписью, содержащей приветственный текст и `chat_id` пользователя, и с
   параметром `parse_mode` равным `HTML`.
4. WHEN изображение успешно загружено, THE **PhotoSender** SHALL передать `WelcomeKeyboard` в
   параметре `reply_markup` вызова `sendPhoto`.
5. IF загрузка изображения завершается ошибкой сети или HTTP-ошибкой, THEN THE **FallbackSender**
   SHALL отправить текстовое сообщение с тем же приветственным текстом и `WelcomeKeyboard` через
   метод `sendMessage` с параметром `parse_mode` равным `HTML`.
6. THE **WelcomeMessage** SHALL включать в HTML-подпись `chat_id` пользователя в явном виде.

---

### Requirement 3: Обработка callback-кнопки «О нас»

**User Story:** Как пользователь, нажавший кнопку «✨ О нас», я хочу получить информацию о
студии и её преимуществах, чтобы принять решение о записи.

#### Acceptance Criteria

1. WHEN пользователь нажимает кнопку с callback-данными `btn_about`, THE **CallbackHandler** SHALL
   вызвать `answerCallbackQuery` с пустым или подтверждающим текстом для снятия индикатора загрузки.
2. WHEN пользователь нажимает кнопку с callback-данными `btn_about`, THE **CallbackHandler** SHALL
   отправить в чат текстовое сообщение с описанием студии и перечнем её преимуществ через метод
   `sendMessage` с параметром `parse_mode` равным `HTML`.
3. THE **CallbackHandler** SHALL обрабатывать `btn_about` до проверки команд `/start`, `/chatid`,
   `/link`, чтобы callback не попадал в ветку обработки текстовых сообщений.

---

### Requirement 4: Обработка callback-кнопки «Наши работы»

**User Story:** Как пользователь, нажавший кнопку «📸 Наши работы», я хочу увидеть портфолио
студии, чтобы оценить качество работ перед записью.

#### Acceptance Criteria

1. WHEN пользователь нажимает кнопку с callback-данными `btn_works`, THE **CallbackHandler** SHALL
   вызвать `answerCallbackQuery` с пустым или подтверждающим текстом для снятия индикатора загрузки.
2. WHEN пользователь нажимает кнопку с callback-данными `btn_works`, THE **CallbackHandler** SHALL
   отправить в чат текстовое сообщение с описанием портфолио студии через метод `sendMessage` с
   параметром `parse_mode` равным `HTML`.
3. THE **CallbackHandler** SHALL обрабатывать `btn_works` до проверки команд `/start`, `/chatid`,
   `/link`, чтобы callback не попадал в ветку обработки текстовых сообщений.

---

### Requirement 5: Устойчивость к ошибкам при загрузке изображения

**User Story:** Как пользователь с нестабильным соединением или при недоступности Unsplash, я
хочу всё равно получить приветственное сообщение, чтобы бот не «молчал» при ошибках.

#### Acceptance Criteria

1. IF при загрузке изображения возникает исключение `urllib.error.URLError`, THEN THE
   **FallbackSender** SHALL отправить текстовое приветственное сообщение с `WelcomeKeyboard`.
2. IF при загрузке изображения возникает исключение `urllib.error.HTTPError`, THEN THE
   **FallbackSender** SHALL отправить текстовое приветственное сообщение с `WelcomeKeyboard`.
3. IF при загрузке изображения возникает исключение `Exception` любого другого типа, THEN THE
   **FallbackSender** SHALL отправить текстовое приветственное сообщение с `WelcomeKeyboard`.
4. THE **Bot** SHALL логировать предупреждение с описанием ошибки при активации fallback-пути.
