import type { Locale, CommonCopy } from "./types"

export const commonCopy = {
  ru: {
    appTitle: "Kanban MVP",
    appSubtitle: "Базовая связка Auth + Firestore (закрыто по умолчанию).",
    signedIn: "В системе",
    signOut: "Выйти",
    interfaceLanguage: "Язык интерфейса",
    themeLight: "Светлая",
    themeDark: "Тёмная",
    themeSwitchToLight: "Переключить на светлую тему",
    themeSwitchToDark: "Переключить на тёмную тему",
    cancel: "Отмена",
    loading: "Загрузка...",
    undo: "Отменить",
},
  en: {
    appTitle: "Kanban MVP",
    appSubtitle: "Auth + Firestore baseline (closed by default)",
    signedIn: "Signed in",
    signOut: "Sign out",
    interfaceLanguage: "Interface language",
    themeLight: "Light",
    themeDark: "Dark",
    themeSwitchToLight: "Switch to light theme",
    themeSwitchToDark: "Switch to dark theme",
    cancel: "Cancel",
    loading: "Loading...",
    undo: "Undo",
},
} satisfies Record<Locale, CommonCopy>
