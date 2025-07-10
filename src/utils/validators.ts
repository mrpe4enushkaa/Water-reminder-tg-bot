export const isValidWeight = (text: string) =>
    /^(\d+(\.\d+)?)(\s?кг)?$/i.test(text.trim()) && parseFloat(text) > 0;

export const isValidCity = (text: string) =>
    /^[A-ZА-ЯЁ][a-zа-яё\- ]{1,49}$/iu.test(text.trim());

export const isValidTime = (text: string) =>
    /^([01]\d|2[0-3]):[0-5]\d,\s?([01]\d|2[0-3]):[0-5]\d$/.test(text.trim());