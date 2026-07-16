import { randomInt } from 'crypto';

const UPPERCASE = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWERCASE = 'abcdefghijkmnopqrstuvwxyz';
const NUMBERS = '23456789';
const SYMBOLS = '!@#$%&*?';
const ALL_CHARS = `${UPPERCASE}${LOWERCASE}${NUMBERS}${SYMBOLS}`;
const TEMPORARY_PASSWORD_LENGTH = 12;

const pickSecureChar = (chars) => chars[randomInt(0, chars.length)];

const secureShuffle = (chars) => {
  const nextChars = [...chars];

  for (let index = nextChars.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(0, index + 1);
    [nextChars[index], nextChars[swapIndex]] = [nextChars[swapIndex], nextChars[index]];
  }

  return nextChars.join('');
};

export const generateTemporaryPassword = () => {
  const requiredChars = [
    pickSecureChar(UPPERCASE),
    pickSecureChar(LOWERCASE),
    pickSecureChar(NUMBERS),
    pickSecureChar(SYMBOLS),
  ];

  const remainingChars = Array.from(
    { length: TEMPORARY_PASSWORD_LENGTH - requiredChars.length },
    () => pickSecureChar(ALL_CHARS)
  );

  return secureShuffle([...requiredChars, ...remainingChars]);
};
