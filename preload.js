//Custom types

PointPrototype = {
  addVec: function (vec) {
    return Point(this.x + vec.x, this.y + vec.y);
  },

  sub: function (other) {
    return Vector(this.x - other.x, this.y - other.y);
  },
};

const Point = (x, y) => {
  const self = Object.create(PointPrototype);
  self.x = x;
  self.y = y;
  return self;
};

VectorPrototype = {
  add: function (other) {
    return Vector(this.x + other.x, this.y + other.y);
  },

  sub: function (other) {
    return Vector(this.x - other.x, this.y - other.y);
  },

  scale: function (factor) {
    return Vector(this.x * factor, this.y * factor);
  },

  length: function () {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  },

  unit: function () {
    const length = this.length();

    // If near zero, return a zero vector.
    if (0.001 > length) {
      return Vector(0, 0);
    } else {
      return this.scale(1 / this.length());
    }
  },
};

const Vector = (x, y) => {
  const self = Object.create(VectorPrototype);
  self.x = x;
  self.y = y;
  return self;
};

const Pose = (point, enterHandle, exitHandle) => {
  return {
    point,
    enterHandle,
    exitHandle,
  };
};

// Constants

const Tool = {
  POSE: 0,
  WAYPOINT: 1,
  FINISH: 2,
  NONE: 3,
  SELECT: 4,
};

const SelectState = {
  NONE: 0,
  MOVE_POSE: 1,
  MOVE_ENTER_HANDLE: 2,
  MOVE_EXIT_HANDLE: 3,
}

const colors = {
  handle: {
    enter: {
      color: "#03a9f4",
      selected: {
        color: "#76ff03",
      },
    },
    exit: {
      color: "#ff9800",
      selected: {
        color: "#76ff03",
      },
    },
  },
};

const toolStateToName = {
  [Tool.POSE]: 'pose',
  [Tool.WAYPOINT]: 'waypoint',
  [Tool.FINISH]: 'finish',
  [Tool.NONE]: '',
  [Tool.SELECT]: 'select',
};

// Global variable

let toolState = Tool.NONE;
const images = {};
const poseList = [];

let hoveredPose = null;
let movePose = null;

let hoveredHandle = null;
let moveHandle = null;

let selectState = SelectState.NONE;


const config = {
  imageFiles: [
    { name: 'field'
    , file: './images/field.png'
    },
    { name: 'pose'
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

  const context = canvas.getContext('2d');
  clearCanvas(context);

  canvas.addEventListener('click', (ev) => {
    const context = canvas.getContext('2d');

    const x = ev.clientX - canvas.offsetLeft;
    const y = ev.clientY - canvas.clientTop;

    switch (toolState) {
      case Tool.NONE:
        //Do nothing
        break;

      case Tool.SELECT:
        break;

      case Tool.POSE:
        // Compute the canvas position of the cursor relative to the canvas.
        const x2 = map(x, 0, canvas.offsetWidth, 0, canvas.width);
        const y2 = map(y, 0, canvas.offsetHeight, 0, canvas.height);

        placePointAt(x2, y2);

        redrawCanvas(context, poseList);
        break;
    }
  });

  canvas.addEventListener('mousemove', (ev) => {
    const context = canvas.getContext('2d');

    const tool = toolStateToName[toolState];

    // Compute the screen position of the cursor relative to the canvas.
    const x = ev.clientX - canvas.offsetLeft;
    const y = ev.clientY - canvas.clientTop;

    // Compute the canvas position of the cursor relative to the canvas.
    const x2 = map(x, 0, canvas.offsetWidth, 0, canvas.width);
    const y2 = map(y, 0, canvas.offsetHeight, 0, canvas.height);

    const mousePt = Point(x2, y2);

    switch (toolState) {
      case Tool.SELECT:
        switch (selectState) {
          case SelectState.MOVE_POSE:
            const posePt = mousePt.addVec(movePose.offset);

            movePose.pose.point = posePt;

            redrawCanvas(context, poseList);
            break;

          case SelectState.MOVE_ENTER_HANDLE:
            const enterPt = mousePt.addVec(moveHandle.offset);
            const enterVec = enterPt.sub(moveHandle.pose.point);

            moveHandle.pose.enterHandle = enterVec;
            moveHandle.pose.exitHandle = enterVec.unit().scale(-moveHandle.pose.exitHandle.length());

            redrawCanvas(context, poseList);
            break;

          case SelectState.MOVE_EXIT_HANDLE:
            const exitPt = mousePt.addVec(moveHandle.offset);
            const exitVec = exitPt.sub(moveHandle.pose.point);

            moveHandle.pose.exitHandle = exitVec;
            moveHandle.pose.enterHandle = exitVec.unit().scale(-moveHandle.pose.enterHandle.length());

            redrawCanvas(context, poseList);
            break;

          case SelectState.NONE:
            hoveredPose = findPoseNear(x2, y2);
            hoveredHandle = findHandleNear(x2, y2);

            redrawCanvas(context, poseList);
            break;
        }

        break;

      case Tool.NONE:
        //Don't do anything
        break;

      case Tool.POSE:
        // Center tool image on cursor.
        const x3 = x2 - images[tool].width / 2;
        const y3 = y2 - images[tool].height / 2;

        redrawCanvas(context, poseList);
        drawTool(context, tool, x3, y3);
        break;
    }

    if ('' != tool) {

    }
  });

  canvas.addEventListener('mousedown', ev => {

    // Compute the screen position of the cursor relative to the canvas.
    const x = ev.clientX - canvas.offsetLeft;
    const y = ev.clientY - canvas.clientTop;

    // Compute the canvas position of the cursor relative to the canvas.
    const x2 = map(x, 0, canvas.offsetWidth, 0, canvas.width);
    const y2 = map(y, 0, canvas.offsetHeight, 0, canvas.height);

    const mousePt = Point(x2, y2);

    switch (toolState) {
      case Tool.POSE:
        break;

      case Tool.SELECT:
        if (hoveredPose != null) {
          selectState = SelectState.MOVE_POSE;

          movePose = {
            offset: hoveredPose.point.sub(mousePt),
            pose: hoveredPose,
          };
        } else if (hoveredHandle != null) {
          let offset;

          if (hoveredHandle.isEnter) {
            selectState = SelectState.MOVE_ENTER_HANDLE;
            offset = hoveredHandle.pose.point.addVec(hoveredHandle.pose.enterHandle).sub(mousePt);

          } else {
            selectState = SelectState.MOVE_EXIT_HANDLE;
            offset = hoveredHandle.pose.point.addVec(hoveredHandle.pose.exitHandle).sub(mousePt);
          }

          moveHandle = {
            offset,
            pose: hoveredHandle.pose,
          }
        }
        break;

      default:
        break;
    }


  });

  canvas.addEventListener('mouseup', ev => {
    switch (toolState) {
      case Tool.POSE:
        break;

      case Tool.SELECT:
        switch (selectState) {
          case SelectState.MOVE_POSE:
            selectState = SelectState.NONE;
            movePose = null;
            break;

          case SelectState.MOVE_ENTER_HANDLE:
            selectState = SelectState.NONE;
            moveHandle = null;
            break;

          case SelectState.MOVE_EXIT_HANDLE:
            selectState = SelectState.NONE;
            moveHandle = null;
            break;
        }
        break;

      default:
        break;
    }
  });

  // Adding event handlers for toolbar icons

  const tool_map = [
    {
      id: 'pose-tool',
      state: Tool.POSE,
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

function redrawCanvas(context, poseList) {
  clearCanvas(context);
  drawBezier(context, poseList);
  drawAllHandleLines(context, poseList);
  drawAllPoses(context, poseList);
  drawAllHandleDots(context, poseList);
}

function clearCanvas(context) {
  context.drawImage(images.field, 0, 0);
}

function drawTool(context, tool, x, y) {
  context.drawImage(images[tool], x, y);
}

function drawPose(context, pose, image) {
  const selected = pose === hoveredPose;
  const size = selected ? 40 : 32;

  // Center tool image on cursor.
  const x = pose.point.x - size / 2;
  const y = pose.point.y - size / 2;
  context.drawImage(image, x, y, size, size);
}

function drawAllPoses(context, poseList) {
  if (poseList.length < 1) return;

  const first = poseList.slice(0, 1);
  const inner = poseList.slice(1, -1);
  const last = poseList.slice(-1);

  drawPose(context, first[0], images[toolStateToName[Tool.POSE]]);

  for (let pose of inner) {
    const image = images[toolStateToName[Tool.WAYPOINT]];

    drawPose(context, pose, image);
  }

  if (poseList.length > 1) {
    drawPose(context, last[0], images[toolStateToName[Tool.FINISH]]);
  }
}

function drawBezier(context, poseList) {
  if (2 > poseList.length) {
    return;
  }

  let pose1 = poseList[0];

  context.save();
  context.lineWidth = 2.0;
  context.beginPath();
  context.moveTo(pose1.point.x, pose1.point.y);

  for (let pose2 of poseList.slice(1)) {
    const exitPt = pose1.point.addVec(pose1.exitHandle);
    const enterPt = pose2.point.addVec(pose2.enterHandle);

    context.bezierCurveTo(
      exitPt.x,
      exitPt.y,
      enterPt.x,
      enterPt.y,
      pose2.point.x,
      pose2.point.y,
    );

    pose1 = pose2;
  }

  context.stroke();
  context.restore();
}

function isHandleSelected(handle) {
  return (
    null != hoveredHandle
    && (
         ( hoveredHandle.isEnter && handle === hoveredHandle.pose.enterHandle )
      || ( !hoveredHandle.isEnter && handle === hoveredHandle.pose.exitHandle )
    )
  )
}

function drawHandleLine(context, handle, posePoint) {
  const p = posePoint.addVec(handle);

  context.save();

  context.lineWidth = 2.0;

  context.beginPath();
  context.moveTo(posePoint.x, posePoint.y);
  context.lineTo(p.x, p.y);
  context.stroke();

  context.restore();
}

function drawHandleDot(context, handle, posePoint, style, scale) {
  const p = posePoint.addVec(handle);

  context.save();

  context.fillStyle = style;
  context.lineWidth = 2.0;

  context.beginPath();
  context.ellipse(
    p.x,
    p.y,
    8 * scale,
    8 * scale,
    0,
    0,
    2 * Math.PI,
  );
  context.fill();
  context.stroke();

  context.restore();
}

function drawAllHandleLines(context, poseList) {
  if (poseList.length == 0) {
    return;
  }

  for (let pose of poseList) {
    drawHandleLine(context, pose.enterHandle, pose.point);
    drawHandleLine(context, pose.exitHandle, pose.point);
  }
}

function drawAllHandleDots(context, poseList) {
  if (poseList.length == 0) {
    return;
  }

  for (let pose of poseList) {
    const enterColor = isHandleSelected(pose.enterHandle)
      ? colors.handle.enter.selected.color
      : colors.handle.enter.color;

    const enterScale = isHandleSelected(pose.enterHandle)
      ? 1.3
      : 1.0;

    drawHandleDot(context, pose.enterHandle, pose.point, enterColor, enterScale);

    const exitColor = isHandleSelected(pose.exitHandle)
      ? colors.handle.exit.selected.color
      : colors.handle.exit.color;

    const exitScale = isHandleSelected(pose.exitHandle)
      ? 1.3
      : 1.0;

    drawHandleDot(context, pose.exitHandle, pose.point, exitColor, exitScale);
  }
}

function map(value, x1, w1, x2, w2) {
  return (value - x1) * w2 / w1 + x2;
}

function placePointAt(x, y) {
  const newPoint = Point(x, y);

  let newPose;

  if (0 == poseList.length) {
    newPose = Pose(newPoint, Vector(-100, 0), Vector(100, 0));
  } else {
    const lastPt = poseList.slice(-1)[0].point;
    const enterVec = lastPt.sub(newPoint).unit().scale(100);
    const exitVec = enterVec.scale(-1);

    newPose = Pose(newPoint, enterVec, exitVec);
  }

  poseList.push(newPose)
}

function findPoseNear(x, y) {
  for (let pose of poseList) {
    const distance = Math.pow(x - pose.point.x, 2) + Math.pow(y - pose.point.y, 2);

    if (distance < 450) {
      return pose;
    }
  }

  return null;
}

function findHandleNear(x, y) {
  for (let pose of poseList) {
    let pt = pose.point.addVec(pose.enterHandle);
    let distance = Math.pow(x - pt.x, 2) + Math.pow(y - pt.y, 2);

    if (distance < 450) {
      return {
        pose,
        isEnter: true,
      };
    }

    pt = pose.point.addVec(pose.exitHandle);
    distance = Math.pow(x - pt.x, 2) + Math.pow(y - pt.y, 2);
    if (distance < 450) {
      return {
        pose,
        isEnter: false,
      };
    }
  }

  return null;
}
