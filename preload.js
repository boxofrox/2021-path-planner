// Constants

const Tool = {
  START: 0,
  WAYPOINT: 1,
  FINISH: 2,
  NONE: 3,
  SELECT: 4,
};

const toolStateToName = {
  [Tool.START]: 'start',
  [Tool.WAYPOINT]: 'waypoint',
  [Tool.FINISH]: 'finish',
  [Tool.NONE]: '',
  [Tool.SELECT]: 'select',
};
// Global variable

let toolState = Tool.NONE;

const images = {};

const config = {
  imageFiles: [
    { name: 'field'
    , file: './images/field.png'
    },
    { name: 'start'
    , file: './images/start.png'
    },
    { name: 'waypoint'
    , file: './images/waypoint.png'
    },
    { name: 'finish'
    , file: './images/finish.png'
    },
    { name: 'select'
    , file: './images/finish.png'
    },
  ]
};

// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('canvas');

  loadImages(() => {
    onFieldLoaded(canvas);
  });
})

// Load all images in parallel, wait for all images to finish loading,
// then activate onDone function.
function loadImages(onDone) {
  let loadCount = config.imageFiles.length;

  const onImageLoaded = (ev) => {
    loadCount -= 1;

    if (0 == loadCount) {
      onDone();
    }
  };

  for (let entry of config.imageFiles) {
    images[entry.name] = new Image();
    images[entry.name].src = entry.file;
    images[entry.name].addEventListener('load', onImageLoaded, { once: true });
  }
}

function onFieldLoaded(canvas) {
  canvas.width = images.field.width;
  canvas.height = images.field.height;

  canvas.addEventListener('mousemove', (ev) => {
    const tool = toolStateToName[toolState];

    // Compute the screen position of the cursor relative to the canvas.
    const x = ev.clientX - canvas.offsetLeft;
    const y = ev.clientY - canvas.clientTop;

    // Compute the canvas position of the cursor relative to the canvas.
    const x2 = map(x, 0, canvas.offsetWidth, 0, canvas.width);
    const y2 = map(y, 0, canvas.offsetHeight, 0, canvas.height);

    // Center tool image on cursor.
    const x3 = x2 - images[tool].width / 2;
    const y3 = y2 - images[tool].height / 2;

    if ('' != tool) {
      clearCanvas(canvas);
      drawTool(canvas, tool, x3, y3);
    }
  });

  clearCanvas(canvas);

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


function clearCanvas(canvas) {
  const context = canvas.getContext('2d');
  context.drawImage(images.field, 0, 0);
}

function drawTool(canvas, tool, x, y) {
  const context = canvas.getContext('2d');

  context.drawImage(images[tool], x, y);
}

function map(value, x1, w1, x2, w2) {
  return (value - x1) * w2 / w1 + x2;
}
