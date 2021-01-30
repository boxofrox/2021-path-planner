const fieldImage = new Image();

// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('canvas');

  fieldImage.src = 'images/field.png';
  fieldImage.addEventListener('load', (ev) => {
    onFieldLoaded(ev, canvas);
  })
})
function onFieldLoaded(ev, canvas) {

  const image = ev.path[0];

  canvas.width = image.width;
  canvas.height = image.height;

  const context = canvas.getContext('2d');
  context.drawImage(image, 0, 0);
}