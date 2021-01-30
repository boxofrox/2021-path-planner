const Tool = {
  START: 0,
  WAYPOINT: 1,
  FINISH: 2,
  NONE: 3,
  SELECT: 4,
};

const fieldImage = new Image();
let toolState = Tool.NONE;

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

  // Adding event handlers for toolbar icons

  const tool_map = [
    {
      id: 'start-tool',
      state: Tool.START,
    },
    {
      id: 'waypoint-tool',
      state: Tool.WAYPOINT,
    },
    {
      id: 'finish-tool',
      state: Tool.FINISH,
    },
    {
      id: 'select-tool',
      state: Tool.SELECT,
    },
  ];

  for (let tool of tool_map) {
    const elem = document.getElementById(tool.id);
    elem.addEventListener('click', () => {
      toolState = tool.state;

      document.querySelectorAll('.toolbar > .tool').forEach(item => item.classList.remove('active'));
      elem.classList.add('active');
    });
  }
}