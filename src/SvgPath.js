const ACTION = {
  MOVE: 0,
  MOVE_D: 1,
  LINE: 2,
  LINE_D: 3,
  HORIZONTAL: 4,
  HORIZONTAL_D: 5,
  VERTICAL: 6,
  VERTICAL_D: 7,
  BEZIER: 8,
  BEZIER_D: 9,
  ARC: 10,
  ADD: 10
};

export default class SvgPath {
  constructor() {
    this._path = '';
    this._x;
    this._y;
    this._precision = 2;
    this._lastAction;
  }

  // ignore a change, if its end coordinate is the same as its current position
  _pathWillChange(x, y) {
    if (Number.isNaN(x) || Number.isNaN(y)); //debugger;
    if (x !== this._x || y !== this._y) {
      this._x = x;
      this._y = y;
      return true;
    }
    return false;
  }

  _applyPrecision(...numbers) {
    return numbers.map(d => +d.toFixed(this._precision));
  }

  get() {
    return this._path;
  }

  move(x, y) {
    [x, y] = this._applyPrecision(x, y);
    if (this._pathWillChange(x, y)) {
      if (this._lastAction == ACTION.MOVE)
        // remove last move from string
        this._path = this._path.slice(0, this._path.lastIndexOf('M'));
      this._path += 'M ' + x + ' ' + y + ' ';
      this._lastAction = ACTION.MOVE;
    }
  }

  moveD(dx, dy) {
    [dx, dy] = this._applyPrecision(dx, dy);
    if (this._pathWillChange(this._x + dx, this._y + dy)) {
      this._path += 'm ' + dx + ' ' + dy + ' ';
      this._lastAction = ACTION.MOVE_D;
    }
  }

  line(x, y) {
    [x, y] = this._applyPrecision(x, y);
    if (this._pathWillChange(x, y)) {
      this._path += 'L ' + x + ' ' + y + ' ';
      this._lastAction = ACTION.LINE;
    }
  }

  lineD(dx, dy) {
    [dx, dy] = this._applyPrecision(dx, dy);
    if (this._pathWillChange(this._x + dx, this._y + dy)) {
      this._path += 'l ' + dx + ' ' + dy + ' ';
      this._lastAction = ACTION.LINE_D;
    }
  }

  horizontal(x) {
    [x] = this._applyPrecision(x);
    if (this._pathWillChange(x, this._y)) {
      if (this._lastAction == ACTION.HORIZONTAL)
        // remove last move from string
        this._path = this._path.slice(0, this._path.lastIndexOf('H'));
      this._path += 'H ' + x + ' ';
      this._lastAction = ACTION.HORIZONTAL;
    }
  }

  horizontalD(dx) {
    [dx] = this._applyPrecision(dx);
    if (this._pathWillChange(this._x + dx, this._y)) {
      this._path += 'h ' + dx + ' ';
      this._lastAction = ACTION.HORIZONTAL_D;
    }
  }

  vertical(y) {
    [y] = this._applyPrecision(y);
    if (this._pathWillChange(this._x, y)) {
      if (this._lastAction == ACTION.VERTICAL)
        // remove last move from string
        this._path = this._path.slice(0, this._path.lastIndexOf('V'));
      this._path += 'V ' + y + ' ';
      this._lastAction = ACTION.VERTICAL;
    }
  }

  verticalD(dy) {
    [dy] = this._applyPrecision(dy);
    if (this._pathWillChange(this._x, this._y + dy)) {
      this._path += 'v ' + dy + ' ';
      this._lastAction = ACTION.VERTICAL_D;
    }
  }

  bezier(x1, y1, x2, y2, x, y) {
    [x1, y1, x2, y2, x, y] = this._applyPrecision(x1, y1, x2, y2, x, y);
    if (this._pathWillChange(x, y)) {
      this._path +=
        'C ' + x1 + ' ' + y1 + ', ' + x2 + ' ' + y2 + ', ' + x + ' ' + y + ' ';
      this._lastAction = ACTION.BEZIER;
    }
  }

  bezierD(dx1, dy1, dx2, dy2, dx, dy) {
    [dx1, dy1, dx2, dy2, dx, dy] = this._applyPrecision(
      dx1,
      dy1,
      dx2,
      dy2,
      dx,
      dy
    );
    if (this._pathWillChange(this._x + dx, this._y + dy)) {
      this._path +=
        'c ' +
        dx1 +
        ' ' +
        dy1 +
        ', ' +
        dx2 +
        ' ' +
        dy2 +
        ', ' +
        dx +
        ' ' +
        dy +
        ' ';
      this._lastAction = ACTION.BEZIER_D;
    }
  }

  arc(rx, ry, rot, largeArcFlag, sweepFlag, x, y) {
    [rx, ry, rot, largeArcFlag, sweepFlag, x, y] = this._applyPrecision(
      rx,
      ry,
      rot,
      largeArcFlag,
      sweepFlag,
      x,
      y
    );
    if (this._pathWillChange(x, y)) {
      this._path +=
        'A ' +
        rx +
        ' ' +
        ry +
        ' ' +
        rot +
        ' ' +
        largeArcFlag +
        ' ' +
        sweepFlag +
        ' ' +
        x +
        ' ' +
        y +
        ' ';
      this._lastAction = ACTION.ARC;
    }
  }

  close() {
    this._path += 'Z';
  }

  add(string) {
    this._path += string;
    this._lastAction = ACTION.ADD;
  }
}
