/** @type {Record<string, any>} */
export default {
  compilerOptions: {
    warningFilter: (warning) => !warning.code.startsWith("a11y"),
  },
  onwarn: (warning, handler) => {
    if (warning.code && warning.code.startsWith("a11y")) return;
    handler(warning);
  },
};

