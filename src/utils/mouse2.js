const urlParams = new URLSearchParams(window.location.search);
const queryRez = urlParams.get("rez");
const rez = parseInt(queryRez, 10) || 1;

// helper functions
export const getWidth = () => {
  return ~~(document.documentElement.clientWidth, window.innerWidth || 0) / rez;
};
export const getHeight = () => {
  return (
    ~~(document.documentElement.clientHeight, window.innerHeight || 0) / rez
  );
};
export const nbtr = (val, minVal, maxVal, newMin, newMax) => {
  return newMin + ((val - minVal) * (newMax - newMin)) / (maxVal - minVal);
};

// Mouse Class //
export default class Mouse {
  constructor(element) {
    this.element = element || window;
    this.drag = false;
    this.x = getWidth() / 2;
    this.y = getHeight() / 2;
    this.pointer = this.pointer.bind(this);
    this.getCoordinates = this.getCoordinates.bind(this);
    this.events = ["mouseenter", "mousemove"];
    this.events.forEach((eventName) => {
      this.element.addEventListener(eventName, this.getCoordinates);
    });
    this.element.addEventListener("mousedown", () => {
      this.drag = true;
    });
    this.element.addEventListener("mouseup", () => {
      this.drag = false;
    });
  }

  getCoordinates(event) {
    event.preventDefault();
    // because the scroll changes the y position
    // this compensates for that in the mouse uniform.
    const scrolltop =
      window.pageYOffset ||
      (document.documentElement || document.body.parentNode || document.body)
        .scrollTop;
    const x = (event.pageX / rez);
    const y = (event.pageY / rez);
    if (this.drag) {
      this.x = x ;
      this.y = y - scrolltop / rez;
    }
  }
  pointer() {
    // console.log(this.x, this.y);
    return {
      x: this.x,
      y: this.y,
      drag: this.drag,
    };
  }
}
