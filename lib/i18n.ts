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
}

type BoardCopy = {
  boardSectionTitle: string
  boardSectionSubtitle: string
  boardNamePlaceholder: string
  createBoard: string
  creatingBoard: string
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
  errors: {
    signOutFailed: string
    signInToCreate: string
    boardTitleRequired: string
    createBoardFailed: string
    profileLoadFailed: string
    profileUpdateFailed: string
    signInToUpdate: string
    viewersCantUpdate: string
    updateLanguageFailed: string
    signInToInvite: string
    onlyOwnerCanInvite: string
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
      errors: {
        signOutFailed: "Ошибка выхода.",
        signInToCreate: "Войдите, чтобы создать доску.",
        boardTitleRequired: "Название доски обязательно.",
        createBoardFailed: "Не удалось создать доску.",
        profileLoadFailed: "Не удалось загрузить профиль пользователя.",
        profileUpdateFailed: "Не удалось обновить профиль пользователя.",
        signInToUpdate: "Войдите, чтобы изменить настройки доски.",
        viewersCantUpdate: "Наблюдатели не могут менять настройки доски.",
        updateLanguageFailed: "Не удалось обновить язык доски.",
        signInToInvite: "Войдите, чтобы пригласить участников.",
        onlyOwnerCanInvite: "Приглашать может только владелец доски.",
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
      errors: {
        signOutFailed: "Sign out error.",
        signInToCreate: "Sign in to create a board.",
        boardTitleRequired: "Board title is required.",
        createBoardFailed: "Create board error.",
        profileLoadFailed: "Failed to load user profile.",
        profileUpdateFailed: "Failed to update user profile.",
        signInToUpdate: "Sign in to update board settings.",
        viewersCantUpdate: "Viewers can't change board settings.",
        updateLanguageFailed: "Update language error.",
        signInToInvite: "Sign in to invite members.",
        onlyOwnerCanInvite: "Only the board owner can send invites.",
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

export const roleLabels: Record<Locale, Record<"owner" | "editor" | "viewer" | "member", string>> = {
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
