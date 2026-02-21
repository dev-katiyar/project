/** HTML entities decode */
export const htmlDecode = (str: string) => {
  const txt = document.createElement('textarea');
  txt.innerHTML = str;
  return txt.value;
};
