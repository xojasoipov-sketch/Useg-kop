/**
 * Quroladigan funksiyalar - umumiy foydalanish uchun foydali yordamchi funksiyalar
 * Bu modullarni har qanday loyiha uchun import qilib ishlatish mumkin
 */

const quroladiganFunksiyalar = {
  /**
   * 1. Random raqamni olish funksiyasi
   * @param {number} min - Minimal raqam
   * @param {number} max - Maksimal raqam
   * @returns {number} - min va max orasidagi random raqam
   */
  randomRaqam: (min, max) => {
    if (min > max) [min, max] = [max, min]; // Agar min maxdan katta bo'lsa almashtirish
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  /**
   * 2. Array ichidan eng katta qiymatni topish funksiyasi
   * @param {Array<number>} arr - Raqamlar joylashgan array
   * @returns {number|null} - Eng katta raqam yoki array bo'sh bo'lsa null
   */
  engKattaQiymat: (arr) => {
    if (!arr || arr.length === 0) return null;
    return Math.max(...arr);
  },

  /**
   * 3. Stringni teskari o'zgartirish funksiyasi
   * @param {string} str - O'zgartirilishi kerak bo'lgan string
   * @returns {string} - Teskari string
   */
  teskariString: (str) => {
    if (typeof str !== 'string') return '';
    return str.split('').reverse().join('');
  },

  /**
   * 4. Fibonacci raqamlarini hisoblash funksiyasi
   * @param {number} n - Fibonacci qatoridagi elementlar soni
   * @returns {Array<number>} - Fibonacci qatori
   */
  fibonacci: (n) => {
    if (n <= 0) return [];
    if (n === 1) return [0];

    const fib = [0, 1];
    for (let i = 2; i < n; i++) {
      fib[i] = fib[i - 1] + fib[i - 2];
    }
    return fib.slice(0, n);
  },

  /**
   * 5. Array ichidagi elementlarni tartiblash funksiyasi
   * @param {Array<number>} arr - Tartibga solinishi kerak bo'lgan array
   * @returns {Array<number>} - Tartiblangan array
   */
  tartiblash: (arr) => {
    if (!Array.isArray(arr)) return [];
    return [...arr].sort((a, b) => a - b);
  },

  /**
   * 6. Array ichidan berilgan qiymatni qidirish funksiyasi
   * @param {Array<any>} arr - Qidiriladigan array
   * @param {any} value - Qidiriladigan qiymat
   * @returns {number} - Qiymat topilgan index yoki -1
   */
  arrayIndexOf: (arr, value) => {
    if (!Array.isArray(arr)) return -1;
    return arr.indexOf(value);
  },

  /**
   * 7. Berilgan sonni faktorialini hisoblash
   * @param {number} n - Faktoriali hisoblanadigan son
   * @returns {number} - Hisoblangan faktorial
   */
  faktorial: (n) => {
    if (n < 0) return NaN;
    if (n === 0 || n === 1) return 1;
    let result = 1;
    for (let i = 2; i <= n; i++) {
      result *= i;
    }
    return result;
  },

  /**
   * 8. Berilgan matnda so'zlarni hisoblash
   * @param {string} text - Matn
   * @returns {number} - So'zlar soni
   */
  sozlarniHisoblash: (text) => {
    if (typeof text !== 'string') return 0;
    return text.trim().split(/\s+/).length;
  },

  /**
   * 9. Berilgan arraydan duplikatlarni olib tashlash
   * @param {Array<any>} arr - Asl array
   * @returns {Array<any>} - Duplikatlari olib tashlangan array
   */
  duplikatlarniOlibTashlash: (arr) => {
    if (!Array.isArray(arr)) return [];
    return [...new Set(arr)];
  },

  /**
   * 10. Berilgan ikki arrayni birlashtirish
   * @param {Array<any>} arr1 - Birinchi array
   * @param {Array<any>} arr2 - Ikkinchi array
   * @returns {Array<any>} - Birlashtirilgan array
   */
  arraylarniBirlashtirish: (arr1, arr2) => {
    if (!Array.isArray(arr1)) arr1 = [];
    if (!Array.isArray(arr2)) arr2 = [];
    return [...arr1, ...arr2];
  }
};

// Export qilish (Node.js va browser uchun)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = quroladiganFunksiyalar;
} else if (typeof window !== 'undefined') {
  window.quroladiganFunksiyalar = quroladiganFunksiyalar;
}

// Testlar uchun foydalanish
if (typeof console !== 'undefined') {
  console.log('🔧 Quroladigan Funksiyalar Testlari:');
  console.log('1. Random raqam (1-10):', quroladiganFunksiyalar.randomRaqam(1, 10));
  console.log('2. Eng katta qiymat:', quroladiganFunksiyalar.engKattaQiymat([1, 2, 3, 4, 5]));
  console.log('3. Teskari string:', quroladiganFunksiyalar.teskariString("Salom Dunyo"));
  console.log('4. Fibonacci (10):', quroladiganFunksiyalar.fibonacci(10));
  console.log('5. Tartiblash:', quroladiganFunksiyalar.tartiblash([5, 3, 8, 1, 2]));
  console.log('6. Faktorial (5):', quroladiganFunksiyalar.faktorial(5));
  console.log('7. Sozlarni hisoblash:', quroladiganFunksiyalar.sozlarniHisoblash("Bu bir matn misoli"));
  console.log('8. Duplikatlarni olib tashlash:', quroladiganFunksiyalar.duplikatlarniOlibTashlash([1, 2, 2, 3, 4, 4, 5]));
  console.log('9. Arraylarni birlashtirish:', quroladiganFunksiyalar.arraylarniBirlashtirish([1, 2], [3, 4]));
}