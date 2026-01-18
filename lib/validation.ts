export const isValidEmail = (value: string) => /\S+@\S+\.\S+/.test(value.trim())

export const isNonEmpty = (value: string) => value.trim().length > 0
