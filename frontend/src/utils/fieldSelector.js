// src/utils/fieldSelector.js

/**
 * Filtra un objeto solo con los campos indicados
 * @param {Object} data - objeto con todos los campos
 * @param {Array<string>} fields - array con los nombres de campos a mantener
 * @returns {Object} objeto filtrado
 */
export function selectFields(data, fields) {
  if (!data) return {};
  return fields.reduce((acc, key) => {
    if (key in data) acc[key] = data[key];
    return acc;
  }, {});
}
