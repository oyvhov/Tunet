export const isValidPin = (pin) => /^\d{4}$/.test(String(pin || ''));

export const hashPin = (pin) => {
  const normalizedPin = String(pin || '');
  let hash = 5381;

  for (let index = 0; index < normalizedPin.length; index += 1) {
    hash = ((hash << 5) + hash) + normalizedPin.charCodeAt(index);
  }

  return `tunet_${(hash >>> 0).toString(16)}`;
};

export const verifyPin = (pin, expectedHash) => {
  if (!isValidPin(pin) || !expectedHash) return false;
  return hashPin(pin) === expectedHash;
};