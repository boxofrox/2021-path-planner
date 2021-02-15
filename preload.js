//Custom types

PointPrototype = {
  offset: function (other) {
    return Point(this.x + other.x, this.y + other.y);
  },

  sub: function (other) {
    return Point(this.x - other.x, this.y - other.y);
  }
};

const Point = (x, y) => {
  const self = Object.create(PointPrototype);
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

  canvas.addEventListener('click', (ev) => {
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
        clearCanvas(canvas);
        drawBezier(canvas, poseList);
        drawAllPoses(canvas, poseList);
        drawAllHandles(canvas, poseList);
        break;
    }
  });

  canvas.addEventListener('mousemove', (ev) => {
    const tool = toolStateToName[toolState];

    // Compute the screen position of the cursor relative to the canvas.
    const x = ev.clientX - canvas.offsetLeft;
    const y = ev.clientY - canvas.clientTop;

    // Compute the canvas position of the cursor relative to the canvas.
    const x2 = map(x, 0, canvas.offsetWidth, 0, canvas.width);
    const y2 = map(y, 0, canvas.offsetHeight, 0, canvas.height);

    const mousePt = Point(x2, y2);

    let pt;

    switch (toolState) {
      case Tool.SELECT:
        switch (selectState) {
          case SelectState.MOVE_POSE:
            pt = mousePt.offset(movePose.offset);
            movePose.pose.point = pt;
            clearCanvas(canvas);
            drawBezier(canvas, poseList);
            drawAllPoses(canvas, poseList);
            drawAllHandles(canvas, poseList);

            break;

          case SelectState.MOVE_ENTER_HANDLE:
            pt = mousePt.offset(moveHandle.offset);
            moveHandle.pose.enterHandle = pt.sub(moveHandle.pose.point);
            clearCanvas(canvas);
            drawBezier(canvas, poseList);
            drawAllPoses(canvas, poseList);
            drawAllHandles(canvas, poseList);
            break;

          case SelectState.MOVE_EXIT_HANDLE:
            pt = mousePt.offset(moveHandle.offset);
            moveHandle.pose.exitHandle = pt.sub(moveHandle.pose.point);
            clearCanvas(canvas);
            drawBezier(canvas, poseList);
            drawAllPoses(canvas, poseList);
            drawAllHandles(canvas, poseList);
            break;

          case SelectState.NONE:
            hoveredPose = findPoseNear(x2, y2);
            hoveredHandle = findHandleNear(x2, y2);
            clearCanvas(canvas);
            drawBezier(canvas, poseList);
            drawAllPoses(canvas, poseList);
            drawAllHandles(canvas, poseList);
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

        clearCanvas(canvas);
        drawBezier(canvas, poseList);
        drawAllPoses(canvas, poseList);
        drawAllHandles(canvas, poseList);
        drawTool(canvas, tool, x3, y3);
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
            offset = hoveredHandle.pose.point.offset(hoveredHandle.pose.enterHandle).sub(mousePt);

          } else {
            selectState = SelectState.MOVE_EXIT_HANDLE;
            offset = hoveredHandle.pose.point.offset(hoveredHandle.pose.exitHandle).sub(mousePt);
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

  clearCanvas(canvas);

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

function clearCanvas(canvas) {
  const context = canvas.getContext('2d');
  context.drawImage(images.field, 0, 0);
}

function drawTool(canvas, tool, x, y) {
  const context = canvas.getContext('2d');

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

function drawAllPoses(canvas, poseList) {
  if (poseList.length < 1) return;

  const context = canvas.getContext('2d');

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

function drawBezier(canvas, poseList) {
  if (2 > poseList.length) {
    return;
  }

  const context = canvas.getContext('2d');

  let pose1 = poseList[0];

  context.save();
  context.lineWidth = 2.0;
  context.beginPath();
  context.moveTo(pose1.point.x, pose1.point.y);

  for (let pose2 of poseList.slice(1)) {
    context.bezierCurveTo(
      pose1.exitHandle.x + pose1.point.x,
      pose1.exitHandle.y + pose1.point.y,
      pose2.enterHandle.x + pose2.point.x,
      pose2.enterHandle.y + pose2.point.y,
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

function drawHandle(context, handle, posePoint) {
  const p = handle.offset(posePoint);

  const selected = isHandleSelected(handle);

  context.save();

  if (selected) {
    context.fillStyle = "#0F0";
  }

  context.lineWidth = 2.0;

  context.beginPath();
  context.ellipse(
    p.x,
    p.y,
    8,
    8,
    0,
    0,
    2 * Math.PI,
  );
  context.fill();

  context.moveTo(posePoint.x, posePoint.y);
  context.lineTo(p.x, p.y);
  context.stroke();

  context.restore();
}

function drawAllHandles(canvas, poseList) {
  if (poseList.length == 0) {
    return;
  }
  const context = canvas.getContext('2d');

  for (let pose of poseList) {
    drawHandle(context, pose.enterHandle, pose.point);
    drawHandle(context, pose.exitHandle, pose.point);
  }
}

function map(value, x1, w1, x2, w2) {
  return (value - x1) * w2 / w1 + x2;
}

function placePointAt(x, y) {
  const new_point = Point(x, y);

  const new_pose = Pose(new_point, Point(-100, 0), Point(100, 0));

  poseList.push(new_pose)
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
    let pt = pose.point.offset(pose.enterHandle);
    let distance = Math.pow(x - pt.x, 2) + Math.pow(y - pt.y, 2);

    if (distance < 450) {
      return {
        pose,
        isEnter: true,
      };
    }

    pt = pose.point.offset(pose.exitHandle);
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
