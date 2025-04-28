module.exports = {
  "src/**/*.{js,ts,svelte}": [
    "prettier --write",
    "eslint --fix"
  ],
  "src/**/*.{css,scss,less,styl}": [
    "stylelint --fix"
  ]
};
