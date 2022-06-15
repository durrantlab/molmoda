export function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w ]+/g, '')
    .replace(/ +/g, '-');
}

export function randomID(l=13) {
  return "id_" + Math.random().toString(36).substring(2, 2 + l);
  //  + Math.random().toString(36).substring(2, 15);
}
