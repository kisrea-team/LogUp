'use strict';

// 小工具：随机整数（含端点）与 sleep
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { randomInt, sleep };
