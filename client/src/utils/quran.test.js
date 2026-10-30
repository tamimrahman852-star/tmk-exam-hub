import { AYAH_COUNTS, globalAyah } from './quran.js';

test('the ayah table has 114 surahs and 6236 ayahs', () => {
  expect(AYAH_COUNTS).toHaveLength(114);
  expect(AYAH_COUNTS.reduce((a, b) => a + b, 0)).toBe(6236);
});

test('surah:ayah maps to the right global ayah number', () => {
  expect(globalAyah(1, 1)).toBe(1);
  expect(globalAyah(2, 255)).toBe(262);     // Ayat al-Kursi
  expect(globalAyah(20, 114)).toBe(2462);   // "Rabbi zidni ilma"
  expect(globalAyah(96, 1)).toBe(6107);     // Iqra
  expect(globalAyah(114, 6)).toBe(6236);
});
