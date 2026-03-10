export const getAddDayExpiration = (day: number) => new Date(Date.now() + day * 24 * 60 * 60 * 1000)
