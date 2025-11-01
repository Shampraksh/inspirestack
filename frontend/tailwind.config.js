// /** @type {import('tailwindcss').Config} */
// module.exports = {
//   content: [
//     "./index.html",
//     "./src/**/*.{js,ts,jsx,tsx}", // adjust paths if needed
//   ],
//   theme: {
//     extend: {
//       colors: {
//         slate: {
//           950: '#0f172a',
//         },
//       },
//       fontFamily: {
//         nunito: ['Nunito-Semi-Bold', 'sans-serif'],
//         varela: ['Varela', 'sans-serif'],
//         avenir: ['Avenir-Medium', 'sans-serif'],
//         poppins: ['Poppins-Medium', 'sans-serif'],
//       },
//     },
//   },
//   darkMode: 'class', // enables dark mode using class strategy (you can also use 'media')
//   plugins: [
//     require('@tailwindcss/forms'), // optional but helps style <input> and <button>
//     require('tailwind-scrollbar'), // adds scrollbar utilities
//   ],
// };
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // your custom colors can go here
        brand: {
          orange: '#ff7a00',
        },
      },
      fontFamily: {
        nunito: ['Nunito', 'sans-serif'],
        poppins: ['Poppins', 'sans-serif'],
        avenir: ['Avenir', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
