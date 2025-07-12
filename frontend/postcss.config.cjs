module.exports = {
  plugins: {
    "postcss-pxtorem": {
      rootValue({ file }) {
        return file.indexOf("vant") !== -1 || file.indexOf("mobile") !== -1 ? 50 : 75;
      },
      propList: ["*"],
      exclude: (file) => {
        return !file.includes("mobile") && !file.includes("vant");
      },
      minPixelValue: 2,
      mediaQuery: false,
    },
  },
};
