// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
window.addEventListener('DOMContentLoaded', () => {
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector)
    if (element) element.innerText = text
  }

  for (const type of ['chrome', 'node', 'electron']) {
    replaceText(`${type}-version`, process.versions[type])
  }

  const canvas = document.getElementById('canvas');
  const context = canvas.getContext('2d');

  const image = new Image();
  image.src = 'images/field.png';
  image.addEventListener('load', (ev) => {
    console.log("before drawing image", ev);
    context.drawImage(image, 0, 0);
    console.log("After drawing image");
  })
})
