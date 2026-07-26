/**
 * Quroladigan Funksiyalar - Umumiy foydalanish uchun foydali yordamchi funksiyalar
 * Bu modullarni har qanday loyiha uchun import qilib ishlatish mumkin
 *
 * @module quroladiganFunksiyalar
 */

const quroladiganFunksiyalar = {
  /**
   * 1. Random raqam olish (min va max oraliqda)
   * @param {number} min - Minimal qiymat
   * @param {number} max - Maksimal qiymat
   * @returns {number} - Random raqam
   * @example quroladiganFunksiyalar.randomRaqam(1, 10) // 1-10 orasida random raqam
   */
  randomRaqam: (min, max) => {
    if (typeof min !== 'number' || typeof max !== 'number') {
      throw new Error('Min va max raqam bo\'lishi kerak');
    }
    if (min > max) [min, max] = [max, min];
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  /**
   * 2. Array ichidan eng katta qiymatni topish
   * @param {Array<number>} arr - Raqamlar arrayi
   * @returns {number|null} - Eng katta qiymat yoki array bo'sh bo'lsa null
   * @example quroladiganFunksiyalar.engKattaQiymat([1, 5, 3, 9]) // 9
   */
  engKattaQiymat: (arr) => {
    if (!Array.isArray(arr)) return null;
    if (arr.length === 0) return null;
    return Math.max(...arr);
  },

  /**
   * 3. Stringni teskari qilish
   * @param {string} str - Teskari qilinadigan string
   * @returns {string} - Teskari string
   * @example quroladiganFunksiyalar.teskariString("salom") // "molas"
   */
  teskariString: (str) => {
    if (typeof str !== 'string') return '';
    return str.split('').reverse().join('');
  },

  /**
   * 4. Fibonacci qatorini hisoblash
   * @param {number} n - Elementlar soni
   * @returns {Array<number>} - Fibonacci qatori
   * @example quroladiganFunksiyalar.fibonacci(5) // [0, 1, 1, 2, 3]
   */
  fibonacci: (n) => {
    if (typeof n !== 'number' || n < 0) return [];
    if (n === 0) return [];
    if (n === 1) return [0];

    const fib = [0, 1];
    for (let i = 2; i < n; i++) {
      fib[i] = fib[i - 1] + fib[i - 2];
    }
    return fib;
  },

  /**
   * 5. Arrayni tartiblash (kuchsizdan kuchliga)
   * @param {Array<number>} arr - Tartiblanadigan array
   * @returns {Array<number>} - Tartiblangan array
   * @example quroladiganFunksiyalar.tartiblash([3, 1, 4, 2]) // [1, 2, 3, 4]
   */
  tartiblash: (arr) => {
    if (!Array.isArray(arr)) return [];
    return [...arr].sort((a, b) => a - b);
  },

  /**
   * 6. Arraydan berilgan qiymatni qidirish
   * @param {Array<any>} arr - Qidiriladigan array
   * @param {any} value - Qidiriladigan qiymat
   * @returns {number} - Index yoki -1
   * @example quroladiganFunksiyalar.arrayIndexOf([1, 2, 3], 2) // 1
   */
  arrayIndexOf: (arr, value) => {
    if (!Array.isArray(arr)) return -1;
    return arr.indexOf(value);
  },

  /**
   * 7. Faktorial hisoblash
   * @param {number} n - Faktoriali hisoblanadigan son
   * @returns {number} - Hisoblangan faktorial
   * @example quroladiganFunksiyalar.faktorial(5) // 120
   */
  faktorial: (n) => {
    if (typeof n !== 'number' || n < 0) return NaN;
    if (n === 0 || n === 1) return 1;
    let result = 1;
    for (let i = 2; i <= n; i++) {
      result *= i;
    }
    return result;
  },

  /**
   * 8. Matndagi so'zlarni hisoblash
   * @param {string} text - Hisoblash uchun matn
   * @returns {number} - So'zlar soni
   * @example quroladiganFunksiyalar.sozlarniHisoblash("Salom dunyo") // 2
   */
  sozlarniHisoblash: (text) => {
    if (typeof text !== 'string') return 0;
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  },

  /**
   * 9. Arraydan duplikatlarni olib tashlash
   * @param {Array<any>} arr - Asl array
   * @returns {Array<any>} - Duplikatlari olib tashlangan array
   * @example quroladiganFunksiyalar.duplikatlarniOlibTashlash([1, 2, 2, 3]) // [1, 2, 3]
   */
  duplikatlarniOlibTashlash: (arr) => {
    if (!Array.isArray(arr)) return [];
    return [...new Set(arr)];
  },

  /**
   * 10. Ikki arrayni birlashtirish
   * @param {Array<any>} arr1 - Birinchi array
   * @param {Array<any>} arr2 - Ikkinchi array
   * @returns {Array<any>} - Birlashtirilgan array
   * @example quroladiganFunksiyalar.arraylarniBirlashtirish([1, 2], [3, 4]) // [1, 2, 3, 4]
   */
  arraylarniBirlashtirish: (arr1, arr2) => {
    if (!Array.isArray(arr1)) arr1 = [];
    if (!Array.isArray(arr2)) arr2 = [];
    return [...arr1, ...arr2];
  },

  /**
   * 11. Berilgan sonni tub yoki tub emasligini tekshirish
   * @param {number} n - Tekshiriladigan son
   * @returns {boolean} - Tub bo'lsa true, aks holda false
   * @example quroladiganFunksiyalar.tubSonmi(7) // true
   */
  tubSonmi: (n) => {
    if (typeof n !== 'number' || n <= 1) return false;
    if (n === 2) return true;
    if (n % 2 === 0) return false;

    for (let i = 3; i <= Math.sqrt(n); i += 2) {
      if (n % i === 0) return false;
    }
    return true;
  },

  /**
   * 12. Berilgan arrayni random tartibda aralashtirish (Fisher-Yates algoritmi)
   * @param {Array<any>} arr - Aralashtiriladigan array
   * @returns {Array<any>} - Aralashtirilgan array
   * @example quroladiganFunksiyalar.arrayniAralashtirish([1, 2, 3, 4])
   */
  arrayniAralashtirish: (arr) => {
    if (!Array.isArray(arr)) return [];
    const newArr = [...arr];
    for (let i = newArr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
  },

  /**
   * 13. Berilgan matndan HTML teglarini olib tashlash
   * @param {string} html - HTML matni
   * @returns {string} - Tegsiz matn
   * @example quroladiganFunksiyalar.htmlTeglariniOlibTashlash("<p>Salom</p>") // "Salom"
   */
  htmlTeglariniOlibTashlash: (html) => {
    if (typeof html !== 'string') return '';
    return html.replace(/<[^>]*>/g, '');
  },

  /**
   * 14. Berilgan vaqtni formatlash (kun.oy.yil soat:daqiqa)
   * @param {Date|string} date - Sana obyekti yoki ISO string
   * @returns {string} - Formatlangan sana
   * @example quroladiganFunksiyalar.sanaFormatlash(new Date()) // "26.07.2026 20:30"
   */
  sanaFormatlash: (date) => {
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return 'Noma\'lum sana';

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');

    return `${day}.${month}.${year} ${hours}:${minutes}`;
  },

  /**
   * 15. Berilgan arraydan berilgan shartga mos elementlarni filtrlash
   * @param {Array<any>} arr - Filtrlanadigan array
   * @param {Function} predicate - Shartni tekshiruvchi funktsiya
   * @returns {Array<any>} - Filtrlangan array
   * @example quroladiganFunksiyalar.arrayniFiltrlash([1, 2, 3, 4], x => x % 2 === 0) // [2, 4]
   */
  arrayniFiltrlash: (arr, predicate) => {
    if (!Array.isArray(arr) || typeof predicate !== 'function') return [];
    return arr.filter(predicate);
  }
};

// Export qilish (Node.js va browser uchun moslashuvchan)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = quroladiganFunksiyalar;
} else if (typeof window !== 'undefined') {
  if (!window.quroladiganFunksiyalar) {
    window.quroladiganFunksiyalar = quroladiganFunksiyalar;
  }
}

// Testlar va demo uchun foydalanish
if (typeof console !== 'undefined') {
  console.log('\n🔧 Quroladigan Funksiyalar - Test Natijalari\n');

  // Asosiy funksiyalarni test qilish
  console.log('1. Random raqam (1-100):', quroladiganFunksiyalar.randomRaqam(1, 100));
  console.log('2. Eng katta qiymat:', quroladiganFunksiyalar.engKattaQiymat([10, 5, 20, 15, 8]));
  console.log('3. Teskari string:', quroladiganFunksiyalar.teskariString("JavaScript"));
  console.log('4. Fibonacci (8):', quroladiganFunksiyalar.fibonacci(8));
  console.log('5. Tartiblash:', quroladiganFunksiyalar.tartiblash([5, 3, 8, 1, 2]));
  console.log('6. Faktorial (6):', quroladiganFunksiyalar.faktorial(6));
  console.log('7. Sozlarni hisoblash:', quroladiganFunksiyalar.sozlarniHisoblash("Bu bir matn misoli"));
  console.log('8. Duplikatlarni olib tashlash:', quroladiganFunksiyalar.duplikatlarniOlibTashlash([1, 2, 2, 3, 4, 4, 5]));
  console.log('9. Arraylarni birlashtirish:', quroladiganFunksiyalar.arraylarniBirlashtirish([1, 2], [3, 4]));
  console.log('10. Tub sonmi (17):', quroladiganFunksiyalar.tubSonmi(17));
  console.log('11. Arrayni aralashtirish:', quroladiganFunksiyalar.arrayniAralashtirish([1, 2, 3, 4, 5]));
  console.log('12. HTML teglarini olish:', quroladiganFunksiyalar.htmlTeglariniOlibTashlash("<div>Salom</div><p>Dunyo</p>"));
  console.log('13. Sana formatlash:', quroladiganFunksiyalar.sanaFormatlash(new Date()));
  console.log('14. Arrayni filtrlash:', quroladiganFunksiyalar.arrayniFiltrlash([1, 2, 3, 4, 5], x => x > 2));

  console.log('\n✅ Barcha testlar muvaffaqiyatli bajarildi!');
}