{
    class SvgPath {
        constructor() {
            this._path = "";
            this._x;
            this._y;
            this._precision = 2;
        }

        // ignore a change, if its end coordinate is the same as its current position
        _pathWillChange(x, y) {
            if (Number.isNaN(x) || Number.isNaN(y))
                ;//debugger;
            if (x !== this._x || y !== this._y) {
                this._x = x;
                this._y = y;
                return true;
            }
            return false;
        }

        _applyPrecision(...numbers) { return numbers.map(d => +d.toFixed(this._precision)); }

        get() { return this._path; }

        move(x,y) {
            [x,y] = this._applyPrecision(x,y);
            if (this._pathWillChange(x, y))
                this._path += "M " + x + " " + y + " ";
        }
        
        moveD(dx,dy) {
            [dx,dy] = this._applyPrecision(dx,dy);
            if (this._pathWillChange(this._x + dx, this._y + dy))
                this._path += "m " + dx + " " + dy + " ";
        }

        line(x,y) {
            [x,y] = this._applyPrecision(x,y);
            if (this._pathWillChange(x, y))
                this._path += "L " + x + " " + y + " ";
        }

        lineD(dx,dy) {
            [dx,dy] = this._applyPrecision(dx,dy);
            if (this._pathWillChange(this._x + dx, this._y + dy))
                this._path += "l " + dx + " " + dy + " ";
        }

        horizontal(x) {
            [x] = this._applyPrecision(x);
            if (this._pathWillChange(x, this._y))
                this._path += "H " + x + " ";
        }

        horizontalD(dx) {
            [dx] = this._applyPrecision(dx);
            if (this._pathWillChange(this._x + dx, this._y))
                this._path += "h " + dx + " ";
        }

        vertical(y) {
            [y] = this._applyPrecision(y);
            if (this._pathWillChange(this._x, y))
                this._path += "V " + y + " ";
        }

        verticalD(dy) {
            [dy] = this._applyPrecision(dy);
            if (this._pathWillChange(this._x, this._y + dy))
                this._path += "v " + dy + " ";
        }

        bezier(x1, y1, x2, y2, x, y) {
            [x1,y1,x2,y2,x,y] = this._applyPrecision(x1,y1,x2,y2,x,y);
            if (this._pathWillChange(x, y))
                this._path += "C " + x1 + " " + y1 + ", " + x2 + " " + y2 + ", " + x + " " + y + " ";
        }

        bezierD(dx1, dy1, dx2, dy2, dx, dy) {
            [dx1,dy1,dx2,dy2,dx,dy] = this._applyPrecision(dx1,dy1,dx2,dy2,dx,dy);
            if (this._pathWillChange(this._x + dx, this._y + dy))
                this._path += "c " + dx1 + " " + dy1 + ", " + dx2 + " " + dy2 + ", " + dx + " " + dy + " ";
        
        }

        arc(rx, ry, rot, largeArcFlag, sweepFlag, x, y) {
            [rx,ry,rot,largeArcFlag,sweepFlag,x,y] = this._applyPrecision(rx,ry,rot,largeArcFlag,sweepFlag,x,y);
            if (this._pathWillChange(x, y))
                this._path += "A "  + rx + " "  + ry + " "  + rot + " "  + largeArcFlag + " "  + sweepFlag + " "  + x + " "  + y + " ";
        }

        close() {
            this._path += "Z"
        }
    }
	window.SvgPath = (...args) => new SvgPath(...args);
}