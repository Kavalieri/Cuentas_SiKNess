import Papa from 'papaparse';

export interface CSVRow {
  [key: string]: string;
}

/**
 * Convierte un array de objetos a CSV
 */
export const toCSV = (rows: CSVRow[]): string => {
  return Papa.unparse(rows, {
    delimiter: ',',
    header: true,
    newline: '\n',
  });
};

/**
 * Parsea un texto CSV a array de objetos
 */
export const fromCSV = (text: string): CSVRow[] => {
  const result = Papa.parse<CSVRow>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  if (result.errors.length > 0) {
    throw new Error(`Error parsing CSV: ${result.errors[0]?.message}`);
  }

  return result.data;
};

/**
 * Descarga un CSV en el navegador
 */
export const downloadCSV = (filename: string, csvContent: string) => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
