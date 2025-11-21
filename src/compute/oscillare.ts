import * as THREE from "three/webgpu";
const { storage } = THREE.TSL;
const t = THREE.TSL;

function rgb(r, g, b) {
  // Make r, g, and b fractions of 1
  r /= 255;
  g /= 255;
  b /= 255;

  // Find greatest and smallest channel values
  let cmin = Math.min(r, g, b),
    cmax = Math.max(r, g, b),
    delta = cmax - cmin,
    h = 0,
    s = 0,
    l = 0;

  // Calculate hue
  // No difference
  if (delta == 0) h = 0;
  // Red is max
  else if (cmax == r) h = ((g - b) / delta) % 6;
  // Green is max
  else if (cmax == g) h = (b - r) / delta + 2;
  // Blue is max
  else h = (r - g) / delta + 4;

  h = Math.round(h * 60);

  // Make negative hues positive behind 360°
  if (h < 0) h += 360;

  // Calculate lightness
  l = (cmax + cmin) / 2;

  // Calculate saturation
  s = delta == 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

  // Multiply l and s by 100
  s = +(s * 100).toFixed(1);
  l = +(l * 100).toFixed(1);

  return {
    hue: h / 360,
    saturation: s / 100,
    value: l / 100,
  };
}

function hexToRgb(hex) {
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return rgb(
    parseInt(result![1], 16),
    parseInt(result![2], 16),
    parseInt(result![3], 16),
  );
}

const tealcontrast = [
  rgb(188, 242, 246),
  rgb(50, 107, 113),
  rgb(211, 90, 30),
  rgb(209, 122, 43),
  rgb(188, 242, 246),
];
const purplish = [
  rgb(150, 110, 100),
  rgb(223, 143, 67),
  rgb(76, 73, 100),
  rgb(146, 118, 133),
  rgb(165, 148, 180),
];
const bnw = [rgb(255, 255, 255), rgb(0, 0, 0)];
const sunset = [
  rgb(185, 117, 19),
  rgb(228, 187, 108),
  rgb(251, 162, 1),
  rgb(255, 243, 201),
];
const coolpink = [
  rgb(215, 40, 26),
  rgb(157, 60, 121),
  rgb(179, 83, 154),
  rgb(187, 59, 98),
];
const darkestred = [
  rgb(153, 7, 17),
  rgb(97, 6, 11),
  rgb(49, 7, 8),
  rgb(13, 7, 7),
  rgb(189, 5, 13),
];
const nature = [
  rgb(63, 124, 7),
  rgb(201, 121, 66),
  rgb(213, 101, 23),
  rgb(177, 201, 80),
  rgb(180, 207, 127),
];
const greenpurple = [
  rgb(42, 4, 74),
  rgb(11, 46, 89),
  rgb(13, 103, 89),
  rgb(122, 179, 23),
  rgb(160, 197, 95),
];
const tealblue = [
  rgb(188, 242, 246),
  rgb(50, 107, 113),
  rgb(188, 242, 246),
  rgb(165, 148, 180),
];
const neon = ["A9336B", "5F2F88", "CB673D", "87BB38"].map(hexToRgb);
const fire = ["F07F13", "800909", "F27D0C", "FDCF58"].map(hexToRgb);
const rainbow = ["0000FF", "FFFF00", "FF0000", "FFFFFF", "FF9800"].map(
  hexToRgb,
);
const flower = ["000E00", "003D00", "E4A900", "FEDEEF", "C99CB8"].map(hexToRgb);
const bluepink = ["F2C6F2", "F8F0F0", "A6D1FF", "3988E1", "4C8600"].map(
  hexToRgb,
);
const lime = ["FF4274", "DCD549", "ABDFAB", "437432", "033B45"].map(hexToRgb);
const sky = [
  "D6CEC0",
  "EBC560",
  "DE8A65",
  "7A9AAA",
  "B08850",
  "654530",
  "FFFFFF",
].map(hexToRgb);

const palettes = {
  tealcontrast,
  purplish,
  bnw,
  sunset,
  coolpink,
  darkestred,
  nature,
  greenpurple,
  tealblue,
  neon,
  fire,
  rainbow,
  flower,
  bluepink,
  lime,
  sky,
};

export const paletteNode = (palette) => {
  const colors = palettes[palette];
  let floatArr = new Float32Array(colors.length * 3);
  colors.forEach((c, idx) => {
    floatArr[idx * 3] = colors[idx].hue;
    floatArr[idx * 3 + 1] = colors[idx].saturation;
    floatArr[idx * 3 + 2] = colors[idx].value;
    /*
      data.buffers[attr].array[idx * 3] = colors[idx].hue;
    data.buffers[attr].array[idx * 3 + 1] = colors[idx].saturation
    data.buffers[attr].array[idx * 3 + 2] = colors[idx].value
    */
  });
  return storage(
    new THREE.StorageInstancedBufferAttribute(floatArr, 3),
    "vec3",
    colors.length,
  );
};
export const hsvToRgb = (hsv) => {
  const K = t.vec4(t.float(1), t.float(2 / 3), t.float(1 / 3), t.float(3));

  const p = t.abs(
    t.sub(t.mul(t.fract(t.add(hsv.xxx, K.xyz)), t.float(6)), K.www),
  );

  return t.mul(
    hsv.z,
    t.mix(K.xxx, t.clamp(t.sub(p, K.xxx), t.float(0), t.float(1)), hsv.y),
  );
};
