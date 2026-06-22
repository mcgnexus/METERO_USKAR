module.exports = {
  presets: [
    [
      "next/babel",
      {
        "preset-env": {
          targets: { esmodules: true },
          useBuiltIns: false,
          modules: false,
        },
      },
    ],
  ],
};
