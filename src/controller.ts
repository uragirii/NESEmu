const A_MASK = 0b1000_0000;
const B_MASK = A_MASK >> 1;
const SELECT_MASK = B_MASK >> 1;
const START_MASK = SELECT_MASK >> 1;
const UP_MASK = START_MASK >> 1;
const DOWN_MASK = UP_MASK >> 1;
const LEFT_MASK = DOWN_MASK >> 1;
const RIGHT_MASK = LEFT_MASK >> 1;

export class Controller {
  isListening = false;
  /**
   * 0 - A
   * 1 - B
   * 2 - Select
   * 3 - Start
   * 4 - Up
   * 5  - Down
   * 6 - Left
   * 7 - Right
   */
  buffer = 0;

  internalBuffer = 0;

  constructor() {
    document.addEventListener("keydown", (evt) => this.keyDownListener(evt));
    document.addEventListener("keyup", (evt) => this.keyUpListener(evt));
  }

  startListening() {
    // arrow keys are not detected for keypress
    // this.internalBuffer = 0;
    this.isListening = true;
  }

  private keyUpListener(evt: KeyboardEvent) {
    switch (evt.key) {
      case "ArrowRight":
        this.internalBuffer &= ~RIGHT_MASK;
        break;
      case "ArrowLeft":
        this.internalBuffer &= ~LEFT_MASK;
        break;
      case "ArrowUp":
        this.internalBuffer &= ~UP_MASK;
        break;
      case "ArrowDown":
        this.internalBuffer &= ~DOWN_MASK;
        break;
      case "Enter":
        this.internalBuffer &= ~SELECT_MASK;
        break;
      case "s":
        this.internalBuffer &= ~START_MASK;
        break;
      case "a":
        this.internalBuffer &= ~A_MASK;
        break;
      case "b":
        this.internalBuffer &= ~B_MASK;
        break;
    }
    this.internalBuffer &= 0xff;
  }

  private keyDownListener(evt: KeyboardEvent) {
    switch (evt.key) {
      case "ArrowRight":
        this.internalBuffer |= RIGHT_MASK;
        break;
      case "ArrowLeft":
        this.internalBuffer |= LEFT_MASK;
        break;
      case "ArrowUp":
        this.internalBuffer |= UP_MASK;
        break;
      case "ArrowDown":
        this.internalBuffer |= DOWN_MASK;
        break;
      case "Enter":
        this.internalBuffer |= SELECT_MASK;
        break;
      case "s":
        this.internalBuffer |= START_MASK;
        break;
      case "a":
        this.internalBuffer |= A_MASK;
        break;
      case "b":
        this.internalBuffer |= B_MASK;
        break;
    }
  }

  stopListening() {
    // document.removeEventListener("keydown", this.listener);
    this.buffer = this.internalBuffer;
    this.isListening = false;
  }
}
