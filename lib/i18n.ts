import type { BoardRoleLabel } from "@/lib/types/boards"

export type Locale = "ru" | "en"

type AuthCopy = {
  title: string
  subtitle: string
  emailPlaceholder: string
  passwordPlaceholder: string
  signInEmail: string
  signUpEmail: string
  toggleToSignUp: string
  toggleToSignIn: string
  orLabel: string
  googleButton: string
  connecting: string
  resetTitle: string
  resetSubtitle: string
  resetSend: string
  resetSending: string
  resetNotice: string
  resetBack: string
  forgotPassword: string
  loading: string
  errors: {
    invalidEmail: string
    missingPassword: string
    weakPassword: string
    userNotFound: string
    wrongPassword: string
    emailAlreadyInUse: string
    accountExists: string
    popupClosed: string
    popupBlocked: string
    tooManyRequests: string
    invalidCredential: string
    sessionError: string
    generic: string
  }
}

type CommonCopy = {
  appTitle: string
  appSubtitle: string
  signedIn: string
  signOut: string
  interfaceLanguage: string
  cancel: string
}

type BoardCopy = {
  boardSectionTitle: string
  boardSectionSubtitle: string
  boardNamePlaceholder: string
  createBoard: string
  creatingBoard: string
  renameBoard: string
  renamingBoard: string
  renameBoardTitle: string
  renameBoardDescription: string
  deleteBoard: string
  deletingBoard: string
  deleteBoardTitle: string
  deleteBoardDescription: string
  openBoard: string
  columnsTitle: string
  addColumn: string
  columnNamePlaceholder: string
  createColumn: string
  creatingColumn: string
  addCard: string
  cardTitlePlaceholder: string
  cardDescriptionPlaceholder: string
  cardDueDateLabel: string
  createCard: string
  creatingCard: string
  editCardTitle: string
  editCardDescription: string
  saveCard: string
  savingCard: string
  deleteCard: string
  deleteCardTitle: string
  deleteCardDescription: string
  noCards: string
  noColumns: string
  deleteColumn: string
  deleteColumnTitle: string
  deleteColumnDescription: string
  participantsTitle: string
  onlyYou: string
  youLabel: string
  noBoards: string
  ownerLabel: string
  roleLabel: string
  boardLanguageLabel: string
  inviteMember: string
  inviteEmailPlaceholder: string
  inviteButton: string
  inviteSending: string
  invitationsTitle: string
  invitationsSubtitle: string
  acceptInvite: string
  declineInvite: string
  readOnlyNotice: string
  errors: {
    signOutFailed: string
    signInToCreate: string
    boardTitleRequired: string
    createBoardFailed: string
    updateBoardFailed: string
    deleteBoardFailed: string
    columnTitleRequired: string
    createColumnFailed: string
    updateColumnFailed: string
    deleteColumnFailed: string
    cardTitleRequired: string
    createCardFailed: string
    updateCardFailed: string
    deleteCardFailed: string
    profileLoadFailed: string
    profileUpdateFailed: string
    signInToUpdate: string
    viewersCantUpdate: string
    updateLanguageFailed: string
    signInToInvite: string
    onlyOwnerCanInvite: string
    onlyOwnerCanDelete: string
    inviteInvalidEmail: string
    inviteSelf: string
    inviteFailed: string
    acceptInviteFailed: string
    declineInviteFailed: string
  }
}

type Copy = {
  common: CommonCopy
  auth: AuthCopy
  board: BoardCopy
}

const copy: Record<Locale, Copy> = {
  ru: {
    common: {
      appTitle: "Kanban MVP",
      appSubtitle: "Базовая связка Auth + Firestore (закрыто по умолчанию).",
      signedIn: "В системе",
      signOut: "Выйти",
      interfaceLanguage: "Язык интерфейса",
      cancel: "Отмена",
    },
    auth: {
      title: "Вход в Kanban",
      subtitle: "Выберите удобный способ входа",
      emailPlaceholder: "Email",
      passwordPlaceholder: "Пароль",
      signInEmail: "Войти по Email",
      signUpEmail: "Создать аккаунт",
      toggleToSignUp: "Нет аккаунта? Зарегистрироваться",
      toggleToSignIn: "Уже есть аккаунт? Войти",
      orLabel: "или",
      googleButton: "Войти через Google",
      connecting: "Подключение...",
      resetTitle: "Восстановление пароля",
      resetSubtitle: "Отправим письмо на вашу почту",
      resetSend: "Отправить письмо",
      resetSending: "Отправка письма...",
      resetNotice: "Письмо для восстановления пароля отправлено.",
      resetBack: "Вернуться к входу",
      forgotPassword: "Забыли пароль?",
      loading: "Загрузка...",
      errors: {
        invalidEmail: "Введите корректный email.",
        missingPassword: "Введите пароль.",
        weakPassword: "Пароль должен быть не короче 6 символов.",
        userNotFound: "Пользователь не найден.",
        wrongPassword: "Неверный пароль.",
        emailAlreadyInUse: "Email уже используется.",
        accountExists: "Аккаунт уже существует с другим способом входа.",
        popupClosed: "Окно входа закрыто.",
        popupBlocked: "Браузер заблокировал всплывающее окно.",
        tooManyRequests: "Слишком много попыток. Повторите позже.",
        invalidCredential: "Неверные email или пароль.",
        sessionError: "Не удалось создать сессию.",
        generic: "Ошибка авторизации.",
      },
    },
    board: {
      boardSectionTitle: "Ваши доски",
      boardSectionSubtitle: "Доступ есть только у тех, кому его предоставили.",
      boardNamePlaceholder: "Название доски",
      createBoard: "Создать доску",
      creatingBoard: "Создание...",
      renameBoard: "Переименовать",
      renamingBoard: "Переименование...",
      renameBoardTitle: "Переименовать доску?",
      renameBoardDescription: "Введите новое название доски.",
      deleteBoard: "Удалить",
      deletingBoard: "Удаление...",
      deleteBoardTitle: "Удалить доску?",
      deleteBoardDescription: "Доска будет удалена без возможности восстановления.",
      openBoard: "Открыть",
      columnsTitle: "Колонки",
      addColumn: "Добавить колонку",
      columnNamePlaceholder: "Название колонки",
      createColumn: "Создать колонку",
      creatingColumn: "Создание...",
      addCard: "Добавить карточку",
      cardTitlePlaceholder: "Название карточки",
      cardDescriptionPlaceholder: "Описание",
      cardDueDateLabel: "Дедлайн",
      createCard: "Создать карточку",
      creatingCard: "Создание...",
      editCardTitle: "Редактировать карточку?",
      editCardDescription: "Обновите название и описание карточки.",
      saveCard: "Сохранить",
      savingCard: "Сохранение...",
      deleteCard: "Удалить карточку",
      deleteCardTitle: "Удалить карточку?",
      deleteCardDescription: "Карточка будет удалена без возможности восстановления.",
      noCards: "Пока нет карточек.",
      noColumns: "Пока нет колонок.",
      deleteColumn: "Удалить",
      deleteColumnTitle: "Удалить колонку?",
      deleteColumnDescription: "Колонка будет удалена без возможности восстановления.",
      participantsTitle: "Участники",
      onlyYou: "Пока на доске только вы.",
      youLabel: "Вы",
      noBoards: "Пока нет досок.",
      ownerLabel: "Владелец",
      roleLabel: "Роль",
      boardLanguageLabel: "Язык доски",
      inviteMember: "Пригласить участника",
      inviteEmailPlaceholder: "Email",
      inviteButton: "Пригласить",
      inviteSending: "Отправка...",
      invitationsTitle: "Приглашения",
      invitationsSubtitle: "Доступ появится после принятия приглашения.",
      acceptInvite: "Принять",
      declineInvite: "Отклонить",
      readOnlyNotice: "Режим только чтение: изменения недоступны.",
      errors: {
        signOutFailed: "Ошибка выхода.",
        signInToCreate: "Войдите, чтобы создать доску.",
        boardTitleRequired: "Название доски обязательно.",
        createBoardFailed: "Не удалось создать доску.",
        updateBoardFailed: "Не удалось переименовать доску.",
        deleteBoardFailed: "Не удалось удалить доску.",
        columnTitleRequired: "Название колонки обязательно.",
        createColumnFailed: "Не удалось создать колонку.",
        updateColumnFailed: "Не удалось обновить колонку.",
        deleteColumnFailed: "Не удалось удалить колонку.",
        cardTitleRequired: "Название карточки обязательно.",
        createCardFailed: "Не удалось создать карточку.",
        updateCardFailed: "Не удалось обновить карточку.",
        deleteCardFailed: "Не удалось удалить карточку.",
        profileLoadFailed: "Не удалось загрузить профиль пользователя.",
        profileUpdateFailed: "Не удалось обновить профиль пользователя.",
        signInToUpdate: "Войдите, чтобы изменить настройки доски.",
        viewersCantUpdate: "Наблюдатели не могут менять настройки доски.",
        updateLanguageFailed: "Не удалось обновить язык доски.",
        signInToInvite: "Войдите, чтобы пригласить участников.",
        onlyOwnerCanInvite: "Приглашать может только владелец доски.",
        onlyOwnerCanDelete: "Удалять может только владелец доски.",
        inviteInvalidEmail: "Введите корректный email для приглашения.",
        inviteSelf: "Нельзя пригласить самого себя.",
        inviteFailed: "Не удалось отправить приглашение.",
        acceptInviteFailed: "Не удалось принять приглашение.",
        declineInviteFailed: "Не удалось отклонить приглашение.",
      },
    },
  },
  en: {
    common: {
      appTitle: "Kanban MVP",
      appSubtitle: "Auth + Firestore baseline (closed by default)",
      signedIn: "Signed in",
      signOut: "Sign out",
      interfaceLanguage: "Interface language",
      cancel: "Cancel",
    },
    auth: {
      title: "Sign in to Kanban",
      subtitle: "Choose a convenient sign-in method",
      emailPlaceholder: "Email",
      passwordPlaceholder: "Password",
      signInEmail: "Sign in with Email",
      signUpEmail: "Create account",
      toggleToSignUp: "No account? Sign up",
      toggleToSignIn: "Already have an account? Sign in",
      orLabel: "or",
      googleButton: "Sign in with Google",
      connecting: "Connecting...",
      resetTitle: "Reset password",
      resetSubtitle: "We will email you a reset link",
      resetSend: "Send reset email",
      resetSending: "Sending email...",
      resetNotice: "Password reset email sent.",
      resetBack: "Back to sign in",
      forgotPassword: "Forgot password?",
      loading: "Loading...",
      errors: {
        invalidEmail: "Enter a valid email.",
        missingPassword: "Enter a password.",
        weakPassword: "Password must be at least 6 characters.",
        userNotFound: "User not found.",
        wrongPassword: "Wrong password.",
        emailAlreadyInUse: "Email is already in use.",
        accountExists: "Account exists with a different sign-in method.",
        popupClosed: "Sign-in window was closed.",
        popupBlocked: "Popup was blocked by the browser.",
        tooManyRequests: "Too many attempts. Try again later.",
        invalidCredential: "Invalid email or password.",
        sessionError: "Failed to create session.",
        generic: "Authentication error.",
      },
    },
    board: {
      boardSectionTitle: "Your boards",
      boardSectionSubtitle: "Only explicit members can read or write board data.",
      boardNamePlaceholder: "Board name",
      createBoard: "Create board",
      creatingBoard: "Creating...",
      renameBoard: "Rename",
      renamingBoard: "Renaming...",
      renameBoardTitle: "Rename board?",
      renameBoardDescription: "Enter a new board name.",
      deleteBoard: "Delete",
      deletingBoard: "Deleting...",
      deleteBoardTitle: "Delete board?",
      deleteBoardDescription: "This board will be deleted permanently.",
      openBoard: "Open",
      columnsTitle: "Columns",
      addColumn: "Add column",
      columnNamePlaceholder: "Column title",
      createColumn: "Create column",
      creatingColumn: "Creating...",
      addCard: "Add card",
      cardTitlePlaceholder: "Card title",
      cardDescriptionPlaceholder: "Description",
      cardDueDateLabel: "Due date",
      createCard: "Create card",
      creatingCard: "Creating...",
      editCardTitle: "Edit card?",
      editCardDescription: "Update the card title and description.",
      saveCard: "Save",
      savingCard: "Saving...",
      deleteCard: "Delete card",
      deleteCardTitle: "Delete card?",
      deleteCardDescription: "This card will be deleted permanently.",
      noCards: "No cards yet.",
      noColumns: "No columns yet.",
      deleteColumn: "Delete",
      deleteColumnTitle: "Delete column?",
      deleteColumnDescription: "This column will be deleted permanently.",
      participantsTitle: "Participants",
      onlyYou: "You are the only participant for now.",
      youLabel: "You",
      noBoards: "No boards yet.",
      ownerLabel: "Owner",
      roleLabel: "Role",
      boardLanguageLabel: "Board language",
      inviteMember: "Invite member",
      inviteEmailPlaceholder: "Email",
      inviteButton: "Invite",
      inviteSending: "Sending...",
      invitationsTitle: "Invitations",
      invitationsSubtitle: "Board access is granted only after acceptance.",
      acceptInvite: "Accept",
      declineInvite: "Decline",
      readOnlyNotice: "Read-only mode: editing is disabled.",
      errors: {
        signOutFailed: "Sign out error.",
        signInToCreate: "Sign in to create a board.",
        boardTitleRequired: "Board title is required.",
        createBoardFailed: "Create board error.",
        updateBoardFailed: "Rename board error.",
        deleteBoardFailed: "Delete board error.",
        columnTitleRequired: "Column title is required.",
        createColumnFailed: "Create column error.",
        updateColumnFailed: "Update column error.",
        deleteColumnFailed: "Delete column error.",
        cardTitleRequired: "Card title is required.",
        createCardFailed: "Create card error.",
        updateCardFailed: "Update card error.",
        deleteCardFailed: "Delete card error.",
        profileLoadFailed: "Failed to load user profile.",
        profileUpdateFailed: "Failed to update user profile.",
        signInToUpdate: "Sign in to update board settings.",
        viewersCantUpdate: "Viewers can't change board settings.",
        updateLanguageFailed: "Update language error.",
        signInToInvite: "Sign in to invite members.",
        onlyOwnerCanInvite: "Only the board owner can send invites.",
        onlyOwnerCanDelete: "Only the board owner can delete boards.",
        inviteInvalidEmail: "Enter a valid email for invitation.",
        inviteSelf: "You can't invite yourself.",
        inviteFailed: "Invite error.",
        acceptInviteFailed: "Accept invite error.",
        declineInviteFailed: "Decline invite error.",
      },
    },
  },
}

export const languageLabels: Record<Locale, string> = {
  ru: "Русский",
  en: "English",
}

export const roleLabels: Record<Locale, Record<BoardRoleLabel, string>> = {
  ru: {
    owner: "Владелец",
    editor: "Редактор",
    viewer: "Наблюдатель",
    member: "Участник",
  },
  en: {
    owner: "Owner",
    editor: "Editor",
    viewer: "Viewer",
    member: "Member",
  },
}

export const getCopy = (locale: Locale) => copy[locale] ?? copy.ru
