// Babel config — required so NativeWind's `className` JSX is wired to its
// jsxImportSource and the v4 babel transform processes our Tailwind classes.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
  };
};
